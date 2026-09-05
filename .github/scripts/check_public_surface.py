"""Verify every user-facing static launch surface without changing it."""

from __future__ import annotations

import json
import sys
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


SURFACES = {
    "": ("text/html", b"Stock Scanner", 250_000),
    "root_redirect.js": ("javascript", b"stock-scanner.html", 20_000),
    "stock-scanner.html": ("text/html", b"Stock Scanner", 250_000),
    "learn.html": ("text/html", b"Understand the method", 250_000),
    "privacy-choices.html": ("text/html", b"Privacy choices", 150_000),
    "privacy_choices.js": ("javascript", b"clearAdPreferences", 20_000),
    "ad_config.js": ("javascript", b"STOCK_SCANNER_AD_CONFIG", 30_000),
    "ad_runtime.js": ("javascript", b"StockScannerAds", 100_000),
    "ad_demand_config.js": ("javascript", b"STOCK_SCANNER_AD_DEMAND_CONFIG", 50_000),
    "ad_orchestrator.js": ("javascript", b"StockScannerAdOrchestrator", 150_000),
    "ad-operations-policy-v2.json": ("application/json", b'"stock-scanner-ad-operations-policy/v2"', 100_000),
    "ad_marketplace_config.js": ("javascript", b"STOCK_SCANNER_AD_MARKETPLACE_CONFIG", 100_000),
    "ad_marketplace_orchestrator.js": ("javascript", b"StockScannerAdMarketplace", 200_000),
    "ad-operations-policy-v3.json": ("application/json", b'"stock-scanner-ad-operations-policy/v3"', 100_000),
    "direct-sales-policy-v1.json": ("application/json", b'"stock-scanner-direct-sales-policy/v1"', 100_000),
    "ads.txt": ("text/plain", b"google.com, pub-2476023536699107, DIRECT, f08c47fec0942fa0", 20_000),
    "advertising-stage1-readiness.json": ("application/json", b'"schemaVersion": "stock-scanner-advertising-stage1/v1"', 100_000),
    "advertising-stage2-readiness.json": ("application/json", b'"stock-scanner-advertising-readiness/v2"', 100_000),
    "advertising-stage3-readiness.json": ("application/json", b'"stock-scanner-advertising-readiness/v3"', 100_000),
    "advertiser-disclosure.html": ("text/html", b"Advertising cannot purchase a research outcome", 150_000),
    "dashboard.html": ("text/html", "개발 진척 대시보드".encode(), 250_000),
    "progress.json": ("application/json", b'"schemaVersion": "stock-scanner-progress/v1"', 100_000),
    "stage1-market-v8.json": ("application/json", b'"schemaVersion": "stock-scanner-stage1-market-readiness/v8.0"', 100_000),
    "stage2-global-v8.json": ("application/json", b'"schemaVersion": "stock-scanner-stage2-global-readiness/v8.0"', 100_000),
    "free-launch-readiness.json": ("application/json", b'"schemaVersion": "stock-scanner-free-launch-readiness/v1"', 100_000),
    "stage1-readiness.json": ("application/json", b'"schemaVersion": "stock-scanner-stage1-readiness/v1"', 100_000),
    "persona-report.json": ("application/json", b'"schemaVersion": "stock-scanner-persona-report/v2"', 100_000),
    "stage2-readiness.json": ("application/json", b'"releaseVersion": "6.0"', 100_000),
    "advanced-persona-report.json": ("application/json", b'"population": 1000', 100_000),
    "commercial-free-readiness.json": ("application/json", b'"releaseVersion": "7.4"', 100_000),
    "commercial-persona-report.json": ("application/json", b'"tasks": 10000', 100_000),
    "release-assurance.json": ("application/json", b'"automatedChecks": 20', 100_000),
    "stock-scanner.css": ("text/css", b"focus-visible", 500_000),
    "stock-scanner-v8.css": ("text/css", b"scanner-footer a", 500_000),
    "stock_scanner_runtime.js": ("javascript", b"StockScanner", 500_000),
    "advanced_research_runtime.js": ("javascript", b"StockScannerAdvanced", 500_000),
    "advanced_research_ui.js": ("javascript", b"StockScannerAdvanced", 500_000),
    "advanced_research_v2.json": ("application/json", b'"schemaVersion": "stock-scanner-advanced-content/v2"', 500_000),
    "commercial_free_runtime.js": ("javascript", b"StockScannerCommercialFree", 500_000),
    "commercial_free_ui.js": ("javascript", b"StockScannerCommercialFree", 500_000),
    "commercial_free_v1.json": ("application/json", b'"serviceLevel": "ADVANCED_FREE_COMMERCIAL"', 500_000),
    "methodology_education_v1.json": ("application/json", b'"schemaVersion": "stock-scanner-method-education/v1"', 500_000),
    "free_content_guide_v1.json": ("application/json", b'"schemaVersion": "stock-scanner-free-content/v1"', 500_000),
    "stock-scanner-sw.js": ("javascript", b"stock-scanner-shell-v9-content-atlas-1", 100_000),
    "sw_update_v8.js": ("javascript", b"updateViaCache", 20_000),
    "sw.js": ("javascript", b"stock-scanner-sw.js", 20_000),
    "public_config.js": ("javascript", b"STOCK_SCANNER_PUBLIC_CONFIG", 20_000),
    "brand.json": ("application/json", b'"name": "Stock Scanner"', 20_000),
    "stock-scanner.webmanifest": ("manifest", b'"name": "Stock Scanner"', 50_000),
    "manifest.webmanifest": ("manifest", b'"name":"Stock Scanner"', 50_000),
    "legal/terms.html": ("text/html", "Stock Scanner".encode(), 150_000),
    "legal/privacy.html": ("text/html", "Stock Scanner".encode(), 150_000),
    "legal/terms-en.html": ("text/html", b"Free service terms", 150_000),
    "legal/privacy-en.html": ("text/html", b"Privacy notice", 150_000),
    "status.html": ("text/html", "Stock Scanner".encode(), 150_000),
    "support.html": ("text/html", "Stock Scanner".encode(), 150_000),
    ".well-known/security.txt": ("text/plain", b"Contact: https://github.com/hanksleekorea-boop/kabulens-public-web/security/advisories/new", 20_000),
    "robots.txt": ("text/plain", b"Sitemap:", 20_000),
    "sitemap.xml": ("xml", b"kabulens-public-web", 100_000),
    "stock-scanner-qr.png": ("image/png", b"\x89PNG\r\n\x1a\n", 200_000),
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
        request = Request(urljoin(base, path), headers={"User-Agent": "Stock-Scanner-public-surface/5.3"})
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
