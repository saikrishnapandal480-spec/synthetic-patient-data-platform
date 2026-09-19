import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export const CHART_COLORS = ['#38bdf8', '#2dd4bf', '#a78bfa', '#fbbf24', '#fb7185', '#34d399', '#60a5fa', '#f472b6']

const tooltipStyle = {
  backgroundColor: 'rgba(13, 21, 38, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#e2e8f0',
  boxShadow: '0 12px 32px -12px rgba(2, 8, 23, 0.9)',
}

export default function BarChart({ data, xKey = 'label', yKey = 'value', height = 260, color = '#38bdf8', multicolor = false, unit = '' }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            formatter={(v) => [`${v.toLocaleString('en-US')}${unit}`, 'Patients']}
          />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((_, i) => (
              <Cell key={i} fill={multicolor ? CHART_COLORS[i % CHART_COLORS.length] : color} fillOpacity={0.85} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
