"""Deterministic twenty-point assurance check for the free public Stock Scanner release."""

from __future__ import annotations

import argparse
from collections import OrderedDict
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET


class Links(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.values: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        key = "href" if tag in {"a", "link"} else "src" if tag in {"script", "img"} else None
        if not key:
            return
        for name, value in attrs:
            if name == key and value:
                self.values.append(value)


def load_json(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"OBJECT_REQUIRED:{path.name}")
    return value


def local_links(web: Path) -> list[str]:
    failures: list[str] = []
    root = web.resolve()
    for page in web.rglob("*.html"):
        parser = Links()
        parser.feed(page.read_text(encoding="utf-8"))
        for value in parser.values:
            if value.startswith(("https://", "http://", "mailto:", "data:", "#")):
                continue
            clean = value.split("#", 1)[0].split("?", 1)[0]
            if not clean:
                continue
            target = (page.parent / clean).resolve()
            try:
                target.relative_to(root)
            except ValueError:
                failures.append(f"{page.relative_to(web).as_posix()}:{value}:outside")
                continue
            generated_alias = target.name == "stock-scanner-v8.css" and (web / "stock-scanner.css").is_file()
            if not target.is_file() and not generated_alias:
                failures.append(f"{page.relative_to(web).as_posix()}:{value}")
    return failures


def run(root: Path) -> dict[str, object]:
    web = root / "web" if (root / "web").is_dir() else root
    quality = root / "public-repo" / ".github" / "quality"
    if not quality.is_dir():
        quality = root / ".github" / "quality"
    workflow = quality.parent / "workflows" / "public-quality.yml"

    release = load_json(web / "commercial-free-readiness.json")
    personas = load_json(web / "commercial-persona-report.json")
    progress = load_json(web / "progress.json")
    brand = load_json(web / "brand.json")
    manifest = load_json(web / "stock-scanner.webmanifest")
    methods = load_json(web / "methodology_education_v1.json")
    free_content = load_json(web / "free_content_guide_v1.json")
    advanced = load_json(web / "advanced_research_v2.json")
    assurance = load_json(web / "release-assurance.json")
    html = (web / "stock-scanner.html").read_text(encoding="utf-8")
    css = (web / "stock-scanner.css").read_text(encoding="utf-8")
    runtime = (web / "stock_scanner_runtime.js").read_text(encoding="utf-8")
    worker = (web / "stock-scanner-sw.js").read_text(encoding="utf-8")
    workflow_text = workflow.read_text(encoding="utf-8")
    public_test = (quality / "public.spec.mjs").read_text(encoding="utf-8")
    service_pages = [web / name for name in (
        "index.html", "stock-scanner.html", "status.html", "support.html",
        "legal/terms.html", "legal/privacy.html",
    )]
    service_text = "\n".join(path.read_text(encoding="utf-8") for path in service_pages)

    expiry_match = re.search(r"^Expires:\s*(\S+)$", (web / ".well-known" / "security.txt").read_text(encoding="utf-8"), re.M)
    expiry = datetime.fromisoformat(expiry_match.group(1).replace("Z", "+00:00")) if expiry_match else datetime.min.replace(tzinfo=timezone.utc)
    days_to_expiry = (expiry - datetime.now(timezone.utc)).days
    sitemap = ET.parse(web / "sitemap.xml").getroot()
    sitemap_urls = [node.text or "" for node in sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    broken = local_links(web)
    required_offline = (
        "stock-scanner.html", "stock-scanner.css", "stock_scanner_runtime.js",
        "advanced_research_runtime.js", "advanced_research_ui.js", "advanced_research_v2.json",
        "commercial_free_runtime.js", "commercial_free_ui.js", "commercial_free_v1.json",
        "methodology_education_v1.json", "free_content_guide_v1.json",
        "legal/terms.html", "legal/privacy.html", "status.html", "support.html",
    )
    secret_pattern = re.compile(r"(?:gh[opsu]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|bearer\s+[A-Za-z0-9._-]{20,})", re.I)
    methods_rows = methods.get("methods", [])
    method_fields = ("shortExplanationKo", "analogyKo", "principleKo", "requiredDataKo", "masters", "caseStudy", "failureModesKo", "reviewedAt", "nextReviewAt")
    checks: OrderedDict[str, bool] = OrderedDict([
        ("truthful_free_scope", release.get("publicReleaseOpen") is True and release.get("externalAssuranceComplete") is False and bool(release.get("nonClaim"))),
        ("commercial_free_gates", len(release.get("gates", [])) >= 15 and all(str(item.get("status", "")).startswith("PASS") for item in release.get("gates", []))),
        ("synthetic_personas_1000x10", personas.get("population") == 1000 and personas.get("tasks") == 10000 and personas.get("failed") == 0 and personas.get("realUsers") == 0),
        ("release_version_alignment", len({release.get("releaseVersion"), progress.get("version"), brand.get("releaseVersion"), assurance.get("releaseVersion")}) == 1),
        ("three_locale_advanced_contract", set(advanced.get("locales", {})) == {"ko", "en", "ja"} and bool(advanced.get("jaCoreKeys"))),
        ("complete_method_education", len(methods_rows) == 12 and all(all(field in item and item[field] for field in method_fields) for item in methods_rows)),
        ("complete_free_content", len(free_content.get("firstUse", [])) == 6 and len(free_content.get("scenarios", [])) == 3 and len(free_content.get("presets", [])) == 4 and len(free_content.get("states", [])) == 9 and len(free_content.get("faqs", [])) == 25 and len(free_content.get("glossary", [])) == 50),
        ("responsive_accessible_css", all(token in css for token in ("min-height:44px", "overflow-wrap:anywhere", "minmax(0,1fr)", "prefers-reduced-motion:reduce", ":focus-visible", "safe-area-inset-bottom"))),
        ("print_pdf_contract", "@media print" in css and "break-inside:avoid" in css and "window.print()" in runtime and "#printReport" not in css),
        ("offline_complete_shell", all(asset in worker for asset in required_offline) and "localStorage.clear" not in worker and "indexedDB.deleteDatabase" not in worker),
        ("safe_worker_upgrade", "cache.addAll(SHELL)" in worker and "skipWaiting" in worker and "clients.claim" in worker and "key!==CACHE" in worker),
        ("local_backup_restore_delete", all(token in runtime for token in ("localBackup", "restoreLocalBackup", "deleteLocalData", "2*1024*1024", "confirm("))),
        ("safe_json_csv_export", all(token in runtime for token in ("stock-scanner-results.json", "stock-scanner-results.csv", "toCsv", "/^[=+\\-@]/"))),
        ("restrictive_service_pages", all("Content-Security-Policy" in path.read_text(encoding="utf-8") and "object-src 'none'" in path.read_text(encoding="utf-8") for path in service_pages)),
        ("no_obvious_secrets_or_trackers", not secret_pattern.search(service_text + runtime + worker) and not re.search(r"google-analytics|googletagmanager|mixpanel|segment\.com|facebook\.net", service_text + runtime, re.I)),
        ("all_local_links_resolve", not broken),
        ("security_contact_not_expiring", days_to_expiry >= 30 and "security/advisories/new" in (web / ".well-known" / "security.txt").read_text(encoding="utf-8")),
        ("manifest_robots_sitemap", manifest.get("display") == "standalone" and manifest.get("start_url") == "./stock-scanner.html#today" and all(url.startswith("https://hanksleekorea-boop.github.io/kabulens-public-web/") for url in sitemap_urls) and "Sitemap:" in (web / "robots.txt").read_text(encoding="utf-8")),
        ("three_browser_lighthouse_supply_chain", all(token in workflow_text for token in ("chromium firefox webkit", "public-lighthouse-$run.json", "npm audit", "npm sbom")) and all(token in public_test for token in ("widths=[1440,390,360]", "AxeBuilder", "commercialLaunchDesk"))),
        ("assurance_report_complete", assurance.get("automatedChecks") == 20 and assurance.get("passed") == 20 and len(assurance.get("checks", [])) == 20 and all(item.get("status") == "PASS_AUTOMATED" for item in assurance.get("checks", []))),
    ])
    failed = [name for name, passed in checks.items() if not passed]
    return {
        "schemaVersion": "stock-scanner-free-release-assurance-check/v1",
        "passed": not failed,
        "checks": len(checks),
        "passedChecks": sum(checks.values()),
        "failed": failed,
        "observed": {
            "daysToSecurityContactExpiry": days_to_expiry,
            "localBrokenLinks": broken,
            "methodRecords": len(methods_rows),
            "sitemapUrls": len(sitemap_urls),
        },
        "notProvenByThisCheck": ["manual-screen-reader", "iphone", "real-users", "operator-legal-identity", "licensed-market-data", "investment-performance"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    result = run(args.root.resolve())
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    if not result["passed"]:
        raise SystemExit("FREE_RELEASE_ASSURANCE_FAILED")


if __name__ == "__main__":
    main()
