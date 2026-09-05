import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from './components/Header'
import { MetricCard } from './components/MetricCard'
import { Dropzone } from './components/Dropzone'
import { ExceptionDrawer } from './components/ExceptionDrawer'
import { ResultsTable } from './components/ResultsTable'
import { ActivityLog } from './components/ActivityLog'
import { SystemArchitectureView } from './components/SystemArchitectureView'
import { Icons } from './components/Icons'
import DarkVeil from './components/DarkVeil'

export default function App() {
  const [invoicesFile, setInvoicesFile] = useState(null)
  const [returnsFile, setReturnsFile] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [engineActive, setEngineActive] = useState(false)

  const [toastMessage, setToastMessage] = useState(null)

  // Navigation tab: 'MAIN' | 'ACTIVITY'
  const [activeTab, setActiveTab] = useState('MAIN')

  // SQLite Audit logs
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)

  const fetchAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true)
    try {
      const res = await fetch('/api/audit/log')
      if (res.ok) {
        const logs = await res.json()
        setAuditLogs(logs)
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [])

  const handleResetActivityLog = useCallback(async () => {
    if (!window.confirm('Are you sure you want to reset and clear the entire audit trail activity log?')) {
      return
    }
    try {
      setAuditLogsLoading(true)
      const res = await fetch('/api/audit/log', { method: 'DELETE' })
      if (res.ok) {
        setAuditLogs([])
        setToastMessage('🧹 Activity log has been reset successfully.')
        setTimeout(() => setToastMessage(null), 3500)
      }
    } catch (err) {
      console.error('Failed to reset audit logs:', err)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const handleReconcile = useCallback(async () => {
    if (!invoicesFile || !returnsFile) {
      setError('Please provide both Invoices CSV and GST Returns CSV files.')
      return
    }

    setLoading(true)
    setEngineActive(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('invoices', invoicesFile)
      formData.append('returns', returnsFile)
      if (apiKey.trim()) formData.append('api_key', apiKey.trim())

      const res = await fetch('/api/reconcile', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server responded with status ${res.status}`)
      }

      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during reconciliation.')
    } finally {
      setLoading(false)
      setEngineActive(false)
    }
  }, [invoicesFile, returnsFile, apiKey])

  const handleResolveAction = useCallback(
    async ({
      invoice_id,
      action,
      previous_status,
      new_status,
      note,
      vendor_email = 'manthangennur@gmail.com',
      date = '',
      taxable_amount = '',
      gst_amount = '',
      reason_code = '',
    }) => {
      const effectiveAction =
        action === 'FLAG_VENDOR' || action === 'Flag for Vendor Follow-up'
          ? 'FLAGGED_VENDOR_EMAIL_SENT'
          : action

      // 1. If vendor follow-up, display immediate toast notification
      if (
        effectiveAction === 'FLAGGED_VENDOR_EMAIL_SENT' ||
        action === 'FLAG_VENDOR' ||
        action === 'Flag for Vendor Follow-up'
      ) {
        setToastMessage(`📧 Vendor follow-up email dispatched to ${vendor_email}!`)
        setTimeout(() => setToastMessage(null), 4000)
      }

      // 2. Post to SQLite Audit Log endpoint
      try {
        const res = await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice_id,
            action: effectiveAction,
            previous_status,
            new_status,
            note: note || `Automated vendor follow-up email dispatched to ${vendor_email}`,
            vendor_email,
            date,
            taxable_amount,
            gst_amount,
            reason_code: reason_code || previous_status,
          }),
        })
        if (res.ok) {
          const createdLog = await res.json()
          setAuditLogs((prev) => [createdLog, ...prev])
        }
      } catch (err) {
        console.error('Failed to save audit log to SQLite:', err)
      }

      // 3. Update local state
      setData((prev) => {
        if (!prev || !prev.results) return prev
        const updatedResults = prev.results.map((r) => {
          if (r.invoice_id === invoice_id) {
            return {
              ...r,
              reason_code: new_status || 'RESOLVED',
              resolution_action: effectiveAction,
              confidence: 'HIGH',
            }
          }
          return r
        })

        // Recalculate stats dynamically
        const total = updatedResults.length
        const matched = updatedResults.filter(
          (r) =>
            r.reason_code === 'MATCHED' ||
            r.reason_code === 'MATCHED_WITH_VARIANCE' ||
            r.reason_code === 'RESOLVED'
        ).length
        const matchRate = total ? Number(((matched / total) * 100).toFixed(2)) : 0

        return {
          ...prev,
          stats: {
            ...prev.stats,
            matched,
            match_rate: matchRate,
          },
          results: updatedResults,
        }
      })
    },
    []
  )

  const handleReset = useCallback(() => {
    setData(null)
    setInvoicesFile(null)
    setReturnsFile(null)
    setError(null)
    setSelectedRow(null)
  }, [])

  const handleExportExceptions = useCallback(async () => {
    try {
      const res = await fetch('/api/export/exceptions')
      if (!res.ok) {
        throw new Error(`Export failed with status: ${res.status}`)
      }
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'reconciliation_exceptions.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Failed to export exceptions:', err)
      alert(err.message || 'Failed to download exceptions CSV.')
    }
  }, [])

  const stats = data?.stats || {}
  const total = stats.total || 0
  const matched = stats.matched || 0
  const matchRate = stats.match_rate || 0
  const highConf = useMemo(() => {
    if (!data?.results) return 0
    return data.results.filter((r) => r.confidence === 'HIGH').length
  }, [data])
  const highConfPct = total ? Math.round((highConf / total) * 100) : 0
  const exceptionCount = Math.max(0, total - matched)

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* DarkVeil Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={0.5}
          scanlineFrequency={0}
          warpAmount={0}
          resolutionScale={1}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80 pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header
          engineActive={engineActive || loading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          auditLogCount={auditLogs.length}
          onReset={data && activeTab === 'MAIN' ? handleReset : null}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
          {activeTab === 'ARCHITECTURE' ? (
            <SystemArchitectureView />
          ) : activeTab === 'ACTIVITY' ? (
            <ActivityLog
              logs={auditLogs}
              loading={auditLogsLoading}
              onRefresh={fetchAuditLogs}
              onResetLog={handleResetActivityLog}
            />
          ) : (
          <>
            {!data && (
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 sm:p-10 shadow-2xl shadow-black/50 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <Icons.Sparkles className="w-3.5 h-3.5" />
                    Automated Ledger Ingestion
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    GST Audit & Reconciliation Pipeline
                  </h2>
                  <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2">
                    Ingest internal ERP invoices alongside filed GSTR-2B returns to detect variances, HSN rate drift, and filing exceptions.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <Dropzone label="Internal Invoices (.CSV)" file={invoicesFile} onDrop={setInvoicesFile} />
                  <Dropzone label="GST Returns (.CSV)" file={returnsFile} onDrop={setReturnsFile} />
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    Groq / LLM API Key{' '}
                    <span className="text-slate-500 font-normal lowercase">(optional — defaults to configured backend key)</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_... (leave empty to use server default)"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleReconcile}
                    disabled={loading || !invoicesFile || !returnsFile}
                    className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm transition-all duration-300 shadow-xl shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          ></path>
                        </svg>
                        <span>Reconciling Records...</span>
                      </>
                    ) : (
                      <>
                        <Icons.Zap className="w-5 h-5" />
                        <span>Run Reconciliation Engine</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/5"
                role="alert"
              >
                <Icons.AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {data && (
              <div className="space-y-8 animate-fade-in">
                {/* KPI Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <MetricCard
                    label="Total Invoices"
                    value={total}
                    icon={Icons.FileText}
                    color="blue"
                    subtitle="Ingested ledger records"
                  />
                  <MetricCard
                    label="Auto-Match Rate"
                    value={`${matchRate}%`}
                    icon={Icons.CheckCircle}
                    color="green"
                    subtitle={`${matched} of ${total} matched`}
                  />
                  <MetricCard
                    label="High Confidence"
                    value={`${highConfPct}%`}
                    icon={Icons.ShieldCheck}
                    color="green"
                    subtitle={`${highConf} records verified`}
                  />
                  <MetricCard
                    label="Actionable Exceptions"
                    value={exceptionCount}
                    icon={Icons.AlertTriangle}
                    color={exceptionCount > 0 ? 'red' : 'green'}
                    subtitle={exceptionCount > 0 ? 'Requires loop closure' : 'Zero exceptions detected'}
                  />
                </div>

                {/* Reconciliation Ledger Table */}
                <ResultsTable
                  results={data.results}
                  onSelectRow={setSelectedRow}
                  onExportExceptions={handleExportExceptions}
                />
              </div>
            )}
          </>
        )}
      </main>

      <ExceptionDrawer
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onAction={handleResolveAction}
      />

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/40 shadow-emerald-600/30 animate-bounce">
          <Icons.CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}
      </div>
    </div>
  )
}