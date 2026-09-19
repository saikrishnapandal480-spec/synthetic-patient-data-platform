const variants = {
  mock: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
  data: 'bg-sky-400/10 text-sky-300 border-sky-400/25',
  neutral: 'bg-white/5 text-slate-300 border-white/10',
  success: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
}

export default function Badge({ variant = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${variants[variant]}`}
    >
      {children}
    </span>
  )
}
