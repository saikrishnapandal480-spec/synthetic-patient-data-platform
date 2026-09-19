// ---------------------------------------------------------------------------
// API client for the Phase 3 FastAPI backend (http://localhost:8000).
// Override the base URL with VITE_API_BASE in a .env file if needed.
// ---------------------------------------------------------------------------

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

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
          // Structured validation errors from the cohort endpoint
          errors = json.detail.errors
          message = json.detail.errors.join(' · ')
        }
      } catch {
        // non-JSON error body — keep the generic message
      }
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
  health: () => request('/api/health', { timeout: 5000 }),
  patients: () => request('/api/patients'),
  patient: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}`),
  timeline: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}/timeline`, { timeout: 20000 }),
  // Phase 7 — regenerate a patient's longitudinal observations.
  regenerateTimeline: (patientId) =>
    request(`/api/patients/${encodeURIComponent(patientId)}/timeline/regenerate`, { method: 'POST', timeout: 20000 }),
  medications: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}/medications`),
  symptoms: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}/symptoms`),
  // POST /api/patients/generate — { count, epsilon } → { status, message, job_id }
  generatePatients: (count, epsilon) =>
    request('/api/patients/generate', { method: 'POST', body: { count, epsilon }, timeout: 20000 }),
  // POST /api/interactions/analyze — { patient_id, medications[] } → { status, analysis, is_synthetic_demo }
  analyzeInteractions: (patientId, medications) =>
    request('/api/interactions/analyze', { method: 'POST', body: { patient_id: patientId, medications }, timeout: 20000 }),
  // POST /api/cohort/generate (Phase 6) — custom cohort requirements.
  generateCohort: (params) =>
    request('/api/cohort/generate', { method: 'POST', body: params, timeout: 60000 }),
  // GET /api/cohort/latest — the CURRENT generated cohort (Validation recovery).
  latestCohort: () => request('/api/cohort/latest', { timeout: 10000 }),
  // POST /api/assistant/query — SH-405 data-aware assistant. The backend runs
  // deterministic intent handling against the CURRENT data (cohort / source /
  // timelines) and computes the answer at request time. No LLM is connected.
  assistantQuery: (question, patientId = null) =>
    request('/api/assistant/query', { method: 'POST', body: { question, patient_id: patientId }, timeout: 20000 }),
}

// Extract a readable message from the backend's structured 422 error body:
// { detail: { status: 'validation_error', errors: ['…', …] } }
export function cohortErrorMessage(err) {
  if (err && Array.isArray(err.errors) && err.errors.length) return err.errors.join(' · ')
  if (err instanceof ApiError) return err.message
  return String(err?.message || 'Cohort generation failed')
}
