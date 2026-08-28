"""Fail closed when three public Lighthouse runs miss the Stage 1 budget."""
from __future__ import annotations
import json
from pathlib import Path
import statistics
import sys
LIMITS = {
    "performance": 0.95,
    "accessibility": 1.0,
    "best-practices": 1.0,
    "seo": 1.0,
    "largest-contentful-paint": 2_500,
    "cumulative-layout-shift": 0.1,
    "total-blocking-time": 200,
}
def main() -> None:
    reports = [json.loads(Path(value).read_text(encoding="utf-8")) for value in sys.argv[1:]]
    if len(reports) != 3:
        raise SystemExit("THREE_REPORTS_REQUIRED")
    observed = {}
    for name in ("performance", "accessibility", "best-practices", "seo"):
        observed[name] = statistics.median(report["categories"][name]["score"] for report in reports)
    for name in ("largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time"):
        observed[name] = statistics.median(report["audits"][name]["numericValue"] for report in reports)
    observed["consoleErrors"] = sum(len(report["audits"].get("errors-in-console", {}).get("details", {}).get("items", [])) for report in reports)
    failed = [
        name for name in ("performance", "accessibility", "best-practices", "seo")
        if observed[name] < LIMITS[name]
    ] + [
        name for name in ("largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time")
        if observed[name] > LIMITS[name]
    ]
    if observed["consoleErrors"]:
        failed.append("errors-in-console")
    result = {"passed": not failed, "failed": failed, "observed": observed, "limits": LIMITS, "runs": 3}
    print(json.dumps(result, sort_keys=True))
    if failed:
        raise SystemExit("PUBLIC_LIGHTHOUSE_BUDGET_FAILED")
if __name__ == "__main__":
    main()
