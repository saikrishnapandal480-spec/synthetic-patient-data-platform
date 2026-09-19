// ---------------------------------------------------------------------------
// Descriptive statistics helpers — SH-405 Statistical Validation.
// Every function computes from the values it is given; nothing is precomputed,
// hard-coded, or invented. Nulls/undefined are ignored (missing data).
// ---------------------------------------------------------------------------

// Full numeric description: mean, median, sample standard deviation, min, max.
// stdDev is the sample SD (n-1); null when fewer than 2 valid values.
export function describeNumeric(values) {
  const xs = (values || []).filter((v) => typeof v === 'number' && Number.isFinite(v))
  const n = xs.length
  if (n === 0) return { n: 0, mean: null, median: null, stdDev: null, min: null, max: null }
  const sorted = [...xs].sort((a, b) => a - b)
  const mean = xs.reduce((s, v) => s + v, 0) / n
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  const variance =
    n > 1 ? xs.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1) : null
  return {
    n,
    mean,
    median,
    stdDev: variance === null ? null : Math.sqrt(variance),
    min: sorted[0],
    max: sorted[n - 1],
  }
}

// Category counts + percentages over the valid (non-null) values.
// `order` pins the display order; unexpected labels are appended sorted.
export function categoricalCounts(values, order) {
  const counts = new Map()
  for (const v of values || []) {
    if (v === null || v === undefined) continue
    const key = String(v)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const total = [...counts.values()].reduce((s, c) => s + c, 0)
  let labels = order ? order.filter((l) => counts.has(l)) : []
  const extra = [...counts.keys()].filter((l) => !labels.includes(l)).sort()
  labels = [...labels, ...extra]
  return {
    total,
    categories: labels.map((l) => ({
      label: l,
      count: counts.get(l),
      pct: total ? (counts.get(l) / total) * 100 : 0,
    })),
  }
}

// Status for a numeric comparison, derived from the ACTUAL difference relative
// to the source distribution's spread (display guidance, not a quality score):
//   |Δmean| ≤ 0.10 × source SD → 'match'   (distributions overlap closely)
//   |Δmean| ≤ 0.25 × source SD → 'close'
//   otherwise                  → 'differs'
// Zero/unknown SD: equal means → 'match', any other difference → 'differs'.
export function numericStatus(origMean, synthMean, origSd) {
  if (origMean === null || synthMean === null) return 'unavailable'
  const diff = synthMean - origMean
  if (origSd === null || origSd === 0) return diff === 0 ? 'match' : 'differs'
  const rel = Math.abs(diff) / origSd
  if (rel <= 0.1) return 'match'
  if (rel <= 0.25) return 'close'
  return 'differs'
}

// Status for a categorical comparison from the ACTUAL percentage-point gap:
//   |Δpp| ≤ 5  → 'match' · ≤ 10 → 'close' · otherwise → 'differs'
export function categoricalStatus(origPct, synthPct) {
  if (origPct === null || synthPct === null) return 'unavailable'
  const pp = Math.abs(synthPct - origPct)
  if (pp <= 5) return 'match'
  if (pp <= 10) return 'close'
  return 'differs'
}

// ---------------------------------------------------------------------------
// Ordinal category → numeric mapping (visualization layer only).
// Used by the Longitudinal charts to plot categorical observations
// (activity_level, medication_adherence). The original categorical values are
// never modified — conversion happens only at render time.
// ---------------------------------------------------------------------------
export function categoryToOrdinal(value, mapping) {
  if (value === null || value === undefined) return null
  const mapped = mapping[String(value).trim().toLowerCase()]
  return mapped === undefined ? null : mapped
}
