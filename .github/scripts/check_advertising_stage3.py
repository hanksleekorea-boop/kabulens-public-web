from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run(root: Path) -> int:
    web = root / "web" if (root / "web").is_dir() else root
    config = read(web / "ad_marketplace_config.js")
    runtime = read(web / "ad_marketplace_orchestrator.js")
    learn = read(web / "learn.html")
    scanner = read(web / "stock-scanner.html")
    policy = json.loads(read(web / "ad-operations-policy-v3.json"))
    direct = json.loads(read(web / "direct-sales-policy-v1.json"))
    ready = json.loads(read(web / "advertising-stage3-readiness.json"))
    sw = read(web / "stock-scanner-sw.js")
    checks = [
        ("GAM final decision", policy["marketplace"]["finalAdServer"] == "google-ad-manager" and "gamFinalDecision: true" in config),
        ("Pinned self-hosted Prebid", "selfHostedBundlePath" in config and "bundleSri" in config and "CROSS_ORIGIN_PROVIDER_FORBIDDEN" in runtime),
        ("Three verified adapters maximum", "maximumBiddersPerSlot: 3" in config and "PREBID_BIDDER_LIMIT_INVALID" in runtime),
        ("Seven-hundred-millisecond auction", "auctionTimeoutMs: 700" in config and "PREBID_TIMEOUT_INVALID" in runtime),
        ("Consent and privacy before auctions", "privacyDecision" in runtime and runtime.index("privacyDecision(config, context)") < runtime.index("runPrebid(windowLike")),
        ("Identity modules and storage disabled", "userSyncEnabled: false" in config and "deviceAccess: false" in config and "allowTopWindowRenderers: false" in config),
        ("Core routes ad-free", "data-ad-surface" not in scanner and "CORE_OR_POLICY_ROUTE_BLOCKED" in runtime),
        ("Two reserved slots", learn.count('data-ad-surface="education"') == 2 and "maxAdsPerPage: 2" in config),
        ("Anonymous no-ad holdout", "NO_AD_HOLDOUT" in runtime and "noAdHoldoutPercent: 10" in config),
        ("Prebid staged rollout", "rolloutPercent: 0" in config and "PREBID_ROLLOUT_INVALID" in runtime),
        ("Duplicate channels rejected", "DUPLICATE_BIDDER_CHANNEL" in runtime and policy["marketplace"]["duplicatePartnerAcrossOpenBiddingAndPrebid"] == "FORBIDDEN"),
        ("Context-only targeting", "sanitizeTargeting" in runtime and len(policy["targeting"]["forbiddenKeys"]) >= 7),
        ("Direct-sales controls", len(direct["requiredBeforeCampaign"]) >= 8 and policy["directSales"]["advertiserCannotInfluenceResearch"] is True),
        ("Evidence-led floors", policy["pricing"]["liveFloorRules"] == [] and policy["pricing"]["floorSkipControlPercent"] == 10),
        ("Supply-chain transparency", policy["supplyChain"]["adsTxt11Required"] and policy["supplyChain"]["sellersJsonRequired"] and policy["supplyChain"]["completeSchainRequired"]),
        ("Timeout circuit and fallback", "PROVIDER_TIMEOUT" in runtime and "MARKETPLACE_CIRCUIT_OPEN" in runtime and "renderHouse" in runtime),
        ("No automatic refresh", policy["inventory"]["automaticRefresh"] is False and "automaticRefresh: false" in config),
        ("Aggregate-only reporting", "aggregateOnly: true" in config and "userIdentifiers: false" in config and "recordMetric" in runtime),
        ("No live marketplace identifiers", "enabled: false" in config and "emergencyDisabled: true" in config and "networkCode: ''" in config and not re.search(r"/\d{4,12}/learn_", config)),
        ("Readiness and first-party offline boundary", len(ready["automaticGates"]) == 20 and all(g["status"] == "PASS" for g in ready["automaticGates"]) and len(ready["externalGates"]) == 12 and all(g["status"] != "PASS" for g in ready["externalGates"]) and "ad_marketplace_config.js" in sw and "ad_marketplace_orchestrator.js" in sw and "prebid-" not in sw),
    ]
    failed = [name for name, passed in checks if not passed]
    for name, passed in checks:
        print(f"{'PASS' if passed else 'FAIL'}: {name}")
    print(f"advertising_stage3={len(checks) - len(failed)}/{len(checks)}")
    if failed:
        print("failed=" + ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    raise SystemExit(run(args.root.resolve()))
