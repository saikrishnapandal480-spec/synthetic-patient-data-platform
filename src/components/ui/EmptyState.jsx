import Icon from './Icon.jsx'

export default function EmptyState({ icon = 'database', title, message, action }) {
  return (
    <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
