"""Verify every user-facing static launch surface without changing it."""

from __future__ import annotations

import json
import sys
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


SURFACES = {
    "": ("text/html", b"KABU LENS", 250_000),
    "app.js": ("javascript", b"ensureCatalog", 500_000),
    "styles.css": ("text/css", b"focus-visible", 500_000),
    "sw.js": ("javascript", b"kabulens-shell-v30-4-account-adapter", 100_000),
    "auth_config.js": ("javascript", b"KABULENS_AUTH_CONFIG", 20_000),
    "auth_runtime.js": ("javascript", b"AUTH_API_NOT_CONFIGURED", 100_000),
    "public_config.js": ("javascript", b"KABULENS_PUBLIC_CONFIG", 20_000),
    "account_runtime.js": ("javascript", b"kabulens.account-preferences.v1", 100_000),
    "manifest.webmanifest": ("manifest", b'"display":"standalone"', 50_000),
    "legal/terms.html": ("text/html", "무료 베타 이용 조건".encode(), 150_000),
    "legal/privacy.html": ("text/html", "무료 베타 개인정보".encode(), 150_000),
    "status.html": ("text/html", "서비스 상태".encode(), 150_000),
    "support.html": ("text/html", "지원·신고".encode(), 150_000),
    "robots.txt": ("text/plain", b"Sitemap:", 20_000),
    "sitemap.xml": ("xml", b"kabulens-public-web", 100_000),
    "kabulens-public-qr.png": ("image/png", b"\x89PNG\r\n\x1a\n", 200_000),
    "__connectivity__": ("connectivity", b"online", 1_000),
}


def validate_surface(path: str, expected: tuple[str, bytes, int], status: int, content_type: str, payload: bytes, final_url: str, base_host: str) -> list[str]:
    kind, marker, maximum = expected
    failures = []
    if status != 200:
        failures.append("status")
    if urlparse(final_url).hostname != base_host:
        failures.append("cross-origin-redirect")
    normalized_type = content_type.split(";", 1)[0].strip().lower()
    accepted = {
        "javascript": ("application/javascript", "text/javascript"),
        "manifest": ("application/manifest+json", "application/json", "text/json"),
        "xml": ("application/xml", "text/xml"),
        "connectivity": ("application/octet-stream", "text/plain"),
    }.get(kind, (kind,))
    if normalized_type not in accepted:
        failures.append("content-type")
    marker_missing = not payload.startswith(marker) if kind == "image/png" else marker not in payload
    if marker_missing:
        failures.append("marker")
    if not payload or len(payload) > maximum:
        failures.append("size")
    return [f"{path or '/'}:{failure}" for failure in failures]


def run(base_url: str) -> dict[str, object]:
    base = base_url.rstrip("/") + "/"
    parsed = urlparse(base)
    if parsed.scheme != "https" or not parsed.hostname:
        return {"passed": False, "failed": ["base:https-required"], "checked": 0}
    failures = []
    observed = []
    for path, expected in SURFACES.items():
        request = Request(urljoin(base, path), headers={"User-Agent": "KABU-LENS-public-surface/1.0"})
        try:
            with urlopen(request, timeout=20) as response:
                payload = response.read(expected[2] + 1)
                current = validate_surface(path, expected, response.status, response.headers.get("Content-Type", ""), payload, response.geturl(), parsed.hostname)
                failures.extend(current)
                observed.append({"path": path or "/", "status": response.status, "bytes": len(payload), "failed": current})
        except Exception as error:
            failures.append(f"{path or '/'}:request:{type(error).__name__}")
            observed.append({"path": path or "/", "failed": [type(error).__name__]})
    return {"passed": not failures, "failed": failures, "checked": len(SURFACES), "observed": observed}


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://hanksleekorea-boop.github.io/kabulens-public-web/"
    result = run(base_url)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    if not result["passed"]:
        raise SystemExit("PUBLIC_SURFACE_CHECK_FAILED")


if __name__ == "__main__":
    main()
