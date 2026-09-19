import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import MobileNav from './MobileNav.jsx'
import Icon from '../ui/Icon.jsx'
import Badge from '../ui/Badge.jsx'
import { useApp } from '../../state/AppContext.jsx'

const NAV_TITLE_MAP = {
  '/dashboard': ['Dashboard', 'Workspace overview'],
  '/upload': ['Upload', 'Add a new dataset'],
  '/analysis': ['Analysis', 'Dataset statistics and distributions'],
  '/cohort-builder': ['Cohort Builder', 'Configure your synthetic cohort'],
  '/synthetic-data': ['Synthetic Data', 'Generated patient records'],
  '/validation': ['Validation', 'Original vs synthetic comparison'],
  '/privacy': ['Privacy', 'Privacy evaluation'],
  '/data-assistant': ['Data Assistant', 'Ask questions about your data'],
}

export default function Layout() {
  const { datasetName, isDemoMode } = useApp()
  const location = useLocation()
  const [title, desc] = NAV_TITLE_MAP[location.pathname] || ['Dashboard', 'Workspace overview']

  return (
    <div className="flex min-h-screen bg-ink-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-white/5 bg-ink-900/85 px-6 backdrop-blur-xl lg:flex">
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
          <div className="flex items-center gap-3">
            {isDemoMode ? (
              <Badge variant="mock">Demo mode — mock data</Badge>
            ) : (
              <Badge variant="success">Live backend — synthetic data</Badge>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
              <Icon name="file" className="h-3.5 w-3.5 text-sky-300" />
              <span className="max-w-52 truncate font-medium">{datasetName}</span>
            </div>
          </div>
        </header>
        <main key={location.pathname} className="min-w-0 flex-1 animate-fade-up p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
