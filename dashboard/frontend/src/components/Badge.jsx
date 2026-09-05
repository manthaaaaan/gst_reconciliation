import React from 'react'

export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ code }) {
  const config = {
    MATCHED: {
      className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      dot: 'bg-emerald-400',
      icon: true
    },
    MATCHED_WITH_VARIANCE: {
      className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      dot: 'bg-amber-400',
      icon: false
    },
    MISSING_IN_RETURNS: {
      className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold',
      dot: 'bg-red-400',
      icon: false
    },
    RATE_MISMATCH: {
      className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold',
      dot: 'bg-red-400',
      icon: false
    },
    HSN_MISMATCH: {
      className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold',
      dot: 'bg-red-400',
      icon: false
    },
    DUPLICATE_ENTRY: {
      className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold',
      dot: 'bg-orange-400',
      icon: false
    },
    AMOUNT_MISMATCH: {
      className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold',
      dot: 'bg-red-400',
      icon: false
    },
    UNRESOLVED: {
      className: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
      dot: 'bg-slate-400',
      icon: false
    },
    RESOLVED: {
      className: 'bg-teal-500/15 text-teal-400 border border-teal-500/30 font-medium',
      dot: 'bg-teal-400',
      icon: true
    },
  }

  const c = config[code] || config.UNRESOLVED
  const displayText = (code || 'UNRESOLVED').replace(/_/g, ' ')

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium tracking-wide ${c.className}`}>
      {c.icon ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      )}
      <span>{displayText}</span>
    </span>
  )
}
