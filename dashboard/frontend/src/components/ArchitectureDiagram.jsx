import React, { useState, useEffect } from 'react'
import { Icons } from './Icons'

export function ArchitectureDiagram() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Keyboard shortcut: Escape to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Architecture Blueprint
          </div>
          <span className="text-xs text-slate-300 font-medium hidden md:inline">
            High-tech pipeline flow diagram from Data Ingestion to Downstream AI & SQLite
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              className="px-3 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-bold"
              title="Zoom out"
            >
              −
            </button>
            <span className="px-3 text-xs font-mono text-emerald-400 font-bold min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
              className="px-3 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-bold"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-mono font-bold"
              title="Reset Zoom"
            >
              Fit
            </button>
          </div>

          {/* Download Image Button */}
          <a
            href="/architecture_diagram.jpg"
            download="razorpay_audit_architecture.jpg"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Icons.Upload className="w-3.5 h-3.5 rotate-180" />
            <span>Download HD</span>
          </a>

          {/* Fullscreen presentation toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Icons.Zap className="w-4 h-4" />
            <span>{isFullscreen ? 'Exit Presentation' : 'Full Screen Demo Mode'}</span>
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-8 overflow-hidden shadow-2xl flex justify-center items-center relative backdrop-blur-2xl min-h-[550px] w-full group">
        <div className="relative overflow-auto max-h-[750px] w-full flex justify-center items-center">
          <img
            src="/architecture_diagram.jpg"
            alt="Razorpay System Architecture Diagram"
            style={{ transform: `scale(${zoomLevel})` }}
            className="max-w-full h-auto rounded-2xl transition-transform duration-300 ease-out shadow-2xl border border-slate-800/80 select-none object-contain"
          />
        </div>
      </div>

      {/* Fullscreen Demo Presentation Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/98 flex flex-col p-6 sm:p-8 animate-fade-in overflow-hidden backdrop-blur-3xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Razorpay Automated Reconciliation Architecture — Demo Mode
              </h2>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                1080p Ultra HD View
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
                  className="px-3 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
                >
                  Zoom −
                </button>
                <span className="px-3 text-xs font-mono text-emerald-400 font-bold min-w-[50px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3.0, Number((z + 0.2).toFixed(2))))}
                  className="px-3 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
                >
                  Zoom +
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono font-bold rounded-lg"
                >
                  Fit 100%
                </button>
              </div>

              <button
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all shadow-lg shadow-black/40"
              >
                <Icons.Close className="w-4 h-4" />
                <span>Exit Demo Mode (Esc)</span>
              </button>
            </div>
          </div>

          {/* Modal Center Image Display */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-900 shadow-inner">
            <img
              src="/architecture_diagram.jpg"
              alt="Razorpay System Architecture Diagram"
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-2xl transition-transform duration-300 ease-out shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  )
}
