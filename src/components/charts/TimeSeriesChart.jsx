import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import EmptyState from '../ui/EmptyState.jsx'

// Shared tooltip styling — exported so custom tooltip renderers elsewhere can
// match this look exactly.
export const chartTooltipStyle = {
  backgroundColor: 'rgba(13, 21, 38, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#e2e8f0',
  padding: '8px 12px',
}

// Time-series line chart over backend timeline observations.
// `series`: [{ key, name, color, yAxis?, strokeDash? }] — values must be
// numeric (map categorical data to ordinal indexes before passing).
// Optional props:
//   yTicks / yTickFormatter / yWidth — readable ordinal Y axes
//     (e.g. "2 Moderate").
//   tooltipContent — custom tooltip renderer receiving Recharts tooltip props
//     ({ active, payload, label }) for label-aware tooltips.
export default function TimeSeriesChart({
  data,
  series,
  xKey = 'date',
  height = 240,
  yDomain,
  yTicks,
  yTickFormatter,
  yWidth = 44,
  tooltipContent,
}) {
  if (!data || data.length === 0) {
    return <EmptyState icon="chart" title="No observations" message="This patient has no longitudinal observations yet." />
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickFormatter={(v) => String(v).slice(5)} // MM-DD
            stroke="rgba(148,163,184,0.25)"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            stroke="rgba(148,163,184,0.25)"
            width={yWidth}
            domain={yDomain || ['auto', 'auto']}
            ticks={yTicks}
            tickFormatter={yTickFormatter}
          />
          <Tooltip contentStyle={chartTooltipStyle} content={tooltipContent} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.strokeDash || undefined}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              yAxisId={s.yAxis || 0}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
