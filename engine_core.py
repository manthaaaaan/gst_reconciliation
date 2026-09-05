"""
Core GST Reconciliation and Tax Exception Engine.
Provides high-precision financial arithmetic (via Decimal), rule-based classification,
fuzzy fallback matching, confidence scoring, and dataset statistics.
"""

from decimal import Decimal, InvalidOperation
from enum import Enum
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional, Set


class ReasonCode(str, Enum):
    MATCHED = "MATCHED"
    MATCHED_WITH_VARIANCE = "MATCHED_WITH_VARIANCE"
    MISSING_IN_RETURNS = "MISSING_IN_RETURNS"
    RATE_MISMATCH = "RATE_MISMATCH"
    HSN_MISMATCH = "HSN_MISMATCH"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    UNRESOLVED = "UNRESOLVED"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


DEFAULT_VARIANCE_TOLERANCE = Decimal("5.00")


def to_decimal(val: Any) -> Optional[Decimal]:
    """Safely convert any numeric / string input to Decimal."""
    if val is None or val == "":
        return None
    try:
        return Decimal(str(val).strip())
    except (InvalidOperation, TypeError, ValueError):
        return None


def within_tolerance(a: Any, b: Any, tolerance: Decimal = DEFAULT_VARIANCE_TOLERANCE) -> bool:
    """Check if two amounts are within financial variance tolerance."""
    dec_a = to_decimal(a)
    dec_b = to_decimal(b)
    if dec_a is None or dec_b is None:
        return False
    return abs(dec_a - dec_b) <= tolerance


def exact_match_fields(inv: Dict[str, Any], ret: Dict[str, Any]) -> bool:
    """Check whether all primary audit fields match identically."""
    return (
        str(inv.get("hsn_code", "")).strip() == str(ret.get("hsn_code", "")).strip()
        and str(inv.get("gst_rate", "")).strip() == str(ret.get("gst_rate", "")).strip()
        and to_decimal(inv.get("taxable_amount")) == to_decimal(ret.get("taxable_amount"))
        and to_decimal(inv.get("gst_amount")) == to_decimal(ret.get("gst_amount"))
    )


def compute_confidence(reason_code: ReasonCode, metadata: Dict[str, Any]) -> ConfidenceLevel:
    """
    Computes confidence score:
    - HIGH: Exact match on all fields
    - MEDIUM: Matched within tolerance (variance < ₹2.00) or fuzzy matched on strong keys
    - LOW: Flagged exception or higher variance requiring manual audit
    """
    if reason_code == ReasonCode.MATCHED:
        return ConfidenceLevel.HIGH

    if reason_code == ReasonCode.MATCHED_WITH_VARIANCE:
        variances = metadata.get("variances", [])
        # If variance is very small (<= ₹1.00), confidence is MEDIUM
        max_delta = max((abs(v.get("delta", 0)) for v in variances), default=0)
        if max_delta <= 1.0:
            return ConfidenceLevel.MEDIUM
        return ConfidenceLevel.LOW

    return ConfidenceLevel.LOW


def classify_match(
    inv: Dict[str, Any],
    ret: Dict[str, Any],
    tolerance: Decimal = DEFAULT_VARIANCE_TOLERANCE
) -> Tuple[ReasonCode, Dict[str, Any]]:
    """
    Compares an invoice row against a GST return row and classifies the match status.
    """
    hsn_match = str(inv.get("hsn_code", "")).strip() == str(ret.get("hsn_code", "")).strip()
    rate_match = str(inv.get("gst_rate", "")).strip() == str(ret.get("gst_rate", "")).strip()

    inv_ta = to_decimal(inv.get("taxable_amount"))
    ret_ta = to_decimal(ret.get("taxable_amount"))
    inv_ga = to_decimal(inv.get("gst_amount"))
    ret_ga = to_decimal(ret.get("gst_amount"))

    ta_exact = inv_ta == ret_ta and inv_ta is not None
    ga_exact = inv_ga == ret_ga and inv_ga is not None

    if exact_match_fields(inv, ret):
        return ReasonCode.MATCHED, {}

    if not rate_match:
        return ReasonCode.RATE_MISMATCH, {
            "expected_gst_rate": inv.get("gst_rate"),
            "returned_gst_rate": ret.get("gst_rate"),
        }

    if not hsn_match:
        return ReasonCode.HSN_MISMATCH, {
            "expected_hsn": inv.get("hsn_code"),
            "returned_hsn": ret.get("hsn_code"),
        }

    ta_within = within_tolerance(inv_ta, ret_ta, tolerance)
    ga_within = within_tolerance(inv_ga, ret_ga, tolerance)

    if (ta_exact or ta_within) and (ga_exact or ga_within):
        variances = []
        if not ta_exact and ta_within and inv_ta is not None and ret_ta is not None:
            delta = float(ret_ta - inv_ta)
            variances.append({
                "field": "taxable_amount",
                "expected": float(inv_ta),
                "returned": float(ret_ta),
                "delta": round(delta, 2),
            })
        if not ga_exact and ga_within and inv_ga is not None and ret_ga is not None:
            delta = float(ret_ga - inv_ga)
            variances.append({
                "field": "gst_amount",
                "expected": float(inv_ga),
                "returned": float(ret_ga),
                "delta": round(delta, 2),
            })
        return ReasonCode.MATCHED_WITH_VARIANCE, {"variances": variances}

    return ReasonCode.AMOUNT_MISMATCH, {
        "expected_taxable": inv.get("taxable_amount"),
        "returned_taxable": ret.get("taxable_amount"),
        "expected_gst": inv.get("gst_amount"),
        "returned_gst": ret.get("gst_amount"),
    }


def find_duplicates(rows: List[Dict[str, Any]]) -> Set[str]:
    """Finds invoice_ids that appear more than once in a list of rows."""
    seen: Dict[str, int] = defaultdict(int)
    for r in rows:
        inv_id = str(r.get("invoice_id", "")).strip()
        if inv_id:
            seen[inv_id] += 1
    return {k for k, v in seen.items() if v > 1}


def fuzzy_fallback(
    inv: Dict[str, Any],
    returns_by_key: Dict[Tuple[str, str], List[Dict[str, Any]]],
    tolerance: Decimal = DEFAULT_VARIANCE_TOLERANCE
) -> Optional[Dict[str, Any]]:
    """Fallback fuzzy match on (vendor_id, date) within taxable_amount tolerance."""
    key = (str(inv.get("vendor_id", "")).strip(), str(inv.get("date", "")).strip())
    candidates = returns_by_key.get(key, [])
    for ret in candidates:
        if within_tolerance(inv.get("taxable_amount"), ret.get("taxable_amount"), tolerance):
            return ret
    return None


def reconcile_records(
    invoices: List[Dict[str, Any]],
    returns: List[Dict[str, Any]],
    tolerance: Decimal = DEFAULT_VARIANCE_TOLERANCE
) -> List[Dict[str, Any]]:
    """
    Executes full reconciliation pipeline over invoices and return records.
    Uses deterministic indexing rather than memory ids.
    """
    # Assign deterministic index to return rows
    indexed_returns = [
        {"_idx": idx, **row} for idx, row in enumerate(returns)
    ]

    duplicate_ids = find_duplicates(indexed_returns)

    returns_by_id: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in indexed_returns:
        inv_id = str(r.get("invoice_id", "")).strip()
        if inv_id:
            returns_by_id[inv_id].append(r)

    returns_by_key: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
    for r in indexed_returns:
        v_key = (str(r.get("vendor_id", "")).strip(), str(r.get("date", "")).strip())
        returns_by_key[v_key].append(r)

    matched_return_indices: Set[int] = set()
    results: List[Dict[str, Any]] = []

    for inv in invoices:
        inv_id = str(inv.get("invoice_id", "")).strip()
        rets = returns_by_id.get(inv_id, [])

        if inv_id in duplicate_ids:
            code = ReasonCode.DUPLICATE_ENTRY
            meta = {"occurrences": len(rets)}
            confidence = compute_confidence(code, meta)
            clean_ret = {k: v for k, v in rets[0].items() if k != "_idx"} if rets else None
            results.append({
                "invoice_id": inv_id,
                "reason_code": code.value,
                "confidence": confidence.value,
                "metadata": meta,
                "invoice_data": dict(inv),
                "return_data": clean_ret,
            })
            for r in rets:
                matched_return_indices.add(r["_idx"])
            continue

        if not rets:
            fb = fuzzy_fallback(inv, returns_by_key, tolerance)
            if fb and fb["_idx"] not in matched_return_indices:
                code, meta = classify_match(inv, fb, tolerance)
                if code == ReasonCode.MATCHED:
                    code = ReasonCode.MATCHED_WITH_VARIANCE
                    meta = {"variances": [{"field": "vendor_id", "note": "fuzzy matched on vendor+date+amount"}]}
                confidence = compute_confidence(code, meta)
                clean_fb = {k: v for k, v in fb.items() if k != "_idx"}
                results.append({
                    "invoice_id": inv_id,
                    "reason_code": code.value,
                    "confidence": confidence.value,
                    "metadata": meta,
                    "invoice_data": dict(inv),
                    "return_data": clean_fb,
                })
                matched_return_indices.add(fb["_idx"])
            else:
                code = ReasonCode.MISSING_IN_RETURNS
                meta = {}
                confidence = compute_confidence(code, meta)
                results.append({
                    "invoice_id": inv_id,
                    "reason_code": code.value,
                    "confidence": confidence.value,
                    "metadata": meta,
                    "invoice_data": dict(inv),
                    "return_data": None,
                })
            continue

        ret = rets[0]
        matched_return_indices.add(ret["_idx"])
        code, meta = classify_match(inv, ret, tolerance)
        confidence = compute_confidence(code, meta)
        clean_ret = {k: v for k, v in ret.items() if k != "_idx"}
        results.append({
            "invoice_id": inv_id,
            "reason_code": code.value,
            "confidence": confidence.value,
            "metadata": meta,
            "invoice_data": dict(inv),
            "return_data": clean_ret,
        })

    # Unmatched Return Rows (Missing corresponding internal invoice)
    unmatched_returns = [
        r for r in indexed_returns if r["_idx"] not in matched_return_indices
    ]
    for r in unmatched_returns:
        code = ReasonCode.UNRESOLVED
        meta = {"note": "return row with no matching invoice"}
        confidence = compute_confidence(code, meta)
        clean_r = {k: v for k, v in r.items() if k != "_idx"}
        results.append({
            "invoice_id": clean_r.get("invoice_id", "UNKNOWN"),
            "reason_code": code.value,
            "confidence": confidence.value,
            "metadata": meta,
            "invoice_data": None,
            "return_data": clean_r,
        })

    return results


def compute_stats(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates overall aggregate reconciliation summary and breakdown metrics."""
    total = len(results)
    counts: Dict[str, int] = defaultdict(int)
    conf_counts: Dict[str, int] = defaultdict(int)

    for r in results:
        counts[r["reason_code"]] += 1
        conf_counts[r.get("confidence", ConfidenceLevel.LOW.value)] += 1

    matched = counts.get(ReasonCode.MATCHED.value, 0) + counts.get(ReasonCode.MATCHED_WITH_VARIANCE.value, 0)
    match_rate = round(matched / total * 100, 2) if total else 0.0

    return {
        "total": total,
        "matched": matched,
        "match_rate": match_rate,
        "breakdown": dict(counts),
        "confidence_breakdown": dict(conf_counts),
    }
