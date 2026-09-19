import { NavLink, Link } from 'react-router-dom'
import { NAV_ITEMS } from './navConfig.js'
import Icon from '../ui/Icon.jsx'
import { useApp } from '../../state/AppContext.jsx'

const STEP_ROUTES = [
  { to: '/upload', label: 'Upload' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/cohort-builder', label: 'Cohort' },
  { to: '/synthetic-data', label: 'Synthetic' },
  { to: '/validation', label: 'Validation' },
  { to: '/privacy', label: 'Privacy' },
]

export default function Sidebar() {
  const { hasGenerated, isDemoMode, setIsDemoMode } = useApp()
  const doneCount = hasGenerated ? 5 : 0
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950/60 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-glow">
            <Icon name="heart" className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Synthetic Patient Data</p>
            <p className="text-[11px] font-medium text-slate-500">Research Platform</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Menu</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/15 to-transparent text-white shadow-[inset_2px_0_0_0_#38bdf8]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.to === '/synthetic-data' && hasGenerated && (
                  <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">NEW</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-2xl border border-white/5 bg-ink-800/50 p-3.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Workflow</p>
          {STEP_ROUTES.map((step, i) => {
            const stepDone = i < doneCount
            return (
              <Link key={step.to} to={step.to} className="group flex items-center gap-2.5 py-1.5">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold ${
                    stepDone
                      ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-300'
                      : 'border-white/15 text-slate-500'
                  }`}
                >
                  {stepDone ? '✓' : i + 1}
                </span>
                <span className={`text-xs transition-colors ${stepDone ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {step.label}
                  </span>
              </Link>
            )
          })}
          <p className="mt-3 border-t border-white/5 pt-3 text-[10px] leading-relaxed text-slate-500">
            {isDemoMode
              ? 'Demo mode: all data is mocked in the frontend.'
              : 'Live mode: data comes from the FastAPI backend.'}
          </p>
        </div>
      </nav>

      <div className="border-t border-white/5 p-4">
        <button 
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`w-full text-left rounded-xl border p-3 transition-colors ${
            isDemoMode 
              ? 'border-emerald-400/15 bg-emerald-400/5 hover:bg-emerald-400/10' 
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isDemoMode ? 'animate-pulse-dot bg-emerald-400' : 'bg-slate-500'}`} />
              <p className={`text-xs font-semibold ${isDemoMode ? 'text-emerald-300' : 'text-slate-400'}`}>
                {isDemoMode ? 'Demo mode active' : 'Live backend active'}
              </p>
            </div>
            <div className={`flex h-4 w-7 items-center rounded-full p-0.5 transition-colors ${isDemoMode ? 'bg-emerald-500' : 'bg-slate-600'}`}>
              <div className={`h-3 w-3 rounded-full bg-white transition-transform ${isDemoMode ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
            {isDemoMode ? 'Sample dataset loaded — 1,000 mock patients' : 'Connected to FastAPI backend'}
          </p>
        </button>
      </div>
    </aside>
  )
}
