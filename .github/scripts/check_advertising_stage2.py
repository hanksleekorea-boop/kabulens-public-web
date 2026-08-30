from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run(root: Path) -> int:
    web = root / "web" if (root / "web").is_dir() else root
    config = read(web / "ad_demand_config.js")
    runtime = read(web / "ad_orchestrator.js")
    learn = read(web / "learn.html")
    scanner = read(web / "stock-scanner.html")
    policy = json.loads(read(web / "ad-operations-policy-v2.json"))
    ready = json.loads(read(web / "advertising-stage2-readiness.json"))
    sw = read(web / "stock-scanner-sw.js")

    checks = [
        ("GAM demand configuration", "stock-scanner-ad-demand/v2" in config and "google-ad-manager" in config),
        ("Single orchestrator", learn.count('src="ad_orchestrator.js"') == 1 and "selectDemand" in runtime),
        ("Core routes ad-free", "data-ad-surface" not in scanner and "CORE_OR_POLICY_ROUTE_BLOCKED" in runtime),
        ("Two-slot density", learn.count('data-ad-surface="education"') == 2 and "maxAdsPerPage: 2" in config),
        ("Certified consent first", "CERTIFIED_CONSENT_REQUIRED" in runtime and runtime.index("consentDecision") < runtime.index("requestGam(windowLike")),
        ("GPC and age restrictions", "GPC_OPT_OUT" in runtime and "AGE_RESTRICTED_NO_ADS" in runtime),
        ("GPT initial request disabled", "disableInitialLoad: true" in runtime),
        ("Identifiers validated", "GAM_NETWORK_INVALID" in runtime and "GAM_AD_UNIT_INVALID" in runtime),
        ("Unverified demand rejected", "GAM_NOT_VERIFIED" in runtime and "contractConfirmed" in runtime),
        ("Open Bidding server-side only", policy["demandStrategy"]["openBidding"] == "CONTRACT_AND_ACCOUNT_REQUIRED" and policy["demandStrategy"]["clientHeaderBidding"] == "NOT_ENABLED_STAGE2"),
        ("House fallback", "renderHouse" in runtime and "house" in config),
        ("Timeout and circuit breaker", "GAM_PROVIDER_TIMEOUT" in runtime and "PROVIDER_CIRCUIT_OPEN" in runtime),
        ("Automatic refresh disabled", "refreshEnabled: false" in config and policy["inventory"]["automaticRefresh"] is False),
        ("No-ad holdout", "NO_AD_HOLDOUT" in runtime and "holdoutPercent: 10" in config),
        ("Aggregate reporting", "aggregateOnly: true" in config and "userIdentifiers: false" in config),
        ("Creative protections", len(policy["creativeProtections"]["blockedCategories"]) == 5 and policy["creativeProtections"]["advertiserCannotInfluenceResearch"] is True),
        ("Evidence-led pricing", policy["pricing"]["liveFloorRules"] == [] and "30 days" in policy["pricing"]["rule"]),
        ("No live identifiers", "enabled: false" in config and "networkCode: ''" in config and not re.search(r"/\d{4,12}/learn_", config)),
        ("First-party offline only", "ad_demand_config.js" in sw and "ad_orchestrator.js" in sw and "securepubads" not in sw),
        ("Readiness separation", len(ready["automaticGates"]) == 20 and all(g["status"] == "PASS" for g in ready["automaticGates"]) and len(ready["externalGates"]) == 10 and all(g["status"] != "PASS" for g in ready["externalGates"])),
    ]
    failed = [name for name, passed in checks if not passed]
    for name, passed in checks:
        print(f"{'PASS' if passed else 'FAIL'}: {name}")
    print(f"advertising_stage2={len(checks) - len(failed)}/{len(checks)}")
    if failed:
        print("failed=" + ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    raise SystemExit(run(args.root.resolve()))
