import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useApp, DEFAULT_COHORT } from '../state/AppContext.jsx'

const AGE_GROUPS = ['18–35', '36–55', '56–75', '76+']
const ACTIVITY_OPTIONS = [
  'Mirror source distribution',
  'Sedentary',
  'Light',
  'Moderate',
  'Active',
]

function Slider({ label, value, min, max, step = 1, onChange, format = (v) => v }) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1 text-xs font-semibold text-sky-300">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${fill}%` }}
        className="mt-2.5"
        aria-label={label}
      />
    </div>
  )
}

export default function CohortBuilder() {
  const navigate = useNavigate()
  const { cohortConfig, setCohortConfig, generateCohort, generationStatus } = useApp()
  const [error, setError] = useState(null)

  const config = cohortConfig
  const ageTotal = Object.values(config.ageGroups).reduce((s, w) => s + w, 0)
  const update = (patch) => setCohortConfig({ ...config, ...patch })
  const setAgeWeight = (group, w) =>
    update({ ageGroups: { ...config.ageGroups, [group]: w } })

  const onGenerate = async () => {
    if (ageTotal === 0) {
      setError('Age group weights sum to 0 — adjust the distribution first.')
      return
    }
    setError(null)
    await generateCohort(config)
    navigate('/synthetic-data')
  }

  const generating = generationStatus === 'generating'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Cohort Builder"
        description="Configure the target population for your synthetic cohort. Generation runs as a frontend simulation in this phase — no real data synthesis yet."
        badge={<Badge variant="mock">Frontend simulation</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Controls */}
        <div className="space-y-6 lg:col-span-3">
          <div className="glass rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Icon name="users" className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-semibold text-white">Cohort size</h3>
            </div>
            <div className="mt-4">
              <Slider
                label="Number of synthetic patients"
                value={config.count}
                min={100}
                max={10000}
                step={100}
                onChange={(v) => update({ count: v })}
                format={(v) => v.toLocaleString('en-US')}
              />
            </div>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="cohort" className="h-4 w-4 text-sky-300" />
                <h3 className="text-sm font-semibold text-white">Age group distribution</h3>
              </div>
              <span
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  ageTotal === 100
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                    : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                }`}
              >
                Total: {ageTotal}%
              </span>
            </div>
            <div className="mt-5 space-y-5">
              {AGE_GROUPS.map((g) => (
                <Slider
                  key={g}
                  label={`Ages ${g}`}
                  value={config.ageGroups[g]}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) => setAgeWeight(g, v)}
                  format={(v) => `${v}%`}
                />
              ))}
            </div>
            {ageTotal !== 100 && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">
                <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Weights are normalized automatically when generating, but they should sum to 100% for the intended mix.
              </p>
            )}
            <button
              onClick={() => update({ ageGroups: DEFAULT_COHORT.ageGroups })}
              className="mt-3 text-xs font-semibold text-sky-300 transition hover:text-sky-200"
            >
              Reset to source-like distribution
            </button>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Icon name="heart" className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-semibold text-white">Clinical conditions</h3>
            </div>
            <div className="mt-4 space-y-5">
              <Slider
                label="Diabetes prevalence"
                value={config.diabetesPct}
                min={0}
                max={100}
                step={5}
                onChange={(v) => update({ diabetesPct: v })}
                format={(v) => `${v}%`}
              />
              <Slider
                label="High blood pressure prevalence"
                value={config.highBpPct}
                min={0}
                max={100}
                step={5}
                onChange={(v) => update({ highBpPct: v })}
                format={(v) => `${v}%`}
              />
            </div>
          </div>
        </div>

        {/* Activity + summary */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Icon name="activity" className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-semibold text-white">Activity level</h3>
            </div>
            <div className="mt-4 grid gap-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => update({ activity: opt })}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    config.activity === opt
                      ? 'border-sky-400/40 bg-sky-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {opt}
                  {config.activity === opt && <Icon name="check" className="h-4 w-4 text-sky-300" />}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-white">Configuration summary</h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              {[
                ['Patients', config.count.toLocaleString('en-US')],
                ['Dominant age group', AGE_GROUPS.reduce((a, b) => (config.ageGroups[a] >= config.ageGroups[b] ? a : b))],
                ['Diabetes', `${config.diabetesPct}%`],
                ['High BP', `${config.highBpPct}%`],
                ['Activity', config.activity],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-200">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Generate */}
      <div className="glass rounded-2xl p-6 shadow-card">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <h3 className="text-sm font-semibold text-white">Ready to generate</h3>
            <p className="mt-1 text-xs text-slate-500">
              In this phase, generation is simulated in the browser — parameters are stored and a mock cohort is produced.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <button
              className="btn-primary min-w-56"
              disabled={generating}
              onClick={onGenerate}
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating cohort…
                </>
              ) : (
                <>
                  <Icon name="sparkles" className="h-4 w-4" />
                  Generate Synthetic Cohort
                </>
              )}
            </button>
          </div>
        </div>
        {generating && (
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              Simulating generation of {config.count.toLocaleString('en-US')} patient records…
            </p>
          </div>
        )}
        {error && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs text-rose-300">
            <Icon name="alert" className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
