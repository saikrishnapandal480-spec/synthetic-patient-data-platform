// ---------------------------------------------------------------------------
// API client for the Phase 3 FastAPI backend (http://localhost:8000).
// Override the base URL with VITE_API_BASE in a .env file if needed.
// ---------------------------------------------------------------------------
import { generateSyntheticCohort } from '../data/mockData.js'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export let DEMO_MODE = true
export function setDemoMode(val) {
  DEMO_MODE = val
}

function isDemoActive() {
  try {
    const session = JSON.parse(sessionStorage.getItem('spdp.session.v1') || '{}')
    if (session.isDemoMode !== undefined) return session.isDemoMode
  } catch (e) {}
  return DEMO_MODE
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, timeout = 10000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!res.ok) {
      let message = `Request failed with status ${res.status}`
      let errors = null
      try {
        const json = await res.json()
        if (typeof json?.detail === 'string') {
          message = json.detail
        } else if (json?.detail?.errors) {
          errors = json.detail.errors
          message = json.detail.errors.join(' · ')
        }
      } catch {}
      const err = new ApiError(message, res.status)
      if (errors) err.errors = errors
      throw err
    }
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out — is the backend running on ' + API_BASE + '?', 0)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  health: () => {
    if (isDemoActive()) return Promise.resolve({ status: "ok", demo_mode: true })
    return request('/api/health', { timeout: 5000 })
  },
  
  patients: async () => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 400))
      try {
        const session = JSON.parse(sessionStorage.getItem('spdp.session.v1') || '{}')
        const patients = session.customCohort?.patients || session.syntheticPatients
        if (patients && patients.length > 0) {
            return patients.map(p => ({
                // Ensure IDs match the 'COH-' prefix that Longitudinal.jsx expects.
                patient_id: p.patientId.replace(/^SYN-/, 'COH-'),
                age: p.age,
                gender: p.gender,
                diabetes: p.diabetes ? "Yes" : "No",
                blood_pressure: `${p.systolic}/${p.diastolic}`,
                pain_score: p.painScore,
                activity_level: p.activity,
                medication_adherence: p.adherence,
                bmi: p.bmi,
                glucose: p.glucose,
                hba1c: p.hba1c,
                source_donor_id: p.sourceDonorId
            }))
        }
      } catch (e) {}
      // Fallback
      return []
    }
    return request('/api/patients')
  },
  
  patient: async (patientId) => {
    if (isDemoActive()) {
      const list = await api.patients()
      const p = list.find(x => x.patient_id === patientId)
      if (!p) throw new ApiError("Patient not found", 404)
      return p
    }
    return request(`/api/patients/${encodeURIComponent(patientId)}`)
  },
  
  timeline: async (patientId) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 600))
      return {
        patient_id: patientId,
        count: 2,
        modeling_notes: ["Generated using local frontend mock data (Demo Mode)."],
        observations: [
          {
            observation_date: "2024-01-15",
            observation_type: "Condition",
            concept_name: "Routine Checkup",
            value: null,
            unit: null
          },
          {
            observation_date: "2024-02-15",
            observation_type: "Medication",
            concept_name: "Mock Lisinopril",
            value: null,
            unit: null
          }
        ]
      }
    }
    return request(`/api/patients/${encodeURIComponent(patientId)}/timeline`, { timeout: 20000 })
  },
  
  regenerateTimeline: async (patientId) => {
    if (isDemoActive()) {
      return api.timeline(patientId)
    }
    return request(`/api/patients/${encodeURIComponent(patientId)}/timeline/regenerate`, { method: 'POST', timeout: 20000 })
  },
  
  medications: async (patientId) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 300))
      return ["Mock Lisinopril", "Mock Atorvastatin"]
    }
    return request(`/api/patients/${encodeURIComponent(patientId)}/medications`)
  },
  
  symptoms: async (patientId) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 300))
      return ["Mock Headache", "Mock Fatigue"]
    }
    return request(`/api/patients/${encodeURIComponent(patientId)}/symptoms`)
  },
  
  generatePatients: async (count, epsilon) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 1000))
      return { status: "success", message: `Generated ${count} synthetic patients via Demo Mode.`, job_id: "demo-job-1" }
    }
    return request('/api/patients/generate', { method: 'POST', body: { count, epsilon }, timeout: 20000 })
  },
  
  analyzeInteractions: async (patientId, medications) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 800))
      return {
        status: 'ok',
        analysis: {
            risk_level: medications?.length > 2 ? 'High' : 'Low',
            suspected_interactions: medications?.length > 2 ? [
                {
                    drugs: medications,
                    severity: 'High',
                    mechanism: 'Mock mechanism for demo mode.',
                    symptoms_to_monitor: ['Dizziness', 'Nausea'],
                    recommendation: 'Monitor patient closely. (Demo Mode)'
                }
            ] : [],
            summary: medications?.length > 2 ? 'Detected 1 suspected interaction (Demo).' : 'No severe interactions found.'
        },
        is_synthetic_demo: true
      }
    }
    return request('/api/interactions/analyze', { method: 'POST', body: { patient_id: patientId, medications }, timeout: 20000 })
  },
  
  generateCohort: async (params) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 1500))
      const count = params.patient_count || 10
      const mockPatients = generateSyntheticCohort({
        count,
        ageGroups: { '18–35': 20, '36–55': 30, '56–75': 30, '76+': 20 },
        diabetesPct: params.diabetes_percentage || 20,
        highBpPct: params.hypertension_percentage || 30,
        activity: 'Mirror source distribution'
      })
      return {
        status: "success",
        cohort_id: "COH-DEMO-123",
        requested_patient_count: count,
        actual_patient_count: count,
        requested: params,
        actual: params,
        distributions: { activity: [], medication_adherence: [], pain_score: [] },
        patients: mockPatients.map(p => ({
          patient_id: p.patientId.replace(/^SYN-/, 'COH-'),
          age: p.age,
          gender: p.gender,
          diabetes: p.diabetes ? "Yes" : "No",
          blood_pressure: `${p.systolic}/${p.diastolic}`,
          pain_score: p.painScore,
          activity_level: p.activity,
          medication_adherence: p.adherence,
          bmi: p.bmi,
          glucose: p.glucose,
          hba1c: p.hba1c,
          source_donor_id: p.sourceDonorId
        })),
        modeling_notes: ["Generated using local frontend mock data (Demo Mode)."]
      }
    }
    return request('/api/cohort/generate', { method: 'POST', body: params, timeout: 60000 })
  },
  
  latestCohort: async () => {
    if (isDemoActive()) {
      throw new Error("No backend cohort available in demo mode")
    }
    return request('/api/cohort/latest', { timeout: 10000 })
  },
  
  assistantQuery: async (question, patientId = null) => {
    if (isDemoActive()) {
      await new Promise(r => setTimeout(r, 1000))
      return {
        answer: "This is a mock response from the local Demo Mode. I cannot process complex queries without the backend.",
        source: "Local Mock Demo",
        data: {},
        assistant_kind: "mock"
      }
    }
    return request('/api/assistant/query', { method: 'POST', body: { question, patient_id: patientId }, timeout: 20000 })
  },
}

export function cohortErrorMessage(err) {
  if (err && Array.isArray(err.errors) && err.errors.length) return err.errors.join(' · ')
  if (err instanceof ApiError) return err.message
  return String(err?.message || 'Cohort generation failed')
}
