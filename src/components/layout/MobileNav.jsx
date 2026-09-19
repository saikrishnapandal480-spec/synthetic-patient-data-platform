import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { NAV_ITEMS } from './navConfig.js'
import Icon from '../ui/Icon.jsx'
import Badge from '../ui/Badge.jsx'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white">
              <Icon name="heart" className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold text-white">Synthetic Patient Data</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            aria-label="Open navigation"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-ink-950/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-ink-900 shadow-2xl transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
            <span className="text-sm font-bold text-white">Navigation</span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 p-2 text-slate-300"
              aria-label="Close navigation"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <nav className="p-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-sky-500/15 text-white' : 'text-slate-400 hover:bg-white/5'
                  }`
                }
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] text-slate-600">{item.desc}</span>
              </NavLink>
            ))}
          </nav>
          <div className="px-4 pt-2">
            <Badge variant="mock">Demo mode</Badge>
          </div>
        </div>
      </div>
    </>
  )
}
