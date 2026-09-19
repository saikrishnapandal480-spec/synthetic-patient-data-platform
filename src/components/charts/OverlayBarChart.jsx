import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const tooltipStyle = {
  backgroundColor: 'rgba(13, 21, 38, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#e2e8f0',
}

const legendStyle = { fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }

export default function OverlayBarChart({
  data,
  xKey = 'label',
  series = [
    { key: 'original', name: 'Original', color: '#38bdf8' },
    { key: 'synthetic', name: 'Synthetic', color: '#fbbf24' },
  ],
  height = 280,
}) {
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
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
          <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              fillOpacity={0.85}
              radius={[5, 5, 0, 0]}
              maxBarSize={30}
            />
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
