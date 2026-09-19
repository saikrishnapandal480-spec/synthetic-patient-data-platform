import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon.jsx'

const FEATURES = [
  {
    icon: 'analysis',
    title: 'Dataset Analysis',
    desc: 'Automatic profiling of distributions, missing values and correlations across your patient dataset.',
  },
  {
    icon: 'synthetic',
    title: 'Synthetic Data Generation',
    desc: 'Create realistic artificial patient records that mirror the statistical properties of your source data.',
  },
  {
    icon: 'cohort',
    title: 'Cohort Customization',
    desc: 'Tune cohort size, age structure and clinical proportions to match your research question.',
  },
  {
    icon: 'validation',
    title: 'Statistical Validation',
    desc: 'Compare original and synthetic datasets side by side across key clinical metrics.',
  },
  {
    icon: 'privacy',
    title: 'Privacy Evaluation',
    desc: 'Screen synthetic records for duplicates and near-copies before any release.',
  },
  {
    icon: 'download',
    title: 'Data Export',
    desc: 'Download validated synthetic cohorts as CSV, ready for downstream research pipelines.',
  },
]

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-900">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute right-[-10rem] top-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-6rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-glow">
            <Icon name="heart" className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-bold text-white">Synthetic Patient Data Platform</span>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Open Dashboard
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-14 text-center md:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3.5 py-1.5 text-xs font-semibold text-sky-300">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sky-300" />
          Live backend — synthetic data for research
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
          Synthetic patient data,
          <span className="text-gradient"> built for research</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
          Generate realistic synthetic patient datasets for healthcare research while reducing
          exposure of sensitive patient information.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/upload" className="btn-primary w-full sm:w-auto">
            <Icon name="upload" className="h-4 w-4" />
            Upload Dataset
          </Link>
          <Link to="/analysis" className="btn-ghost w-full sm:w-auto">
            <Icon name="sparkles" className="h-4 w-4" />
            Try Sample Dataset
          </Link>
        </div>

        {/* Mini preview strip */}
        <div className="glass mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 rounded-2xl p-6 text-left shadow-card sm:grid-cols-4">
          {[
            ['Patients in sample', '1,000'],
            ['Avg. age', '53.9 yrs'],
            ['Diabetes prevalence', '23.4%'],
            ['Fields per record', '11'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xl font-bold text-white md:text-2xl">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">One workflow, end to end</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            From raw CSV to a validated, privacy-screened synthetic cohort — all in a single
            research-ready platform.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass glass-hover group rounded-2xl p-6 shadow-card transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300 transition-colors duration-300 group-hover:bg-sky-500/20">
                <Icon name={f.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition hover:text-sky-200"
          >
            Explore the dashboard
            <Icon name="chevronRight" className="h-4 w-4" />
          </Link>
          <p className="mt-6 text-xs text-slate-600">
            Demo build — no real patient data is processed. Backend integration comes in a later phase.
          </p>
        </div>
      </section>
    </div>
  )
}
