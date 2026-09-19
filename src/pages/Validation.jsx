import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import OverlayBarChart from '../components/charts/OverlayBarChart.jsx'
import CorrelationMatrix from '../components/charts/CorrelationMatrix.jsx'
import { useApp } from '../state/AppContext.jsx'
import { api as apiClient } from '../api/client.js'
import { describeNumeric, categoricalCounts, numericStatus, categoricalStatus } from '../utils/stats.js'
import { backendPatientsToCanonical, CORRELATION_FIELDS, CORRELATION_MATRIX, computeCorrelationMatrix } from '../data/mockData.js'
import {
  ORIGINAL_PATIENTS,
  getOriginalAgeHistogram,
  getOriginalBpHisto,
  getOriginalPainHistogram,
  getOriginalActivityHistogram,
  getSyntheticAgeHistogram,
  getSyntheticBpHisto,
  getSyntheticPainHistogram,
} from '../data/mockData.js'
import { fmtInt, fmtNum1, fmtPct } from '../utils/format.js'

// --- Metric definitions (accessors shared by both datasets) -----------------
const num = (get, label, unit, dp = 1) => ({ kind: 'numeric', label, unit, dp, get })
const cat = (get, label, order) => ({ kind: 'categorical', label, order, get })

const METRICS = [
  num((p) => p.age, 'Age', 'yrs'),
  num((p) => p.systolic, 'Systolic BP', 'mmHg'),
  num((p) => p.diastolic, 'Diastolic BP', 'mmHg'),
  num((p) => p.painScore, 'Pain score', '/10'),
  num((p) => p.glucose, 'Glucose', 'mg/dL'),
  num((p) => p.bmi, 'BMI', ''),
  cat((p) => (p.diabetes ? 'Yes' : 'No'), 'Diabetes', ['Yes', 'No']),
  cat((p) => (p.systolic >= 140 ? 'Yes' : 'No'), 'Hypertension (systolic ≥ 140)', ['Yes', 'No']),
  cat((p) => p.activity, 'Physical activity', ['Sedentary', 'Light', 'Moderate', 'Active']),
  cat((p) => p.adherence, 'Medication adherence', ['High', 'Medium', 'Low']),
]

const STATUS_STYLES = {
  match: { cls: 'bg-emerald-400/10 text-emerald-300', label: 'match' },
  close: { cls: 'bg-amber-400/10 text-amber-300', label: 'close' },
  differs: { cls: 'bg-rose-400/10 text-rose-300', label: 'differs' },
  unavailable: { cls: 'bg-white/5 text-slate-400', label: 'N/A' },
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unavailable
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  )
}

function fmtVal(v, dp) {
  return v === null || v === undefined ? 'N/A' : v.toFixed(dp)
}

// Full description of one metric over one record set, computed from the
// actual records. Numeric metrics keep nulls out of the numeric stats.
function describeMetric(metric, patients) {
  const vals = patients.map(metric.get)
  if (metric.kind === 'numeric') {
    const d = describeNumeric(vals)
    return { ...d, dist: categoricalCounts(vals) }
  }
  return categoricalCounts(vals, metric.order)
}

function NumericRow({ metric, orig, synth }) {
  const [open, setOpen] = useState(false)
  const diff = synth.mean !== null && orig.mean !== null ? synth.mean - orig.mean : null
  const status = numericStatus(orig.mean, synth.mean, orig.stdDev)
  const closeDiff = diff !== null && orig.stdDev !== null && Math.abs(diff) <= orig.stdDev * 0.1
  return (
    <>
      <tr className="border-b border-white/5">
        <td className="px-4 py-2.5 text-sm text-slate-300">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-left transition-colors hover:text-white"
            aria-expanded={open}
          >
            <Icon name="chevronRight" className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
            {metric.label}
          </button>
        </td>
        <td className="px-4 py-2.5 text-right text-sm font-semibold text-sky-300">
          {fmtVal(orig.mean, metric.dp)}{' '}{metric.unit}
        </td>
        <td className="px-4 py-2.5 text-right text-sm font-semibold text-amber-300">
          {fmtVal(synth.mean, metric.dp)}{' '}{metric.unit}
        </td>
        <td className={`px-4 py-2.5 text-right text-sm ${diff === null ? 'text-slate-500' : closeDiff ? 'text-emerald-300' : 'text-slate-300'}`}>
          {diff === null ? 'N/A' : `${diff > 0 ? '+' : ''}${diff.toFixed(metric.dp)} ${metric.unit}`}
        </td>
        <td className="px-4 py-2.5 text-right"><StatusChip status={status} /></td>
      </tr>
      {open && (
        <tr className="border-b border-white/5 bg-white/[0.02]">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-5 gap-3 text-center text-[11px]">
              {[
                ['Median', orig.median, synth.median],
                ['Std dev', orig.stdDev, synth.stdDev],
                ['Min', orig.min, synth.min],
                ['Max', orig.max, synth.max],
                ['Valid n', orig.n, synth.n],
              ].map(([name, ov, sv]) => (
                <div key={name}>
                  <p className="text-slate-500">{name}</p>
                  <p className="mt-0.5 text-sky-300">{name === 'Valid n' ? ov : fmtVal(ov, metric.dp)}</p>
                  <p className="text-amber-300">{name === 'Valid n' ? sv : fmtVal(sv, metric.dp)}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CategoricalSide({ cats, labels, tone }) {
  if (!cats.total) {
    return <span className="text-xs text-slate-500">N/A — not in this dataset</span>
  }
  const byLabel = Object.fromEntries(cats.categories.map((c) => [c.label, c]))
  const color = tone === 'orig' ? 'text-sky-300' : 'text-amber-300'
  return (
    <div className="space-y-0.5">
      {labels.map((l) => (
        <div key={l} className={`text-xs ${color}`}>
          <span className="font-semibold">{fmtNum1(byLabel[l]?.pct ?? 0)}%</span>{' '}
          <span className="text-slate-500">({byLabel[l]?.count ?? 0})</span>
          <span className="ml-1 text-[10px] text-slate-600">{l}</span>
        </div>
      ))}
    </div>
  )
}

function CategoricalRow({ metric, orig, synth }) {
  const oMap = Object.fromEntries(orig.categories.map((c) => [c.label, c]))
  const sMap = Object.fromEntries(synth.categories.map((c) => [c.label, c]))
  const labels = [...new Set([...orig.categories, ...synth.categories].map((c) => c.label))]
  const bothHaveData = orig.total > 0 && synth.total > 0
  // Status from the largest actual percentage-point gap — only when BOTH
  // sides carry data; a missing source field is N/A, never "differs".
  let worstPp = 0
  if (bothHaveData) {
    labels.forEach((l) => {
      const pp = Math.abs((sMap[l]?.pct ?? 0) - (oMap[l]?.pct ?? 0))
      if (pp > worstPp) worstPp = pp
    })
  }
  const status = bothHaveData ? categoricalStatus(0, worstPp) : 'unavailable'
  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-2.5 text-sm text-slate-300">{metric.label}</td>
      <td className="px-4 py-2.5 text-right">
        <CategoricalSide cats={orig} labels={labels} tone="orig" />
      </td>
      <td className="px-4 py-2.5 text-right">
        <CategoricalSide cats={synth} labels={labels} tone="synth" />
      </td>
      <td className={`px-4 py-2.5 text-right text-sm ${!bothHaveData ? 'text-slate-500' : worstPp <= 5 ? 'text-emerald-300' : 'text-slate-300'}`}>
        {bothHaveData ? `±${fmtNum1(worstPp)} pp` : 'N/A'}
      </td>
      <td className="px-4 py-2.5 text-right"><StatusChip status={status} /></td>
    </tr>
  )
}

function pairize(orig, synth) {
  return orig.map((o, i) => ({
    label: o.label,
    original: o.original ?? o.value,
    synthetic: synth[i].synthetic ?? synth[i].value,
  }))
}

export default function Validation() {
  const { syntheticPatients } = useApp()
  const [backendCohort, setBackendCohort] = useState(null)
  const [loadingCohort, setLoadingCohort] = useState(false)

  // Refresh persistence: if the in-session cohort is unavailable (fresh tab,
  // cleared storage), recover the CURRENT generated cohort from the backend's
  // latest-cohort record — the same store Custom Cohort and the ADR Predictor
  // use. Falls back to COH-* records from GET /api/patients if metadata is absent.
  useEffect(() => {
    if (syntheticPatients) return
    let cancelled = false
    setLoadingCohort(true)
    const fromList = (list) => {
      const coh = (Array.isArray(list) ? list : []).filter((p) =>
        String(p?.patient_id || '').startsWith('COH-'),
      )
      setBackendCohort(coh.length ? backendPatientsToCanonical(coh) : [])
    }
    apiClient.latestCohort()
      .then((resp) => {
        if (cancelled) return
        if (resp?.status === 'no_cohort' || !Array.isArray(resp?.patients) || resp.patients.length === 0) {
          return apiClient.patients().then(fromList)
        }
        setBackendCohort(backendPatientsToCanonical(resp.patients))
      })
      .catch(() => {
        if (!cancelled) {
          apiClient.patients().then(fromList).catch(() => {
            if (!cancelled) setBackendCohort([])
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCohort(false)
      })
    return () => {
      cancelled = true
    }
  }, [syntheticPatients])

  const sPatients = syntheticPatients || backendCohort
  const cohortSource = syntheticPatients
    ? 'current session (Custom Cohort / Cohort Builder)'
    : backendCohort && backendCohort.length
      ? 'recovered from backend — GET /api/cohort/latest / GET /api/patients'
      : null

  // Real correlation matrices — computed from the actual records on both
  // sides. No precomputed or hard-coded values anywhere.
  const synthCorr = useMemo(
    () => (sPatients && sPatients.length ? computeCorrelationMatrix(sPatients) : null),
    [sPatients],
  )

  // Per-metric descriptions for both sides — computed from the actual records.
  const rows = useMemo(() => {
    if (!sPatients || !sPatients.length) return []
    return METRICS.map((metric) => ({
      metric,
      orig: describeMetric(metric, ORIGINAL_PATIENTS),
      synth: describeMetric(metric, sPatients),
    }))
  }, [sPatients])

  if (!sPatients || !sPatients.length) {
    return (
      <div className="mx-auto max-w-2xl pt-10">
        <EmptyState
          icon="validation"
          title={loadingCohort ? 'Looking for a generated cohort…' : 'No generated cohort found'}
          message={
            loadingCohort
              ? 'Checking the backend patient store for the current synthetic cohort.'
              : 'Generate a custom cohort first — Validation then compares it against the original source dataset using statistics calculated from the actual records.'
          }
          action={
            !loadingCohort && (
              <Link to="/custom-cohort" className="btn-primary">
                <Icon name="sparkles" className="h-4 w-4" />
                Open Custom Cohort
              </Link>
            )
          }
        />
      </div>
    )
  }

  const ageData = pairize(getOriginalAgeHistogram(), getSyntheticAgeHistogram(sPatients))
  const bpData = pairize(getOriginalBpHisto(), getSyntheticBpHisto(sPatients))
  const painData = pairize(getOriginalPainHistogram(), getSyntheticPainHistogram(sPatients))
  const activityData = pairize(getOriginalActivityHistogram(), getOriginalActivityHistogram().map((d) => ({
    label: d.label,
    synthetic: sPatients.filter((p) => p.activity === d.label).length,
  })))

  const numericRows = rows.filter((r) => r.metric.kind === 'numeric')
  const categoricalRows = rows.filter((r) => r.metric.kind === 'categorical')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validation"
        description={`Original source dataset vs the current generated synthetic cohort. All statistics are calculated from the actual records (${cohortSource}).`}
        badge={<Badge variant="data">Calculated from records</Badge>}
      />

      {/* Legend / cohort sizes */}
      <div className="glass flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl p-4 text-xs shadow-card">
        <span className="flex items-center gap-2 font-semibold text-sky-300">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Original · {fmtInt(ORIGINAL_PATIENTS.length)} patients
        </span>
        <span className="flex items-center gap-2 font-semibold text-amber-300">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Synthetic · {fmtInt(sPatients.length)} patients
        </span>
        <span className="text-slate-500">Different cohort sizes — compare distributions, not absolute counts.</span>
      </div>

      {/* Statistical comparison table */}
      <div className="glass rounded-2xl shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 p-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Statistical comparison</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Every value is calculated from the records. Expand a numeric metric for median, std dev, min and max.
            </p>
          </div>
          <Badge variant="data">Calculated from records</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 text-right font-semibold">Original (blue)</th>
                <th className="px-4 py-3 text-right font-semibold">Synthetic (amber)</th>
                <th className="px-4 py-3 text-right font-semibold">Difference</th>
                <th className="px-4 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Numerical variables: mean on the row, full stats expandable */}
              {numericRows.map(({ metric, orig, synth }) => (
                <NumericRow key={metric.label} metric={metric} orig={orig} synth={synth} />
              ))}

              {/* Categorical / binary variables: counts + percentages per label */}
              <tr className="bg-white/[0.03]">
                <td colSpan={5} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Categorical variables — percentage (count) per category · status from the largest percentage-point gap
                </td>
              </tr>
              {categoricalRows.map(({ metric, orig, synth }) => (
                <CategoricalRow key={metric.label} metric={metric} orig={orig} synth={synth} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 p-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><StatusChip status="match" /> |Δmean| ≤ 0.10 × source SD, or |Δpp| ≤ 5</span>
          <span className="flex items-center gap-1.5"><StatusChip status="close" /> ≤ 0.25 × SD, or ≤ 10 pp</span>
          <span className="flex items-center gap-1.5"><StatusChip status="differs" /> beyond those thresholds</span>
          <span className="flex items-center gap-1.5"><StatusChip status="unavailable" /> insufficient valid data</span>
          <span className="ml-auto">Status describes distribution agreement — not a quality score.</span>
        </div>
      </div>

      {/* Reading this comparison */}
      <div className="glass rounded-2xl p-6 shadow-card">
        <h3 className="text-sm font-semibold text-white">Reading this comparison</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-400">
          <li className="flex gap-2.5">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            Numeric rows show the mean; expand for median, standard deviation, minimum and maximum, with valid-data counts.
          </li>
          <li className="flex gap-2.5">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            Glucose and BMI are included where the datasets provide them; cells show N/A rather than invented values when data is missing.
          </li>
          <li className="flex gap-2.5">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            The synthetic cohort reflects your cohort requirements, so statuses such as "differs" can be expected and intentional.
          </li>
          <li className="flex gap-2.5">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            No overall utility/similarity score is claimed — statuses are derived per-metric from the actual differences shown.
          </li>
        </ul>
      </div>

      {/* Distribution comparisons */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Age distribution</h3>
            <Badge variant="data">Calculated</Badge>
          </div>
          <OverlayBarChart data={ageData} />
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Blood pressure bands</h3>
            <Badge variant="data">Calculated</Badge>
          </div>
          <OverlayBarChart data={bpData} />
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Pain score</h3>
            <Badge variant="data">Calculated</Badge>
          </div>
          <OverlayBarChart data={painData} />
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Activity distribution</h3>
            <Badge variant="data">Calculated</Badge>
          </div>
          <OverlayBarChart data={activityData} />
        </div>
      </div>

      {/* Correlation comparison */}
      <div className="glass rounded-2xl p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Correlation comparison</h3>
            <p className="mt-0.5 text-xs text-slate-400">Pearson correlations calculated from the actual records — original source vs the current generated cohort. N/A = insufficient valid data.</p>
          </div>
          <Badge variant="data">Calculated</Badge>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-300">Original dataset ({fmtInt(ORIGINAL_PATIENTS.length)} records)</p>
            <CorrelationMatrix fields={CORRELATION_FIELDS} matrix={CORRELATION_MATRIX} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Synthetic cohort ({fmtInt(sPatients.length)} records)</p>
            <CorrelationMatrix fields={CORRELATION_FIELDS} matrix={synthCorr} />
          </div>
        </div>
      </div>
    </div>
  )
}
