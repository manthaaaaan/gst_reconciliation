import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine_core import ReasonCode

EXCEPTION_CODES = {
    ReasonCode.MATCHED_WITH_VARIANCE.value,
    ReasonCode.MISSING_IN_RETURNS.value,
    ReasonCode.RATE_MISMATCH.value,
    ReasonCode.HSN_MISMATCH.value,
    ReasonCode.DUPLICATE_ENTRY.value,
    ReasonCode.AMOUNT_MISMATCH.value,
    ReasonCode.UNRESOLVED.value,
}


def build_prompt(row):
    inv_id = row.get("invoice_id", "Unknown")
    reason = row.get("reason_code", "Exception")
    meta = row.get("metadata", {})
    inv = row.get("invoice_data", {}) or {}
    ret = row.get("return_data", {}) or {}

    parts = [f"Invoice {inv_id} has a reconciliation issue: {reason}."]

    if reason == ReasonCode.MATCHED_WITH_VARIANCE.value:
        variances = meta.get("variances", [])
        for v in variances:
            parts.append(
                f" {v['field']} differs by Rs.{v['delta']:.2f} (invoice: Rs.{v['expected']:.2f}, return: Rs.{v['returned']:.2f})."
            )

    elif reason == ReasonCode.MISSING_IN_RETURNS.value:
        parts.append(
            f" The invoice (Rs.{inv.get('taxable_amount', 'N/A')} taxable, {inv.get('gst_rate', 'N/A')}% GST) does not appear in the GST return filing."
        )

    elif reason == ReasonCode.RATE_MISMATCH.value:
        exp_rate = inv.get("gst_rate", "?")
        ret_rate = ret.get("gst_rate", "?")
        parts.append(f" Invoice GST rate is {exp_rate}% but return shows {ret_rate}%.")

    elif reason == ReasonCode.HSN_MISMATCH.value:
        exp_hsn = inv.get("hsn_code", "?")
        ret_hsn = ret.get("hsn_code", "?")
        parts.append(f" Invoice HSN code {exp_hsn} but return shows {ret_hsn}.")

    elif reason == ReasonCode.DUPLICATE_ENTRY.value:
        parts.append(f" This invoice appears {meta.get('occurrences', 'multiple')} times in the return.")

    elif reason == ReasonCode.AMOUNT_MISMATCH.value:
        parts.append(
            f" Taxable amount or GST amount exceeds tolerance (invoice taxable: Rs.{inv.get('taxable_amount', '?')}, return taxable: Rs.{ret.get('taxable_amount', '?')})."
        )

    elif reason == ReasonCode.UNRESOLVED.value:
        parts.append(" Return row has no matching invoice.")

    parts.append("\nWrite ONE concise sentence explaining this for a finance professional. Do NOT change any status, reason code, or numeric values.")
    return "".join(parts)


def generate_explanations():
    # Attempt to load .env if present
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

    groq_key = os.environ.get("GROQ_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if not groq_key and not gemini_key:
        raise ValueError("Neither GROQ_API_KEY nor GEMINI_API_KEY environment variable is set.")

    with open("results.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    exceptions = [r for r in data["results"] if r["reason_code"] in EXCEPTION_CODES]

    print(f"Generating explanations for {len(exceptions)} exception rows...")

    if groq_key:
        import urllib.request
        print("Using Groq API (qwen/qwen3.8-27b)...")
        for row in exceptions:
            prompt = build_prompt(row)
            payload = json.dumps({
                "model": "qwen/qwen3.8-27b",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a GST tax auditor assistant. Write ONE concise sentence explaining the reconciliation exception for a finance professional. Do NOT alter status or numbers."
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 100
            }).encode("utf-8")

            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=payload,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "GST-Reconciler/1.0"
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    explanation = res_json["choices"][0]["message"]["content"].strip()
            except Exception as e:
                explanation = f"LLM error: {e}"

            row["llm_explanation"] = explanation
            print(f"  {row['invoice_id']} ({row['reason_code']}): {explanation}")

    elif gemini_key:
        from google import genai
        print("Using Gemini API (gemini-2.0-flash)...")
        client = genai.Client(api_key=gemini_key)
        for row in exceptions:
            prompt = build_prompt(row)
            try:
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config={
                        "temperature": 0.1,
                        "max_output_tokens": 100,
                    }
                )
                explanation = response.text.strip()
            except Exception as e:
                explanation = f"LLM error: {e}"

            row["llm_explanation"] = explanation
            print(f"  {row['invoice_id']} ({row['reason_code']}): {explanation}")

    with open("results_explained.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"\nSaved results_explained.json with {len(exceptions)} LLM explanations.")


if __name__ == "__main__":
    generate_explanations()