import React from 'react'

export function ConfidenceBars({ level }) {
  const config = {
    HIGH: { bars: 3, color: 'bg-emerald-400', inactive: 'bg-emerald-900/30', textColor: 'text-emerald-400' },
    MEDIUM: { bars: 2, color: 'bg-amber-400', inactive: 'bg-amber-900/30', textColor: 'text-amber-400' },
    LOW: { bars: 1, color: 'bg-slate-400', inactive: 'bg-slate-700', textColor: 'text-slate-400' },
  }

  const c = config[level] || config.LOW

  return (
    <div className="flex items-center gap-2" title={`Confidence score: ${level}`}>
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={`w-1 rounded-sm transition-all duration-300 ${bar <= c.bars ? c.color : c.inactive}`}
            style={{ height: `${bar * 4 + 4}px` }}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold tracking-wider ${c.textColor}`}>{level}</span>
    </div>
  )
}
