import Icon from './Icon.jsx'

export default function Pagination({ page, pageCount, pageSize, onPageSize, total, onPage }) {
  const window = []
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  for (let i = start; i <= Math.min(pageCount, start + 4); i++) window.push(i)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 px-5 py-4 text-sm sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-300">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
        </span>{' '}
        of <span className="font-semibold text-slate-300">{total.toLocaleString('en-US')}</span> records
      </p>
      <div className="flex items-center gap-1.5">
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
          aria-label="Rows per page"
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
        {window.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
              p === page
                ? 'bg-sky-500 text-white shadow-glow'
                : 'border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          aria-label="Next page"
        >
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
