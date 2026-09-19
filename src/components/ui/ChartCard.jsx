export default function ChartCard({ title, description, badge, children, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-5 shadow-card transition-colors duration-300 hover:border-sky-400/20 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  )
}
