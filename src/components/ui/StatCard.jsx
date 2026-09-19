import Icon from './Icon.jsx'

export default function StatCard({ icon, label, value, sub, tone = 'sky', delta }) {
  const tones = {
    sky: 'bg-sky-500/10 text-sky-300 border-sky-400/20',
    teal: 'bg-teal-500/10 text-teal-300 border-teal-400/20',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-400/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-400/20',
  }
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
        {delta != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              delta >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
            }`}
          >
            {delta >= 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
