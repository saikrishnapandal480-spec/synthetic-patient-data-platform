import Icon from '../ui/Icon.jsx'

const styles = {
  error: 'border-rose-400/25 bg-rose-500/10 text-rose-200',
  success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
  info: 'border-sky-400/25 bg-sky-500/10 text-sky-200',
}

const icons = { error: 'alert', success: 'check', info: 'info' }

export default function Alert({ kind = 'info', children, onDismiss }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles[kind] || styles.info}`}>
      <Icon name={icons[kind] || 'info'} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 transition-opacity hover:opacity-100" aria-label="Dismiss">
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
