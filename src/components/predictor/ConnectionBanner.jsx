import { useState } from 'react'
import Icon from '../ui/Icon.jsx'
import Button from './Button.jsx'

const states = {
  checking: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300', label: 'Connecting to backend…' },
  online: { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'Backend connected' },
  offline: { dot: 'bg-rose-400', text: 'text-rose-300', label: 'Backend offline' },
}

export default function ConnectionBanner({ status, baseUrl, onRetry }) {
  const [retrying, setRetrying] = useState(false)
  const s = states[status] || states.checking

  const handleRetry = async () => {
    setRetrying(true)
    await onRetry?.()
    setRetrying(false)
  }

  return (
    <div className="glass flex flex-col items-start justify-between gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full ${s.dot}`} />
        </span>
        <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
        <span className="hidden text-xs text-slate-500 sm:inline">{baseUrl}</span>
      </div>
      {status !== 'online' && (
        <Button variant="ghost" onClick={handleRetry} disabled={retrying} className="!px-3 !py-1.5 text-xs">
          <Icon name="refresh" className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Retry connection'}
        </Button>
      )}
    </div>
  )
}
