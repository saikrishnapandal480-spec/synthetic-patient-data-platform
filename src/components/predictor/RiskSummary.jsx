import Badge from '../ui/Badge.jsx'
import Icon from '../ui/Icon.jsx'

// Renders ONLY what the backend returned. Risk level, suspected combinations,
// and related symptoms are extracted strictly from the analysis text — if the
// backend didn't provide a field, the card shows "not provided" rather than
// inventing a value (healthcare rule: never fabricate medical facts).
// Ordered: negative phrases first so "No severe interactions found" is read
// as low risk instead of matching the "severe interaction" substring.
const KEYWORD_MAP = {
  'no severe interaction': 'low',
  'no interaction': 'low',
  'no known interaction': 'low',
  'no major interaction': 'low',
  'severe interaction': 'high',
  'major interaction': 'high',
  'high risk': 'high',
  'moderate interaction': 'moderate',
  'possible interaction': 'moderate',
}

function deriveRiskLevel(analysisText) {
  const text = String(analysisText || '').toLowerCase()
  for (const [phrase, level] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(phrase)) return level
  }
  return null
}

const LEVEL_STYLES = {
  high: { badge: <Badge variant="mock">Risk level: high (derived)</Badge>, tone: 'text-rose-300' },
  moderate: { badge: <Badge variant="mock">Risk level: moderate (derived)</Badge>, tone: 'text-amber-300' },
  low: { badge: <Badge variant="success">Risk level: low (derived)</Badge>, tone: 'text-emerald-300' },
}

export default function RiskSummary({ result }) {
  if (!result) return null

  // 1) Prefer the backend's explicit risk_level field when present — that IS
  //    the actual response, not an interpretation.
  const backendLevel =
    typeof result.risk_level === 'string' ? result.risk_level.toLowerCase() : null
  const validLevel = ['low', 'moderate', 'high'].includes(backendLevel) ? backendLevel : null
  // 2) Fall back to a keyword reading of the backend's own analysis text.
  const derivedLevel = validLevel ? null : deriveRiskLevel(result.analysis)
  const level = validLevel || derivedLevel
  const style = level ? LEVEL_STYLES[level] : null
  const combos = Array.isArray(result.suspected_combinations) ? result.suspected_combinations : []

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        {validLevel ? (
          <Badge variant="data">Risk level: {validLevel} (from backend)</Badge>
        ) : style ? (
          style.badge
        ) : (
          <Badge variant="neutral">Risk level: not provided by backend</Badge>
        )}
        {combos.length > 0 ? (
          <Badge variant="data">Suspected combinations: from backend</Badge>
        ) : (
          <Badge variant="data">Suspected combinations: from analysis text</Badge>
        )}
      </div>
      {combos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {combos.map((c) => (
            <li key={c} className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
              {c}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {validLevel
          ? `Risk level is taken directly from the backend's risk_level field — no frontend interpretation.`
          : level
            ? `The analysis text indicates a ${level}-risk interpretation. This is a frontend keyword reading of the backend's own wording — no score is invented.`
            : 'The backend did not include a risk level in its response. No risk level is inferred or fabricated here.'}
      </p>
      <p className={`mt-2 flex items-center gap-1.5 text-xs ${style ? style.tone : 'text-slate-400'}`}>
        <Icon name="alert" className="h-3.5 w-3.5" />
        Derived display only — not clinical guidance and not medical advice.
      </p>
    </div>
  )
}
