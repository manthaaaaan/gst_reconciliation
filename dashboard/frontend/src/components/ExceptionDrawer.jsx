import React, { useState, useEffect } from 'react'
import { StatusBadge } from './Badge'
import { ConfidenceBars } from './ConfidenceBars'
import { Icons } from './Icons'
import { formatCurrency } from '../utils/formatters'

export function ExceptionDrawer({ row, onClose, onAction }) {
  const [isVisible, setIsVisible] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (row) {
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [row])

  if (!row) return null

  const inv = row.invoice_data || {}
  const ret = row.return_data || {}

  const hasDiscrepancy = (field) => {
    if (!inv[field] || !ret[field]) return false
    return String(inv[field]).trim() !== String(ret[field]).trim()
  }

  const getDiscrepancyClass = (field) => {
    if (hasDiscrepancy(field)) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    }
    return 'text-slate-300 bg-slate-800/50 border-slate-700'
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 250)
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAction = async (actionType) => {
    const actionDetails = {
      FLAG_VENDOR: {
        action: 'FLAGGED_VENDOR_EMAIL_SENT',
        new_status: 'RESOLVED',
        note: `Automated vendor follow-up email dispatched to manthangennur@gmail.com for invoice ${row.invoice_id}`,
        message: '📧 Vendor follow-up email dispatched to manthangennur@gmail.com!',
      },
      MARK_WRITTEN_OFF: {
        action: 'MARK_WRITTEN_OFF',
        new_status: 'RESOLVED',
        note: `Invoice ${row.invoice_id} marked as written off after review`,
        message: `Loop Closed: Invoice ${row.invoice_id} marked as written off`,
      },
      APPROVE_MATCH: {
        action: 'APPROVE_MATCH',
        new_status: 'RESOLVED',
        note: `Approved match with accepted variance for ${row.invoice_id}`,
        message: `Loop Closed: Invoice ${row.invoice_id} approved with accepted variance`,
      },
      ESCALATE_TAX: {
        action: 'ESCALATE_TAX',
        new_status: 'ESCALATE_TAX',
        note: `Discrepancy escalated to internal tax team for ${row.invoice_id}`,
        message: `Loop Closed: Invoice ${row.invoice_id} escalated to tax review`,
      },
      REJECT_DUPLICATE: {
        action: 'REJECT_DUPLICATE',
        new_status: 'RESOLVED',
        note: `Rejected duplicate filing entry for ${row.invoice_id}`,
        message: `Loop Closed: Invoice ${row.invoice_id} duplicate entry rejected`,
      },
      ACKNOWLEDGE: {
        action: 'ACKNOWLEDGE',
        new_status: 'RESOLVED',
        note: `Acknowledged and confirmed for ${row.invoice_id}`,
        message: `Invoice ${row.invoice_id} acknowledged`,
      },
    }

    const payload = actionDetails[actionType] || {
      action: actionType,
      new_status: 'RESOLVED',
      note: `Action ${actionType} performed on ${row.invoice_id}`,
      message: `Action recorded for ${row.invoice_id}`,
    }

    showToast(payload.message)

    if (onAction) {
      await onAction({
        invoice_id: row.invoice_id,
        action: payload.action,
        previous_status: row.reason_code,
        new_status: payload.new_status,
        note: payload.note,
        vendor_email: 'manthangennur@gmail.com',
        date: inv.date || ret.date || '',
        taxable_amount: String(inv.taxable_amount || ret.taxable_amount || ''),
        gst_amount: String(inv.gst_amount || ret.gst_amount || ''),
        reason_code: row.reason_code,
      })
    }

    setTimeout(handleClose, 1200)
  }

  const renderActionButtons = () => {
    const reason = row.reason_code

    if (reason === 'MISSING_IN_RETURNS') {
      return (
        <>
          <button
            onClick={() => handleAction('FLAG_VENDOR')}
            className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <Icons.AlertTriangle className="w-4 h-4" />
            Flag for Vendor Follow-up
          </button>
          <button
            onClick={() => handleAction('MARK_WRITTEN_OFF')}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm transition-all border border-slate-600 flex items-center justify-center gap-2"
          >
            <Icons.Check className="w-4 h-4" />
            Mark as Written Off
          </button>
        </>
      )
    }

    if (reason === 'MATCHED_WITH_VARIANCE') {
      return (
        <>
          <button
            onClick={() => handleAction('APPROVE_MATCH')}
            className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Icons.CheckCircle className="w-4 h-4" />
            Approve Match (Accept Variance)
          </button>
          <button
            onClick={() => handleAction('FLAG_VENDOR')}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm transition-all border border-slate-600 flex items-center justify-center gap-2"
          >
            <Icons.AlertTriangle className="w-4 h-4" />
            Flag for Vendor Follow-up
          </button>
        </>
      )
    }

    if (
      reason === 'RATE_MISMATCH' ||
      reason === 'HSN_MISMATCH' ||
      reason === 'AMOUNT_MISMATCH' ||
      reason === 'UNRESOLVED'
    ) {
      return (
        <>
          <button
            onClick={() => handleAction('ESCALATE_TAX')}
            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
          >
            <Icons.ShieldCheck className="w-4 h-4" />
            Escalate to Tax Review
          </button>
          <button
            onClick={() => handleAction('FLAG_VENDOR')}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm transition-all border border-slate-600 flex items-center justify-center gap-2"
          >
            <Icons.AlertTriangle className="w-4 h-4" />
            Flag Vendor
          </button>
        </>
      )
    }

    if (reason === 'DUPLICATE_ENTRY') {
      return (
        <>
          <button
            onClick={() => handleAction('REJECT_DUPLICATE')}
            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <Icons.Close className="w-4 h-4" />
            Reject Duplicate Filing
          </button>
          <button
            onClick={() => handleAction('ESCALATE_TAX')}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm transition-all border border-slate-600 flex items-center justify-center gap-2"
          >
            <Icons.ShieldCheck className="w-4 h-4" />
            Escalate
          </button>
        </>
      )
    }

    return (
      <button
        onClick={() => handleAction('APPROVE_MATCH')}
        className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
      >
        <Icons.Check className="w-4 h-4" />
        Acknowledge & Close
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        className={`relative w-full max-w-2xl bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 z-10 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Icons.FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-mono">{row.invoice_id}</h2>
                <p className="text-xs text-slate-400">{inv.date || ret.date || 'Transaction date missing'}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-700"
            >
              <Icons.Close className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge code={row.reason_code} />
            <ConfidenceBars level={row.confidence} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Comparison Matrix */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icons.FileText className="w-4 h-4 text-blue-400" />
              Comparative Ledger Audit
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60">
                <p className="text-xs text-slate-400 font-semibold uppercase">Field</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60">
                <p className="text-xs text-blue-400 font-semibold uppercase">Internal Invoice</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60">
                <p className="text-xs text-emerald-400 font-semibold uppercase">GST Return</p>
              </div>

              {[
                { label: 'Taxable Amount', key: 'taxable_amount', format: (v) => formatCurrency(v) },
                { label: 'GST Rate', key: 'gst_rate', format: (v) => (v ? `${v}%` : '-') },
                { label: 'HSN Code', key: 'hsn_code', format: (v) => v || '-' },
                { label: 'GST Amount', key: 'gst_amount', format: (v) => formatCurrency(v) },
                { label: 'Vendor ID', key: 'vendor_id', format: (v) => v || '-' },
              ].map(({ label, key, format }) => (
                <React.Fragment key={key}>
                  <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 flex items-center">
                    <p className="text-xs text-slate-300 font-medium">{label}</p>
                  </div>
                  <div className={`rounded-xl p-3 border flex items-center justify-between ${getDiscrepancyClass(key)}`}>
                    <p className="text-sm font-medium">{format(inv[key])}</p>
                    {hasDiscrepancy(key) && <Icons.AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 ml-1" />}
                  </div>
                  <div className={`rounded-xl p-3 border flex items-center justify-between ${getDiscrepancyClass(key)}`}>
                    <p className="text-sm font-medium">{format(ret[key])}</p>
                    {hasDiscrepancy(key) && <Icons.AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 ml-1" />}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* AI Audit Note */}
          {row.llm_explanation && (
            <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/5 rounded-2xl p-5 border border-indigo-500/25 shadow-lg shadow-indigo-500/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Icons.Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-indigo-300">AI Tax Audit Analysis</h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                      Automated Note
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{row.llm_explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-5">
          <div className="flex gap-3">{renderActionButtons()}</div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-400/40 shadow-emerald-600/30'
              : 'bg-red-600 text-white border-red-400/40 shadow-red-600/30'
          }`}
        >
          <Icons.CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
