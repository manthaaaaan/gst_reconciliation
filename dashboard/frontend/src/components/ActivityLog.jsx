import React, { useState, useMemo } from 'react'
import { Icons } from './Icons'
import { StatusBadge } from './Badge'

const ACTION_COLORS = {
  APPROVE_MATCH: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  FLAG_VENDOR: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  FLAGGED_VENDOR_EMAIL_SENT: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  MARK_WRITTEN_OFF: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  ESCALATE_TAX: 'bg-red-500/15 text-red-400 border border-red-500/30',
  REJECT_DUPLICATE: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  ACKNOWLEDGE: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
}

export function ActivityLog({ logs, loading, onRefresh, onResetLog }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  const uniqueActions = useMemo(() => {
    if (!logs) return []
    return Array.from(new Set(logs.map((l) => l.action)))
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    let list = [...logs]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (log) =>
          log.invoice_id?.toLowerCase().includes(q) ||
          log.action?.toLowerCase().includes(q) ||
          log.note?.toLowerCase().includes(q) ||
          log.previous_status?.toLowerCase().includes(q) ||
          log.new_status?.toLowerCase().includes(q)
      )
    }

    if (actionFilter !== 'ALL') {
      list = list.filter((log) => log.action === actionFilter)
    }

    return list
  }, [logs, searchQuery, actionFilter])

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl animate-fade-in">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-700/80 bg-slate-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Audit Trail & Activity Log</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                SQLite Immutable
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of all exception resolutions, vendor escalations, and manual audit decisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Icons.Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-full sm:w-64 transition-all"
              />
            </div>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center shrink-0"
              title="Refresh Audit Logs"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {onResetLog && logs && logs.length > 0 && (
              <button
                onClick={onResetLog}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
                title="Reset All Activity Logs"
              >
                <Icons.Close className="w-3.5 h-3.5" />
                <span>Reset Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Action filter chips */}
        {uniqueActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setActionFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                actionFilter === 'ALL'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              All Actions ({logs.length})
            </button>
            {uniqueActions.map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  actionFilter === act
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {act.replace(/_/g, ' ')} ({logs.filter((l) => l.action === act).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-700/60 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Invoice ID</th>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Action Taken</th>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Status Transition</th>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Audit Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3.5 text-xs text-slate-400 font-mono whitespace-nowrap">
                  {log.timestamp}
                </td>
                <td className="px-4 py-3.5 font-mono text-white text-xs font-bold">
                  {log.invoice_id}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                      ACTION_COLORS[log.action] || 'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium line-through opacity-75">
                      {log.previous_status || 'INITIAL'}
                    </span>
                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="text-emerald-400 font-bold">
                      {log.new_status || 'RESOLVED'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-slate-300 text-xs max-w-md">
                  {log.note || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="p-12 text-center text-slate-500 text-sm font-medium">
          {logs.length === 0
            ? 'No audit log entries recorded yet. Resolve an exception from the Main Table to generate audit trail records.'
            : 'No audit records match the selected filter.'}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
        <span>Total Records in SQLite: <strong className="text-slate-200">{logs.length}</strong></span>
        <span>Showing {filteredLogs.length} entries</span>
      </div>
    </div>
  )
}
