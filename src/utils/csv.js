// ---------------------------------------------------------------------------
// SH-405 CSV export utilities — generate real CSV from the actual synthetic
// records held in shared application state (backend cohort / backend timeline).
// Nothing here is hard-coded: every row comes from the records passed in.
// Values are escaped per RFC 4180 (quote fields containing commas, quotes or
// newlines; double the quotes). Output is UTF-8 (Blob type includes charset).
// ---------------------------------------------------------------------------

export function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) lines.push(row.map(csvEscape).join(','))
  return lines.join('\r\n')
}

// ---------------------------------------------------------------------------
// Synthetic cohort export — one row per generated synthetic patient.
// Expects canonical patient records (backendPatientsToCanonical shape):
// { patientId, age, gender, diabetes(bool), systolic, diastolic, glucose,
//   hba1c, bmi, painScore, activity, adherence, sourceDonorId }
// Hypertension follows the platform's documented rule (systolic ≥ 140),
// the same rule the backend uses.
// ---------------------------------------------------------------------------
export const COHORT_CSV_HEADERS = [
  'patient_id',
  'age',
  'gender',
  'diabetes',
  'hypertension',
  'systolic_bp',
  'diastolic_bp',
  'glucose',
  'hba1c',
  'bmi',
  'pain_score',
  'activity_level',
  'medication_adherence',
  'source_donor_id',
]

export function cohortCsvFilename({ cohortId, patientCount } = {}) {
  const parts = ['synthetic_patient_cohort']
  if (cohortId) parts.push(cohortId)
  if (patientCount != null) parts.push(`${patientCount}patients`)
  return `${parts.join('_')}.csv`
}

export function buildCohortCsv(patients, opts = {}) {
  const rows = (patients || []).map((p) => [
    p.patientId ?? '',
    p.age ?? '',
    p.gender ?? '',
    p.diabetes ? 'Yes' : 'No',
    (typeof p.systolic === 'number' && p.systolic >= 140) ? 'Yes' : 'No',
    p.systolic ?? '',
    p.diastolic ?? '',
    p.glucose ?? '',
    p.hba1c ?? '',
    p.bmi ?? '',
    p.painScore ?? '',
    p.activity ?? '',
    p.adherence ?? '',
    p.sourceDonorId ?? '',
  ])
  return {
    csv: toCsv(COHORT_CSV_HEADERS, rows),
    filename: cohortCsvFilename({ cohortId: opts.cohortId, patientCount: patients?.length }),
  }
}

// ---------------------------------------------------------------------------
// Longitudinal export — one row per observation/date for one patient.
// Expects the backend timeline response:
// { patient_id, count, observations: [{ observation_date, age, systolic_bp,
//   diastolic_bp, glucose, pain_score, activity_level, medication_adherence,
//   diabetes, hypertension }] }
// ---------------------------------------------------------------------------
export const LONGITUDINAL_CSV_HEADERS = [
  'patient_id',
  'observation_date',
  'age',
  'systolic_bp',
  'diastolic_bp',
  'glucose',
  'pain_score',
  'activity_level',
  'medication_adherence',
  'diabetes',
  'hypertension',
]

export function buildLongitudinalCsv(timeline) {
  const observations = timeline?.observations || []
  const rows = observations.map((o) => [
    timeline.patient_id ?? o.patient_id ?? '',
    o.observation_date ?? '',
    o.age ?? '',
    o.systolic_bp ?? '',
    o.diastolic_bp ?? '',
    o.glucose ?? '',
    o.pain_score ?? '',
    o.activity_level ?? '',
    o.medication_adherence ?? '',
    o.diabetes ?? '',
    o.hypertension ?? '',
  ])
  return {
    csv: toCsv(LONGITUDINAL_CSV_HEADERS, rows),
    filename: `longitudinal_timeline_${timeline?.patient_id || 'patient'}.csv`,
  }
}

// Trigger a real browser download for the generated CSV (UTF-8).
export function downloadCsv(csv, filename) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return blob
}
