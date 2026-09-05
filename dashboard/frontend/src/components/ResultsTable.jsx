import React, { useState, useMemo, useCallback } from 'react'
import { StatusBadge } from './Badge'
import { ConfidenceBars } from './ConfidenceBars'
import { Icons } from './Icons'
import { formatCurrency } from '../utils/formatters'

const EXCEPTION_CODES = [
  'MISSING_IN_RETURNS',
  'RATE_MISMATCH',
  'HSN_MISMATCH',
  'DUPLICATE_ENTRY',
  'AMOUNT_MISMATCH',
  'UNRESOLVED',
]

const ROW_COLORS = {
  MATCHED: 'bg-emerald-500/5 hover:bg-emerald-500/10',
  MATCHED_WITH_VARIANCE: 'bg-amber-500/5 hover:bg-amber-500/10',
  MISSING_IN_RETURNS: 'bg-red-500/5 hover:bg-red-500/10',
  RATE_MISMATCH: 'bg-red-500/5 hover:bg-red-500/10',
  HSN_MISMATCH: 'bg-red-500/5 hover:bg-red-500/10',
  DUPLICATE_ENTRY: 'bg-orange-500/5 hover:bg-orange-500/10',
  AMOUNT_MISMATCH: 'bg-red-500/5 hover:bg-red-500/10',
  UNRESOLVED: 'bg-slate-500/5 hover:bg-slate-500/10',
  RESOLVED: 'bg-teal-500/5 hover:bg-teal-500/10',
}

function QuickFilterTab({ label, count, active, onClick, color = 'blue' }) {
  const colors = {
    blue: active
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/10'
      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700/80 hover:text-slate-200',
    green: active
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700/80 hover:text-slate-200',
    red: active
      ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm shadow-red-500/10'
      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700/80 hover:text-slate-200',
  }

  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${colors[color]}`}
    >
      {label}
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${active ? 'bg-white/15' : 'bg-slate-700/60'}`}>
        {count}
      </span>
    </button>
  )
}

export function ResultsTable({ results, onSelectRow, onExportExceptions }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [showAll, setShowAll] = useState(false)

  const ITEMS_PER_PAGE = 10

  const filteredAndSortedResults = useMemo(() => {
    if (!results) return []

    let list = [...results]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (row) =>
          row.invoice_id?.toLowerCase().includes(q) ||
          row.invoice_data?.vendor_id?.toLowerCase().includes(q) ||
          row.return_data?.vendor_id?.toLowerCase().includes(q) ||
          row.reason_code?.toLowerCase().includes(q)
      )
    }

    if (quickFilter === 'matched') {
      list = list.filter((r) => r.reason_code === 'MATCHED' || r.reason_code === 'MATCHED_WITH_VARIANCE')
    } else if (quickFilter === 'exceptions') {
      list = list.filter((r) => EXCEPTION_CODES.includes(r.reason_code))
    }

    list.sort((a, b) => {
      let aVal, bVal

      switch (sortConfig.key) {
        case 'date':
          aVal = a.invoice_data?.date || a.return_data?.date || ''
          bVal = b.invoice_data?.date || b.return_data?.date || ''
          break
        case 'amount':
          aVal = parseFloat(a.invoice_data?.taxable_amount || a.return_data?.taxable_amount || 0)
          bVal = parseFloat(b.invoice_data?.taxable_amount || b.return_data?.taxable_amount || 0)
          break
        case 'status':
          aVal = a.reason_code || ''
          bVal = b.reason_code || ''
          break
        case 'confidence':
          aVal = a.confidence || ''
          bVal = b.confidence || ''
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [results, searchQuery, quickFilter, sortConfig])

  const totalPages = Math.ceil(filteredAndSortedResults.length / ITEMS_PER_PAGE) || 1
  const paginatedResults = useMemo(() => {
    if (showAll) return filteredAndSortedResults
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedResults.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAndSortedResults, currentPage, showAll])

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const matchedCount = useMemo(
    () => results.filter((r) => r.reason_code === 'MATCHED' || r.reason_code === 'MATCHED_WITH_VARIANCE').length,
    [results]
  )

  const exceptionCount = useMemo(
    () => results.filter((r) => EXCEPTION_CODES.includes(r.reason_code)).length,
    [results]
  )

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-3 h-3 text-slate-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-700/80 bg-slate-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Reconciliation Ledger</h2>
            <p className="text-xs text-slate-400">Detailed line-by-line internal vs filed comparison</p>
          </div>

          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              <Icons.Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search ID, vendor, status..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-full sm:w-72 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <QuickFilterTab
            label="All Records"
            count={results.length}
            active={quickFilter === 'all'}
            onClick={() => {
              setQuickFilter('all')
              setCurrentPage(1)
            }}
            color="blue"
          />
          <QuickFilterTab
            label="Matched"
            count={matchedCount}
            active={quickFilter === 'matched'}
            onClick={() => {
              setQuickFilter('matched')
              setCurrentPage(1)
            }}
            color="green"
          />
          <QuickFilterTab
            label="Exceptions"
            count={exceptionCount}
            active={quickFilter === 'exceptions'}
            onClick={() => {
              setQuickFilter('exceptions')
              setCurrentPage(1)
            }}
            color="red"
          />
          {onExportExceptions && (
            <button
              onClick={onExportExceptions}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 shadow-sm"
              title="Export exceptions to CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Exceptions</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-700/60 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Invoice ID</th>
              <th
                className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1.5">
                  Date
                  <SortIcon columnKey="date" />
                </div>
              </th>
              <th className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Vendor</th>
              <th
                className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1.5">
                  Status
                  <SortIcon columnKey="status" />
                </div>
              </th>
              <th
                className="px-4 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center gap-1.5">
                  Confidence
                  <SortIcon columnKey="confidence" />
                </div>
              </th>
              <th
                className="px-4 py-3.5 text-right text-slate-400 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  Taxable
                  <SortIcon columnKey="amount" />
                </div>
              </th>
              <th className="px-4 py-3.5 text-right text-slate-400 font-semibold text-xs uppercase tracking-wider">
                GST
              </th>
              <th className="px-4 py-3.5 text-center text-slate-400 font-semibold text-xs uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {paginatedResults.map((row) => (
              <tr
                key={row.invoice_id}
                className={`${ROW_COLORS[row.reason_code] || ROW_COLORS.UNRESOLVED} transition-colors group`}
              >
                <td className="px-4 py-3.5 font-mono text-white text-xs font-semibold">{row.invoice_id}</td>
                <td className="px-4 py-3.5 text-slate-300 text-xs font-medium">
                  {row.invoice_data?.date || row.return_data?.date || '-'}
                </td>
                <td className="px-4 py-3.5 text-slate-300 text-xs font-medium">
                  {row.invoice_data?.vendor_id || row.return_data?.vendor_id || '-'}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge code={row.reason_code} />
                </td>
                <td className="px-4 py-3.5">
                  <ConfidenceBars level={row.confidence} />
                </td>
                <td className="px-4 py-3.5 text-right text-slate-200 font-mono text-xs font-medium">
                  {formatCurrency(row.invoice_data?.taxable_amount || row.return_data?.taxable_amount)}
                </td>
                <td className="px-4 py-3.5 text-right text-slate-200 font-mono text-xs font-medium">
                  {formatCurrency(row.invoice_data?.gst_amount || row.return_data?.gst_amount)}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <button
                    onClick={() => onSelectRow(row)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold transition-all duration-200 shadow-sm"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedResults.length === 0 && (
        <div className="p-12 text-center text-slate-500 text-sm font-medium">
          No records match the current filter or search criteria.
        </div>
      )}

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-700/80 bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400">
            {showAll
              ? `Showing all ${filteredAndSortedResults.length} records`
              : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredAndSortedResults.length
                )} of ${filteredAndSortedResults.length}`}
          </span>
          <button
            onClick={() => {
              setShowAll(!showAll)
              setCurrentPage(1)
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              showAll
                ? 'bg-blue-500 text-white border-blue-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {showAll ? 'Paginated' : 'Show All'}
          </button>
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1
              if (totalPages > 5) {
                if (currentPage > 3 && currentPage < totalPages - 2) {
                  page = currentPage - 2 + i
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                }
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {page}
                </button>
              )
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
