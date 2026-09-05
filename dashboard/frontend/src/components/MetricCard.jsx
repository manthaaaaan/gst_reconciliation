import React from 'react'

export function MetricCard({ label, value, icon: Icon, color = 'blue', subtitle }) {
  const borderColors = {
    blue: 'border-blue-500/20 bg-gradient-to-b from-blue-500/10 to-slate-800/40',
    green: 'border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-slate-800/40',
    red: 'border-red-500/20 bg-gradient-to-b from-red-500/10 to-slate-800/40',
    yellow: 'border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-slate-800/40',
    purple: 'border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-slate-800/40',
  }

  const iconColors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    red: 'text-red-400 bg-red-500/10 border-red-500/30',
    yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  }

  const valueColors = {
    blue: 'text-white',
    green: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-amber-400',
    purple: 'text-purple-400',
  }

  return (
    <div className={`flex-1 p-5 rounded-2xl border ${borderColors[color]} backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg shadow-black/20`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={`p-2 rounded-xl border ${iconColors[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className={`text-3xl font-extrabold tracking-tight ${valueColors[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
    </div>
  )
}
