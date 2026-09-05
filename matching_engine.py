import csv
import json
import os
import sys
from typing import List, Dict, Any

# Ensure current directory is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine_core import (
    ReasonCode,
    ConfidenceLevel,
    reconcile_records,
    compute_stats,
    DEFAULT_VARIANCE_TOLERANCE,
)


def load_csv(path: str) -> List[Dict[str, Any]]:
    """Loads a CSV file into a list of dictionaries."""
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def reconcile(invoices: List[Dict[str, Any]], returns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Backward-compatible entry point for reconciliation."""
    return reconcile_records(invoices, returns, DEFAULT_VARIANCE_TOLERANCE)


def main():
    invoices_path = "invoices.csv"
    returns_path = "gst_returns.csv"

    if not os.path.exists(invoices_path) or not os.path.exists(returns_path):
        print("Error: CSV files (invoices.csv, gst_returns.csv) not found.")
        return

    invoices = load_csv(invoices_path)
    returns = load_csv(returns_path)

    results = reconcile(invoices, returns)
    stats = compute_stats(results)

    output = {"stats": stats, "results": results}
    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("=" * 60)
    print(f"RECONCILIATION COMPLETE: {stats['total']} records processed.")
    print(f"Match Rate       : {stats['match_rate']}%")
    print(f"Matched Total    : {stats['matched']}")
    print("-" * 60)
    print("Breakdown by Reason Code:")
    for code, count in sorted(stats["breakdown"].items()):
        print(f"  - {code:<25}: {count}")
    print("-" * 60)
    print("Breakdown by Confidence Level:")
    for conf, count in sorted(stats["confidence_breakdown"].items()):
        print(f"  - {conf:<10}: {count}")
    print("=" * 60)
    print("Results written to results.json")


if __name__ == "__main__":
    main()
