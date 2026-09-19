import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Icon from '../components/ui/Icon.jsx'

const SAMPLE_FILE = { name: 'cardio_cohort_2024.csv', size: '4.2 MB' }

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle') // idle | uploading | ready
  const [progress, setProgress] = useState(0)

  const startUpload = (f) => {
    setFile(f)
    setStatus('uploading')
    setProgress(0)
    // Mock upload progress — no network request is made.
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer)
          setStatus('ready')
          return 100
        }
        return p + 10
      })
    }, 90)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    startUpload(
      dropped
        ? { name: dropped.name, size: `${(dropped.size / 1024 / 1024).toFixed(1)} MB` }
        : { name: 'dropped_file.csv', size: '— MB' },
    )
  }

  const onBrowse = (e) => {
    const picked = e.target.files?.[0]
    if (picked) startUpload({ name: picked.name, size: `${(picked.size / 1024 / 1024).toFixed(1)} MB` })
  }

  const useSample = () => startUpload(SAMPLE_FILE)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Upload Dataset"
        description="Upload a healthcare dataset in CSV format to begin the analysis and synthetic generation workflow."
        badge={<Badge variant="mock">Demo — no data leaves your browser</Badge>}
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`glass flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300 ${
          dragging
            ? 'border-sky-400/60 bg-sky-400/10 shadow-glow'
            : 'border-white/15 hover:border-sky-400/30'
        }`}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors duration-300 ${
            dragging ? 'border-sky-400/40 bg-sky-400/15 text-sky-200' : 'border-white/10 bg-white/5 text-sky-300'
          }`}
        >
          <Icon name="upload" className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-white">
          {dragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
        </h3>
        <p className="mt-1.5 text-sm text-slate-400">or choose one of the options below</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary" onClick={() => inputRef.current?.click()}>
            <Icon name="file" className="h-4 w-4" />
            Browse Files
          </button>
          <button className="btn-ghost" onClick={useSample}>
            <Icon name="sparkles" className="h-4 w-4" />
            Use Sample Dataset
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onBrowse}
          aria-label="Browse CSV files"
        />
        <p className="mt-5 text-xs text-slate-500">Supported format: CSV · Max demo size 50 MB · Patient data never uploaded in demo mode</p>
      </div>

      {/* Selected file / upload status */}
      {file && (
        <div className="glass mt-6 rounded-2xl p-5 shadow-card animate-fade-up">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
              <Icon name="file" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                <span className="text-xs text-slate-500">{file.size}</span>
              </div>

              {status === 'uploading' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Uploading… (simulated)</span>
                    <span className="font-semibold text-sky-300">{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {status === 'ready' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    <Icon name="check" className="h-3.5 w-3.5" />
                    Ready — validation passed (mock)
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                    11 columns detected
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                    UTF-8 · comma-separated
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expected schema hint */}
      <div className="glass mt-6 rounded-2xl p-5 shadow-card">
        <h4 className="text-sm font-semibold text-white">Expected columns</h4>
        <p className="mt-1 text-xs text-slate-500">
          The sample dataset uses this schema; other column names can be mapped later.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['patient_id', 'name', 'age', 'gender', 'diabetes', 'systolic_bp', 'diastolic_bp', 'pain_score', 'activity_level', 'bmi', 'visit_date'].map((c) => (
            <span key={c} className="rounded-lg border border-white/10 bg-ink-800/70 px-2.5 py-1 font-mono text-[11px] text-slate-300">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Continue */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {status === 'ready' ? 'All set — continue to the analysis step.' : 'Select or simulate a file to continue.'}
        </p>
        <button className="btn-primary" disabled={status !== 'ready'} onClick={() => navigate('/analysis')}>
          Continue to Analysis
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
