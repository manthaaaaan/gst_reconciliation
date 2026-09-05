import React from 'react'
import { Icons } from './Icons'

export function Header({ engineActive, activeTab, onTabChange, auditLogCount = 0, onReset }) {
  return (
    <header className="bg-slate-900/85 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div>
            <span className="text-white font-extrabold text-lg tracking-tight">Razorpay Audit Engine</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v2.1 SQLite
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onTabChange('MAIN')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'MAIN'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icons.FileText className="w-4 h-4" />
            <span>Main Table</span>
          </button>

          <button
            onClick={() => onTabChange('ACTIVITY')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ACTIVITY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icons.ShieldCheck className="w-4 h-4" />
            <span>Activity Log</span>
            {auditLogCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'ACTIVITY'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {auditLogCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('ARCHITECTURE')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ARCHITECTURE'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icons.Cpu className="w-4 h-4" />
            <span>Architecture</span>
          </button>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              New Audit Run
            </button>
          )}

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              engineActive
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-sm shadow-sky-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  engineActive ? 'bg-sky-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  engineActive ? 'bg-sky-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span>{engineActive ? 'Processing...' : 'Engine Ready'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
