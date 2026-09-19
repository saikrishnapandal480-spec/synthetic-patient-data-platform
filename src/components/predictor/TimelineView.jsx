import Badge from '../ui/Badge.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Icon from '../ui/Icon.jsx'

/**
 * Renders the backend's longitudinal observations ({ observation_date,
 * systolic_bp, diastolic_bp, glucose, pain_score, activity_level,
 * medication_adherence, diabetes, hypertension }) as a chronological timeline.
 * Still tolerant of arbitrary event objects ({ date, event_type, description })
 * so it degrades gracefully if the endpoint shape changes again.
 */
const bpTone = (sbp) =>
  sbp == null ? 'bg-slate-400' : sbp >= 140 ? 'bg-rose-400' : sbp >= 130 ? 'bg-amber-400' : 'bg-emerald-400'

export default function TimelineView({ events }) {
  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon="timeline"
        title="No longitudinal observations"
        message="This patient has no stored timeline yet — open the Longitudinal page and select them to generate one."
      />
    )
  }

  const isObservations = (ev) => ev && ('observation_date' in ev || 'systolic_bp' in ev)

  const sorted = [...events].sort((a, b) => {
    const da = a.observation_date || a.date || ''
    const db = b.observation_date || b.date || ''
    return da < db ? -1 : da > db ? 1 : 0
  })

  if (isObservations(sorted[0])) {
    return (
      <ol className="relative ml-3 space-y-0 border-l border-white/10">
        {sorted.map((o, i) => (
          <li key={i} className="ml-6 pb-5 last:pb-0">
            <span className="absolute -left-[11px] mt-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink-800 ring-4 ring-white/5">
              <span className={`h-2 w-2 rounded-full ${bpTone(o.systolic_bp)}`} />
            </span>
            <div className="glass rounded-xl p-4 transition-colors duration-200 hover:border-sky-400/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                  <time className="font-mono text-xs text-sky-300">{o.observation_date}</time>
                  <Badge variant="data">Week {i}</Badge>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      o.hypertension === 'Yes' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    HTN {o.hypertension}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      o.diabetes === 'Yes' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    DM {o.diabetes}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300 sm:grid-cols-3">
                <span>
                  <span className="text-slate-500">BP </span>
                  <span className="font-mono">
                    {o.systolic_bp}/{o.diastolic_bp}
                  </span>
                </span>
                <span>
                  <span className="text-slate-500">Glucose </span>
                  <span className="font-mono">{o.glucose} mg/dL</span>
                </span>
                <span>
                  <span className="text-slate-500">Pain </span>
                  <span className="font-mono">{o.pain_score}/10</span>
                </span>
                <span>
                  <span className="text-slate-500">Activity </span>
                  {o.activity_level}
                </span>
                <span>
                  <span className="text-slate-500">Adherence </span>
                  {o.medication_adherence}
                </span>
                <span>
                  <span className="text-slate-500">Age </span>
                  {o.age != null ? o.age : '—'}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  // Legacy shape fallback ({ date, event_type, severity, description })
  return (
    <ol className="relative ml-3 space-y-0 border-l border-white/10">
      {sorted.map((ev, i) => (
        <li key={i} className="ml-6 pb-6 last:pb-0">
          <span className="absolute -left-[11px] mt-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink-800 ring-4 ring-white/5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          </span>
          <div className="glass rounded-xl p-4 transition-colors duration-200 hover:border-sky-400/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">{ev.event_type || 'Event'}</span>
              <time className="font-mono text-xs text-slate-400">{ev.date}</time>
            </div>
            {ev.description && <p className="mt-2 text-sm leading-relaxed text-slate-300">{ev.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
