import Icon from '../ui/Icon.jsx'

// Gantt-style strip chart built strictly from the backend's medication fields:
// { name, dosage, frequency }. No invented start/end dates.
export default function MedicationTimelineChart({ medications }) {
  if (!medications || medications.length === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-center">
        <Icon name="database" className="h-6 w-6 text-slate-500" />
        <p className="text-sm text-slate-400">No medications returned for this patient.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {medications.map((m, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 shrink-0 truncate text-xs font-medium text-slate-300 sm:w-40">
            {m.name}
          </div>
          <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-white/5">
            <div
              className="flex h-full items-center justify-between rounded-lg bg-gradient-to-r from-sky-500/50 to-cyan-400/30 px-3 transition-all duration-300 hover:from-sky-500/70 hover:to-cyan-400/50"
              style={{ width: `${Math.max(45, 100 - i * 12)}%` }}
              title={`${m.name} ${m.dosage} — ${m.frequency}`}
            >
              <span className="truncate font-mono text-[11px] font-semibold text-sky-100">{m.dosage}</span>
              <span className="truncate text-[11px] text-sky-200/80">{m.frequency}</span>
            </div>
 </div>
        </div>
      ))}
    </div>
  )
}
