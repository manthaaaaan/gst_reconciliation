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

while len(returns) < 55:
    extra_inv = random.choice(invoices)
    extra_inv_num = int(extra_inv["invoice_id"].replace("INV", ""))
    if extra_inv_num not in mismatch_invoice_ids:
        extra_row = extra_inv.copy()
        extra_row["invoice_id"] = f"INV{str(random.randint(100, 999)).zfill(5)}"
        returns.append(extra_row)

returns = returns[:55]

df_invoices = pd.DataFrame(invoices)
df_returns = pd.DataFrame(returns)

df_invoices.to_csv("invoices.csv", index=False)
df_returns.to_csv("gst_returns.csv", index=False)

with open("ground_truth.json", "w") as f:
    json.dump(ground_truth, f, indent=2)

print("=" * 60)
print("SYNTHETIC DATA GENERATION COMPLETE")
print("=" * 60)
print(f"\nGenerated Files:")
print(f"  - invoices.csv     : {len(df_invoices)} rows")
print(f"  - gst_returns.csv  : {len(df_returns)} rows")
print(f"  - ground_truth.json: {len(ground_truth)} entries")

print(f"\nMismatch Summary:")
mismatch_counts = {}
for inv_id, data in ground_truth.items():
    if data["status"] == "mismatch":
        mtype = data["type"]
        mismatch_counts[mtype] = mismatch_counts.get(mtype, 0) + 1

print(f"  Total Mismatches: {sum(mismatch_counts.values())}")
for mtype, count in mismatch_counts.items():
    print(f"    - {mtype}: {count}")

print(f"\nException Codes:")
exception_codes = set()
for data in ground_truth.values():
    if data.get("expected_exception"):
        exception_codes.add(data["expected_exception"])
for code in sorted(exception_codes):
    print(f"  - {code}")

print("\n" + "=" * 60)
