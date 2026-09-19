import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import ChartCard from '../components/ui/ChartCard.jsx'
import BarChart from '../components/charts/BarChart.jsx'
import DonutChart from '../components/charts/DonutChart.jsx'
import CorrelationMatrix from '../components/charts/CorrelationMatrix.jsx'
import {
  getOriginalSummary,
  getOriginalAgeHistogram,
  getOriginalBpHisto,
  getOriginalPainHistogram,
  getOriginalGenderHistogram,
  getOriginalActivityHistogram,
  CORRELATION_FIELDS,
  CORRELATION_MATRIX,
  DATASET_INFO,
} from '../data/mockData.js'
import { fmtInt, fmtNum1, fmtPct } from '../utils/format.js'

export default function Analysis() {
  const s = getOriginalSummary()

  const diabetesData = [
    { label: 'No diabetes', value: s.n - Math.round((s.diabetesPct / 100) * s.n) },
    { label: 'Diabetes', value: Math.round((s.diabetesPct / 100) * s.n) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset Analysis"
        description="Statistical profile of the uploaded dataset. All values below are sample/mock data for the frontend demo."
        badge={<Badge variant="mock">Mock / sample data</Badge>}
      >
        <div className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {DATASET_INFO.fileName} · {fmtInt(s.n)} records
        </div>
      </PageHeader>

      {/* Key statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon="users" tone="sky" label="Total patients" value={fmtInt(s.n)} sub="Sample dataset" />
        <StatCard icon="activity" tone="teal" label="Average age" value={`${fmtNum1(s.avgAge)} yrs`} sub="Ages 18–90" />
        <StatCard icon="heart" tone="rose" label="Diabetes" value={fmtPct(s.diabetesPct)} sub={`${fmtInt((s.diabetesPct / 100) * s.n)} of ${fmtInt(s.n)} patients`} />
        <StatCard icon="chart" tone="violet" label="Average blood pressure" value={`${fmtInt(s.avgSystolic)}/${fmtInt(s.avgDiastolic)}`} sub="mmHg · systolic/diastolic" />
        <StatCard icon="alert" tone="amber" label="Average pain score" value={fmtNum1(s.avgPain)} sub="Scale 0–10" />
        <StatCard icon="database" tone="sky" label="Missing values" value={`${fmtInt(DATASET_INFO.missingCells)} cells`} sub={`${DATASET_INFO.missingPct}% of all cells`} />
      </div>

      {/* Distributions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Age distribution"
          description="Patients per age band"
          badge={<Badge variant="mock">Mock</Badge>}
        >
          <BarChart data={getOriginalAgeHistogram().map((d) => ({ label: d.label, value: d.original }))} />
        </ChartCard>

        <ChartCard
          title="Diabetes distribution"
          description="Share of patients with diabetes"
          badge={<Badge variant="mock">Mock</Badge>}
        >
          <DonutChart
            data={diabetesData}
            centerValue={fmtPct(s.diabetesPct)}
            centerLabel="diabetic"
          />
        </ChartCard>

        <ChartCard
          title="Blood pressure distribution"
          description="AHA systolic bands (Normal <120 · Elevated <130 · Stage 1 <140 · Stage 2 ≥140)"
          badge={<Badge variant="mock">Mock</Badge>}
        >
          <BarChart data={getOriginalBpHisto().map((d) => ({ label: d.label, value: d.original }))} multicolor />
        </ChartCard>

        <ChartCard
          title="Activity level"
          description="Self-reported physical activity"
          badge={<Badge variant="mock">Mock</Badge>}
        >
          <BarChart data={getOriginalActivityHistogram()} />
        </ChartCard>

        <ChartCard
          title="Pain score distribution"
          description="Reported pain scores from 0 (none) to 10 (worst)"
          badge={<Badge variant="mock">Mock</Badge>}
        >
          <BarChart data={getOriginalPainHistogram().map((d) => ({ label: d.label, value: d.original }))} />
        </ChartCard>

        <ChartCard
          title="Gender distribution"
          description="Recorded gender across the cohort"
          badge={<Badge variant="mock">Mock</Badge>}
        >
          <DonutChart data={getOriginalGenderHistogram()} centerValue={fmtInt(s.n)} centerLabel="patients" />
        </ChartCard>
      </div>

      {/* Correlation matrix */}
      <ChartCard
        title="Correlation matrix"
        description="Pairwise Pearson-style correlations between numeric and encoded variables"
        badge={<Badge variant="mock">Mock values</Badge>}
        className="w-full"
      >
        <CorrelationMatrix fields={CORRELATION_FIELDS} matrix={CORRELATION_MATRIX} />
      </ChartCard>

      {/* Column report */}
      <ChartCard
        title="Column report"
        description={`${DATASET_INFO.columns} columns · ${DATASET_INFO.fileSize} file`}
        badge={<Badge variant="mock">Mock</Badge>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-semibold">Column</th>
                <th className="pb-2 pr-4 font-semibold">Type</th>
                <th className="pb-2 text-right font-semibold">Missing</th>
              </tr>
            </thead>
            <tbody>
              {DATASET_INFO.fields.map((f) => (
                <tr key={f.name} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-200">{f.name}</td>
                  <td className="py-2.5 pr-4 text-xs text-slate-400">{f.type}</td>
                  <td className="py-2.5 text-right text-xs">
                    <span className={f.missing === '0.0%' ? 'text-slate-400' : 'text-amber-300'}>{f.missing}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
