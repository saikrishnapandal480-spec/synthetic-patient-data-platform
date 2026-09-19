import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ChartCard from '../components/ui/ChartCard.jsx'
import SectionCard from '../components/predictor/SectionCard.jsx'
import BarChart from '../components/charts/BarChart.jsx'
import DonutChart from '../components/charts/DonutChart.jsx'
import Icon from '../components/ui/Icon.jsx'
import { SOURCE_META, SOURCE_DISTRIBUTIONS, SOURCE_PER_PATIENT, SOURCE_GAPS } from '../data/mockData.js'
import { fmtInt } from '../utils/format.js'

const TABLES = [
  { name: 'patients.csv', purpose: 'Demographics — ID, birth/death date, gender, names', rows: SOURCE_META.counts.patients },
  { name: 'conditions.csv', purpose: 'Diagnoses (SNOMED codes + descriptions, start/stop dates)', rows: SOURCE_META.counts.conditions },
  { name: 'medications.csv', purpose: 'Prescriptions (codes, descriptions, start/stop, cost)', rows: SOURCE_META.counts.medications },
  { name: 'encounters.csv', purpose: 'Healthcare encounters (class, dates, costs, reasons)', rows: SOURCE_META.counts.encounters },
  { name: 'observations.csv', purpose: 'Vitals/labs — BP, pain 0–10, glucose, A1c, BMI, …', rows: SOURCE_META.counts.observations_used },
]

const COLUMN_SAMPLES = {
  'patients.csv': ['patient_id', 'birth_date', 'age', 'gender', 'deceased'],
  'conditions.csv': ['patient_id', 'start', 'stop', 'code', 'description'],
  'medications.csv': ['patient_id', 'start', 'stop', 'code', 'description'],
  'encounters.csv': ['patient_id', 'start', 'class', 'description'],
  'observations.csv': ['patient_id', 'date', 'code', 'field', 'value'],
}

const OBS_PREVIEW = [
  { date: '2013-12-22', patient: '…ced36', code: '8480-6', field: 'Systolic BP', value: '122 mm[Hg]' },
  { date: '2013-12-22', patient: '…ced36', code: '8462-4', field: 'Diastolic BP', value: '81 mm[Hg]' },
  { date: '2013-01-08', patient: '…ced36', code: '72514-3', field: 'Pain severity 0–10', value: '4' },
  { date: '2013-05-16', patient: '…82ff', code: '4548-4', field: 'Hemoglobin A1c', value: '6.0 %' },
  { date: '2013-12-22', patient: '…ced36', code: '39156-5', field: 'Body Mass Index', value: '23.8 kg/m2' },
]

export default function SourceDataset() {
  const d = SOURCE_DISTRIBUTIONS
  const ageData = d.age_histogram.map((a) => ({ label: a.label, value: a.count }))
  const genderData = Object.entries(d.gender_counts).map(([label, value]) => ({ label, value }))

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Source Dataset"
        description="The ORIGINAL/SOURCE sample feeding the SH-405 pipeline — a public SYNTHETIC Synthea export. No real patient data is used anywhere in this platform."
        badge={<Badge variant="mock">Synthetic / non-PHI</Badge>}
      />

      {/* Dataset identity */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="database" tone="sky" label="Dataset" value="Synthea Sample" sub="record/synthea-dataset-100.zip" />
        <StatCard icon="users" tone="teal" label="Source patients" value={fmtInt(SOURCE_META.counts.patients)} sub="unique patient IDs" />
        <StatCard icon="analysis" tone="violet" label="Longitudinal records" value={fmtInt(SOURCE_META.counts.longitudinal_records)} sub="patient-date rows" />
        <StatCard icon="privacy" tone="teal" label="PHI status" value="None" sub="all records fabricated by Synthea" />
      </div>

      <SectionCard icon="database" title="Provenance & License" description="Where the data came from and how it may be used.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Source URL</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-sky-300">
              <Icon name="info" className="h-3.5 w-3.5" />
              <a className="underline decoration-sky-400/40 hover:decoration-sky-300" href={SOURCE_META.url} target="_blank" rel="noreferrer">{SOURCE_META.url}</a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">License</dt>
            <dd className="mt-0.5 text-slate-300">{SOURCE_META.license}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Canonical schema</dt>
            <dd className="mt-0.5 font-mono text-xs text-slate-300">{SOURCE_META.schema_version}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Ingestion reference date</dt>
            <dd className="mt-0.5 font-mono text-xs text-slate-300">{SOURCE_META.reference_date}</dd>
          </div>
        </dl>
      </SectionCard>

      {/* Available tables */}
      <SectionCard icon="table" title="Available Tables / Files" description="Extracted from record/synthea-dataset-100.zip (13 Synthea CSVs; the five used by SH-405 are shown with canonical columns).">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4 font-medium">File</th>
                <th className="pb-2 pr-4 font-medium">Contents</th>
                <th className="pb-2 pr-4 font-medium">Rows</th>
                <th className="pb-2 font-medium">Canonical columns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TABLES.map((t) => (
                <tr key={t.name} className="align-top">
                  <td className="py-2.5 pr-4 font-mono text-xs text-sky-300">{t.name}</td>
                  <td className="py-2.5 pr-4 text-slate-300">{t.purpose}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-200">{fmtInt(t.rows)}</td>
                  <td className="py-2.5 text-xs text-slate-400">{COLUMN_SAMPLES[t.name].join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sample preview */}
      <SectionCard icon="analysis" title="Sample Preview — observations (normalized)" description="Exactly how source rows appear after SH-405 schema mapping (LOINC → canonical field names).">
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                {['date', 'patient', 'LOINC', 'field', 'value'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
              {OBS_PREVIEW.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.patient}</td>
                  <td className="px-3 py-2">{r.code}</td>
                  <td className="px-3 py-2">{r.field}</td>
                  <td className="px-3 py-2">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Full dataset: <a className="text-sky-300 underline decoration-sky-400/40" href="/data/sh405-source-longitudinal.json" target="_blank" rel="noreferrer">/data/sh405-source-longitudinal.json</a> ({fmtInt(SOURCE_META.counts.longitudinal_records)} patient-date records).
        </p>
      </SectionCard>

      {/* Source distributions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Age distribution (source)" description={`${fmtInt(d.n_patients)} synthetic patients · mean age ${d.means.age}`}>
          <BarChart data={ageData} height={240} />
        </ChartCard>
        <ChartCard title="Gender (source)" description={`Diabetes ${d.diabetes.pct}% · mean BP ${d.means.systolic_bp}/${d.means.diastolic_bp} · mean BMI ${d.means.bmi}`}>
          <DonutChart data={genderData} centerValue={fmtInt(d.n_patients)} centerLabel="patients" />
        </ChartCard>
      </div>

      <ChartCard title="Source relationship signals (computed)" description="Pearson correlations computed from the source sample — the relationships the synthetic layer inherits.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(d.correlations).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span className="font-mono text-slate-300">{k.replaceAll('~', ' ↔ ')}</span>
              <span className={`font-semibold ${v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-slate-400'}`}>{v}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Derived fields — the honest disclosure */}
      <SectionCard
        icon="alert"
        title="Fields the source does NOT contain (generated by SH-405)"
        description="These are produced by our synthetic generation layer — they are never presented as Synthea data."
        badge={<Badge variant="mock">Derived layer</Badge>}
      >
        <ul className="space-y-3">
          {SOURCE_GAPS.map((g) => (
            <li key={g.field} className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3.5">
              <p className="font-mono text-sm text-amber-300">{g.field}</p>
              <p className="mt-1 text-xs text-slate-300">{g.note}</p>
              <p className="mt-1 text-xs text-slate-500">Possible values: {g.values.join(' · ')}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
