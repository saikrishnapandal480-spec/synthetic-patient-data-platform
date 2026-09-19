#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Build the SH-405 source foundation from the downloaded Synthea CSVs:
//   1. ingest      — raw CSVs → canonical dataset
//   2. distributions — source statistics used by the generator/dashboard
//   3. longitudinal  — per patient-date records (real timestamps, real pain)
//   4. emit          — src/data/sourceDataset.js (bundled) +
//                      public/data/sh405-source-longitudinal.json (downloadable)
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import { ingest, buildSourceDistributions, buildLongitudinal, DERIVED_FIELDS, FIELD_PROVENANCE, CANONICAL_SCHEMA_VERSION } from './lib/ingest.mjs'

const CSV_DIR = 'source_data/set100/csv'
const OUT_MODULE = 'src/data/sourceDataset.js'
const OUT_PUBLIC_JSON = 'public/data/sh405-source-longitudinal.json'
// Canonical donor pool for the FastAPI cohort generator (Phase 6). Written to
// the backend's data dir so the API resamples the same 140-patient source.
const OUT_BACKEND_JSON = 'C:/Users/saikr/OneDrive/Documents/VNR 2/backend/data/source_canonical.json'

const csvDir = path.resolve(CSV_DIR)
if (!fs.existsSync(path.join(csvDir, 'patients.csv'))) {
  console.error(`Synthea CSVs not found at ${csvDir}. Run the fetch script first.`)
  process.exit(1)
}

console.log('Ingesting raw Synthea CSVs…')
const dataset = ingest(csvDir)
console.log('  patients      :', dataset.integrity.patients)
console.log('  conditions    :', dataset.integrity.conditions)
console.log('  medications   :', dataset.integrity.medications)
console.log('  encounters    :', dataset.integrity.encounters)
console.log('  obs (6 codes) :', dataset.integrity.observations)
console.log('  orphans       :', ['orphan_conditions', 'orphan_medications', 'orphan_encounters', 'orphan_observations'].map((k) => `${k}=${dataset.integrity[k]}`).join(' '))

console.log('Building source distributions…')
const distributions = buildSourceDistributions(dataset)
const { per_patient: sourcePerPatient, ...distSummary } = distributions

console.log('Building longitudinal records…')
const longitudinal = buildLongitudinal(dataset)

// Public JSON keeps dates + a compact projection (with pain score where present).
const projection = longitudinal.records.map((r) => ({
  patient_id: r.patient_id,
  date: r.date,
  systolic_bp: r.systolic_bp ?? null,
  diastolic_bp: r.diastolic_bp ?? null,
  pain_score: r.pain_score ?? null,
  glucose: r.glucose ?? null,
  hba1c: r.hba1c ?? null,
  encounter: r.encounter ?? null,
  medications: r.medications ?? null,
  conditions: r.conditions ?? null,
}))

fs.mkdirSync(path.dirname(OUT_PUBLIC_JSON), { recursive: true })
fs.writeFileSync(OUT_PUBLIC_JSON, JSON.stringify({
  schema_version: CANONICAL_SCHEMA_VERSION,
  provenance: dataset.provenance,
  field_provenance: FIELD_PROVENANCE,
  derived_fields: DERIVED_FIELDS,
  counts: {
    patients: dataset.integrity.patients,
    conditions: dataset.integrity.conditions,
    medications: dataset.integrity.medications,
    encounters: dataset.integrity.encounters,
    observations_used: dataset.integrity.observations,
    longitudinal_records: longitudinal.count,
  },
  distributions: distSummary,
  records: projection,
}, null, 1))
console.log(`Wrote ${OUT_PUBLIC_JSON} (${(fs.statSync(OUT_PUBLIC_JSON).size / 1e6).toFixed(1)} MB)`)

// Bundled module: canonical patients + summary only (records live in the JSON).
const patientRows = dataset.patients.map((p) => ({
  patient_id: p.patient_id,
  first_name: p.first_name,
  last_name: p.last_name,
  birth_date: p.birth_date,
  age: p.age,
  gender: p.gender,
  deceased: p.deceased,
}))

const sourceMeta = {
  name: 'Synthea Sample (record/synthea-dataset-100.zip)',
  url: 'https://github.com/lhs-open/synthetic-data',
  license:
    'Source repo: NOASSERTION (no license file). Upstream Synthea is MIT-licensed. Data is synthetic and carries no PHI.',
  status: 'synthetic / non-PHI',
  schema_version: CANONICAL_SCHEMA_VERSION,
  reference_date: distributions.reference_date,
  counts: {
    patients: dataset.integrity.patients,
    conditions: dataset.integrity.conditions,
    medications: dataset.integrity.medications,
    encounters: dataset.integrity.encounters,
    observations_used: dataset.integrity.observations,
    longitudinal_records: longitudinal.count,
  },
  columns: {
    patients: ['patient_id', 'first_name', 'last_name', 'birth_date', 'age', 'gender', 'deceased'],
    conditions: ['patient_id', 'start', 'stop', 'code', 'description'],
    medications: ['patient_id', 'start', 'stop', 'code', 'description', 'base_cost'],
    encounters: ['encounter_id', 'patient_id', 'start', 'class', 'code', 'description'],
    observations_used: ['patient_id', 'date', 'code', 'field', 'value'],
  },
  derived_fields: DERIVED_FIELDS,
  field_provenance: FIELD_PROVENANCE,
}

const moduleSource = `// ---------------------------------------------------------------------------
// AUTO-GENERATED by scripts/build-source-dataset.mjs — do not edit by hand.
// Source: public Synthea synthetic export (source_data/set100/csv).
// Rebuild: npm run build:source
// ---------------------------------------------------------------------------
export const SOURCE_META = ${JSON.stringify(sourceMeta, null, 2)}

export const SOURCE_DISTRIBUTIONS = ${JSON.stringify(distSummary, null, 2)}

// Per-patient source rows (age, BP, pain, glucose, A1c, condition/medication
// counts) — the empirical pool the SH-405 generator resamples from.
export const SOURCE_PER_PATIENT = ${JSON.stringify(sourcePerPatient)}

export const SOURCE_PATIENTS = ${JSON.stringify(patientRows)}

export function getSourceSummary() {
  return SOURCE_META
}
`

fs.writeFileSync(OUT_MODULE, moduleSource)
console.log(`Wrote ${OUT_MODULE} (${(fs.statSync(OUT_MODULE).size / 1e3).toFixed(0)} KB)`)

// Backend donor pool: canonical per-patient rows for POST /api/cohort/generate.
try {
  fs.mkdirSync(path.dirname(OUT_BACKEND_JSON), { recursive: true })
  fs.writeFileSync(OUT_BACKEND_JSON, JSON.stringify({
    schema_version: CANONICAL_SCHEMA_VERSION,
    provenance: { ...dataset.provenance, derived_fields: DERIVED_FIELDS },
    patients: sourcePerPatient.map((p) => ({
      patient_id: p.patient_id,
      age: p.age,
      gender: p.gender,
      has_diabetes: p.has_diabetes,
      systolic_bp: p.systolic_bp,
      diastolic_bp: p.diastolic_bp,
      pain_score: p.pain_score,
      glucose: p.glucose,
      hba1c: p.hba1c,
      bmi: p.bmi,
      condition_count: p.condition_count,
      medication_count: p.medication_count,
    })),
  }))
  console.log(`Wrote ${OUT_BACKEND_JSON}`)
} catch (err) {
  console.warn(`Skipped backend donor pool (${err.message})`)
}
console.log('Done.')
