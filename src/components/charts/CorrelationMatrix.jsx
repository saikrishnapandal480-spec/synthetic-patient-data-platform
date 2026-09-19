function cellColor(v) {
  if (v === null || v === undefined) return 'rgba(148, 163, 184, 0.08)'
  if (v >= 0) {
    const t = Math.min(1, v)
    return `rgba(56, 189, 248, ${0.08 + 0.72 * t})`
  }
  const t = Math.min(1, -v)
  return `rgba(251, 113, 133, ${0.08 + 0.72 * t})`
}

function cellText(v) {
  if (v === null || v === undefined) return 'N/A'
  return v.toFixed(2)
}

function cellTextColor(v, isDiagonal) {
  if (isDiagonal) return '#cbd5e1'
  if (v === null || v === undefined) return '#64748b'
  return Math.abs(v) > 0.45 ? '#0b1120' : '#e2e8f0'
}

export default function CorrelationMatrix({ fields, matrix, height }) {
  return (
    <div className="overflow-x-auto pb-1">
      <table className="w-full min-w-[520px] border-separate" style={{ borderSpacing: '3px' }}>
        <thead>
          <tr>
            <th className="w-20" />
            {fields.map((f) => (
              <th
                key={f}
                className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={fields[i]}>
              <td className="pr-2 text-right text-[11px] font-medium text-slate-400">{fields[i]}</td>
              {row.map((v, j) => (
                <td key={j} className="p-0">
                  <div
                    className="flex h-11 items-center justify-center rounded-lg text-[11px] font-semibold transition-transform duration-150 hover:scale-105"
                    style={{
                      backgroundColor: i === j ? 'rgba(148,163,184,0.15)' : cellColor(v),
                      color: cellTextColor(v, i === j),
                    }}
                    title={`${fields[i]} ↔ ${fields[j]}: ${i === j ? '1.0' : cellText(v)}`}
                  >
                    {i === j ? '1.0' : cellText(v)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(56,189,248,0.8)' }} /> positive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(148,163,184,0.2)' }} /> none
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(251,113,133,0.8)' }} /> negative
        </span>
      </div>
    </div>
  )
}
