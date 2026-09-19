import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Icon from '../ui/Icon.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const WORD_TO_VALUE = { none: 0, mild: 3, moderate: 5, severe: 8 }

function toValue(s) {
  const raw = String(s.severity ?? '').trim()
  if (/^\d+$/.test(raw)) return Number(raw)
  return WORD_TO_VALUE[raw.toLowerCase()] ?? null
}

export function parseSeverity(series) {
  return series
  .map((s) => ({
    date: s.date_reported,
    value: toValue(s),
    name: s.name,
  }))
  .filter((d) => d.value !== null && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
  .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export default function SeverityChart({ symptoms }) {
  const data = parseSeverity(symptoms || [])

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-center">
        <Icon name="chart" className="h-6 w-6 text-slate-500" />
        <p className="text-sm text-slate-400">No numeric severity data available for this patient.</p>
        <p className="text-xs text-slate-500">Symptoms must include a severity of 0–10 or None/Mild/Moderate/Severe to plot.</p>
      </div>
    )
  }

  return (
    <div style={{ height: 260 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(148,163,184,0.15)' }} tickLine={false} />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(13, 21, 38, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
            formatter={(v, _n, item) => [`${v} / 10`, item?.payload?.name || 'Severity']}
          />
          <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4, fill: '#38bdf8' }} activeDot={{ r: 5 }} />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
