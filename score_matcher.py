import json
import os
import sys
from collections import defaultdict
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine_core import ReasonCode

REASON_CODES = [
    ReasonCode.MATCHED.value,
    ReasonCode.MATCHED_WITH_VARIANCE.value,
    ReasonCode.MISSING_IN_RETURNS.value,
    ReasonCode.RATE_MISMATCH.value,
    ReasonCode.HSN_MISMATCH.value,
    ReasonCode.DUPLICATE_ENTRY.value,
    ReasonCode.AMOUNT_MISMATCH.value,
    ReasonCode.UNRESOLVED.value,
]

GROUND_TRUTH_TO_REASON = {
    "matched": ReasonCode.MATCHED.value,
    "rounding_difference": ReasonCode.MATCHED_WITH_VARIANCE.value,
    "missing_row": ReasonCode.MISSING_IN_RETURNS.value,
    "gst_rate_error": ReasonCode.RATE_MISMATCH.value,
    "hsn_discrepancy": ReasonCode.HSN_MISMATCH.value,
    "duplicate_filing": ReasonCode.DUPLICATE_ENTRY.value,
}


def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def map_ground_truth(gt: Dict[str, Any]) -> Dict[str, str]:
    mapped = {}
    for inv_id, data in gt.items():
        status = data.get("status")
        if status == "matched":
            mapped[inv_id] = ReasonCode.MATCHED.value
        elif status == "mismatch":
            mapped[inv_id] = GROUND_TRUTH_TO_REASON.get(data.get("type", ""), ReasonCode.UNRESOLVED.value)
        else:
            mapped[inv_id] = ReasonCode.UNRESOLVED.value
    return mapped


def map_results(res: Dict[str, Any]) -> Dict[str, str]:
    mapped = {}
    for r in res.get("results", []):
        mapped[r["invoice_id"]] = r["reason_code"]
    return mapped


def compute_confusion(expected_map: Dict[str, str], detected_map: Dict[str, str]) -> Dict[str, Dict[str, int]]:
    confusion: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    all_keys = set(expected_map.keys()) | set(detected_map.keys())

    for inv_id in all_keys:
        expected = expected_map.get(inv_id, ReasonCode.UNRESOLVED.value)
        detected = detected_map.get(inv_id, ReasonCode.UNRESOLVED.value)
        confusion[expected][detected] += 1

    return confusion


def compute_metrics(confusion: Dict[str, Dict[str, int]]) -> Dict[str, Any]:
    codes = REASON_CODES
    metrics = {}

    for code in codes:
        tp = confusion.get(code, {}).get(code, 0)
        fp = sum(confusion.get(other, {}).get(code, 0) for other in codes if other != code)
        fn = sum(confusion.get(code, {}).get(other, 0) for other in codes if other != code)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        expected_total = sum(confusion.get(code, {}).values())
        detected_total = sum(confusion.get(other, {}).get(code, 0) for other in codes)

        metrics[code] = {
            "expected": expected_total,
            "detected": detected_total,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "precision": round(precision * 100, 2),
            "recall": round(recall * 100, 2),
            "f1": round(f1 * 100, 2),
        }

    total_tp = sum(m["tp"] for m in metrics.values())
    total_fp = sum(m["fp"] for m in metrics.values())
    total_fn = sum(m["fn"] for m in metrics.values())

    overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    overall_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    overall_f1 = 2 * overall_precision * overall_recall / (overall_precision + overall_recall) if (overall_precision + overall_recall) > 0 else 0.0

    total_entries = sum(sum(v.values()) for v in confusion.values())
    accuracy = total_tp / total_entries if total_entries > 0 else 0.0

    return {
        "overall": {
            "accuracy": round(accuracy * 100, 2),
            "precision": round(overall_precision * 100, 2),
            "recall": round(overall_recall * 100, 2),
            "f1": round(overall_f1 * 100, 2),
        },
        "per_code": metrics,
    }


def print_table(metrics: Dict[str, Any], confusion: Dict[str, Dict[str, int]]):
    print("\n" + "=" * 95)
    print("GROUND TRUTH SCORING & BENCHMARK REPORT")
    print("=" * 95)

    print("\nOverall Metrics:")
    print(f"  Accuracy : {metrics['overall']['accuracy']:.2f}%")
    print(f"  Precision: {metrics['overall']['precision']:.2f}%")
    print(f"  Recall   : {metrics['overall']['recall']:.2f}%")
    print(f"  F1-Score : {metrics['overall']['f1']:.2f}%")

    print("\n" + "-" * 95)
    header = f"{'Reason Code':<24} | {'Expected':>8} | {'Detected':>8} | {'Precision':>10} | {'Recall':>10} | {'F1-Score':>10}"
    print(header)
    print("-" * 95)

    for code in REASON_CODES:
        m = metrics["per_code"][code]
        if m["expected"] == 0 and m["detected"] == 0:
            continue
        print(f"{code:<24} | {m['expected']:>8} | {m['detected']:>8} | {m['precision']:>9.2f}% | {m['recall']:>9.2f}% | {m['f1']:>9.2f}%")

    print("-" * 95)

    print("\nConfusion Matrix (Expected vs Detected):")
    print("-" * 95)

    codes_with_data = [
        c for c in REASON_CODES
        if metrics["per_code"][c]["expected"] > 0 or metrics["per_code"][c]["detected"] > 0
    ]
    col_header = f"{'':<24} " + " ".join(f"{c[:8]:>10}" for c in codes_with_data)
    print(col_header)

    for exp_code in codes_with_data:
        row = f"{exp_code:<24}"
        for det_code in codes_with_data:
            val = confusion.get(exp_code, {}).get(det_code, 0)
            row += f" {val:>10}"
        print(row)

    print("-" * 95)


def main():
    if not os.path.exists("ground_truth.json") or not os.path.exists("results.json"):
        print("Error: ground_truth.json or results.json not found.")
        return

    gt = load_json("ground_truth.json")
    res = load_json("results.json")

    expected_map = map_ground_truth(gt)
    detected_map = map_results(res)

    confusion = compute_confusion(expected_map, detected_map)
    metrics = compute_metrics(confusion)

    print_table(metrics, confusion)

    with open("scoring_report.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\nDetailed report saved to scoring_report.json")


if __name__ == "__main__":
    main()