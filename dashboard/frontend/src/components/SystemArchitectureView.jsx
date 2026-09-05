import React, { useState } from 'react'
import { Icons } from './Icons'
import { ArchitectureDiagram } from './ArchitectureDiagram'

export function SystemArchitectureView() {
  const [viewMode, setViewMode] = useState('DIAGRAM') // 'DIAGRAM' | 'CARDS' | 'BOTH'
  const [hoveredCard, setHoveredCard] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)

  const pipelineStages = [
    {
      id: 1,
      stepNumber: '01',
      title: 'Data Ingestion',
      icon: '📥',
      badge: 'Dual Ingestion',
      sublabel: 'invoices.csv + gst_returns.csv',
      inputs: ['invoices.csv (Internal ERP)', 'gst_returns.csv (GSTR-2B)'],
      outputs: ['Sanitized DataFrames', 'Schema-Validated Records'],
      features: [
        'Multi-column CSV stream parsing',
        'ERP ledger & portal return schema alignment',
        'Null value coercion & data-type validation'
      ],
      details: 'Ingests raw transaction exports from ERP ledgers alongside portal GSTR-2B returns for automated pre-processing and field alignment.'
    },
    {
      id: 2,
      stepNumber: '02',
      title: 'Deterministic Core',
      icon: '⚙️',
      badge: '90% F1-Score',
      sublabel: 'Exact Match, ±₹5 Tolerance, SHA-256 Digest, 90% F1-Score',
      inputs: ['Raw Ingestion Stream'],
      outputs: ['Variance Categorization', 'Confidence Vectors'],
      features: [
        'Tier 1: Exact invoice ID & value hash matching',
        'Tier 2: ±₹5 tolerance & date window rounding',
        'SHA-256 integrity digest for audit proofs',
        '90%+ benchmark accuracy on historical test sets'
      ],
      details: 'High-speed deterministic matcher that pairs records with zero false-positives across exact, fuzzy, and tolerance boundaries.'
    },
    {
      id: 3,
      stepNumber: '03',
      title: 'FastAPI Backend & SQLite',
      icon: '⚡',
      badge: 'REST & ACID',
      sublabel: 'Endpoints /summary, /export/exceptions, /audit/log',
      inputs: ['Reconciled Output Stream', 'User Audit Actions'],
      outputs: ['JSON Payloads', 'Persistent audit_log.db'],
      features: [
        'High-performance async ASGI Python server',
        'Endpoints: /summary, /export/exceptions, /audit/log',
        'Local ACID SQLite database with WAL mode',
        'Immutable historical change logs'
      ],
      details: 'Exposes clean RESTful endpoints to trigger reconciliations, query match summaries, export exceptions, and record persistent audit log entries.'
    },
    {
      id: 4,
      stepNumber: '04',
      title: 'Downstream AI Explainer',
      icon: '🤖',
      badge: 'Omniroute Port 20128',
      sublabel: 'Omniroute Port 20128 - auto/claude-sonnet',
      inputs: ['Exception Rows & Discrepancies'],
      outputs: ['Root-Cause Memos', 'Remediation Advice'],
      features: [
        'Integrated via Omniroute (Port 20128)',
        'Model targeting: auto/claude-sonnet / Llama 3',
        'Natural-language supplier discrepancy letters',
        'Automated tax loophole & drift analysis'
      ],
      details: 'Translates numeric mismatches and HSN tax differences into human-readable explanations with suggested vendor loop-closure actions.'
    },
    {
      id: 5,
      stepNumber: '05',
      title: 'React Dashboard',
      icon: '📊',
      badge: 'Real-Time Cockpit',
      sublabel: 'Recharts Summary, Detailed Table, Immutable Audit Log',
      inputs: ['JSON API Feed', 'Audit Log Feed'],
      outputs: ['Interactive Visualization', 'Filterable Grids'],
      features: [
        'Recharts KPI breakdown & match-rate analytics',
        'Detailed high-speed sorting & filtering table',
        'Visual DarkVeil WebGL shader background',
        'Exception inspector drawer with quick actions'
      ],
      details: 'Executive control center providing financial controllers with instant visibility, drill-downs, confidence tags, and export capabilities.'
    },
    {
      id: 6,
      stepNumber: '06',
      title: 'Dynamic Closed-Loop Actions',
      badge: 'SQLite Synced',
      icon: '🔄',
      sublabel: 'Reason-code based action buttons writing to SQLite',
      inputs: ['Manual & Automated Resolution Triggers'],
      outputs: ['Updated Ledger Row', 'Immutable DB Audit Record'],
      features: [
        'Contextual action buttons per reason code',
        'Actions: Accept Variance, Dispute, Credit Note',
        'Direct transactional writes to SQLite audit trail',
        'Instant live KPI and match rate recalculation'
      ],
      details: 'Closes the loop between detection and resolution by empowering tax auditors to record justifications and update record statuses with audit integrity.'
    }
  ]

  const activeStage = selectedCard || (hoveredCard !== null ? pipelineStages.find((s) => s.id === hoveredCard) : null)

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Architecture Pipeline
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Razorpay End-to-End System Architecture
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mt-1">
              Deterministic multi-pass processing pipeline combining raw CSV ingestion, 90% F1 matching, FastAPI microservices, and AI-powered exception closure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950/90 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('DIAGRAM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'DIAGRAM'
                    ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📐 Architecture Diagram</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'CARDS'
                    ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>⚡ Pipeline Cards</span>
              </button>
              <button
                onClick={() => setViewMode('BOTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'BOTH'
                    ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>🔍 Dual View</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Render Architecture Diagram */}
      {(viewMode === 'DIAGRAM' || viewMode === 'BOTH') && (
        <ArchitectureDiagram />
      )}

      {/* Pipeline Grid with Connecting Flow Elements */}
      {(viewMode === 'CARDS' || viewMode === 'BOTH') && (
        <div className="relative space-y-6">
        {/* Horizontal Connector Line (Desktop) */}
        <div className="hidden lg:block absolute top-[50%] left-6 right-6 h-0.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 -translate-y-1/2 opacity-20 pointer-events-none z-0" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {pipelineStages.map((stage, idx) => {
            const isHovered = hoveredCard === stage.id
            const isSelected = selectedCard?.id === stage.id
            const isConnectedInflow = hoveredCard !== null && hoveredCard === stage.id + 1
            const isConnectedOutflow = hoveredCard !== null && hoveredCard === stage.id - 1

            return (
              <div
                key={stage.id}
                onMouseEnter={() => setHoveredCard(stage.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setSelectedCard(isSelected ? null : stage)}
                className={`group relative bg-slate-900 border rounded-xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-500/30 shadow-2xl shadow-sky-500/20 scale-[1.02]'
                    : isHovered
                    ? 'border-emerald-400/80 bg-slate-850 shadow-xl shadow-emerald-500/10 scale-[1.01]'
                    : isConnectedInflow || isConnectedOutflow
                    ? 'border-slate-700 bg-slate-900/95 ring-1 ring-emerald-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Glowing Top Gradient Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-emerald-500 to-sky-500 transition-opacity duration-300 ${
                    isHovered || isSelected ? 'opacity-100' : 'opacity-30'
                  }`}
                />

                {/* Stage Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold text-emerald-400">
                        STAGE {stage.stepNumber}
                      </span>
                      {isHovered && (
                        <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider animate-pulse">
                          Active Focus
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300">
                      {stage.badge}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                      {stage.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                        Card {stage.id}: {stage.title}
                      </h3>
                      <p className="text-xs font-mono text-emerald-400/90 mt-0.5 break-words">
                        {stage.sublabel}
                      </p>
                    </div>
                  </div>

                  {/* Connected Data Flow Indicators */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                        Input Feed:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.inputs.map((inp, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                              isHovered || isSelected
                                ? 'bg-sky-950/70 border border-sky-700/60 text-sky-300'
                                : 'bg-slate-950/80 border border-slate-800 text-slate-400'
                            }`}
                          >
                            {inp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                        Output Result:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.outputs.map((out, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                              isHovered || isSelected
                                ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300'
                                : 'bg-slate-950/80 border border-slate-800 text-slate-400'
                            }`}
                          >
                            {out}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer & Stage Transition Indicator */}
                <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    {isSelected ? 'Selected' : 'Click to inspect'}
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Flow →</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* Interactive Stage Inspector Panel */}
      {activeStage && (viewMode === 'CARDS' || viewMode === 'BOTH') && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                  {activeStage.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">STAGE {activeStage.stepNumber}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-bold text-sky-400">{activeStage.badge}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {activeStage.title}
                  </h3>
                </div>
              </div>

              {selectedCard && (
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-all"
                >
                  Close Specs
                </button>
              )}
            </div>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {activeStage.details}
            </p>

            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-3">
                Technical Specifications & Capabilities:
              </span>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeStage.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-xs text-slate-300 font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
