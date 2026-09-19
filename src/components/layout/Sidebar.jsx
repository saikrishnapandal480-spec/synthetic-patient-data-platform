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
  const { hasGenerated } = useApp()
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
            Live mode: data comes from the FastAPI backend.
          </p>
        </div>
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <p className="text-xs font-semibold text-slate-300">Live backend active</p>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
            Connected to FastAPI backend — all data is synthetic, generated server-side.
          </p>
        </div>
      </div>
    </aside>
  )
}
