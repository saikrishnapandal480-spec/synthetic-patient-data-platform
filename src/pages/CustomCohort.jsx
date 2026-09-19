import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import ChartCard from '../components/ui/ChartCard.jsx'
import Icon from '../components/ui/Icon.jsx'
import BarChart from '../components/charts/BarChart.jsx'
import DonutChart from '../components/charts/DonutChart.jsx'
import Alert from '../components/predictor/Alert.jsx'
import { useApp } from '../state/AppContext.jsx'
import { COHORT_CONTROL_OPTIONS } from '../data/mockData.js'
import { fmtInt, fmtNum1, fmtPct } from '../utils/format.js'

const SLIDER_FIELDS = [
  { key: 'older', label: 'Older patients (60+)', hint: 'Share of cohort aged 60 or above' },
  { key: 'diabetes', label: 'Diabetic patients', hint: 'Share flagged as diabetic' },
  { key: 'hypertension', label: 'Hypertensive patients', hint: 'Share with systolic ≥ 140 mmHg' },
]

function RequestedActualRow({ label, requested, actual, unit = '%', good = true }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">{fmtNum1(requested)}{unit}</span>
        <Icon name="check" className={`h-3.5 w-3.5 ${good ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span className={`w-14 text-right text-sm font-semibold ${good ? 'text-emerald-300' : 'text-amber-300'}`}>{fmtNum1(actual)}{unit}</span>
      </div>
    </div>
  )
}

function NumberSlider({ label, hint, value, onChange, min = 0, max = 100, step = 5 }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="font-mono text-sm font-semibold text-sky-300">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-sky-400"
        aria-label={label}
      />
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

export default function CustomCohort() {
  const { customCohort, customCohortStatus, generateCustomCohort } = useApp()

  const [count, setCount] = useState(100)
  const [pct, setPct] = useState({ older: 60, diabetes: 40, hypertension: 45 })
  const [activity, setActivity] = useState('any')
  const [adherence, setAdherence] = useState('any')
  const [painMode, setPainMode] = useState('any')
  const [exactPain, setExactPain] = useState(4)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const generating = customCohortStatus === 'generating'

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    // Client-side validation mirrors the backend contract.
    const errs = []
    if (!Number.isFinite(count) || count < 1) errs.push('Patient count must be a positive number.')
    if (count > 5000) errs.push('Patient count must not exceed 5000 per request.')
    for (const [key, label] of [['older', 'Older patient %'], ['diabetes', 'Diabetes %'], ['hypertension', 'Hypertension %']]) {
      if (pct[key] < 0 || pct[key] > 100) errs.push(`${label} must be between 0 and 100.`)
    }
    if (errs.length) {
      setError(errs.join(' '))
      return
    }
    const params = {
      patient_count: count,
      older_patient_percentage: pct.older,
      diabetes_percentage: pct.diabetes,
      hypertension_percentage: pct.hypertension,
      activity_level: activity,
      medication_adherence: adherence,
      pain_score: painMode === 'exact' ? exactPain : painMode,
    }
    const res = await generateCustomCohort(params)
    if (res.ok) {
      setSuccessMsg(`Custom cohort generated — ${fmtInt(res.resp.actual_patient_count)} synthetic patients created and shared with the Dashboard, Validation and ADR Predictor views.`)
    } else {
      setError(res.error)
    }
  }

  const dist = customCohort?.distributions
  const activityData = useMemo(
    () => (dist ? dist.activity.map((d) => ({ label: d.label, value: d.count })) : []),
    [dist],
  )
  const adherenceData = useMemo(
    () => (dist ? dist.medication_adherence.map((d) => ({ label: d.label, value: d.count })) : []),
    [dist],
  )
  const painBands = useMemo(() => {
    if (!dist) return []
    const band = (s) => (s <= 3 ? 'Low (0–3)' : s <= 6 ? 'Moderate (4–6)' : 'Severe (7–10)')
    const agg = {}
    dist.pain_score.forEach((d) => {
      const b = band(Number(d.label))
      agg[b] = (agg[b] || 0) + d.count
    })
    return ['Low (0–3)', 'Moderate (4–6)', 'Severe (7–10)'].map((b) => ({ label: b, value: agg[b] || 0 }))
  }, [dist])

  const preview = customCohort?.patients?.slice(0, 8) || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Cohort"
        description="Define cohort requirements — older-patient share, diabetes, hypertension, activity, adherence and pain — and generate a synthetic cohort matched to them on the backend."
        badge={<Badge variant="data">Backend-driven</Badge>}
      />

      {/* Connection / provenance notice */}
      <Alert kind="info">
        Generation runs on the FastAPI backend against the 140-patient Synthea source sample. Activity level and
        medication adherence are not present in the source — they are produced by the documented SH-405 derived
        layer. All records are <strong>synthetic demo data</strong>, not medical advice.
      </Alert>

      {error && <Alert kind="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert kind="success" onDismiss={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <div className="grid gap-6 xl:grid-cols-5">
        {/* -------- Controls -------- */}
        <form onSubmit={submit} className="glass rounded-2xl p-5 shadow-card xl:col-span-2">
          <h3 className="text-sm font-semibold text-white">Cohort requirements</h3>
          <p className="mt-0.5 text-xs text-slate-500">Requested values are matched by the generator.</p>

          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="cc-count" className="text-sm font-medium text-slate-300">Number of patients</label>
                <span className="font-mono text-sm font-semibold text-sky-300">{count || ''}</span>
              </div>
              <input
                id="cc-count"
                type="number"
                min={1}
                max={5000}
                value={count}
                onChange={(e) => setCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-base mt-2"
                aria-label="Number of patients"
              />
              <p className="mt-1 text-xs text-slate-500">1 – 5,000 patients per cohort.</p>
            </div>

            {SLIDER_FIELDS.map((f) => (
              <NumberSlider
                key={f.key}
                label={f.label}
                hint={f.hint}
                value={pct[f.key]}
                onChange={(v) => setPct((p) => ({ ...p, [f.key]: v }))}
              />
            ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cc-activity" className="text-sm font-medium text-slate-300">Activity level</label>
                <select id="cc-activity" value={activity} onChange={(e) => setActivity(e.target.value)} className="input-base mt-2">
                  {COHORT_CONTROL_OPTIONS.activity.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cc-adherence" className="text-sm font-medium text-slate-300">Medication adherence</label>
                <select id="cc-adherence" value={adherence} onChange={(e) => setAdherence(e.target.value)} className="input-base mt-2">
                  {COHORT_CONTROL_OPTIONS.adherence.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cc-pain" className="text-sm font-medium text-slate-300">Pain score</label>
                <select id="cc-pain" value={painMode} onChange={(e) => setPainMode(e.target.value)} className="input-base mt-2">
                  {COHORT_CONTROL_OPTIONS.pain.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {painMode === 'exact' && (
                <div>
                  <label htmlFor="cc-pain-exact" className="text-sm font-medium text-slate-300">Exact score</label>
                  <input
                    id="cc-pain-exact"
                    type="number"
                    min={0}
                    max={10}
                    value={exactPain}
                    onChange={(e) => setExactPain(Number(e.target.value))}
                    className="input-base mt-2"
                    aria-label="Exact pain score"
                  />
                  <p className="mt-1 text-xs text-slate-500">Integer 0–10.</p>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary w-full justify-center" disabled={generating}>
              {generating ? (
                <>
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Icon name="sparkles" className="h-4 w-4" />
                  Generate Custom Cohort
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-600">
              POST /api/cohort/generate · records are persisted so the ADR Predictor can load them
            </p>
          </div>
        </form>

        {/* -------- Results -------- */}
        <div className="space-y-4 xl:col-span-3">
          {!customCohort && !generating && (
            <div className="glass flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl p-8 text-center shadow-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                <Icon name="cohort" className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">No custom cohort yet</h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                Set your cohort requirements on the left and press <span className="font-semibold text-slate-300">Generate
                Custom Cohort</span>. Requested vs actual statistics, distributions and a record preview will appear here.
              </p>
            </div>
          )}

          {generating && (
            <div className="glass flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl p-8 text-center shadow-card">
              <Icon name="refresh" className="h-8 w-8 animate-spin text-sky-300" />
              <h3 className="mt-4 text-sm font-semibold text-white">Generating synthetic cohort…</h3>
              <p className="mt-1 text-xs text-slate-500">Resampling the source pool and applying your requirements.</p>
            </div>
          )}

          {customCohort && !generating && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard icon="users" tone="sky" label="Generated" value={fmtInt(customCohort.actualPatientCount)} sub={`Requested ${fmtInt(customCohort.requestedPatientCount)}`} />
                <StatCard icon="activity" tone="teal" label="Older (60+)" value={fmtPct(customCohort.actual.older_patient_percentage)} sub={`Requested ${fmtNum1(customCohort.requested.older_patient_percentage)}%`} />
                <StatCard icon="heart" tone="rose" label="Diabetic" value={fmtPct(customCohort.actual.diabetes_percentage)} sub={`Requested ${fmtNum1(customCohort.requested.diabetes_percentage)}%`} />
                <StatCard icon="chart" tone="violet" label="Hypertensive" value={fmtPct(customCohort.actual.hypertension_percentage)} sub={`Requested ${fmtNum1(customCohort.requested.hypertension_percentage)}%`} />
              </div>

              {/* Requested vs actual */}
              <ChartCard
                title="Requested vs actual"
                description="Deterministic quotas keep the generated cohort on target."
                badge={<Badge variant="success">Matched</Badge>}
              >
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px] uppercase tracking-wide text-slate-500">
                  <span />
                  <span>Requested</span>
                  <span>Actual</span>
                </div>
                <RequestedActualRow label="Older patients (60+)" requested={customCohort.requested.older_patient_percentage} actual={customCohort.actual.older_patient_percentage} />
                <RequestedActualRow label="Diabetic patients" requested={customCohort.requested.diabetes_percentage} actual={customCohort.actual.diabetes_percentage} />
                <RequestedActualRow label="Hypertensive patients" requested={customCohort.requested.hypertension_percentage} actual={customCohort.actual.hypertension_percentage} />
                <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <span>Activity: <span className="text-slate-200">{customCohort.requested.activity_level}</span></span>
                  <span>Adherence: <span className="text-slate-200">{customCohort.requested.medication_adherence}</span></span>
                  <span>Pain: <span className="text-slate-200">{String(customCohort.requested.pain_score)}</span></span>
                  <span>Generated: <span className="text-slate-200">{new Date(customCohort.generatedAt).toLocaleTimeString()}</span></span>
                </div>
              </ChartCard>

              {/* Distributions */}
              <div className="grid gap-4 lg:grid-cols-3">
                <ChartCard title="Activity distribution" description="Derived SH-405 layer">
                  <DonutChart data={activityData} height={200} />
                </ChartCard>
                <ChartCard title="Medication adherence" description="Derived SH-405 layer">
                  <DonutChart data={adherenceData} height={200} />
                </ChartCard>
                <ChartCard title="Pain score bands" description="0–10 scale">
                  <BarChart data={painBands} height={200} />
                </ChartCard>
              </div>

              {/* Preview table */}
              <div className="glass rounded-2xl shadow-card">
                <div className="flex items-center justify-between border-b border-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Patient preview</h3>
                  <Badge variant="mock">First {preview.length} of {fmtInt(customCohort.actualPatientCount)}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 font-semibold">Patient ID</th>
                        <th className="px-4 py-3 font-semibold">Age</th>
                        <th className="px-4 py-3 font-semibold">Gender</th>
                        <th className="px-4 py-3 font-semibold">Diabetes</th>
                        <th className="px-4 py-3 font-semibold">BP</th>
                        <th className="px-4 py-3 font-semibold">Glucose</th>
                        <th className="px-4 py-3 font-semibold">Pain</th>
                        <th className="px-4 py-3 font-semibold">Activity</th>
                        <th className="px-4 py-3 font-semibold">Adherence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p) => (
                        <tr key={p.patientId} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                          <td className="px-4 py-2.5 font-mono text-xs text-sky-300">{p.patientId}</td>
                          <td className="px-4 py-2.5 text-slate-300">{p.age}</td>
                          <td className="px-4 py-2.5 text-slate-300">{p.gender}</td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.diabetes ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                              {p.diabetes ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{p.systolic}/{p.diastolic}</td>
                          <td className="px-4 py-2.5 text-slate-300">{p.glucose ?? '—'} mg/dL</td>
                          <td className="px-4 py-2.5 text-slate-300">{p.painScore}/10</td>
                          <td className="px-4 py-2.5 text-slate-300">{p.activity}</td>
                          <td className="px-4 py-2.5 text-slate-300">{p.adherence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modeling notes */}
              <ChartCard title="Modeling notes" description="Exactly how this cohort was produced — no hidden assumptions.">
                <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
                  {customCohort.modelingNotes.map((note, i) => (
                    <li key={i} className="flex gap-2">
                      <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                      {note}
                    </li>
                  ))}
                </ul>
              </ChartCard>

              {/* Integration strip */}
              <div className="glass rounded-2xl p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This cohort is now available in</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/dashboard" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/30 hover:text-slate-100">
                    <Icon name="dashboard" className="mr-1.5 inline h-3.5 w-3.5" />Dashboard
                  </Link>
                  <Link to="/synthetic-data" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/30 hover:text-slate-100">
                    <Icon name="synthetic" className="mr-1.5 inline h-3.5 w-3.5" />Synthetic Data
                  </Link>
                  <Link to="/validation" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/30 hover:text-slate-100">
                    <Icon name="validation" className="mr-1.5 inline h-3.5 w-3.5" />Validation
                  </Link>
                  <Link to="/predictor" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/30 hover:text-slate-100">
                    <Icon name="heart" className="mr-1.5 inline h-3.5 w-3.5" />ADR Predictor
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
