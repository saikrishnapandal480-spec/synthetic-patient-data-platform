import Badge from '../ui/Badge.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Icon from '../ui/Icon.jsx'

export default function AnalysisResult({ result, isAnalyzing }) {
  if (isAnalyzing) {
    return (
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
        <span className="text-sm text-slate-300">Analyzing medications via the backend…</span>
      </div>
    )
  }

  if (!result) {
    return (
      <EmptyState
        icon="sparkles"
        title="No analysis yet"
        message='Run "Analyze Interactions" to see the backend analysis for this patient.'
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={result.status === 'success' ? 'success' : 'mock'}>status: {String(result.status)}</Badge>
        {result.is_synthetic_demo != null && (
          <Badge variant={result.is_synthetic_demo ? 'data' : 'mock'}>
            {result.is_synthetic_demo ? 'is_synthetic_demo: true' : 'is_synthetic_demo: false'}
          </Badge>
        )}
      </div>
      <div className="glass rounded-xl p-4">
        <div className="flex items-start gap-2.5">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <p className="text-sm leading-relaxed text-slate-200">{String(result.analysis)}</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Verbatim backend response — nothing is added or interpreted on the frontend.
      </p>
    </div>
  )
}
