import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useApp } from '../state/AppContext.jsx'
import { fmtInt, fmtPct } from '../utils/format.js'

/**
 * Mock privacy evaluation results. In the backend phase, replace this object
 * with the API response — the shape is designed to map 1:1 to a backend report:
 * {
 *   status: 'pending' | 'running' | 'passed' | 'warning' | 'failed',
 *   metrics: { exactDuplicates, highlySimilar, uniqueSynthetic, ... }
 * }
 */
const MOCK_PRIVACY_REPORT = {
  status: 'passed',
  evaluatedAt: '2024-06-07 14:32 UTC',
  metrics: {
    exactDuplicates: { count: 0, pctOfSynthetic: 0.0, threshold: '0', state: 'pass' },
    highlySimilar: { count: 14, pctOfSynthetic: 2.8, threshold: '< 5%', state: 'pass' },
    uniqueSynthetic: { count: 486, pctOfSynthetic: 97.2, threshold: '> 95%', state: 'pass' },
  },
  checks: [
    { name: 'Exact duplicate screening', description: 'No synthetic record identical to an original record across all fields.', state: 'pass' },
    { name: 'Nearest-neighbor distance', description: 'Minimum distance between synthetic and original records above the disclosure risk threshold.', state: 'pass' },
    { name: 'Rare attribute combinations', description: 'Unusual attribute combinations are not copied from the source data.', state: 'warning' },
    { name: 'Membership inference resistance', description: 'Placeholder check — computed by the backend in a later phase.', state: 'pending' },
  ],
}

function StateChip({ state }) {
  const map = {
    pass: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    warning: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    pending: 'border-white/10 bg-white/5 text-slate-400',
    fail: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  }
  const label = { pass: 'Pass', warning: 'Review', pending: 'Pending', fail: 'Fail' }
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${map[state]}`}>
      {label[state]}
    </span>
  )
}

export default function Privacy() {
  const { hasGenerated } = useApp()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy Evaluation"
        description="Disclosure-risk screening of the synthetic cohort. Metrics below are mock placeholders — the UI is structured to bind directly to backend evaluation results later."
        badge={<Badge variant="mock">Placeholder values</Badge>}
      >
        <button className="btn-ghost" disabled={!hasGenerated}>
          <Icon name="refresh" className="h-4 w-4" />
          Re-run Evaluation
        </button>
      </PageHeader>

      {!hasGenerated && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">
          <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
          Generate a cohort first — these placeholders will reflect your synthetic cohort once the backend is connected.
        </p>
      )}

      {/* Overall status */}
      <div className={`glass rounded-2xl border p-6 shadow-card ${MOCK_PRIVACY_REPORT.status === 'passed' ? 'border-emerald-400/20' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${MOCK_PRIVACY_REPORT.status === 'passed' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <Icon name="shield" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                {MOCK_PRIVACY_REPORT.status === 'passed' ? 'Privacy evaluation: Passed (mock)' : 'Privacy evaluation pending'}
              </p>
              <p className="text-xs text-slate-500">
                Evaluated {MOCK_PRIVACY_REPORT.evaluatedAt} · thresholds shown are demo defaults
              </p>
            </div>
          </div>
          <StateChip state={MOCK_PRIVACY_REPORT.status === 'passed' ? 'pass' : 'pending'} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon="x"
          tone="rose"
          label="Exact duplicate records"
          value={fmtInt(MOCK_PRIVACY_REPORT.metrics.exactDuplicates.count)}
          sub={`${fmtPct(MOCK_PRIVACY_REPORT.metrics.exactDuplicates.pctOfSynthetic)} of synthetic · threshold ${MOCK_PRIVACY_REPORT.metrics.exactDuplicates.threshold}`}
        />
        <StatCard
          icon="alert"
          tone="amber"
          label="Highly similar records"
          value={fmtInt(MOCK_PRIVACY_REPORT.metrics.highlySimilar.count)}
          sub={`${fmtPct(MOCK_PRIVACY_REPORT.metrics.highlySimilar.pctOfSynthetic)} of synthetic · threshold ${MOCK_PRIVACY_REPORT.metrics.highlySimilar.threshold}`}
        />
        <StatCard
          icon="check"
          tone="teal"
          label="Unique synthetic records"
          value={fmtInt(MOCK_PRIVACY_REPORT.metrics.uniqueSynthetic.count)}
          sub={`${fmtPct(MOCK_PRIVACY_REPORT.metrics.uniqueSynthetic.pctOfSynthetic)} of synthetic · threshold ${MOCK_PRIVACY_REPORT.metrics.uniqueSynthetic.threshold}`}
        />
      </div>

      {/* Checks list */}
      <div className="glass rounded-2xl p-5 shadow-card">
        <h3 className="text-sm font-semibold text-white">Evaluation checks</h3>
        <p className="mt-1 text-xs text-slate-500">Each check maps to a backend job — states shown are placeholders.</p>
        <ul className="mt-4 divide-y divide-white/5">
          {MOCK_PRIVACY_REPORT.checks.map((c) => (
            <li key={c.name} className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200">{c.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{c.description}</p>
              </div>
              <StateChip state={c.state} />
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-slate-600">
        The report object in this page is intentionally shaped like the planned API response so real privacy metrics can be connected without UI changes.
      </p>
    </div>
  )
}
