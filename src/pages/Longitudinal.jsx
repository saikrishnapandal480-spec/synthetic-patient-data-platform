import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import ChartCard from '../components/ui/ChartCard.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import TimeSeriesChart, { chartTooltipStyle } from '../components/charts/TimeSeriesChart.jsx'
import { categoryToOrdinal } from '../utils/stats.js'
import { buildLongitudinalCsv, downloadCsv } from '../utils/csv.js'
import { api, ApiError } from '../api/client.js'

const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active']
const ADHERENCE_LEVELS = ['High', 'Medium', 'Low']

function trendDirection(first, last) {
  if (first === null || last === null) return { dir: 'unavailable', tone: 'text-slate-400', icon: 'x' }
  const d = last - first
  if (Math.abs(d) < 1e-9) return { dir: 'stable', tone: 'text-slate-300', icon: 'x' }
  return d > 0
    ? { dir: 'increasing', tone: 'text-rose-300', icon: 'alert' }
    : { dir: 'decreasing', tone: 'text-emerald-300', icon: 'check' }
}

function ChangeCard({ label, first, last, unit = '', dp = 0 }) {
  const change = first !== null && last !== null ? last - first : null
  const t = trendDirection(first, last)
  return (
    <div className="glass rounded-2xl p-4 shadow-card">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-sm text-slate-200">
        {first === null ? 'N/A' : first.toFixed(dp)} → {last === null ? 'N/A' : last.toFixed(dp)}
        <span className="text-slate-500"> {unit}</span>
      </p>
      <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${t.tone}`}>
        <Icon name={t.icon} className="h-3.5 w-3.5" />
        {change === null ? 'N/A' : `${change > 0 ? '+' : ''}${change.toFixed(dp)} ${unit}`.trim()}
        {t.dir !== 'unavailable' && change !== null && change !== 0 ? ` · ${t.dir}` : change === 0 ? ' · stable' : ''}
      </p>
    </div>
  )
}

// Visualization-layer mapping of categorical timeline values to numeric
// ordinals. The backend's original categorical values are never modified —
// conversion happens only at render time, case-insensitively and null-safe.
// Mappings are exposed on the component for tests and tooltips.
const ACTIVITY_MAP = { sedentary: 0, light: 1, moderate: 2, active: 3 }
const ADHERENCE_MAP = { high: 0, medium: 1, low: 2 }

function OrdinalChartCard({ field, title, description, data, mapping, levels, tooltipNoun }) {
  // Map each observation's categorical value to its ordinal index. Missing or
  // unexpected values become null → the chart simply skips that point.
  const chartData = useMemo(
    () =>
      data.map((o) => ({
        date: o.observation_date,
        value: categoryToOrdinal(o[field], mapping),
        rawLabel: o[field] ?? null, // original categorical label, for tooltips
      })),
    [data, field, mapping],
  )

  const yTicks = levels.map((_, i) => i)
  const yTickFormatter = (v) => {
    const idx = levels.indexOf(v)
    return idx >= 0 ? v : `${v} ${levels[v] ?? ''}`.trim()
  }

  const tooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    const point = payload[0].payload
    const valueLabel = point.value === null ? 'N/A' : levels[point.value] ?? point.value
    return (
      <div style={chartTooltipStyle}>
        <p className="font-mono text-[11px] text-sky-300">Date: {label}</p>
        <p className="text-[11px]">{tooltipNoun}: {point.rawLabel ?? 'N/A'}</p>
        <p className="text-[11px]">Value: {point.value === null ? 'N/A' : point.value}</p>
        {point.value === null && point.rawLabel == null && (
          <p className="text-[11px] text-slate-500">No value for this observation</p>
        )}
      </div>
    )
  }

  return (
    <ChartCard
      title={title}
      description={description}
      badge={<Badge variant="data">{levels.map((l, i) => `${i} ${l}`).join(' · ')}</Badge>}
    >
      <TimeSeriesChart
        data={chartData}
        series={[{ key: 'value', name: title, color: '#a78bfa' }]}
        yDomain={[-0.3, levels.length - 0.7]}
        yTicks={yTicks}
        yTickFormatter={(v) => `${v} ${levels[v] ?? ''}`.trim()}
        yWidth={74}
        tooltipContent={tooltip}
        height={210}
      />
    </ChartCard>
  )
}

export default function Longitudinal() {
  const [patients, setPatients] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [timeline, setTimeline] = useState(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [error, setError] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [exportInfo, setExportInfo] = useState(null)
  const [exportError, setExportError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    api.patients()
      .then((list) => {
        if (cancelled) return
        const coh = (list || []).filter((p) => String(p?.patient_id || '').startsWith('COH-'))
        setPatients(coh)
        setError(coh.length ? null : 'No COH-* patients found — generate a custom cohort first.')
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not reach the backend patient store.')
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Same COH-* patients as Custom Cohort and the Interaction Predictor — one
  // shared backend list, no separate frontend store.
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setLoadingTimeline(true)
    setTimeline(null)
    setError(null)
    api.timeline(selectedId)
      .then((resp) => {
        if (!cancelled) setTimeline(resp)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : `Failed to load the timeline for ${selectedId}.`)
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeline(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const observations = timeline?.observations || []
  const first = observations[0]
  const last = observations[observations.length - 1]

  const chartData = useMemo(
    () => observations.map((o) => ({
      date: o.observation_date,
      systolic: o.systolic_bp,
      diastolic: o.diastolic_bp,
      glucose: o.glucose,
      pain: o.pain_score,
    })),
    [observations],
  )

  const regenerate = async () => {
    if (!selectedId) return
    setRegenerating(true)
    setError(null)
    try {
      const resp = await api.regenerateTimeline(selectedId)
      setTimeline(resp)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  // SH-405: export the currently loaded patient's observations (actual backend
  // timeline data) as CSV — one row per observation/date.
  const handleExport = () => {
    if (!observations.length) {
      setExportError('No observations to export. Load a patient timeline first.')
      return
    }
    try {
      const { csv, filename } = buildLongitudinalCsv(timeline)
      downloadCsv(csv, filename)
      setExportInfo({
        message: `Exported ${observations.length} observations for ${timeline.patient_id} successfully.`,
        filename,
      })
      setExportError(null)
    } catch (err) {
      setExportError(`Export failed: ${err?.message || 'unknown error'}`)
    }
  }

  const n = (key) => (observations.length ? observations[observations.length - 1][key] : null)
  const val = (key) => (observations.length ? observations[0][key] : null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Longitudinal Patient Timeline"
        description="Chronological observations for the synthetic patients generated by your cohort — values evolve over time under controlled demo rules."
        badge={<Badge variant="data">Backend timeline</Badge>}
      />

      {/* Safety labeling */}
      <div className="glass rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs leading-relaxed text-amber-200/90">
        All patient records and longitudinal observations are synthetic and intended for research/demo prototyping only.
        They are not medical advice and do not represent real patients.
      </div>

      {error && (
        <div className="glass flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-rose-200">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Patient selector — same shared COH-* list as everywhere else */}
      <div className="glass rounded-2xl p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label htmlFor="long-patient" className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Select synthetic patient ({patients.length} available)
            </label>
            <select
              id="long-patient"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-base mt-1.5"
              aria-label="Select synthetic patient"
            >
              <option value="" disabled>
                {loadingList ? 'Loading patients…' : patients.length ? 'Choose a COH-* patient…' : 'No COH-* patients yet'}
              </option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>{p.patient_id}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 sm:mt-5">
            <button onClick={regenerate} disabled={!selectedId || regenerating} className="btn-ghost">
              <Icon name="refresh" className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating…' : 'Regenerate timeline'}
            </button>
            <button onClick={handleExport} disabled={!selectedId || !observations.length} className="btn-ghost" title="Export this patient's observations as CSV">
              <Icon name="download" className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {exportInfo && (
        <div className="glass flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
          <Icon name="check" className="h-4 w-4 shrink-0" />
          <span>
            {exportInfo.message} <span className="font-mono text-xs text-slate-400">({exportInfo.filename})</span>
          </span>
        </div>
      )}
      {exportError && (
        <div className="glass flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-200">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          {exportError}
        </div>
      )}

      {loadingTimeline && (
        <div className="glass flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-slate-400">
          <Icon name="refresh" className="h-5 w-5 animate-spin text-sky-300" />
          Loading longitudinal observations…
        </div>
      )}

      {timeline && !loadingTimeline && (
        <>
          {/* Patient header */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon="users" tone="sky" label="Patient ID" value={timeline.patient_id} sub="Synthetic (COH-*)" />
            <StatCard icon="activity" tone="teal" label="Age" value={`${first?.age ?? '—'} yrs`} sub={`Diabetes ${first?.diabetes ?? '—'} · Hypertension ${last?.hypertension ?? '—'}`} />
            <StatCard icon="chart" tone="violet" label="Observations" value={String(timeline.count)} sub="Weekly, ~6 weeks" />
            <StatCard icon="calendar" tone="rose" label="Timeline span" value={first ? `${first.observation_date.slice(5)} → ${last.observation_date.slice(5)}` : '—'} sub={first ? `${first.observation_date} to ${last.observation_date}` : ''} />
          </div>

          {/* Change summaries (calculated dynamically) */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <ChangeCard label="Systolic BP" first={first?.systolic_bp ?? null} last={last?.systolic_bp ?? null} unit="mmHg" />
            <ChangeCard label="Glucose" first={first?.glucose ?? null} last={last?.glucose ?? null} unit="mg/dL" />
            <ChangeCard label="Pain score" first={first?.pain_score ?? null} last={last?.pain_score ?? null} unit="" />
            <ChangeCard label="Diastolic BP" first={first?.diastolic_bp ?? null} last={last?.diastolic_bp ?? null} unit="mmHg" />
          </div>

          {/* Time-series charts (actual backend data) */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Blood pressure" description="Systolic & diastolic mmHg over observation dates">
              <TimeSeriesChart
                data={chartData}
                series={[
                  { key: 'systolic', name: 'Systolic', color: '#38bdf8' },
                  { key: 'diastolic', name: 'Diastolic', color: '#fb7185' },
                ]}
                height={220}
              />
            </ChartCard>
            <ChartCard title="Glucose" description="mg/dL over observation dates">
              <TimeSeriesChart data={chartData} series={[{ key: 'glucose', name: 'Glucose', color: '#34d399' }]} height={220} />
            </ChartCard>
            <ChartCard title="Pain score" description="0–10 scale over observation dates">
              <TimeSeriesChart data={chartData} series={[{ key: 'pain', name: 'Pain', color: '#fbbf24' }]} yDomain={[-0.3, 10.3]} height={220} />
            </ChartCard>
            <OrdinalChartCard
              field="activity_level"
              title="Activity Level"
              description="Weekly activity level (categorical values plotted via ordinal mapping)"
              data={observations}
              mapping={ACTIVITY_MAP}
              levels={ACTIVITY_LEVELS}
              tooltipNoun="Activity"
            />
            <OrdinalChartCard
              field="medication_adherence"
              title="Medication Adherence"
              description="Weekly medication adherence (categorical values plotted via ordinal mapping)"
              data={observations}
              mapping={ADHERENCE_MAP}
              levels={ADHERENCE_LEVELS}
              tooltipNoun="Adherence"
            />
          </div>

          {/* Modeling notes from the backend */}
          {timeline.modeling_notes && (
            <ChartCard title="How these observations were generated" description="Disclosed demo rules — no clinical validation claimed.">
              <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
                {timeline.modeling_notes.map((note, i) => (
                  <li key={i} className="flex gap-2">
                    <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                    {note}
                  </li>
                ))}
              </ul>
            </ChartCard>
          )}

          {/* Chronological table */}
          <div className="glass rounded-2xl shadow-card">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Observation table (oldest → newest)</h3>
              <Badge variant="data">{observations.length} observations</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Blood pressure</th>
                    <th className="px-4 py-3 font-semibold">Glucose</th>
                    <th className="px-4 py-3 font-semibold">Pain score</th>
                    <th className="px-4 py-3 font-semibold">Activity</th>
                    <th className="px-4 py-3 font-semibold">Medication adherence</th>
                    <th className="px-4 py-3 font-semibold">Diabetes</th>
                    <th className="px-4 py-3 font-semibold">Hypertension</th>
                  </tr>
                </thead>
                <tbody>
                  {observations.map((o) => (
                    <tr key={o.observation_date} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5 font-mono text-xs text-sky-300">{o.observation_date}</td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {o.systolic_bp}/{o.diastolic_bp}
                        <span className={`ml-2 text-[11px] ${o.systolic_bp >= 140 ? 'text-rose-300' : o.systolic_bp >= 130 ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {o.systolic_bp >= 140 ? 'high' : o.systolic_bp >= 130 ? 'elevated' : 'normal'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{o.glucose} mg/dL</td>
                      <td className="px-4 py-2.5 text-slate-300">{o.pain_score}/10</td>
                      <td className="px-4 py-2.5 text-slate-300">{o.activity_level}</td>
                      <td className="px-4 py-2.5 text-slate-300">{o.medication_adherence}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${o.diabetes === 'Yes' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                          {o.diabetes}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${o.hypertension === 'Yes' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                          {o.hypertension}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedId && !loadingTimeline && (
        <div className="mx-auto max-w-2xl pt-6">
          <EmptyState
            icon="timeline"
            title="No patient selected"
            message="Pick one of the generated COH-* patients above — their weekly observations will load from the backend."
          />
        </div>
      )}
    </div>
  )
}
