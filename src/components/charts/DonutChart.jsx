import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from './BarChart.jsx'

const tooltipStyle = {
  backgroundColor: 'rgba(13, 21, 38, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#e2e8f0',
}

export default function DonutChart({ data, height = 260, centerLabel, centerValue }) {
  return (
    <div style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${v.toLocaleString('en-US')} patients`, name]} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.9} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{centerValue}</span>
          <span className="text-xs text-slate-400">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}
