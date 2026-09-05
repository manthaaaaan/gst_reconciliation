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
    "amount_mismatch": ReasonCode.AMOUNT_MISMATCH.value,
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
    metrics = {
        "overall": {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0},
        "per_code": {}
    }

    total_correct = 0
    total_samples = 0

    precisions = []
    recalls = []
    f1s = []

    for code in codes:
        tp = confusion[code][code]
        fp = sum(confusion[c][code] for c in codes if c != code)
        fn = sum(confusion[code][c] for c in codes if c != code)
        total_samples += sum(confusion[code].values())
        total_correct += tp

        prec = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else 0.0
        rec = (tp / (tp + fn) * 100.0) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        expected_count = sum(confusion[code].values())
        detected_count = sum(confusion[c][code] for c in codes)

        if expected_count > 0:
            precisions.append(prec)
            recalls.append(rec)
            f1s.append(f1)

        metrics["per_code"][code] = {
            "expected": expected_count,
            "detected": detected_count,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "precision": round(prec, 2),
            "recall": round(rec, 2),
            "f1": round(f1, 2)
        }

    macro_prec = sum(precisions) / len(precisions) if precisions else 0.0
    macro_rec = sum(recalls) / len(recalls) if recalls else 0.0
    macro_f1 = sum(f1s) / len(f1s) if f1s else 0.0
    acc = (total_correct / total_samples * 100.0) if total_samples > 0 else 0.0

    metrics["overall"] = {
        "accuracy": round(acc, 2),
        "precision": round(macro_prec, 2),
        "recall": round(macro_rec, 2),
        "f1": round(macro_f1, 2)
    }

    return metrics


def print_table(metrics: Dict[str, Any], confusion: Dict[str, Dict[str, int]], title: str = "GROUND TRUTH SCORING & BENCHMARK REPORT"):
    print("\n" + "=" * 95)
    print(title)
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
    if "--edge-cases" in sys.argv:
        gt_path = "edge_cases_ground_truth.json"
        res_path = "edge_cases_results.json"
        report_path = "edge_cases_scoring_report.json"
        title = "ADVERSARIAL EDGE-CASE BENCHMARK REPORT"
    else:
        gt_path = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "ground_truth.json"
        res_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "results.json"
        report_path = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else "scoring_report.json"
        title = "GROUND TRUTH SCORING & BENCHMARK REPORT"

    if not os.path.exists(gt_path) or not os.path.exists(res_path):
        print(f"Error: {gt_path} or {res_path} not found.")
        return

    gt = load_json(gt_path)
    res = load_json(res_path)

    expected_map = map_ground_truth(gt)
    detected_map = map_results(res)

    confusion = compute_confusion(expected_map, detected_map)
    metrics = compute_metrics(confusion)

    print_table(metrics, confusion, title=title)

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nDetailed report saved to {report_path}")


if __name__ == "__main__":
    main()