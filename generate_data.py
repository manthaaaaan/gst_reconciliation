import pandas as pd
import random
import json
from datetime import datetime, timedelta

random.seed(42)

VENDORS = [f"V{str(i).zfill(3)}" for i in range(1, 11)]
HSN_CODES = [8471, 8473, 8517, 8528, 8504, 8507, 8419, 8421, 9018, 9027]
GST_RATES = [5, 12, 18, 28]


def generate_invoice(inv_id, date):
    hsn = random.choice(HSN_CODES)
    gst_rate = random.choice(GST_RATES)
    taxable_amount = round(random.uniform(1000, 100000), 2)
    gst_amount = round(taxable_amount * gst_rate / 100, 2)
    vendor = random.choice(VENDORS)
    return {
        "invoice_id": inv_id,
        "date": date.strftime("%Y-%m-%d"),
        "hsn_code": hsn,
        "taxable_amount": taxable_amount,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "vendor_id": vendor
    }


def generate_main_dataset():
    invoices = []
    base_date = datetime(2024, 4, 1)
    for i in range(1, 61):
        inv_date = base_date + timedelta(days=random.randint(0, 90))
        invoices.append(generate_invoice(f"INV{str(i).zfill(5)}", inv_date))

    returns = []
    ground_truth = {}

    mismatch_invoice_ids = random.sample(range(1, 61), 15)
    mismatch_invoice_ids.sort()

    mismatch_types = [
        "missing_row",
        "rounding_diff",
        "hsn_discrepancy",
        "gst_rate_error",
        "duplicate_filing"
    ]

    for i, inv in enumerate(invoices):
        inv_id = inv["invoice_id"]
        inv_num = int(inv_id.replace("INV", ""))
        
        if inv_num in mismatch_invoice_ids:
            mismatch_type = mismatch_types[i % len(mismatch_types)]
            
            if mismatch_type == "missing_row":
                ground_truth[inv_id] = {
                    "status": "mismatch",
                    "type": "missing_row",
                    "expected_exception": "MISSING_IN_RETURN"
                }
                continue
            
            elif mismatch_type == "rounding_diff":
                ret_row = inv.copy()
                field = random.choice(["taxable_amount", "gst_amount"])
                diff = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
                ret_row[field] = round(ret_row[field] + diff, 2)
                ret_row["original_value"] = inv[field]
                ret_row["difference"] = diff
                ground_truth[inv_id] = {
                    "status": "mismatch",
                    "type": "rounding_difference",
                    "field": field,
                    "difference": diff,
                    "expected_exception": "ROUNDING_DIFF"
                }
                returns.append(ret_row)
            
            elif mismatch_type == "hsn_discrepancy":
                ret_row = inv.copy()
                wrong_hsn = random.choice([h for h in HSN_CODES if h != inv["hsn_code"]])
                ret_row["hsn_code"] = wrong_hsn
                ret_row["original_hsn"] = inv["hsn_code"]
                ground_truth[inv_id] = {
                    "status": "mismatch",
                    "type": "hsn_discrepancy",
                    "original_hsn": inv["hsn_code"],
                    "returned_hsn": wrong_hsn,
                    "expected_exception": "HSN_MISMATCH"
                }
                returns.append(ret_row)
            
            elif mismatch_type == "gst_rate_error":
                ret_row = inv.copy()
                wrong_rate = random.choice([r for r in GST_RATES if r != inv["gst_rate"]])
                ret_row["gst_rate"] = wrong_rate
                ret_row["original_gst_rate"] = inv["gst_rate"]
                ret_row["gst_amount"] = round(ret_row["taxable_amount"] * wrong_rate / 100, 2)
                ground_truth[inv_id] = {
                    "status": "mismatch",
                    "type": "gst_rate_error",
                    "original_rate": inv["gst_rate"],
                    "returned_rate": wrong_rate,
                    "expected_exception": "GST_RATE_MISMATCH"
                }
                returns.append(ret_row)
            
            elif mismatch_type == "duplicate_filing":
                ret_row1 = inv.copy()
                ret_row2 = inv.copy()
                ret_row2["taxable_amount"] = round(ret_row2["taxable_amount"] + 0.01, 2)
                returns.append(ret_row1)
                returns.append(ret_row2)
                ground_truth[inv_id] = {
                    "status": "mismatch",
                    "type": "duplicate_filing",
                    "occurrences": 2,
                    "expected_exception": "DUPLICATE_IN_RETURN"
                }
        else:
            ground_truth[inv_id] = {
                "status": "matched",
                "type": None,
                "expected_exception": None
            }
            returns.append(inv.copy())

    random.shuffle(returns)

    df_invoices = pd.DataFrame(invoices)
    df_returns = pd.DataFrame(returns)

    df_invoices.to_csv("invoices.csv", index=False)
    df_returns.to_csv("gst_returns.csv", index=False)

    with open("ground_truth.json", "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    print("=" * 60)
    print("MAIN SYNTHETIC DATASET GENERATION COMPLETE")
    print("=" * 60)
    print(f"  - invoices.csv     : {len(df_invoices)} rows")
    print(f"  - gst_returns.csv  : {len(df_returns)} rows")
    print(f"  - ground_truth.json: {len(ground_truth)} entries")


def generate_adversarial_dataset():
    """
    Generates a challenging 24-row adversarial test suite to stress-test:
    1. Exact tolerance boundaries (₹5.00 vs ₹5.01)
    2. Negative tolerance boundaries (-₹5.00 vs -₹5.01)
    3. Visually similar vendor IDs in fallback logic (V001 vs V010)
    4. Off-by-one digit HSN code typos
    5. Broken 1:N split settlement line items
    6. Return filed 1 day outside date window
    7. Multi-field compound anomalies (Rate + HSN simultaneously)
    8. 1-paisa rounding nuances
    """
    edge_invoices = [
        # --- Boundary Condition 1: Exact +₹5.00 tolerance (Expected: MATCHED_WITH_VARIANCE) ---
        {
            "invoice_id": "EDGE001",
            "date": "2024-05-01",
            "hsn_code": 8471,
            "taxable_amount": 10000.00,
            "gst_rate": 18,
            "gst_amount": 1800.00,
            "vendor_id": "V001",
        },
        # --- Boundary Condition 2: Over tolerance +₹5.01 (Expected: AMOUNT_MISMATCH) ---
        {
            "invoice_id": "EDGE002",
            "date": "2024-05-02",
            "hsn_code": 8471,
            "taxable_amount": 10000.00,
            "gst_rate": 18,
            "gst_amount": 1800.00,
            "vendor_id": "V001",
        },
        # --- Boundary Condition 3: Exact -₹5.00 tolerance (Expected: MATCHED_WITH_VARIANCE) ---
        {
            "invoice_id": "EDGE003",
            "date": "2024-05-03",
            "hsn_code": 8471,
            "taxable_amount": 20000.00,
            "gst_rate": 18,
            "gst_amount": 3600.00,
            "vendor_id": "V002",
        },
        # --- Boundary Condition 4: Over negative tolerance -₹5.01 (Expected: AMOUNT_MISMATCH) ---
        {
            "invoice_id": "EDGE004",
            "date": "2024-05-04",
            "hsn_code": 8471,
            "taxable_amount": 20000.00,
            "gst_rate": 18,
            "gst_amount": 3600.00,
            "vendor_id": "V002",
        },
        # --- Adversarial 5: Visually similar vendor ID (V001 filed as V010) on fuzzy fallback ---
        {
            "invoice_id": "EDGE005_INV",
            "date": "2024-05-05",
            "hsn_code": 8471,
            "taxable_amount": 15000.00,
            "gst_rate": 18,
            "gst_amount": 2700.00,
            "vendor_id": "V001",
        },
        # --- Adversarial 6: HSN code typo by one digit (8471 vs 8472) ---
        {
            "invoice_id": "EDGE006",
            "date": "2024-05-06",
            "hsn_code": 8471,
            "taxable_amount": 12000.00,
            "gst_rate": 18,
            "gst_amount": 2160.00,
            "vendor_id": "V003",
        },
        # --- Adversarial 7: HSN code typo by one digit (8504 vs 8507) ---
        {
            "invoice_id": "EDGE007",
            "date": "2024-05-07",
            "hsn_code": 8504,
            "taxable_amount": 18000.00,
            "gst_rate": 18,
            "gst_amount": 3240.00,
            "vendor_id": "V004",
        },
        # --- Adversarial 8: Rate Mismatch (18% vs 28%) ---
        {
            "invoice_id": "EDGE008",
            "date": "2024-05-08",
            "hsn_code": 8471,
            "taxable_amount": 10000.00,
            "gst_rate": 18,
            "gst_amount": 1800.00,
            "vendor_id": "V005",
        },
        # --- Adversarial 9: 1:N split missing second half item (sum defective by ₹25,000) ---
        {
            "invoice_id": "EDGE009",
            "date": "2024-05-09",
            "hsn_code": 8471,
            "taxable_amount": 50000.00,
            "gst_rate": 18,
            "gst_amount": 9000.00,
            "vendor_id": "V006",
        },
        # --- Adversarial 10: Date off by 1 day on fallback lookup (2024-05-10 vs 2024-05-11) ---
        {
            "invoice_id": "EDGE010_INV",
            "date": "2024-05-10",
            "hsn_code": 8471,
            "taxable_amount": 35000.00,
            "gst_rate": 18,
            "gst_amount": 6300.00,
            "vendor_id": "V007",
        },
        # --- Adversarial 11: Duplicate filing in returns (exact double filing) ---
        {
            "invoice_id": "EDGE011",
            "date": "2024-05-11",
            "hsn_code": 8471,
            "taxable_amount": 22000.00,
            "gst_rate": 18,
            "gst_amount": 3960.00,
            "vendor_id": "V008",
        },
        # --- Adversarial 12: Duplicate filing with slight variance (+0.05) ---
        {
            "invoice_id": "EDGE012",
            "date": "2024-05-12",
            "hsn_code": 8471,
            "taxable_amount": 45000.00,
            "gst_rate": 18,
            "gst_amount": 8100.00,
            "vendor_id": "V009",
        },
        # --- Adversarial 13: 1 paisa rounding edge case ---
        {
            "invoice_id": "EDGE013",
            "date": "2024-05-13",
            "hsn_code": 8471,
            "taxable_amount": 3333.33,
            "gst_rate": 18,
            "gst_amount": 600.00,
            "vendor_id": "V010",
        },
        # --- Adversarial 14: Pure ghost invoice (absent in returns) ---
        {
            "invoice_id": "EDGE014",
            "date": "2024-05-14",
            "hsn_code": 8471,
            "taxable_amount": 14000.00,
            "gst_rate": 18,
            "gst_amount": 2520.00,
            "vendor_id": "V001",
        },
        # --- Adversarial 15: Exact match baseline control ---
        {
            "invoice_id": "EDGE015",
            "date": "2024-05-15",
            "hsn_code": 8471,
            "taxable_amount": 8000.00,
            "gst_rate": 18,
            "gst_amount": 1440.00,
            "vendor_id": "V002",
        },
        # --- Adversarial 16: Compound multi-field error (Rate 12% + HSN 9018) ---
        {
            "invoice_id": "EDGE016",
            "date": "2024-05-16",
            "hsn_code": 8471,
            "taxable_amount": 16000.00,
            "gst_rate": 18,
            "gst_amount": 2880.00,
            "vendor_id": "V003",
        },
        # --- Adversarial 17: Case variance in ID string (EDGE017 vs edge017) ---
        {
            "invoice_id": "EDGE017",
            "date": "2024-05-17",
            "hsn_code": 8471,
            "taxable_amount": 27000.00,
            "gst_rate": 18,
            "gst_amount": 4860.00,
            "vendor_id": "V004",
        },
        # --- Adversarial 18: Major amount mismatch ---
        {
            "invoice_id": "EDGE018",
            "date": "2024-05-18",
            "hsn_code": 8471,
            "taxable_amount": 50000.00,
            "gst_rate": 18,
            "gst_amount": 9000.00,
            "vendor_id": "V005",
        },
        # --- Adversarial 19: Pure ghost invoice 2 ---
        {
            "invoice_id": "EDGE019",
            "date": "2024-05-19",
            "hsn_code": 8471,
            "taxable_amount": 31000.00,
            "gst_rate": 18,
            "gst_amount": 5580.00,
            "vendor_id": "V006",
        },
        # --- Adversarial 20: Exact match baseline control 2 ---
        {
            "invoice_id": "EDGE020",
            "date": "2024-05-20",
            "hsn_code": 8471,
            "taxable_amount": 42000.00,
            "gst_rate": 18,
            "gst_amount": 7560.00,
            "vendor_id": "V007",
        },
        # --- Adversarial 21: High value micro-variance (₹1,000,000 with +₹4.90 diff) ---
        {
            "invoice_id": "EDGE021",
            "date": "2024-05-21",
            "hsn_code": 8471,
            "taxable_amount": 1000000.00,
            "gst_rate": 18,
            "gst_amount": 180000.00,
            "vendor_id": "V008",
        },
        # --- Adversarial 22: High value excessive variance (₹1,000,000 with +₹10.00 diff) ---
        {
            "invoice_id": "EDGE022",
            "date": "2024-05-22",
            "hsn_code": 8471,
            "taxable_amount": 1000000.00,
            "gst_rate": 18,
            "gst_amount": 180000.00,
            "vendor_id": "V008",
        },
        # --- Adversarial 23: Visually similar vendor typo V008 vs V080 on fuzzy ---
        {
            "invoice_id": "EDGE023_INV",
            "date": "2024-05-23",
            "hsn_code": 8471,
            "taxable_amount": 28000.00,
            "gst_rate": 18,
            "gst_amount": 5040.00,
            "vendor_id": "V008",
        },
        # --- Adversarial 24: Exact match baseline control 3 ---
        {
            "invoice_id": "EDGE024",
            "date": "2024-05-24",
            "hsn_code": 8471,
            "taxable_amount": 64000.00,
            "gst_rate": 18,
            "gst_amount": 11520.00,
            "vendor_id": "V009",
        },
    ]

    edge_returns = [
        # Return 1: +5.00 variance
        {"invoice_id": "EDGE001", "date": "2024-05-01", "hsn_code": 8471, "taxable_amount": 10005.00, "gst_rate": 18, "gst_amount": 1800.90, "vendor_id": "V001"},
        # Return 2: +5.01 variance (over 5.00 limit)
        {"invoice_id": "EDGE002", "date": "2024-05-02", "hsn_code": 8471, "taxable_amount": 10005.01, "gst_rate": 18, "gst_amount": 1800.90, "vendor_id": "V001"},
        # Return 3: -5.00 variance
        {"invoice_id": "EDGE003", "date": "2024-05-03", "hsn_code": 8471, "taxable_amount": 19995.00, "gst_rate": 18, "gst_amount": 3599.10, "vendor_id": "V002"},
        # Return 4: -5.01 variance (over 5.00 limit)
        {"invoice_id": "EDGE004", "date": "2024-05-04", "hsn_code": 8471, "taxable_amount": 19994.99, "gst_rate": 18, "gst_amount": 3599.10, "vendor_id": "V002"},
        # Return 5: Return filed under V010 instead of V001
        {"invoice_id": "EDGE005_RET", "date": "2024-05-05", "hsn_code": 8471, "taxable_amount": 15000.00, "gst_rate": 18, "gst_amount": 2700.00, "vendor_id": "V010"},
        # Return 6: HSN typo 8472
        {"invoice_id": "EDGE006", "date": "2024-05-06", "hsn_code": 8472, "taxable_amount": 12000.00, "gst_rate": 18, "gst_amount": 2160.00, "vendor_id": "V003"},
        # Return 7: HSN typo 8507
        {"invoice_id": "EDGE007", "date": "2024-05-07", "hsn_code": 8507, "taxable_amount": 18000.00, "gst_rate": 18, "gst_amount": 3240.00, "vendor_id": "V004"},
        # Return 8: Rate error 28%
        {"invoice_id": "EDGE008", "date": "2024-05-08", "hsn_code": 8471, "taxable_amount": 10000.00, "gst_rate": 28, "gst_amount": 2800.00, "vendor_id": "V005"},
        # Return 9: Defective split line
        {"invoice_id": "EDGE009", "date": "2024-05-09", "hsn_code": 8471, "taxable_amount": 25000.00, "gst_rate": 18, "gst_amount": 4500.00, "vendor_id": "V006"},
        # Return 10: Date off by 1 day
        {"invoice_id": "EDGE010_RET", "date": "2024-05-11", "hsn_code": 8471, "taxable_amount": 35000.00, "gst_rate": 18, "gst_amount": 6300.00, "vendor_id": "V007"},
        # Return 11: Duplicates (2 identical rows)
        {"invoice_id": "EDGE011", "date": "2024-05-11", "hsn_code": 8471, "taxable_amount": 22000.00, "gst_rate": 18, "gst_amount": 3960.00, "vendor_id": "V008"},
        {"invoice_id": "EDGE011", "date": "2024-05-11", "hsn_code": 8471, "taxable_amount": 22000.00, "gst_rate": 18, "gst_amount": 3960.00, "vendor_id": "V008"},
        # Return 12: Duplicates with 5 paisa variance
        {"invoice_id": "EDGE012", "date": "2024-05-12", "hsn_code": 8471, "taxable_amount": 45000.00, "gst_rate": 18, "gst_amount": 8100.00, "vendor_id": "V009"},
        {"invoice_id": "EDGE012", "date": "2024-05-12", "hsn_code": 8471, "taxable_amount": 45000.05, "gst_rate": 18, "gst_amount": 8100.01, "vendor_id": "V009"},
        # Return 13: 1 paisa rounding
        {"invoice_id": "EDGE013", "date": "2024-05-13", "hsn_code": 8471, "taxable_amount": 3333.33, "gst_rate": 18, "gst_amount": 599.99, "vendor_id": "V010"},
        # Return 15: Exact match control
        {"invoice_id": "EDGE015", "date": "2024-05-15", "hsn_code": 8471, "taxable_amount": 8000.00, "gst_rate": 18, "gst_amount": 1440.00, "vendor_id": "V002"},
        # Return 16: Compound Rate + HSN error
        {"invoice_id": "EDGE016", "date": "2024-05-16", "hsn_code": 9018, "taxable_amount": 16000.00, "gst_rate": 12, "gst_amount": 1920.00, "vendor_id": "V003"},
        # Return 17: Case difference in ID
        {"invoice_id": "edge017", "date": "2024-05-17", "hsn_code": 8471, "taxable_amount": 27000.00, "gst_rate": 18, "gst_amount": 4860.00, "vendor_id": "V004"},
        # Return 18: Large amount mismatch
        {"invoice_id": "EDGE018", "date": "2024-05-18", "hsn_code": 8471, "taxable_amount": 48000.00, "gst_rate": 18, "gst_amount": 8640.00, "vendor_id": "V005"},
        # Return 20: Exact match control 2
        {"invoice_id": "EDGE020", "date": "2024-05-20", "hsn_code": 8471, "taxable_amount": 42000.00, "gst_rate": 18, "gst_amount": 7560.00, "vendor_id": "V007"},
        # Return 21: High value micro-variance +4.90
        {"invoice_id": "EDGE021", "date": "2024-05-21", "hsn_code": 8471, "taxable_amount": 1000004.90, "gst_rate": 18, "gst_amount": 180000.88, "vendor_id": "V008"},
        # Return 22: High value excessive variance +10.00
        {"invoice_id": "EDGE022", "date": "2024-05-22", "hsn_code": 8471, "taxable_amount": 1000010.00, "gst_rate": 18, "gst_amount": 180001.80, "vendor_id": "V008"},
        # Return 23: Typos in vendor ID V080
        {"invoice_id": "EDGE023_RET", "date": "2024-05-23", "hsn_code": 8471, "taxable_amount": 28000.00, "gst_rate": 18, "gst_amount": 5040.00, "vendor_id": "V080"},
        # Return 24: Exact match control 3
        {"invoice_id": "EDGE024", "date": "2024-05-24", "hsn_code": 8471, "taxable_amount": 64000.00, "gst_rate": 18, "gst_amount": 11520.00, "vendor_id": "V009"},
    ]

    edge_ground_truth = {
        "EDGE001": {"status": "mismatch", "type": "rounding_difference", "expected_exception": "ROUNDING_DIFF", "note": "Exact +₹5.00 tolerance"},
        "EDGE002": {"status": "mismatch", "type": "amount_mismatch", "expected_exception": "AMOUNT_MISMATCH", "note": "Exceeds ₹5.00 tolerance by +1 paisa"},
        "EDGE003": {"status": "mismatch", "type": "rounding_difference", "expected_exception": "ROUNDING_DIFF", "note": "Exact -₹5.00 tolerance"},
        "EDGE004": {"status": "mismatch", "type": "amount_mismatch", "expected_exception": "AMOUNT_MISMATCH", "note": "Exceeds ₹5.00 tolerance by -1 paisa"},
        "EDGE005_INV": {"status": "mismatch", "type": "missing_row", "expected_exception": "MISSING_IN_RETURN", "note": "Fuzzy fails due to vendor mismatch V001 vs V010"},
        "EDGE006": {"status": "mismatch", "type": "hsn_discrepancy", "expected_exception": "HSN_MISMATCH", "note": "HSN typo 8471 vs 8472"},
        "EDGE007": {"status": "mismatch", "type": "hsn_discrepancy", "expected_exception": "HSN_MISMATCH", "note": "HSN typo 8504 vs 8507"},
        "EDGE008": {"status": "mismatch", "type": "gst_rate_error", "expected_exception": "GST_RATE_MISMATCH", "note": "Rate 18% vs 28%"},
        "EDGE009": {"status": "mismatch", "type": "amount_mismatch", "expected_exception": "AMOUNT_MISMATCH", "note": "Defective split return (partial item)"},
        "EDGE010_INV": {"status": "mismatch", "type": "missing_row", "expected_exception": "MISSING_IN_RETURN", "note": "Fuzzy fails due to date off by 1 day"},
        "EDGE011": {"status": "mismatch", "type": "duplicate_filing", "expected_exception": "DUPLICATE_IN_RETURN", "note": "Exact duplicate filing"},
        "EDGE012": {"status": "mismatch", "type": "duplicate_filing", "expected_exception": "DUPLICATE_IN_RETURN", "note": "Duplicate filing with 5p variance"},
        "EDGE013": {"status": "mismatch", "type": "rounding_difference", "expected_exception": "ROUNDING_DIFF", "note": "1 paisa GST rounding"},
        "EDGE014": {"status": "mismatch", "type": "missing_row", "expected_exception": "MISSING_IN_RETURN", "note": "Genuine missing return"},
        "EDGE015": {"status": "matched", "type": None, "expected_exception": None, "note": "Exact match control"},
        "EDGE016": {"status": "mismatch", "type": "gst_rate_error", "expected_exception": "GST_RATE_MISMATCH", "note": "Multi-field compound error"},
        "EDGE017": {"status": "matched", "type": None, "expected_exception": None, "note": "Case difference in ID"},
        "EDGE018": {"status": "mismatch", "type": "amount_mismatch", "expected_exception": "AMOUNT_MISMATCH", "note": "Major amount mismatch"},
        "EDGE019": {"status": "mismatch", "type": "missing_row", "expected_exception": "MISSING_IN_RETURN", "note": "Genuine missing return"},
        "EDGE020": {"status": "matched", "type": None, "expected_exception": None, "note": "Exact match control"},
        "EDGE021": {"status": "mismatch", "type": "rounding_difference", "expected_exception": "ROUNDING_DIFF", "note": "High value micro-variance +4.90"},
        "EDGE022": {"status": "mismatch", "type": "amount_mismatch", "expected_exception": "AMOUNT_MISMATCH", "note": "High value excessive variance +10.00"},
        "EDGE023_INV": {"status": "mismatch", "type": "missing_row", "expected_exception": "MISSING_IN_RETURN", "note": "Fuzzy fails on vendor typo V008 vs V080"},
        "EDGE024": {"status": "matched", "type": None, "expected_exception": None, "note": "Exact match control"},
    }

    df_edge_invoices = pd.DataFrame(edge_invoices)
    df_edge_returns = pd.DataFrame(edge_returns)

    df_edge_invoices.to_csv("edge_cases.csv", index=False)
    df_edge_returns.to_csv("edge_cases_returns.csv", index=False)

    with open("edge_cases_ground_truth.json", "w", encoding="utf-8") as f:
        json.dump(edge_ground_truth, f, indent=2)

    print("=" * 60)
    print("ADVERSARIAL EDGE-CASE DATASET GENERATION COMPLETE")
    print("=" * 60)
    print(f"  - edge_cases.csv               : {len(df_edge_invoices)} rows")
    print(f"  - edge_cases_returns.csv       : {len(df_edge_returns)} rows")
    print(f"  - edge_cases_ground_truth.json : {len(edge_ground_truth)} entries")
    print("=" * 60)


if __name__ == "__main__":
    generate_main_dataset()
    generate_adversarial_dataset()
