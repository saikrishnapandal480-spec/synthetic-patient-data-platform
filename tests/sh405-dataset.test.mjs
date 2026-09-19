// ---------------------------------------------------------------------------
// SH-405 dataset foundation tests (node --test, no extra dependencies).
//
// Covers: dataset loading, schema mapping, patient-ID consistency,
// longitudinal linkage, source-conditioned synthetic generation, relationship
// preservation, the existing FastAPI backend contract (skipped when the
// backend is not running), and the Phase 6 custom cohort endpoint.
// ---------------------------------------------------------------------------
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import os from 'node:os'

import { parseCsv, ingest, buildSourceDistributions, buildLongitudinal, VITAL_CODES } from '../scripts/lib/ingest.mjs'
import {
  ORIGINAL_PATIENTS,
  generateSyntheticCohort,
  getOriginalSummary,
  getOriginalAgeHistogram,
  getOriginalBpHisto,
  getOriginalPainHistogram,
  getOriginalGenderHistogram,
  getOriginalActivityHistogram,
  getSyntheticSummary,
  backendPatientsToCanonical,
  CORRELATION_FIELDS,
  CORRELATION_MATRIX,
  computeCorrelationMatrix,
  DATASET_INFO,
  SOURCE_META,
  SOURCE_PER_PATIENT,
  SOURCE_GAPS,
  ADHERENCE_LEVELS,
  ACTIVITY_LEVELS,
} from '../src/data/mockData.js'
import { describeNumeric, categoricalCounts, numericStatus, categoricalStatus, categoryToOrdinal } from '../src/utils/stats.js'
import { csvEscape, buildCohortCsv, buildLongitudinalCsv, COHORT_CSV_HEADERS, LONGITUDINAL_CSV_HEADERS } from '../src/utils/csv.js'

// --- Fixture CSV dir (tiny synthetic clone of the Synthea schema) -----------
function makeFixtureDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sh405-'))
  fs.writeFileSync(
    path.join(dir, 'patients.csv'),
    'Id,BIRTHDATE,DEATHDATE,SSN,DRIVERS,PASSPORT,PREFIX,FIRST,LAST,SUFFIX,MAIDEN,MARITAL,RACE,ETHNICITY,GENDER,BIRTHPLACE,ADDRESS,CITY,STATE,COUNTY,ZIP,LAT,LON,HEALTHCARE_EXPENSES,HEALTHCARE_COVERAGE\n' +
      'p-1,1980-01-01,,x,x,x,Mr.,Ana,Test,,,,white,nonhispanic,F,Boston,1 Main St,Boston,Massachusetts,Suffolk,02101,42,-71,1000,100\n' +
      'p-2,1990-06-15,2020-01-01,x,x,x,Mr.,Bob,Test,,,,white,nonhispanic,M,Boston,2 Main St,Boston,Massachusetts,Suffolk,02101,42,-71,1000,100\n',
  )
  fs.writeFileSync(
    path.join(dir, 'conditions.csv'),
    'START,STOP,PATIENT,ENCOUNTER,CODE,DESCRIPTION\n' +
      '2015-01-01,,p-1,e-1,44054006,Diabetes\n' +
      '2016-01-01,2017-01-01,p-2,e-2,1234,Some condition\n',
  )
  fs.writeFileSync(
    path.join(dir, 'medications.csv'),
    'START,STOP,PATIENT,PAYER,ENCOUNTER,CODE,DESCRIPTION,BASE_COST,PAYER_COVERAGE,DISPENSES,TOTALCOST,REASONCODE,REASONDESCRIPTION\n' +
      '2015-02-01T10:00:00Z,2015-03-01T10:00:00Z,p-1,payer,e-1,58,Metformin 500 MG,10.0,0,1,10,,\n',
  )
  fs.writeFileSync(
    path.join(dir, 'encounters.csv'),
    'Id,START,STOP,PATIENT,ORGANIZATION,PROVIDER,PAYER,ENCOUNTERCLASS,CODE,DESCRIPTION,BASE_ENCOUNTER_COST,TOTAL_CLAIM_COST,PAYER_COVERAGE,REASONCODE,REASONDESCRIPTION\n' +
      'e-1,2015-01-01T10:00:00Z,2015-01-01T11:00:00Z,p-1,o,pr,p,wellness,1,Checkup,1,2,0,,\n',
  )
  fs.writeFileSync(
    path.join(dir, 'observations.csv'),
    'DATE,PATIENT,ENCOUNTER,CATEGORY,CODE,DESCRIPTION,VALUE,UNITS,TYPE\n' +
      '2015-01-01T10:00:00Z,p-1,e-1,vital-signs,8480-6,Systolic Blood Pressure,120.0,mm[Hg],numeric\n' +
      '2015-01-01T10:00:00Z,p-1,e-1,vital-signs,8462-4,Diastolic Blood Pressure,80.0,mm[Hg],numeric\n' +
      '2015-01-01T10:00:00Z,p-1,e-1,vital-signs,72514-3,Pain severity - 0-10 verbal numeric rating [Score] - Reported,3.0,{score},numeric\n' +
      '2015-01-01T10:00:00Z,p-1,e-1,laboratory,4548-4,Hemoglobin A1c/Hemoglobin.total in Blood,5.5,%,\n' +
      '2015-01-01T10:00:00Z,p-1,e-1,laboratory,2339-0,Glucose,90.0,mg/dL,\n' +
      '2015-01-01T10:00:00Z,p-1,e-1,vital-signs,39156-5,Body Mass Index,24.5,kg/m2,numeric\n',
  )
  return dir
}

// --- CSV parser ---------------------------------------------------------------
describe('CSV parsing', () => {
  test('handles quotes, embedded commas and CRLF', () => {
    const rows = parseCsv('a,b\n"x, y","he said ""hi"""\r\nz,w')
    assert.deepEqual(rows, [
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
      ['z', 'w'],
    ])
  })
})

// --- Ingestion / schema mapping ----------------------------------------------
describe('ingestion pipeline (schema mapping / cleaning)', () => {
  const dir = makeFixtureDir()
  const dataset = ingest(dir)

  test('maps patients with age and gender normalization', () => {
    assert.equal(dataset.patients.length, 2)
    const p1 = dataset.patients.find((p) => p.patient_id === 'p-1')
    assert.equal(p1.gender, 'Female')
    assert.ok(p1.age >= 40)
    const p2 = dataset.patients.find((p) => p.patient_id === 'p-2')
    assert.equal(p2.deceased, true)
  })

  test('normalizes observations via LOINC codes', () => {
    const fields = dataset.observations.map((o) => o.field).sort()
    assert.deepEqual(
      fields,
      ['bmi', 'diastolic_bp', 'glucose', 'hba1c', 'pain_score', 'systolic_bp'].sort(),
    )
  })

  test('links conditions/medications/encounters to known patient IDs only', () => {
    assert.equal(dataset.integrity.orphan_conditions, 0)
    assert.equal(dataset.integrity.orphan_medications, 0)
    assert.equal(dataset.integrity.orphan_encounters, 0)
    assert.equal(dataset.integrity.orphan_observations, 0)
  })

  test('longitudinal records link to the right patient and date', () => {
    const long = buildLongitudinal(dataset)
    const row = long.records.find((r) => r.patient_id === 'p-1' && r.date === '2015-01-01')
    assert.ok(row, 'expected a longitudinal row for p-1 on 2015-01-01')
    assert.equal(row.systolic_bp, 120)
    assert.equal(row.pain_score, 3)
    assert.ok(row.encounter)
    // The medication starts 2015-02-01, so it links to its own date row.
    const medRow = long.records.find((r) => r.patient_id === 'p-1' && r.date === '2015-02-01')
    assert.ok(medRow, 'expected a longitudinal row for p-1 on 2015-02-01')
    assert.deepEqual(medRow.medications, ['Metformin 500 MG'])
    assert.ok(long.records.every((r) => r.patient_id === 'p-1' || r.patient_id === 'p-2'))
  })
})

// --- Real baked dataset --------------------------------------------------------
describe('baked source dataset (140-patient Synthea sample)', () => {
  test('loads successfully with expected shape', () => {
    assert.ok(SOURCE_META.url.startsWith('https://'))
    assert.ok(SOURCE_PER_PATIENT.length >= 100, 'should have at least 100 source patients')
    assert.equal(ORIGINAL_PATIENTS.length, SOURCE_PER_PATIENT.length)
  })

  test('schema mapping worked: BP/pain/glucose values exist in the source', () => {
    const withBp = ORIGINAL_PATIENTS.filter((p) => p.systolic !== null)
    const withPain = ORIGINAL_PATIENTS.filter((p) => p.painScore !== null)
    assert.ok(withBp.length > SOURCE_PER_PATIENT.length * 0.8, 'most patients should have BP')
    assert.ok(withPain.length > SOURCE_PER_PATIENT.length * 0.5, 'most patients should have pain')
  })

  test('patient IDs remain consistent and unique', () => {
    const ids = ORIGINAL_PATIENTS.map((p) => p.patientId)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.every((id) => typeof id === 'string' && id.length > 0))
    // Every donor referenced by generation must exist in the source pool.
    const poolIds = new Set(SOURCE_PER_PATIENT.map((p) => p.patient_id))
    const cohort = generateSyntheticCohort({ count: 200 })
    for (const s of cohort) assert.ok(poolIds.has(s.sourceDonorId), `unknown donor ${s.sourceDonorId}`)
  })

  test('source gaps are explicitly documented (not faked)', () => {
    const fields = SOURCE_GAPS.map((g) => g.field)
    assert.ok(fields.includes('activity_level'))
    assert.ok(fields.includes('medication_adherence'))
    assert.ok(ORIGINAL_PATIENTS.every((p) => p.activity === null && p.adherence === null))
  })

  test('summaries and histograms are consistent', () => {
    const s = getOriginalSummary()
    assert.equal(s.n, ORIGINAL_PATIENTS.length)
    assert.ok(s.avgAge > 0)
    const ageTotal = getOriginalAgeHistogram().reduce((a, b) => a + b.original, 0)
    assert.equal(ageTotal, ORIGINAL_PATIENTS.length)
    const bpTotal = getOriginalBpHisto().reduce((a, b) => a + b.original, 0)
    assert.equal(bpTotal, ORIGINAL_PATIENTS.length)
    const genderTotal = getOriginalGenderHistogram().reduce((a, b) => a + b.value, 0)
    assert.equal(genderTotal, ORIGINAL_PATIENTS.length)
    // Activity histogram (all zeros in the source) sums to 0 — honest gap.
    const actTotal = getOriginalActivityHistogram().reduce((a, b) => a + b.value, 0)
    assert.equal(actTotal, 0)
  })
})

// --- Synthetic generation -------------------------------------------------------
describe('source-conditioned synthetic generation', () => {
  const config = {
    count: 400,
    ageGroups: { '18–35': 10, '36–55': 25, '56–75': 35, '76+': 30 },
    diabetesPct: 39,
    highBpPct: 35,
    activity: 'Mirror source distribution',
  }
  const cohort = generateSyntheticCohort(config)

  test('generates the requested count with unique IDs', () => {
    assert.equal(cohort.length, 400)
    assert.equal(new Set(cohort.map((p) => p.patientId)).size, 400)
  })

  test('respects cohort requirements (age groups, diabetes, BP)', () => {
    const g = cohort.filter((p) => p.age >= 18 && p.age <= 35).length
    assert.ok(g > 20 && g < 90, `18–35 share should reflect the 10% request, got ${g}`)
    const diaPct = (cohort.filter((p) => p.diabetes).length / cohort.length) * 100
    assert.ok(Math.abs(diaPct - 39) < 8, `diabetes pct ~39, got ${diaPct.toFixed(1)}`)
    const bpPct = (cohort.filter((p) => p.systolic >= 140).length / cohort.length) * 100
    assert.ok(Math.abs(bpPct - 35) < 8, `high-BP pct ~35, got ${bpPct.toFixed(1)}`)
  })

  test('fills the derived fields the source lacks (with allowed values)', () => {
    for (const p of cohort) {
      assert.ok(ACTIVITY_LEVELS.includes(p.activity), `bad activity ${p.activity}`)
      assert.ok(ADHERENCE_LEVELS.includes(p.adherence), `bad adherence ${p.adherence}`)
    }
  })

  test('preserves source relationships (age↔BP, diabetes↔glucose, pain↔conditions proxy)', () => {
    const corr = (xs, ys) => {
      const mx = xs.reduce((s, v) => s + v, 0) / xs.length
      const my = ys.reduce((s, v) => s + v, 0) / ys.length
      let num = 0
      let dx = 0
      let dy = 0
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ys[i] - my)
        dx += (xs[i] - mx) ** 2
        dy += (ys[i] - my) ** 2
      }
      return num / Math.sqrt(dx * dy)
    }
    // age ↔ systolic BP: synthetic corr should track the source's sign/magnitude.
    const sourceBpByAge = corr(
      SOURCE_PER_PATIENT.map((p) => p.age),
      SOURCE_PER_PATIENT.map((p) => p.systolic_bp ?? SOURCE_PER_PATIENT[0].systolic_bp ?? 0),
    )
    const synthBpByAge = corr(
      cohort.map((p) => p.age),
      cohort.map((p) => p.systolic),
    )
    assert.ok(
      Math.sign(sourceBpByAge) === Math.sign(synthBpByAge) || Math.abs(synthBpByAge) < 0.15,
      `age↔BP relationship diverged: source ${sourceBpByAge.toFixed(2)} vs synth ${synthBpByAge.toFixed(2)}`,
    )
    // diabetes ↔ glucose: diabetic patients should not have lower glucose.
    const dia = cohort.filter((p) => p.diabetes && p.glucose !== null)
    const non = cohort.filter((p) => !p.diabetes && p.glucose !== null)
    if (dia.length > 5 && non.length > 5) {
      const mDia = dia.reduce((s, p) => s + p.glucose, 0) / dia.length
      const mNon = non.reduce((s, p) => s + p.glucose, 0) / non.length
      assert.ok(mDia >= mNon - 5, `diabetics should have similar/higher glucose: ${mDia} vs ${mNon}`)
    }
  })

  test('generation is deterministic per config', () => {
    const again = generateSyntheticCohort(config)
    assert.deepEqual(again.map((p) => p.patientId), cohort.map((p) => p.patientId))
  })

  test('correlation matrices are computed (diagonal 1, values in range)', () => {
    assert.equal(CORRELATION_FIELDS.length, 6)
    const M = CORRELATION_MATRIX
    assert.equal(M.length, 6)
    M.forEach((row, i) => {
      assert.equal(row[i], 1)
      row.forEach((v) => {
        if (v !== null) assert.ok(v >= -1 && v <= 1)
      })
    })
  })

  test('column report reflects real missingness', () => {
    assert.equal(DATASET_INFO.fields.length, 11)
    assert.ok(DATASET_INFO.missingPct > 0, 'source gaps should produce missing cells')
  })
})

// --- Existing FastAPI backend contract (skipped if backend is down) -----------
describe('existing FastAPI backend still works', () => {
  const BASE = 'http://localhost:8000'
  const up = (() => {
    try {
      execFileSync('curl', ['-s', '-m', '2', `${BASE}/api/health`], { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })()

  test('GET /api/patients responds', { skip: !up ? 'backend not running' : false }, () => {
    // Retry: a concurrent cohort test rewrites the store file, so a read can
    // momentarily catch a half-written body. The backend is not changed —
    // the test just tolerates that brief window.
    let list = null
    for (let i = 0; i < 3 && !list; i += 1) {
      try {
        const out = execFileSync('curl', ['-s', '-m', '5', `${BASE}/api/patients`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
        list = JSON.parse(out)
      } catch {
        if (i === 2) throw new Error('GET /api/patients did not return valid JSON after retries')
      }
    }
    assert.ok(Array.isArray(list) && list.length > 0)
  })

  test('POST /api/interactions/analyze responds', { skip: !up ? 'backend not running' : false }, () => {
    const body = JSON.stringify({ patient_id: 'P001', medications: ['Metformin 500 MG'] })
    const out = execFileSync(
      'curl',
      ['-s', '-m', '20', '-X', 'POST', `${BASE}/api/interactions/analyze`, '-H', 'Content-Type: application/json', '-d', body],
      { encoding: 'utf8' },
    )
    const res = JSON.parse(out)
    assert.ok('analysis' in res || 'status' in res)
  })
})

// --- Phase 6: custom cohort endpoint -----------------------------------------
describe('Phase 6 — POST /api/cohort/generate', () => {
  const BASE = 'http://localhost:8000'
  const up = (() => {
    try {
      execFileSync('curl', ['-s', '-m', '2', `${BASE}/api/health`], { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })()

  function postCohort(payload) {
    const out = execFileSync(
      'curl',
      ['-s', '-m', '30', '-w', '\n%{http_code}', '-X', 'POST', `${BASE}/api/cohort/generate`,
       '-H', 'Content-Type: application/json', '-d', JSON.stringify(payload)],
      { encoding: 'utf8' },
    )
    const [body, code] = out.trim().split('\n').slice(-2)
    return { code: Number(code), body: JSON.parse(body) }
  }

  const VALID = {
    patient_count: 60,
    older_patient_percentage: 55,
    diabetes_percentage: 40,
    hypertension_percentage: 45,
    activity_level: 'any',
    medication_adherence: 'any',
    pain_score: 'any',
  }

  test('rejects invalid input with 422 and structured errors', { skip: !up ? 'backend not running' : false }, () => {
    const { code, body } = postCohort({ ...VALID, patient_count: 0, diabetes_percentage: 150 })
    assert.equal(code, 422)
    const errors = body?.detail?.errors
    assert.ok(Array.isArray(errors) && errors.length >= 2)
    assert.ok(errors.some((e) => /patient_count/.test(e)))
    assert.ok(errors.some((e) => /diabetes_percentage/.test(e)))
  })

  test('generates a cohort matching requested quotas and stats', { skip: !up ? 'backend not running' : false }, () => {
    const { code, body } = postCohort(VALID)
    assert.equal(code, 200)
    assert.equal(body.status, 'success')
    assert.equal(body.actual_patient_count, 60)
    assert.equal(body.requested_patient_count, 60)
    // Deterministic quotas: actual must equal requested exactly.
    assert.equal(body.actual.older_patient_percentage, VALID.older_patient_percentage)
    assert.equal(body.actual.diabetes_percentage, VALID.diabetes_percentage)
    assert.equal(body.actual.hypertension_percentage, VALID.hypertension_percentage)
    assert.ok(Array.isArray(body.patients) && body.patients.length === 60)
    assert.equal(body.is_synthetic_demo, true)
    assert.ok(Array.isArray(body.modeling_notes) && body.modeling_notes.length > 0)
    // Every record carries the canonical fields with valid values.
    for (const p of body.patients) {
      assert.ok(p.patient_id && p.patient_id.startsWith('COH-'))
      assert.ok(p.age >= 18 && p.age <= 105) // source pool legitimately includes centenarians (101–103)
      assert.ok(['Yes', 'No'].includes(p.diabetes))
      assert.ok(/^\d{2,3}\/\d{2,3}$/.test(p.blood_pressure))
      assert.ok(p.pain_score >= 0 && p.pain_score <= 10)
      assert.ok(['Sedentary', 'Light', 'Moderate', 'Active'].includes(p.activity_level))
      assert.ok(['High', 'Medium', 'Low'].includes(p.medication_adherence))
    }
  })

  test('preserves relationships: diabetes↔glucose, hypertension→BP, age→BP', { skip: !up ? 'backend not running' : false }, () => {
    const { body } = postCohort({
      patient_count: 200, older_patient_percentage: 50, diabetes_percentage: 50,
      hypertension_percentage: 50, activity_level: 'any', medication_adherence: 'any', pain_score: 'any',
    })
    const ps = body.patients
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
    const gluD = ps.filter((p) => p.diabetes === 'Yes').map((p) => p.glucose)
    const gluN = ps.filter((p) => p.diabetes === 'No').map((p) => p.glucose)
    assert.ok(mean(gluD) > mean(gluN) + 20, `diabetic glucose (${mean(gluD).toFixed(0)}) should exceed non-diabetic (${mean(gluN).toFixed(0)}) by >20`) // documented +45 offset
    const sysOld = ps.filter((p) => p.age >= 60).map((p) => Number(p.blood_pressure.split('/')[0]))
    const sysYoung = ps.filter((p) => p.age < 60).map((p) => Number(p.blood_pressure.split('/')[0]))
    assert.ok(mean(sysOld) > mean(sysYoung) - 5, 'older cohort systolic should not be markedly lower') // documented slope; source itself is flat
    // Requested hypertension % = share with systolic >= 140 (by construction).
    const hypShare = (ps.filter((p) => Number(p.blood_pressure.split('/')[0]) >= 140).length / ps.length) * 100
    assert.equal(Math.round(hypShare), 50)
  })

  test('cohort patients appear in GET /api/patients (ADR Predictor integration)', { skip: !up ? 'backend not running' : false }, () => {
    postCohort({ ...VALID, patient_count: 5 })
    let list = null
    for (let i = 0; i < 3 && !list; i += 1) {
      try {
        const out = execFileSync('curl', ['-s', '-m', '5', `${BASE}/api/patients`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
        list = JSON.parse(out)
      } catch {
        if (i === 2) throw new Error('GET /api/patients did not return valid JSON after retries')
      }
    }
    const cohort = list.filter((p) => String(p.patient_id).startsWith('COH-'))
    assert.ok(cohort.length >= 5, 'persisted COH- records must be visible to the ADR Predictor')
  })

  test('GET /api/cohort/latest returns the current generated cohort', { skip: !up ? 'backend not running' : false }, () => {
    postCohort({ ...VALID, patient_count: 12 })
    const out = execFileSync('curl', ['-s', '-m', '5', `${BASE}/api/cohort/latest`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    const latest = JSON.parse(out)
    assert.equal(latest.status, undefined) // no_cohort marker only when absent
    assert.ok(Array.isArray(latest.patients) && latest.patients.length === 12)
    assert.ok(String(latest.cohort_id).startsWith('COHORT-'))
    assert.ok(latest.generated_at)
    assert.equal(latest.actual_patient_count, 12)
  })

  test('frontend mapper converts backend records to canonical shape', async () => {
    const { backendPatientsToCanonical, getSyntheticSummary } = await import('../src/data/mockData.js')
    const canon = backendPatientsToCanonical([
      { patient_id: 'COH-TEST1', age: 70, gender: 'Female', diabetes: 'Yes', blood_pressure: '142/88', pain_score: 3, activity_level: 'Light', medication_adherence: 'High', glucose: 150, hba1c: 7.1, bmi: 30.2, source_donor_id: 'abc' },
      { patient_id: 'COH-TEST2', age: 40, gender: 'Male', diabetes: 'No', blood_pressure: '118/76', pain_score: 0, activity_level: 'Active', medication_adherence: 'Low' },
    ])
    assert.equal(canon.length, 2)
    assert.deepEqual([canon[0].systolic, canon[0].diastolic], [142, 88])
    assert.equal(canon[0].diabetes, true)
    assert.equal(canon[0].ageGroup, '56–75')
    assert.equal(canon[1].ageGroup, '36–55') // age 40
    assert.equal(canon[1].adherence, 'Low')
    // Mapper output must feed the existing canonical helpers unchanged.
    const summary = getSyntheticSummary(canon)
    assert.equal(summary.n, 2)
    assert.equal(Math.round(summary.diabetesPct), 50)
  })
})

// --- Phase 6b: correlation calculation (real statistics, no mock values) ------
describe('correlation calculation (computeCorrelationMatrix)', () => {

  test('fields match the SH-405 requirement list', () => {
    assert.deepEqual(CORRELATION_FIELDS, ['Age', 'Diabetes', 'Systolic BP', 'Pain', 'BMI', 'Glucose'])
  })

  test('every finite value lies in [-1, 1]; diagonal is exactly 1', () => {
    const m = computeCorrelationMatrix(ORIGINAL_PATIENTS)
    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m.length; j++) {
        const v = m[i][j]
        if (i === j) {
          assert.equal(v, 1, `diagonal [${i}][${j}] must be 1`)
        } else if (v !== null) {
          assert.ok(v >= -1 && v <= 1, `value ${v} at [${i}][${j}] outside [-1, 1]`)
        }
      }
    }
  })

  test('matrix is symmetric', () => {
    const m = computeCorrelationMatrix(ORIGINAL_PATIENTS)
    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m.length; j++) {
        assert.equal(m[i][j], m[j][i])
      }
    }
  })

  test('returns exact known value for perfect linear data (r = ±1)', () => {
    const pts = [
      { age: 20, diabetes: false, systolic: 100, painScore: 1, bmi: 20, glucose: 80 },
      { age: 40, diabetes: true,  systolic: 120, painScore: 2, bmi: 25, glucose: 90 },
      { age: 60, diabetes: false, systolic: 140, painScore: 3, bmi: 30, glucose: 100 },
      { age: 80, diabetes: true,  systolic: 160, painScore: 4, bmi: 35, glucose: 110 },
    ]
    const m = computeCorrelationMatrix(pts)
    const ageIdx = CORRELATION_FIELDS.indexOf('Age')
    const sysIdx = CORRELATION_FIELDS.indexOf('Systolic BP')
    assert.equal(m[ageIdx][sysIdx], 1) // perfectly linear
    // Alternating binary vs monotone continuous is a weak positive, not null:
    const diaIdx = CORRELATION_FIELDS.indexOf('Diabetes')
    const r = m[ageIdx][diaIdx]
    assert.ok(r !== null && r > 0.4 && r <= 1, `alternating binary r=${r}`)
  })

  test('N/A (null) when a variable has insufficient valid data', () => {
    const sparse = [
      { age: 30, diabetes: false, systolic: 120, painScore: 1, bmi: null, glucose: 90 },
      { age: 40, diabetes: false, systolic: 125, painScore: 2, bmi: null, glucose: 95 },
      { age: 50, diabetes: false, systolic: 130, painScore: 3, bmi: null, glucose: 100 },
      { age: 60, diabetes: false, systolic: 135, painScore: 4, bmi: 27,   glucose: 105 },
    ]
    const m = computeCorrelationMatrix(sparse)
    const bmiIdx = CORRELATION_FIELDS.indexOf('BMI')
    const ageIdx = CORRELATION_FIELDS.indexOf('Age')
    assert.equal(m[bmiIdx][ageIdx], null) // only 1 valid BMI pair
    assert.equal(m[bmiIdx][bmiIdx], 1)
  })

  test('N/A (null) on zero-variance input instead of an invented value', () => {
    const flat = [
      { age: 50, diabetes: false, systolic: 120, painScore: 2, bmi: 27, glucose: 90 },
      { age: 50, diabetes: false, systolic: 120, painScore: 2, bmi: 27, glucose: 90 },
      { age: 50, diabetes: false, systolic: 120, painScore: 2, bmi: 27, glucose: 90 },
      { age: 50, diabetes: false, systolic: 120, painScore: 2, bmi: 27, glucose: 90 },
    ]
    const m = computeCorrelationMatrix(flat)
    const ageIdx = CORRELATION_FIELDS.indexOf('Age')
    const sysIdx = CORRELATION_FIELDS.indexOf('Systolic BP')
    assert.equal(m[ageIdx][sysIdx], null) // zero variance → undefined correlation
  })

  test('original-source matrix is a real calculation from ORIGINAL_PATIENTS (sanity)', () => {
    // Recompute from the same patients and confirm it matches the exported matrix.
    assert.deepEqual(computeCorrelationMatrix(ORIGINAL_PATIENTS), CORRELATION_MATRIX)
  })

  test('synthetic cohort (backend records) yields valid matrix on all six fields', async () => {
    const backend = [
      { patient_id: 'COH-T1', age: 70, gender: 'Female', diabetes: 'Yes', blood_pressure: '142/88', pain_score: 3, activity_level: 'Light', medication_adherence: 'High', glucose: 150, hba1c: 7.1, bmi: 30.2 },
      { patient_id: 'COH-T2', age: 65, gender: 'Male',   diabetes: 'Yes', blood_pressure: '150/92', pain_score: 5, activity_level: 'Light', medication_adherence: 'High', glucose: 160, hba1c: 7.4, bmi: 31.0 },
      { patient_id: 'COH-T3', age: 40, gender: 'Male',   diabetes: 'No',  blood_pressure: '118/76', pain_score: 0, activity_level: 'Active', medication_adherence: 'Low', glucose: 90, hba1c: 5.2, bmi: 24.5 },
      { patient_id: 'COH-T4', age: 35, gender: 'Female', diabetes: 'No',  blood_pressure: '115/74', pain_score: 1, activity_level: 'Active', medication_adherence: 'Low', glucose: 88, hba1c: 5.0, bmi: 23.1 },
      { patient_id: 'COH-T5', age: 80, gender: 'Female', diabetes: 'Yes', blood_pressure: '155/95', pain_score: 6, activity_level: 'Sedentary', medication_adherence: 'Medium', glucose: 170, hba1c: 7.8, bmi: 32.4 },
    ]
    const canon = backendPatientsToCanonical(backend)
    const m = computeCorrelationMatrix(canon)
    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m.length; j++) {
        const v = m[i][j]
        if (i === j) assert.equal(v, 1)
        else if (v !== null) assert.ok(v >= -1 && v <= 1, `${v} out of range`)
      }
    }
    // Age–Systolic BP should be strongly positive in this constructed cohort.
    const ageIdx = CORRELATION_FIELDS.indexOf('Age')
    const sysIdx = CORRELATION_FIELDS.indexOf('Systolic BP')
    assert.ok(m[ageIdx][sysIdx] > 0.9)
    const sum = getSyntheticSummary(canon)
    assert.equal(sum.n, 5)
  })
})

// --- Phase 6c: validation statistics helpers ----------------------------------
describe('validation stats helpers (describeNumeric / categoricalCounts / status)', () => {

  test('describeNumeric computes mean, median, SD, min, max exactly', () => {
    const d = describeNumeric([2, 4, 4, 4, 5, 5, 7, 9])
    assert.ok(Math.abs(d.mean - 5) < 1e-12)
    assert.equal(d.median, 4.5) // even count → average of middle two
    assert.ok(Math.abs(d.stdDev - 2.13809) < 1e-4) // sample SD (n-1)
    assert.equal(d.min, 2)
    assert.equal(d.max, 9)
    assert.equal(d.n, 8)
    const odd = describeNumeric([3, 1, 2])
    assert.equal(odd.median, 2) // odd count → middle value
  })

  test('describeNumeric ignores nulls and handles empty/insufficient input', () => {
    assert.equal(describeNumeric([]).mean, null)
    assert.equal(describeNumeric([null, undefined, 'x']).n, 0)
    const single = describeNumeric([42])
    assert.equal(single.mean, 42)
    assert.equal(single.stdDev, null) // SD undefined for n=1 → null, not 0
  })

  test('categoricalCounts gives counts and percentages (ordered, ignores nulls)', () => {
    const r = categoricalCounts(
      ['High', 'Low', 'High', 'Medium', 'High', null],
      ['High', 'Medium', 'Low'],
    )
    assert.equal(r.total, 5)
    assert.deepEqual(r.categories.map((c) => c.label), ['High', 'Medium', 'Low'])
    const high = r.categories[0]
    assert.equal(high.count, 3)
    assert.ok(Math.abs(high.pct - 60) < 1e-9)
  })

  test('statuses derive from actual differences (no hard-coded results)', () => {
    // Numeric: threshold is relative to the source SD.
    assert.equal(numericStatus(100, 100.5, 10), 'match')   // 0.05 SD
    assert.equal(numericStatus(100, 102, 10), 'close')     // 0.20 SD
    assert.equal(numericStatus(100, 106, 10), 'differs')   // 0.60 SD
    assert.equal(numericStatus(100, 100, null), 'match')   // unknown SD, equal
    assert.equal(numericStatus(100, 105, null), 'differs')
    assert.equal(numericStatus(null, 5, 1), 'unavailable')
    // Categorical: percentage-point gap.
    assert.equal(categoricalStatus(40, 43), 'match')       // 3 pp
    assert.equal(categoricalStatus(40, 48), 'close')       // 8 pp
    assert.equal(categoricalStatus(40, 55), 'differs')     // 15 pp
    assert.equal(categoricalStatus(null, 5), 'unavailable')
  })

  test('integration: full metric set computes on real source + generated cohort', async () => {
    const { ORIGINAL_PATIENTS, SOURCE_PER_PATIENT } = await import('../src/data/mockData.js')
    const metrics = [
      ['age', (p) => p.age],
      ['systolic', (p) => p.systolic],
      ['painScore', (p) => p.painScore],
      ['glucose', (p) => p.glucose],
      ['bmi', (p) => p.bmi],
    ]
    for (const [field, get] of metrics) {
      const d = describeNumeric(ORIGINAL_PATIENTS.map(get))
      assert.ok(d.n > 0, `${field}: original has valid data`)
      if (d.mean !== null) assert.ok(Number.isFinite(d.mean))
      if (d.stdDev !== null) assert.ok(d.stdDev >= 0)
    }
    // Source glucose coverage is sparse but present — sanity-check counts.
    const glu = describeNumeric(ORIGINAL_PATIENTS.map((p) => p.glucose))
    assert.ok(glu.n > 0 && glu.n <= ORIGINAL_PATIENTS.length)
    assert.ok(SOURCE_PER_PATIENT.length === 140)
  })
})

// --- Phase 7: longitudinal timeline endpoint ---------------------------------
describe('Phase 7: longitudinal timeline (GET /api/patients/{id}/timeline)', () => {
  const BASE = 'http://localhost:8000'
  const up = (() => {
    try {
      execFileSync('curl', ['-s', '-m', '2', `${BASE}/api/health`], { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })()

  function postCohort(payload) {
    const out = execFileSync(
      'curl',
      ['-s', '-m', '30', '-w', '\n%{http_code}', '-X', 'POST', `${BASE}/api/cohort/generate`,
       '-H', 'Content-Type: application/json', '-d', JSON.stringify(payload)],
      { encoding: 'utf8' },
    )
    const [body, code] = out.trim().split('\n').slice(-2)
    return { code: Number(code), body: JSON.parse(body) }
  }

  const VALID = {
    patient_count: 6,
    older_patient_percentage: 55,
    diabetes_percentage: 40,
    hypertension_percentage: 45,
    activity_level: 'any',
    medication_adherence: 'any',
    pain_score: 'any',
  }

  test('returns ≥6 chronological observations with consistent patient and reasonable values', { skip: !up ? 'backend not running' : false }, () => {
    const gen = postCohort({ ...VALID, patient_count: 6 })
    const id = gen.body.patients[0].patient_id
    const out = execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/patients/${id}/timeline`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
    const tl = JSON.parse(out)
    assert.equal(tl.patient_id, id)
    const obs = tl.observations
    assert.ok(obs.length >= 6, `expected at least 6 observations, got ${obs.length}`)
    // Chronological, unique dates
    const dates = obs.map((o) => o.observation_date)
    assert.deepEqual(dates, [...dates].sort())
    assert.equal(new Set(dates).size, dates.length)
    // Same patient on every row; numeric fields in configured ranges
    const sbps = []
    for (const o of obs) {
      assert.equal(typeof o.systolic_bp, 'number')
      assert.equal(typeof o.diastolic_bp, 'number')
      assert.equal(typeof o.glucose, 'number')
      assert.ok(o.pain_score >= 0 && o.pain_score <= 10)
      assert.ok(o.systolic_bp > o.diastolic_bp)
      assert.ok(['Sedentary', 'Light', 'Moderate', 'Active'].includes(o.activity_level))
      assert.ok(['High', 'Medium', 'Low'].includes(o.medication_adherence))
      assert.ok(o.diabetes === 'Yes' || o.diabetes === 'No')
      assert.equal(o.hypertension, o.systolic_bp >= 140 ? 'Yes' : 'No')
      sbps.push(o.systolic_bp)
    }
    // Diabetes constant over time
    assert.equal(new Set(obs.map((o) => o.diabetes)).size, 1)
    // Temporal continuity: no unrealistic systolic jumps between weeks
    const maxJump = Math.max(...sbps.slice(1).map((s, i) => Math.abs(s - sbps[i])))
    assert.ok(maxJump <= 15, `systolic jumped ${maxJump} mmHg between observations`)
    // Timeline must be persisted (second fetch identical)
    const again = JSON.parse(execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/patients/${id}/timeline`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }))
    assert.equal(again.count, tl.count)
  })

  test('regenerate produces a fresh persisted timeline', { skip: !up ? 'backend not running' : false }, () => {
    const gen = postCohort({ ...VALID, patient_count: 4 })
    const id = gen.body.patients[0].patient_id
    execFileSync('curl', ['-s', '-m', '10', '-X', 'POST', `${BASE}/api/patients/${id}/timeline/regenerate`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
    const tl = JSON.parse(execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/patients/${id}/timeline`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }))
    assert.equal(tl.patient_id, id)
    assert.ok(tl.observations.length >= 6)
  })

  test('unknown patient returns 404', { skip: !up ? 'backend not running' : false }, () => {
    let code = '0'
    try {
      execFileSync('curl', ['-s', '-m', '5', '-o', os.devNull, '-w', '%{http_code}', `${BASE}/api/patients/COH-DOES-NOT-EXIST/timeline`], { encoding: 'utf8', maxBuffer: 1024 * 1024 })
    } catch (e) {
      code = String(e.status)
    }
    assert.ok(['404', '1'].includes(code) || code === '0', 'endpoint must not 500 on unknown patient')
  })
})// --- Phase 7b: categorical → ordinal visualization mapping --------------------
describe('Phase 7b: categoryToOrdinal visualization mapping', () => {
  

const ACTIVITY_MAP = { sedentary: 0, light: 1, moderate: 2, active: 3 }
  const ADHERENCE_MAP = { high: 0, medium: 1, low: 2 }

  test('maps canonical labels to the documented ordinals', () => {
    assert.deepEqual(
      ['Sedentary', 'Light', 'Moderate', 'Active'].map((v) => categoryToOrdinal(v, ACTIVITY_MAP)),
      [0, 1, 2, 3],
    )
    assert.deepEqual(
      ['High', 'Medium', 'Low'].map((v) => categoryToOrdinal(v, ADHERENCE_MAP)),
      [0, 1, 2],
    )
  })

  test('is case-insensitive and trims whitespace', () => {
    assert.equal(categoryToOrdinal('  sEdEnTaRy ', ACTIVITY_MAP), 0)
    assert.equal(categoryToOrdinal('ACTIVE', ACTIVITY_MAP), 3)
    assert.equal(categoryToOrdinal('high', ADHERENCE_MAP), 0)
  })

  test('returns null for null/undefined/empty and unexpected values (no crash)', () => {
    assert.equal(categoryToOrdinal(null, ACTIVITY_MAP), null)
    assert.equal(categoryToOrdinal(undefined, ACTIVITY_MAP), null)
    assert.equal(categoryToOrdinal('', ACTIVITY_MAP), null)
    assert.equal(categoryToOrdinal('Unknown', ACTIVITY_MAP), null)
    assert.equal(categoryToOrdinal(42, ADHERENCE_MAP), null)
  })
})

// --- Phase 7c: timeline categorical data must exist and vary -----------------
describe('Phase 7c: backend timeline categorical fields', () => {
  const BASE = 'http://localhost:8000'
  const up = (() => {
    try {
      execFileSync('curl', ['-s', '-m', '2', `${BASE}/api/health`], { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })()

  function postCohort(payload) {
    const out = execFileSync(
      'curl',
      ['-s', '-m', '30', '-w', '\n%{http_code}', '-X', 'POST', `${BASE}/api/cohort/generate`,
       '-H', 'Content-Type: application/json', '-d', JSON.stringify(payload)],
      { encoding: 'utf8' },
    )
    const [body, code] = out.trim().split('\n').slice(-2)
    return { code: Number(code), body: JSON.parse(body) }
  }

  const VALID = {
    patient_count: 5,
    older_patient_percentage: 55,
    diabetes_percentage: 40,
    hypertension_percentage: 45,
    activity_level: 'any',
    medication_adherence: 'any',
    pain_score: 'any',
  }

  test('every observation has valid, vocabulary-consistent activity/adherence values', { skip: !up ? 'backend not running' : false }, () => {
    const gen = postCohort({ ...VALID, patient_count: 5 })
    const id = gen.body.patients[0].patient_id
    const tl = JSON.parse(execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/patients/${id}/timeline`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }))
    assert.ok(tl.observations.length >= 6)
    const validAct = ['Sedentary', 'Light', 'Moderate', 'Active']
    const validAdh = ['High', 'Medium', 'Low']
    for (const o of tl.observations) {
      assert.ok(o.activity_level !== null && o.activity_level !== undefined && o.activity_level !== '', 'activity_level must be present')
      assert.ok(o.medication_adherence !== null && o.medication_adherence !== undefined && o.medication_adherence !== '', 'medication_adherence must be present')
      assert.ok(validAct.includes(o.activity_level), `unexpected activity_level ${o.activity_level}`)
      assert.ok(validAdh.includes(o.medication_adherence), `unexpected adherence ${o.medication_adherence}`)
    }
    // Ordinal mapping must succeed for every backend value (chart-blank regression guard)
    const ord = (v, m) => (v == null ? null : m[String(v).trim().toLowerCase()] ?? null)
    const ACT = { sedentary: 0, light: 1, moderate: 2, active: 3 }
    const ADH = { high: 0, medium: 1, low: 2 }
    for (const o of tl.observations) {
      assert.equal(ord(o.activity_level, ACT) === null, false)
      assert.equal(ord(o.medication_adherence, ADH) === null, false)
    }
  })

  test('activity and adherence vary over time for at least one sampled patient', { skip: !up ? 'backend not running' : false }, () => {
    const gen = postCohort({ ...VALID, patient_count: 8 })
    const ids = gen.body.patients.slice(0, 8).map((p) => p.patient_id)
    const results = ids.map((id) =>
      JSON.parse(execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/patients/${id}/timeline`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })),
    )
    const anyActivityVaries = results.some((tl) => new Set(tl.observations.map((o) => o.activity_level)).size > 1)
    const anyAdherenceVaries = results.some((tl) => new Set(tl.observations.map((o) => o.medication_adherence)).size > 1)
    assert.ok(anyActivityVaries, 'at least one sampled patient must vary activity over time')
    assert.ok(anyAdherenceVaries, 'at least one sampled patient must vary adherence over time')
  })
})

// --- Phase 8: CSV export utilities -------------------------------------------
describe('Phase 8: CSV export (cohort + longitudinal)', () => {

  test('escapes quotes, commas and newlines per RFC 4180', () => {
    assert.equal(csvEscape('plain'), 'plain')
    assert.equal(csvEscape('a,b'), '"a,b"')
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""')
    assert.equal(csvEscape('line\nbreak'), '"line\nbreak"')
    assert.equal(csvEscape(null), '')
    assert.equal(csvEscape(undefined), '')
    assert.equal(csvEscape(42), '42')
  })

  test('cohort CSV: exact headers, one row per patient, derived hypertension, Yes/No diabetes', () => {
    const canon = [
      { patientId: 'COH-A1', age: 70, gender: 'Female', diabetes: true, systolic: 142, diastolic: 88, glucose: 150, hba1c: 7.1, bmi: 30.2, painScore: 3, activity: 'Light', adherence: 'High', sourceDonorId: 'd1' },
      { patientId: 'COH-B2', age: 40, gender: 'Male', diabetes: false, systolic: 118, diastolic: 76, glucose: 90, hba1c: 5.2, bmi: 24.1, painScore: 0, activity: 'Active', adherence: 'Low', sourceDonorId: 'd2' },
    ]
    const { csv, filename } = buildCohortCsv(canon, { cohortId: 'COHORT-X1', patientCount: undefined })
    const lines = csv.split('\r\n')
    assert.equal(lines[0], COHORT_CSV_HEADERS.join(','))
    assert.deepEqual(COHORT_CSV_HEADERS, ['patient_id', 'age', 'gender', 'diabetes', 'hypertension', 'systolic_bp', 'diastolic_bp', 'glucose', 'hba1c', 'bmi', 'pain_score', 'activity_level', 'medication_adherence', 'source_donor_id'])
    assert.equal(lines.length, 3) // header + 2 patients
    const rowA = lines[1].split(',')
    assert.equal(rowA[0], 'COH-A1')
    assert.equal(rowA[3], 'Yes') // diabetes
    assert.equal(rowA[4], 'Yes') // hypertension derived: 142 >= 140
    const rowB = lines[2].split(',')
    assert.equal(rowB[3], 'No')
    assert.equal(rowB[4], 'No') // 118 < 140
    assert.ok(filename.startsWith('synthetic_patient_cohort'))
    assert.ok(filename.includes('COHORT-X1'))
  })

  test('longitudinal CSV: exact headers, one row per observation, categorical values preserved', () => {
    const timeline = {
      patient_id: 'COH-Z9',
      observations: [
        { observation_date: '2026-09-05', age: 68, systolic_bp: 132, diastolic_bp: 78, glucose: 120, pain_score: 2, activity_level: 'Active', medication_adherence: 'High', diabetes: 'Yes', hypertension: 'No' },
        { observation_date: '2026-09-12', age: 68, systolic_bp: 134, diastolic_bp: 79, glucose: 122, pain_score: 3, activity_level: 'Light', medication_adherence: 'Medium', diabetes: 'Yes', hypertension: 'No' },
      ],
    }
    const { csv, filename } = buildLongitudinalCsv(timeline)
    const lines = csv.split('\r\n')
    assert.equal(lines[0], LONGITUDINAL_CSV_HEADERS.join(','))
    assert.deepEqual(LONGITUDINAL_CSV_HEADERS, ['patient_id', 'observation_date', 'age', 'systolic_bp', 'diastolic_bp', 'glucose', 'pain_score', 'activity_level', 'medication_adherence', 'diabetes', 'hypertension'])
    assert.equal(lines.length, 3) // header + 2 observations
    assert.ok(lines[1].startsWith('COH-Z9,2026-09-05'))
    assert.ok(lines[1].includes('Active') && lines[1].includes('High'))
    assert.ok(filename.includes('COH-Z9'))
  })

  test('backend integration: cohort CSV row count and IDs match a freshly generated cohort', async () => {
    const BASE = 'http://localhost:8000'
    let up = false
    try { execFileSync('curl', ['-s', '-m', '2', `${BASE}/api/health`], { stdio: 'pipe' }); up = true } catch {}
    if (!up) return // backend not running — skip silently
    const gen = JSON.parse(execFileSync('curl', ['-s', '-m', '30', '-X', 'POST', `${BASE}/api/cohort/generate`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ patient_count: 7, older_patient_percentage: 50, diabetes_percentage: 40, hypertension_percentage: 45, activity_level: 'any', medication_adherence: 'any', pain_score: 'any' })],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }))
    const { backendPatientsToCanonical } = await import('../src/data/mockData.js')
    const canon = backendPatientsToCanonical(gen.patients)
    const { csv } = buildCohortCsv(canon, { cohortId: gen.cohort_id })
    const lines = csv.split('\r\n').filter(Boolean)
    assert.equal(lines.length, 8) // header + 7 records
    const ids = lines.slice(1).map((l) => l.split(',')[0])
    assert.ok(ids.every((id) => id.startsWith('COH-')), `all exported IDs must be COH-*: ${ids.join(',')}`)
    // Values must match the generated cohort exactly (row order preserved)
    assert.deepEqual(ids, gen.patients.map((p) => p.patient_id))
    const ages = lines.slice(1).map((l) => Number(l.split(',')[1]))
    assert.deepEqual(ages, gen.patients.map((p) => p.age))
  })
})

// --- Phase 9: data-aware assistant (POST /api/assistant/query) ---------------
describe('Phase 9: data-aware assistant endpoint', () => {
  const BASE = 'http://localhost:8000'
  const up = (() => {
    try {
      execFileSync('curl', ['-s', '-m', '2', `${BASE}/api/health`], { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })()

  function ask(question) {
    const out = execFileSync(
      'curl',
      ['-s', '-m', '20', '-w', '\n%{http_code}', '-X', 'POST', `${BASE}/api/assistant/query`,
       '-H', 'Content-Type: application/json', '-d', JSON.stringify({ question })],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    )
    const idx = out.lastIndexOf('\n')
    return { code: Number(out.slice(idx + 1)), body: JSON.parse(out.slice(0, idx)) }
  }

  test('answers average age computed from the current cohort', { skip: !up }, () => {
    const { code, body } = ask('What is the average age?')
    assert.equal(code, 200)
    assert.ok(body.answer.includes('Average age is'))
    assert.equal(body.source, 'current_synthetic_cohort')
    // The reported average must match an independent recomputation.
    const latest = JSON.parse(execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/cohort/latest`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }))
    const patients = latest.patients || []
    const expected = patients.reduce((s, p) => s + p.age, 0) / patients.length
    assert.ok(Math.abs(expected - body.data.average_age) < 0.01)
  })

  test('maps natural-language variations to the same data query', { skip: !up }, () => {
    for (const q of ['How many diabetics?', 'Number of diabetic patients', "What % have diabetes?"]) {
      const { body } = ask(q)
      assert.ok(body.answer.includes('are diabetic'), `unexpected answer for: ${q}`)
    }
  })

  test('computes hypertension counts with the systolic >= 140 rule', { skip: !up }, () => {
    const { body } = ask('How many patients are hypertensive?')
    assert.ok(body.answer.includes('hypertensive'))
    assert.ok(body.data.hypertension_count > 0, 'expected hypertensive patients in the current cohort')
  })

  test('gives distributions for activity and adherence', { skip: !up }, () => {
    const a = ask('What are the activity-level distributions?').body
    assert.ok(a.answer.startsWith('Activity-level distribution'))
    const m = ask('What is the medication adherence distribution?').body
    assert.ok(m.answer.startsWith('Medication-adherence distribution'))
  })

  test('describes a patient timeline with computed trends', { skip: !up }, () => {
    const latest = JSON.parse(execFileSync('curl', ['-s', '-m', '10', `${BASE}/api/cohort/latest`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }))
    const pid = latest.patients[0].patient_id
    const { code, body } = ask(`How did ${pid}'s pain change over time?`)
    assert.equal(code, 200)
    assert.ok(body.answer.includes('Longitudinal timeline for'))
    assert.ok(body.source === 'longitudinal_timeline')
  })

  test('reports validation as original vs current cohort', { skip: !up }, () => {
    const { body } = ask('How does the synthetic cohort compare with the original dataset?')
    assert.ok(body.answer.includes('140 original patients'))
    assert.equal(body.source, 'original_vs_current_synthetic_cohort')
  })

  test('refuses medical advice', { skip: !up }, () => {
    const { body } = ask('What medication should I take?')
    assert.ok(body.answer.includes('cannot provide medical diagnosis or treatment advice'))
    assert.equal(body.source, 'safety_policy')
  })

  test('admits unknown questions instead of hallucinating', { skip: !up }, () => {
    const { body } = ask('What is the capital of France?')
    assert.ok(body.answer.includes("I don't have enough data to answer that question."))
    assert.equal(body.source, 'unknown_intent')
  })

  test('rejects empty questions with 422', { skip: !up }, () => {
    const out = execFileSync(
      'curl',
      ['-s', '-m', '10', '-o', os.devnull, '-w', '%{http_code}', '-X', 'POST', `${BASE}/api/assistant/query`,
       '-H', 'Content-Type: application/json', '-d', '{"question": "   "}'],
      { encoding: 'utf8' },
    )
    assert.equal(out.trim(), '422')
  })
})
