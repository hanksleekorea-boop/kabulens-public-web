from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run(root: Path) -> int:
    web = root / "web" if (root / "web").is_dir() else root
    learn = read(web / "learn.html")
    scanner = read(web / "stock-scanner.html")
    config = read(web / "ad_config.js")
    runtime = read(web / "ad_runtime.js")
    sw = read(web / "stock-scanner-sw.js")
    privacy_ko = read(web / "legal" / "privacy.html")
    privacy_en = read(web / "legal" / "privacy-en.html")
    terms_en = read(web / "legal" / "terms-en.html")
    choices = read(web / "privacy-choices.html")
    readiness = json.loads(read(web / "advertising-stage1-readiness.json"))

    checks = [
        ("English educational surface", '<html lang="en">' in learn and learn.count('<article id="') == 12),
        ("Core scanner stays ad-free", "data-ad-surface" not in scanner and "adsbygoogle" not in scanner),
        ("Two slots maximum", learn.count('data-ad-surface="education"') == 2 and "maxAdsPerPage: 2" in config),
        ("No publisher identifier", not re.search(r"ca-pub-\d", config + learn)),
        ("Pre-approval disabled", "enabled: false" in config and "ADS_DISABLED_PRE_APPROVAL" in runtime),
        ("Certified consent required", "CERTIFIED_CONSENT_REQUIRED" in runtime and "google-certified-cmp" in runtime),
        ("Offline blocked", "OFFLINE_NO_ADS" in runtime),
        ("Print blocked", "PRINT_NO_ADS" in runtime),
        ("Provider timeout", "AD_PROVIDER_TIMEOUT" in runtime and "requestTimeoutMs: 900" in config),
        ("House fallback", "renderFallback" in runtime and "without tracking" in learn),
        ("Privacy choices", "Clear advertising preferences" in choices),
        ("Korean disclosure", "광고는 현재 비활성" in privacy_ko),
        ("English disclosure", "Live advertising is disabled" in privacy_en),
        ("Editorial independence", "Advertisers cannot purchase rankings" in terms_en),
        ("First-party service worker only", "url.origin!==self.location.origin" in sw and "pagead2" not in sw),
        ("Search metadata", 'hreflang="en"' in learn and 'robots" content="index,follow' in learn),
        ("Sitemap educational URL", "learn.html" in read(web / "sitemap.xml")),
        ("Honest ads.txt", "advertising is disabled" in read(web / "ads.txt").lower() and "google.com," not in read(web / "ads.txt")),
        ("External gates explicit", len(readiness["externalGates"]) == 7 and all(g["status"] != "PASS" for g in readiness["externalGates"])),
        ("Automatic contract complete", len(readiness["automaticGates"]) == 20 and all(g["status"] == "PASS" for g in readiness["automaticGates"])),
    ]
    failed = [name for name, passed in checks if not passed]
    for name, passed in checks:
        print(f"{'PASS' if passed else 'FAIL'}: {name}")
    print(f"advertising_stage1={len(checks) - len(failed)}/{len(checks)}")
    if failed:
        print("failed=" + ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    raise SystemExit(run(args.root.resolve()))
