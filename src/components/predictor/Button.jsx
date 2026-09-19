const variants = {
  primary:
    'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-[0_8px_24px_-8px_rgba(56,189,248,0.5)] hover:shadow-[0_8px_28px_-6px_rgba(56,189,248,0.65)] hover:brightness-110',
  ghost: 'border border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/30 hover:bg-white/10',
  danger: 'border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
