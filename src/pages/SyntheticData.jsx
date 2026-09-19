import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Pagination from '../components/ui/Pagination.jsx'
import Icon from '../components/ui/Icon.jsx'
import BarChart from '../components/charts/BarChart.jsx'
import DonutChart from '../components/charts/DonutChart.jsx'
import { useApp } from '../state/AppContext.jsx'
import { buildCohortCsv, downloadCsv, cohortCsvFilename } from '../utils/csv.js'
import { getSyntheticSummary, getSyntheticAgeHistogram, getSyntheticActivityHistogram } from '../data/mockData.js'
import { fmtInt, fmtNum1, fmtPct } from '../utils/format.js'

const ACTIVITY_OPTIONS = ['All', 'Sedentary', 'Light', 'Moderate', 'Active']

export default function SyntheticData() {
  const { syntheticPatients, hasGenerated, cohortConfig, generationStatus, generateCohort, customCohort } = useApp()
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('All')
  const [diabetesFilter, setDiabetesFilter] = useState('All')
  const [ageFilter, setAgeFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [exportInfo, setExportInfo] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [exporting, setExporting] = useState(false)

  const patients = syntheticPatients || []
  const cohortId = customCohort?.cohortId || null
  const summary = useMemo(() => (patients.length ? getSyntheticSummary(patients) : null), [patients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patients.filter((p) => {
      if (activityFilter !== 'All' && p.activity !== activityFilter) return false
      if (diabetesFilter === 'Yes' && !p.diabetes) return false
      if (diabetesFilter === 'No' && p.diabetes) return false
      if (ageFilter !== 'All') {
        const [lo, hi] = ageFilter.split('-').map(Number)
        if (p.age < lo || p.age > hi) return false
      }
      if (q && !(`${p.name}`.toLowerCase().includes(q) || p.patientId.toLowerCase().includes(q))) return false
      return true
    })
  }, [patients, search, activityFilter, diabetesFilter, ageFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const regenerate = async () => {
    setPage(1)
    await generateCohort(cohortConfig)
  }

  // SH-405: real CSV export of the current synthetic cohort (shared backend
  // state — the same records shown in this table and served to Validation /
  // the ADR Predictor). No hard-coded records; nothing is exported when the
  // cohort is empty.
  const handleExport = () => {
    if (!patients.length) {
      setExportError('No synthetic cohort available. Generate a cohort first.')
      return
    }
    setExporting(true)
    setExportError(null)
    try {
      const { csv, filename } = buildCohortCsv(patients, { cohortId })
      downloadCsv(csv, filename)
      setExportInfo({
        count: patients.length,
        filename,
        message: `Exported ${patients.length} synthetic patients successfully.`,
      })
    } catch (err) {
      setExportError(`Export failed: ${err?.message || 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }

  if (!hasGenerated || !summary) {
    return (
      <div className="mx-auto max-w-2xl pt-10">
        <EmptyState
          icon="synthetic"
          title="No synthetic cohort available. Generate a cohort first."
          message="Once a cohort has been generated you can explore the synthetic records here and export them as CSV for research/testing."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/custom-cohort" className="btn-primary">
                <Icon name="sparkles" className="h-4 w-4" />
                Open Custom Cohort
              </Link>
              <Link to="/cohort-builder" className="btn-ghost">
                <Icon name="cohort" className="h-4 w-4" />
                Open Cohort Builder
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synthetic Data"
        description="Synthetic patient records produced by the SH-405 generator (backend cohort or in-session builder). Values are artificial and for research/demo purposes only — not real patients."
        badge={<Badge variant="success">Generation complete</Badge>}
      >
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost" onClick={regenerate} disabled={generationStatus === 'generating'}>
            <Icon name="refresh" className="h-4 w-4" />
            Generate Again
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={exporting}
            title="Export the current synthetic cohort as CSV"
          >
            <Icon name="download" className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export Synthetic Cohort CSV'}
          </button>
        </div>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="users" tone="sky" label="Generated patients" value={fmtInt(summary.n)} sub={`Target was ${fmtInt(cohortConfig.count)}`} />
        <StatCard icon="activity" tone="teal" label="Average age" value={`${fmtNum1(summary.avgAge)} yrs`} sub="Synthetic cohort" />
        <StatCard icon="heart" tone="rose" label="Diabetes" value={fmtPct(summary.diabetesPct)} sub={`Configured ${cohortConfig.diabetesPct}%`} />
        <StatCard icon="chart" tone="violet" label="Avg. blood pressure" value={`${fmtInt(summary.avgSystolic)}/${fmtInt(summary.avgDiastolic)}`} sub={`High BP target ${cohortConfig.highBpPct}%`} />
      </div>

      {/* SH-405 export feedback + data-source labeling */}
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
      <p className="text-xs text-slate-500">
        Synthetic data — generated by SH-405 synthetic cohort generator. All records are synthetic and intended for
        research/demo prototyping only. They are not real patient records or medical advice.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 shadow-card lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Age distribution</h3>
            <Badge variant="mock">Mock</Badge>
          </div>
          <BarChart data={getSyntheticAgeHistogram(patients).map((d) => ({ label: d.label, value: d.synthetic }))} height={220} />
        </div>
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Activity level</h3>
            <Badge variant="mock">Mock</Badge>
          </div>
          <DonutChart data={getSyntheticActivityHistogram(patients)} height={220} />
        </div>
      </div>

      {/* Table controls */}
      <div className="glass rounded-2xl shadow-card">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name or patient ID…"
              className="input-base pl-9"
              aria-label="Search patients"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ageFilter}
              onChange={(e) => {
                setAgeFilter(e.target.value)
                setPage(1)
              }}
              className="input-base w-auto"
              aria-label="Filter by age range"
            >
              <option value="All">All ages</option>
              <option value="18-35">18–35</option>
              <option value="36-55">36–55</option>
              <option value="56-75">56–75</option>
              <option value="76-120">76+</option>
            </select>
            <select
              value={activityFilter}
              onChange={(e) => {
                setActivityFilter(e.target.value)
                setPage(1)
              }}
              className="input-base w-auto"
              aria-label="Filter by activity level"
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o === 'All' ? 'All activity' : o}</option>
              ))}
            </select>
            <select
              value={diabetesFilter}
              onChange={(e) => {
                setDiabetesFilter(e.target.value)
                setPage(1)
              }}
              className="input-base w-auto"
              aria-label="Filter by diabetes status"
            >
              <option value="All">Diabetes: all</option>
              <option value="Yes">Diabetic</option>
              <option value="No">Non-diabetic</option>
            </select>
            {(search || activityFilter !== 'All' || diabetesFilter !== 'All' || ageFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearch('')
                  setActivityFilter('All')
                  setDiabetesFilter('All')
                  setAgeFilter('All')
                  setPage(1)
                }}
                className="text-xs font-semibold text-sky-300 transition hover:text-sky-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Patient ID</th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Age</th>
                <th className="px-5 py-3 font-semibold">Gender</th>
                <th className="px-5 py-3 font-semibold">Diabetes</th>
                <th className="px-5 py-3 font-semibold">Blood pressure</th>
                <th className="px-5 py-3 font-semibold">Pain</th>
                <th className="px-5 py-3 font-semibold">Activity</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.patientId} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                  <td className="px-5 py-3 font-mono text-xs text-sky-300">{p.patientId}</td>
                  <td className="px-5 py-3 font-medium text-slate-200">{p.name}</td>
                  <td className="px-5 py-3 text-slate-300">{p.age}</td>
                  <td className="px-5 py-3 text-slate-300">{p.gender}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.diabetes ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {p.diabetes ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {p.systolic}/{p.diastolic}
                    <span className={`ml-2 text-[11px] ${p.systolic >= 140 ? 'text-rose-300' : p.systolic >= 130 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {p.systolic >= 140 ? 'high' : p.systolic >= 130 ? 'elevated' : 'normal'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{p.painScore}/10</td>
                  <td className="px-5 py-3 text-slate-300">{p.activity}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">
                    No records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSize={(n) => {
            setPageSize(n)
            setPage(1)
          }}
          total={filtered.length}
          onPage={setPage}
        />
      </div>

      <p className="text-center text-xs text-slate-600">
        All synthetic records on this page are generated in the browser from your cohort settings — no real patient data is involved.
      </p>
    </div>
  )
}
