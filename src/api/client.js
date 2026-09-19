// ---------------------------------------------------------------------------
// API client for the SH-405 FastAPI backend (http://localhost:8000).
// Override the base URL with VITE_API_BASE in a .env file if needed.
//
// NOTE: the old demo/mock data layer has been removed entirely. Every call
// goes to the real backend — the Longitudinal page, Interaction Predictor and
// Synthetic Data all share the same server-side patient store.
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
  health: () => request('/api/health', { timeout: 5000 }),

  patients: () => request('/api/patients'),

  patient: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}`),

  timeline: (patientId) =>
    request(`/api/patients/${encodeURIComponent(patientId)}/timeline`, { timeout: 20000 }),

  regenerateTimeline: (patientId) =>
    request(`/api/patients/${encodeURIComponent(patientId)}/timeline/regenerate`, {
      method: 'POST',
      timeout: 20000,
    }),

  medications: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}/medications`),

  symptoms: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}/symptoms`),

  generatePatients: (count, epsilon) =>
    request('/api/patients/generate', { method: 'POST', body: { count, epsilon }, timeout: 20000 }),

  analyzeInteractions: (patientId, medications) =>
    request('/api/interactions/analyze', {
      method: 'POST',
      body: { patient_id: patientId, medications },
      timeout: 20000,
    }),

  generateCohort: (params) =>
    request('/api/cohort/generate', { method: 'POST', body: params, timeout: 60000 }),

  latestCohort: () => request('/api/cohort/latest', { timeout: 10000 }),

  assistantQuery: (question, patientId = null) =>
    request('/api/assistant/query', {
      method: 'POST',
      body: { question, patient_id: patientId },
      timeout: 20000,
    }),
}

export function cohortErrorMessage(err) {
  if (err && Array.isArray(err.errors) && err.errors.length) return err.errors.join(' · ')
  if (err instanceof ApiError) return err.message
  return String(err?.message || 'Cohort generation failed')
}
