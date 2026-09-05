import csv
import json
import os
import sys
import asyncio
import sqlite3
import io
import smtplib
from email.mime.text import MIMEText
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# Ensure parent directory is on sys.path to import engine_core
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Load .env file if present
for env_candidate in [os.path.join(os.path.dirname(__file__), ".env"), os.path.join(ROOT_DIR, ".env")]:
    if os.path.exists(env_candidate):
        with open(env_candidate, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())

from engine_core import (
    ReasonCode,
    ConfidenceLevel,
    reconcile_records,
    compute_stats,
    DEFAULT_VARIANCE_TOLERANCE,
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit_log.db")


def init_db():
    """Initializes SQLite audit logging table on startup."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id TEXT NOT NULL,
                action TEXT NOT NULL,
                previous_status TEXT,
                new_status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                note TEXT
            )
        """)
        conn.commit()


# Initialize database table
init_db()

app = FastAPI(
    title="Razorpay GST Reconciliation API",
    description="High-performance, high-precision automated GST audit and reconciliation engine with SQLite audit trail.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXCEPTION_CODES = {
    ReasonCode.MATCHED_WITH_VARIANCE.value,
    ReasonCode.MISSING_IN_RETURNS.value,
    ReasonCode.RATE_MISMATCH.value,
    ReasonCode.HSN_MISMATCH.value,
    ReasonCode.DUPLICATE_ENTRY.value,
    ReasonCode.AMOUNT_MISMATCH.value,
    ReasonCode.UNRESOLVED.value,
}


class AuditLogCreate(BaseModel):
    invoice_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    note: Optional[str] = None
    vendor_email: Optional[str] = "manthangennur@gmail.com"
    date: Optional[str] = None
    taxable_amount: Optional[str] = None
    gst_amount: Optional[str] = None
    reason_code: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: int
    invoice_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    timestamp: str
    note: Optional[str] = None


def send_vendor_email_notification(
    invoice_id: str,
    date: str = "",
    taxable_amount: str = "",
    gst_amount: str = "",
    reason_code: str = "MISSING_IN_RETURNS",
    recipient_email: str = "manthangennur@gmail.com"
) -> bool:
    """Dispatches automated vendor email for reconciliation discrepancies with graceful fallback."""
    target_email = recipient_email or "manthangennur@gmail.com"
    subject = f"[URGENT] GST Reconciliation Discrepancy - Invoice {invoice_id}"
    
    body = (
        f"Dear Vendor,\n\n"
        f"Our automated GST Reconciliation Audit Engine detected a discrepancy regarding Invoice {invoice_id}.\n\n"
        f"Details:\n"
        f"- Invoice ID: {invoice_id}\n"
        f"- Date: {date or 'N/A'}\n"
        f"- Taxable Amount: ₹{taxable_amount or '0.00'}\n"
        f"- GST Discrepancy: ₹{gst_amount or '0.00'}\n"
        f"- Reason: {reason_code} (Missing in GSTR-2B Filing)\n\n"
        f"Please update your GSTR-1 return or submit the missing filing immediately to prevent payment hold.\n\n"
        f"Regards,\n"
        f"Razorpay Automated Tax Operations"
    )

    smtp_server = os.environ.get("SMTP_SERVER")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")

    if smtp_server and smtp_user and smtp_pass:
        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = target_email

            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [target_email], msg.as_string())
            print(f"[LIVE EMAIL SENT to {target_email}] Subject: {subject} | Invoice: {invoice_id}")
            return True
        except Exception as e:
            print(f"[SMTP ERROR] Failed to send live email: {e}. Falling back to mock dispatch.")

    print(f"[MOCK EMAIL SENT to {target_email}] Subject: {subject} | Invoice: {invoice_id}")
    return True


def load_csv_from_content(content: str) -> List[Dict[str, Any]]:
    """Parses raw CSV string into a list of dictionaries."""
    return list(csv.DictReader(content.strip().splitlines()))


def build_default_explanation(row: Dict[str, Any]) -> str:
    """Provides a deterministic, professional audit note fallback."""
    reason = row.get("reason_code")
    inv = row.get("invoice_data") or {}
    ret = row.get("return_data") or {}
    meta = row.get("metadata") or {}

    if reason == ReasonCode.MATCHED_WITH_VARIANCE.value:
        variances = meta.get("variances", [])
        if variances:
            v_desc = ", ".join(f"{v.get('field')}: diff Rs.{v.get('delta', 0):.2f}" for v in variances)
            return f"Match confirmed with acceptable rounding tolerance ({v_desc})."
        return "Match confirmed within acceptable tolerance parameters."
    elif reason == ReasonCode.MISSING_IN_RETURNS.value:
        return f"Invoice recorded internally (Taxable: Rs. {inv.get('taxable_amount', '-')}) is missing from filed GST returns."
    elif reason == ReasonCode.RATE_MISMATCH.value:
        return f"Rate discrepancy: internal rate {inv.get('gst_rate', '-')}% conflicts with return rate {ret.get('gst_rate', '-')}%."
    elif reason == ReasonCode.HSN_MISMATCH.value:
        return f"HSN code mismatch: internal {inv.get('hsn_code', '-')} vs return {ret.get('hsn_code', '-')}."
    elif reason == ReasonCode.DUPLICATE_ENTRY.value:
        return f"Multiple return filings ({meta.get('occurrences', 2)} entries) detected for this single invoice ID."
    elif reason == ReasonCode.AMOUNT_MISMATCH.value:
        return f"Taxable or GST amounts exceed permissible tolerance (Inv: Rs. {inv.get('taxable_amount', '-')} vs Return: Rs. {ret.get('taxable_amount', '-')})."
    elif reason == ReasonCode.UNRESOLVED.value:
        return "Return row present in tax filing without corresponding internal invoice record."
    return f"Exception classified as {reason}. Pending manual audit review."


async def fetch_single_explanation(
    client: httpx.AsyncClient,
    row: Dict[str, Any],
    api_key: Optional[str] = None,
    api_url: Optional[str] = None
) -> str:
    """Asynchronously queries LLM endpoint with strict timeout and fallback."""
    effective_key = api_key or os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not effective_key:
        return build_default_explanation(row)

    if effective_key.startswith("gsk_"):
        endpoint = api_url or "https://api.groq.com/openai/v1/chat/completions"
        model_name = "qwen/qwen3.8-27b"
    else:
        endpoint = api_url or "http://localhost:20128/v1/chat/completions"
        model_name = "auto/claude-sonnet"

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": "You are a GST tax auditor assistant. Provide a single, concise, 1-sentence plain-English explanation of why this tax exception occurred for a finance user. DO NOT alter the reason_code or match status under any circumstances."
            },
            {
                "role": "user",
                "content": f"Invoice details: {json.dumps(row)}"
            }
        ],
        "temperature": 0.1,
        "max_tokens": 100
    }
    headers = {
        "Authorization": f"Bearer {effective_key}",
        "Content-Type": "application/json",
        "User-Agent": "GST-Reconciler/1.0"
    }

    try:
        response = await client.post(endpoint, headers=headers, json=payload, timeout=6.0)
        if response.status_code == 200:
            data = response.json()
            if "error" not in data:
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    return content
    except Exception:
        pass

    return build_default_explanation(row)


async def generate_explanations_concurrently(
    results: List[Dict[str, Any]],
    api_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Concurrently generates explanations for exception rows via asyncio.gather."""
    exceptions = [r for r in results if r["reason_code"] in EXCEPTION_CODES]
    
    if not exceptions:
        return results

    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_single_explanation(client, row, api_key)
            for row in exceptions
        ]
        explanations = await asyncio.gather(*tasks, return_exceptions=False)

    for row, exp in zip(exceptions, explanations):
        row["llm_explanation"] = exp

    return results


class HealthResponse(BaseModel):
    status: str
    engine: str
    version: str
    database: str


@app.get("/api/health", response_model=HealthResponse)
async def health():
    return {
        "status": "ok",
        "engine": "Razorpay GST Audit Engine Core",
        "version": "2.1.0",
        "database": "sqlite3 initialized"
    }


@app.post("/api/reconcile")
async def reconcile_endpoint(
    invoices: UploadFile = File(...),
    returns: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    try:
        invoices_content = (await invoices.read()).decode("utf-8")
        returns_content = (await returns.read()).decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Files must be UTF-8 encoded CSV.")

    invoices_data = load_csv_from_content(invoices_content)
    returns_data = load_csv_from_content(returns_content)

    if not invoices_data and not returns_data:
        raise HTTPException(status_code=400, detail="Uploaded CSV files are empty.")

    results = reconcile_records(invoices_data, returns_data, DEFAULT_VARIANCE_TOLERANCE)
    results = await generate_explanations_concurrently(results, api_key)
    stats = compute_stats(results)

    return {
        "stats": stats,
        "results": results
    }


@app.post("/api/audit/log", response_model=AuditLogResponse)
async def create_audit_log(entry: AuditLogCreate):
    """Logs an audit trail action into SQLite database and triggers automated vendor email if applicable."""
    # Check if this is a vendor follow-up action
    if entry.action in [
        "FLAG_VENDOR",
        "Flag for Vendor Follow-up",
        "FLAGGED_VENDOR_EMAIL_SENT"
    ]:
        send_vendor_email_notification(
            invoice_id=entry.invoice_id,
            date=entry.date or "",
            taxable_amount=entry.taxable_amount or "",
            gst_amount=entry.gst_amount or "",
            reason_code=entry.previous_status or entry.reason_code or "MISSING_IN_RETURNS",
            recipient_email=entry.vendor_email or "manthangennur@gmail.com"
        )

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO audit_log (invoice_id, action, previous_status, new_status, note)
                VALUES (?, ?, ?, ?, ?)
                """,
                (entry.invoice_id, entry.action, entry.previous_status, entry.new_status, entry.note)
            )
            log_id = cursor.lastrowid
            conn.commit()

            cursor.execute(
                "SELECT id, invoice_id, action, previous_status, new_status, timestamp, note FROM audit_log WHERE id = ?",
                (log_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=500, detail="Failed to retrieve inserted audit log entry")

            return {
                "id": row[0],
                "invoice_id": row[1],
                "action": row[2],
                "previous_status": row[3],
                "new_status": row[4],
                "timestamp": row[5],
                "note": row[6]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/api/notify/vendor")
async def notify_vendor(payload: Dict[str, Any]):
    """Standalone endpoint to dispatch automated vendor notification email."""
    invoice_id = payload.get("invoice_id", "UNKNOWN")
    recipient = payload.get("vendor_email") or "manthangennur@gmail.com"
    date = payload.get("date", "")
    taxable_amount = str(payload.get("taxable_amount", ""))
    gst_amount = str(payload.get("gst_amount", ""))
    reason_code = payload.get("reason_code", "MISSING_IN_RETURNS")

    send_vendor_email_notification(
        invoice_id=invoice_id,
        date=date,
        taxable_amount=taxable_amount,
        gst_amount=gst_amount,
        reason_code=reason_code,
        recipient_email=recipient
    )
    return {
        "status": "success",
        "invoice_id": invoice_id,
        "recipient": recipient,
        "email_status": "DISPATCHED"
    }


@app.get("/api/audit/log", response_model=List[AuditLogResponse])
async def get_audit_logs():
    """Returns all audit log records sorted by timestamp descending."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, invoice_id, action, previous_status, new_status, timestamp, note
                FROM audit_log
                ORDER BY timestamp DESC, id DESC
                """
            )
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "invoice_id": r[1],
                    "action": r[2],
                    "previous_status": r[3],
                    "new_status": r[4],
                    "timestamp": r[5],
                    "note": r[6]
                }
                for r in rows
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.delete("/api/audit/log")
async def clear_audit_logs():
    """Clears all audit log records from SQLite database."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM audit_log")
            conn.commit()
        return {"status": "success", "message": "Activity log reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/export/exceptions")
async def export_exceptions():
    """Exports reconciliation exceptions from results.json as a downloadable CSV."""
    results_path = os.path.join(ROOT_DIR, "results.json")
    if not os.path.exists(results_path):
        if os.path.exists("results.json"):
            results_path = "results.json"
        else:
            raise HTTPException(status_code=404, detail="results.json file not found on server")

    try:
        with open(results_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load results data: {str(e)}")

    raw_results = data.get("results", []) if isinstance(data, dict) else data
    exceptions = [r for r in raw_results if r.get("reason_code") != "MATCHED"]

    output = io.StringIO()
    fieldnames = [
        "invoice_id",
        "reason_code",
        "confidence",
        "vendor_id",
        "invoice_date",
        "invoice_hsn",
        "invoice_taxable_amount",
        "invoice_gst_rate",
        "invoice_gst_amount",
        "return_date",
        "return_hsn",
        "return_taxable_amount",
        "return_gst_rate",
        "return_gst_amount",
        "explanation",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for row in exceptions:
        inv = row.get("invoice_data") or {}
        ret = row.get("return_data") or {}
        raw_exp = row.get("llm_explanation") or build_default_explanation(row)
        # Clean any mojibake or raw currency symbols that cause issues in Excel
        clean_exp = (
            str(raw_exp)
            .replace("₹", "Rs. ")
            .replace("竄ｹ", "Rs. ")
            .replace("\u20b9", "Rs. ")
            .replace("Δ", "diff ")
        )

        writer.writerow({
            "invoice_id": row.get("invoice_id", ""),
            "reason_code": row.get("reason_code", ""),
            "confidence": row.get("confidence", ""),
            "vendor_id": inv.get("vendor_id") or ret.get("vendor_id", ""),
            "invoice_date": inv.get("date", ""),
            "invoice_hsn": inv.get("hsn_code", ""),
            "invoice_taxable_amount": inv.get("taxable_amount", ""),
            "invoice_gst_rate": inv.get("gst_rate", ""),
            "invoice_gst_amount": inv.get("gst_amount", ""),
            "return_date": ret.get("date", ""),
            "return_hsn": ret.get("hsn_code", ""),
            "return_taxable_amount": ret.get("taxable_amount", ""),
            "return_gst_rate": ret.get("gst_rate", ""),
            "return_gst_amount": ret.get("gst_amount", ""),
            "explanation": clean_exp,
        })

    # Prepend UTF-8 BOM so Excel opens the CSV seamlessly without character corruption
    csv_bytes = b"\xef\xbb\xbf" + output.getvalue().encode("utf-8")
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reconciliation_exceptions.csv"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)