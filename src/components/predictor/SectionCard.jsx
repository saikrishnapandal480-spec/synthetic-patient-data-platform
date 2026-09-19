import Icon from '../ui/Icon.jsx'

export default function SectionCard({ icon, title, description, badge, children, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-5 shadow-card transition-colors duration-300 hover:border-sky-400/20 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
              <Icon name={icon} className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>}
          </div>
        </div>
        {badge && <div className="flex shrink-0 items-center gap-2">{badge}</div>}
      </div>
      {children}
    </div>
  )
}
