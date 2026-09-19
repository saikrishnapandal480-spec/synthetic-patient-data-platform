import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import Icon from '../components/ui/Icon.jsx'
import BarChart from '../components/charts/BarChart.jsx'
import DonutChart from '../components/charts/DonutChart.jsx'
import { getOriginalSummary, getOriginalAgeHistogram, getOriginalGenderHistogram, getOriginalActivityHistogram, DATASET_INFO } from '../data/mockData.js'
import { fmtInt, fmtNum1, fmtPct } from '../utils/format.js'

const PIPELINE = [
  { to: '/upload', label: 'Upload', icon: 'upload', done: true },
  { to: '/analysis', label: 'Analysis', icon: 'analysis', done: true },
  { to: '/cohort-builder', label: 'Cohort', icon: 'cohort', done: false },
  { to: '/synthetic-data', label: 'Generate', icon: 'synthetic', done: false },
  { to: '/validation', label: 'Validate', icon: 'validation', done: false },
  { to: '/privacy', label: 'Privacy', icon: 'privacy', done: false },
  { to: '/data-assistant', label: 'Ask', icon: 'assistant', done: false },
]

export default function Dashboard() {
  const { customCohort } = useApp()
  const s = getOriginalSummary()
  const ageData = getOriginalAgeHistogram().map((d) => ({ label: d.label, value: d.original }))

  // --- SH-405: cohort distribution charts, computed from the CURRENT generated
  // synthetic records (shared backend/app cohort store). No static values: every
  // series below is counted from customCohort.patients and updates whenever a
  // new cohort is generated. Hypertension follows the platform's documented
  // systolic >= 140 rule, consistent with the Custom Cohort / Validation views.
  const cohortPatients = customCohort?.patients || []
  const cohortCount = cohortPatients.length
  const pct = (n) => (cohortCount ? (n / cohortCount) * 100 : 0)
  const countBy = (sel) =>
    cohortPatients.reduce((acc, p) => {
      const key = sel(p)
      if (key === null || key === undefined) return acc
      const found = acc.find((d) => d.label === key)
      if (found) found.value += 1
      else acc.push({ label: String(key), value: 1 })
      return acc
    }, [])

  const cohortAgeData = useMemo(() => {
    const bins = [
      { label: '18–35', min: 18, max: 35 },
      { label: '36–55', min: 36, max: 55 },
      { label: '56–75', min: 56, max: 75 },
      { label: '76+', min: 76, max: 200 },
    ]
    return bins.map((b) => ({
      label: b.label,
      value: cohortPatients.filter((p) => p.age >= b.min && p.age <= b.max).length,
    }))
  }, [cohortPatients])

  const cohortDiabetesPct = pct(cohortPatients.filter((p) => p.diabetes).length)
  const cohortDiabetesData = useMemo(
    () => [
      { label: 'Diabetic', value: cohortPatients.filter((p) => p.diabetes).length },
      { label: 'Non-diabetic', value: cohortPatients.filter((p) => !p.diabetes).length },
    ],
    [cohortPatients],
  )

  const isHypertensive = (p) => (p.systolic ? p.systolic >= 140 : false)
  const cohortHypertensionPct = pct(cohortPatients.filter(isHypertensive).length)
  const cohortHypertensionData = useMemo(
    () => [
      { label: 'Hypertensive', value: cohortPatients.filter(isHypertensive).length },
      { label: 'Normal BP', value: cohortPatients.filter((p) => !isHypertensive).length },
    ],
    [cohortPatients],
  )

  const cohortActivityData = useMemo(() => countBy((p) => p.activity), [cohortPatients])
  const cohortAdherenceData = useMemo(() => countBy((p) => p.adherence), [cohortPatients])
  const cohortPainData = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        .map((score) => ({ label: String(score), value: cohortPatients.filter((p) => p.painScore === score).length }))
        .filter((d) => d.value > 0),
    [cohortPatients],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your current dataset and the synthetic data workflow."
        badge={<Badge variant="mock">Sample data</Badge>}
      >
        <Link to="/upload" className="btn-primary">
          <Icon name="upload" className="h-4 w-4" />
          Upload Dataset
        </Link>
      </PageHeader>

      {/* Workflow strip */}
      <div className="glass rounded-2xl p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE.map((step, i) => (
            <Link
              key={step.to}
              to={step.to}
              className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                step.done
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-sky-400/30 hover:text-slate-200'
              }`}
            >
              {step.done ? <Icon name="check" className="h-3.5 w-3.5" /> : <Icon name={step.icon} className="h-3.5 w-3.5" />}
              {step.label}
              {i < PIPELINE.length - 1 && <span className="ml-1 hidden text-slate-600 sm:inline">→</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="users" tone="sky" label="Total patients" value={fmtInt(s.n)} sub={DATASET_INFO.fileName} />
        <StatCard icon="activity" tone="teal" label="Average age" value={`${fmtNum1(s.avgAge)} yrs`} sub="Range 18–90" />
        <StatCard icon="heart" tone="rose" label="Diabetes prevalence" value={fmtPct(s.diabetesPct)} sub={`${fmtInt((s.diabetesPct / 100) * s.n)} patients`} />
        <StatCard icon="chart" tone="violet" label="Avg. blood pressure" value={`${fmtInt(s.avgSystolic)}/${fmtInt(s.avgDiastolic)}`} sub="Systolic / diastolic mmHg" />
      </div>

      {/* Charts + dataset card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="glass h-full rounded-2xl p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Age distribution</h3>
              <Badge variant="mock">Mock</Badge>
            </div>
            <BarChart data={ageData} height={240} />
          </div>
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-white">Dataset</h3>
          <p className="mt-1 text-xs text-slate-500">Currently loaded source file</p>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
              <Icon name="file" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{DATASET_INFO.fileName}</p>
              <p className="text-xs text-slate-500">{DATASET_INFO.fileSize} · {DATASET_INFO.columns} columns</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5 text-xs">
            {[
              ['Records', fmtInt(s.n)],
              ['Missing cells', `${fmtInt(DATASET_INFO.missingCells)} (${DATASET_INFO.missingPct}%)`],
              ['Avg. pain score', fmtNum1(s.avgPain)],
              ['Data type', 'Sample / mock'],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                <span className="text-slate-500">{k}</span>
                <span className="font-semibold text-slate-200">{v}</span>
              </li>
            ))}
          </ul>
          <Link to="/analysis" className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-300 transition hover:text-sky-200">
            View full analysis <Icon name="chevronRight" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Gender distribution</h3>
            <Badge variant="mock">Mock</Badge>
          </div>
          <DonutChart
            data={getOriginalGenderHistogram()}
            centerValue={fmtInt(s.n)}
            centerLabel="patients"
          />
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Activity level</h3>
            <Badge variant="mock">Mock</Badge>
          </div>
          <BarChart data={getOriginalActivityHistogram()} height={260} multicolor />
        </div>
      </div>

      {customCohort && (
        <div className="space-y-4">
          {/* Cohort summary strip (values computed by the backend from the generated records) */}
          <div className="glass rounded-2xl p-5 shadow-card transition-colors duration-300 hover:border-sky-400/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon name="sparkles" className="h-4 w-4 text-sky-300" />
                  Custom cohort (backend-generated)
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {fmtInt(customCohort.actualPatientCount)} synthetic patients · {fmtPct(customCohort.actual.diabetes_percentage)} diabetic ·{' '}
                  {fmtPct(customCohort.actual.hypertension_percentage)} hypertensive · {fmtPct(customCohort.actual.older_patient_percentage)} older (60+)
                </p>
              </div>
              <Link to="/custom-cohort" className="btn-ghost">
                <Icon name="cohort" className="h-4 w-4" />
                Open Custom Cohort
              </Link>
            </div>
          </div>

          {/* Synthetic cohort distributions — computed from the current generated records */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Synthetic cohort distributions</h3>
              <p className="text-xs text-slate-500">Computed live from the {fmtInt(customCohort.patients.length)} generated synthetic records</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="glass rounded-2xl p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Age distribution</h3>
                  <Badge variant="data">Synthetic</Badge>
                </div>
                <BarChart data={cohortAgeData} height={220} />
              </div>
              <div className="glass rounded-2xl p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Diabetes distribution</h3>
                  <Badge variant="data">Synthetic</Badge>
                </div>
                <DonutChart data={cohortDiabetesData} height={220} centerValue={fmtPct(cohortDiabetesPct)} centerLabel="diabetic" />
              </div>
              <div className="glass rounded-2xl p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Hypertension distribution</h3>
                  <Badge variant="data">Synthetic</Badge>
                </div>
                <DonutChart data={cohortHypertensionData} height={220} centerValue={fmtPct(cohortHypertensionPct)} centerLabel="hypertensive" />
              </div>
              <div className="glass rounded-2xl p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Activity level distribution</h3>
                  <Badge variant="data">Synthetic</Badge>
                </div>
                <BarChart data={cohortActivityData} height={220} multicolor />
              </div>
              <div className="glass rounded-2xl p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Medication adherence distribution</h3>
                  <Badge variant="data">Synthetic</Badge>
                </div>
                <BarChart data={cohortAdherenceData} height={220} multicolor />
              </div>
              <div className="glass rounded-2xl p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Pain score distribution</h3>
                  <Badge variant="data">Synthetic</Badge>
                </div>
                <BarChart data={cohortPainData} height={220} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              All records are synthetic — generated by the SH-405 cohort generator (research/demo prototyping only, not real patients or medical advice).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
