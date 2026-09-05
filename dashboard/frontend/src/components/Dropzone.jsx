import React, { useState, useCallback } from 'react'
import { Icons } from './Icons'

export function Dropzone({ label, file, onDrop, accept = '.csv' }) {
  const [dragActive, setDragActive] = useState(false)
  
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onDrop(e.dataTransfer.files[0])
    }
  }, [onDrop])

  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      onDrop(e.target.files[0])
    }
  }, [onDrop])

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-7 transition-all duration-300 cursor-pointer ${
        dragActive 
          ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
          : file 
            ? 'border-emerald-500/50 bg-emerald-500/5 shadow-inner'
            : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center text-center select-none">
        {file ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10">
              <Icons.Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white mb-1 truncate max-w-xs">{file.name}</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Ready ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </>
        ) : (
          <>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
              dragActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'
            }`}>
              <Icons.Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-1">{label}</p>
            <p className="text-xs text-slate-500">Drag & drop or click to browse</p>
          </>
        )}
      </div>
    </div>
  )
}
