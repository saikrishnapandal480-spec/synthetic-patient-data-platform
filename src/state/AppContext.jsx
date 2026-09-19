import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { generateSyntheticCohort, getOriginalSummary, backendPatientsToCanonical } from '../data/mockData.js'
import { api, cohortErrorMessage } from '../api/client.js'

const AppContext = createContext(null)

export const DEFAULT_COHORT = {
  count: 500,
  ageGroups: { '18–35': 20, '36–55': 35, '56–75': 32, '76+': 13 },
  diabetesPct: 20,
  highBpPct: 30,
  activity: 'Mirror source distribution',
}

const STORAGE_KEY = 'spdp.session.v1'

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function AppProvider({ children }) {
  const persisted = useMemo(loadPersisted, [])

  const [datasetName, setDatasetName] = useState(persisted.datasetName || 'cardio_cohort_2024.csv')
  const [cohortConfig, setCohortConfig] = useState(persisted.cohortConfig || DEFAULT_COHORT)
  const [syntheticPatients, setSyntheticPatients] = useState(persisted.syntheticPatients || null)
  const [hasGenerated, setHasGenerated] = useState(Boolean(persisted.hasGenerated))
  const [generationStatus, setGenerationStatus] = useState('idle') // idle | generating | done
  // Phase 6 — custom cohort generated via the FastAPI backend.
  const [customCohort, setCustomCohort] = useState(persisted.customCohort || null)
  const [customCohortStatus, setCustomCohortStatus] = useState('idle') // idle | generating | done | error

  // Keep the mock session alive across page reloads (still no backend involved).
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ datasetName, cohortConfig, syntheticPatients, hasGenerated, customCohort }),
      )
    } catch {
      // Storage full or unavailable — demo state simply won't survive a refresh.
    }
  }, [datasetName, cohortConfig, syntheticPatients, hasGenerated, customCohort])

  // Mock "generation": builds a seeded synthetic cohort client-side after a delay.
  const generateCohort = (config) => {
    setGenerationStatus('generating')
    return new Promise((resolve) => {
      setTimeout(() => {
        const patients = generateSyntheticCohort(config)
        setSyntheticPatients(patients)
        setHasGenerated(true)
        setGenerationStatus('done')
        resolve(patients)
      }, 1800)
    })
  }

  const resetCohort = () => {
    setSyntheticPatients(null)
    setHasGenerated(false)
    setGenerationStatus('idle')
    setCustomCohort(null)
    setCustomCohortStatus('idle')
  }

  // Phase 6 — calls POST /api/cohort/generate on the FastAPI backend, persists
  // the generated records server-side (so the ADR Predictor sees them via
  // GET /api/patients) and stores them in canonical shape so Dashboard,
  // Synthetic Data and Validation render them without any page changes.
  const generateCustomCohort = async (params) => {
    setCustomCohortStatus('generating')
    try {
      const resp = await api.generateCohort(params)
      const patients = backendPatientsToCanonical(resp.patients || [])
      setCustomCohort({
        patients,
        cohortId: resp.cohort_id || null,
        requested: resp.requested,
        actual: resp.actual,
        requestedPatientCount: resp.requested_patient_count,
        actualPatientCount: resp.actual_patient_count,
        distributions: resp.distributions,
        modelingNotes: resp.modeling_notes || [],
        generatedAt: new Date().toISOString(),
      })
      // Integration: feed the backend cohort into the existing workflow views.
      // Dashboard/Validation/SyntheticData read `syntheticPatients`, and the
      // ADR Predictor reads the persisted backend records via GET /api/patients.
      const ageGroups = { '18–35': 0, '36–55': 0, '56–75': 0, '76+': 0 }
      patients.forEach((p) => {
        if (ageGroups[p.ageGroup] !== undefined) ageGroups[p.ageGroup] += 1
      })
      setCohortConfig({
        count: resp.actual_patient_count,
        ageGroups,
        diabetesPct: resp.actual?.diabetes_percentage ?? params.diabetes_percentage,
        highBpPct: resp.actual?.hypertension_percentage ?? params.hypertension_percentage,
        activity: 'Mirror source distribution',
      })
      setSyntheticPatients(patients)
      setHasGenerated(true)
      setCustomCohortStatus('done')
      return { ok: true, patients, resp }
    } catch (err) {
      setCustomCohortStatus('error')
      return { ok: false, error: cohortErrorMessage(err), status: err?.status }
    }
  }

  // Phase 7 — session recovery: after a browser refresh, if no cohort exists in
  // this tab's session, recover the current one from the shared backend store
  // (the same records served to GET /api/patients and the Interaction
  // Predictor via /api/cohort/latest). Keeps Dashboard / Synthetic Data /
  // Validation populated across reloads without any frontend-only dataset.
  useEffect(() => {
    let cancelled = false
    api.latestCohort()
      .then((resp) => {
        if (cancelled || !resp?.patients?.length) return
        const patients = backendPatientsToCanonical(resp.patients)
        setCustomCohort({
          patients,
          cohortId: resp.cohort_id || null,
          requested: resp.requested || null,
          actual: resp.actual || null,
          requestedPatientCount: resp.requested_patient_count,
          actualPatientCount: resp.actual_patient_count,
          distributions: resp.distributions || null,
          modelingNotes: [],
          generatedAt: resp.generated_at || null,
          recoveredFromBackend: true,
        })
        const ageGroups = { '18–35': 0, '36–55': 0, '56–75': 0, '76+': 0 }
        patients.forEach((p) => {
          if (ageGroups[p.ageGroup] !== undefined) ageGroups[p.ageGroup] += 1
        })
        setCohortConfig({
          count: resp.actual_patient_count,
          ageGroups,
          diabetesPct: resp.actual?.diabetes_percentage ?? null,
          highBpPct: resp.actual?.hypertension_percentage ?? null,
          activity: 'Mirror source distribution',
        })
        setSyntheticPatients(patients)
        setHasGenerated(true)
      })
      .catch(() => {
        // No backend or no cohort yet — pages keep their own empty states.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const originalSummary = useMemo(() => getOriginalSummary(), [])

  const value = {
    datasetName,
    setDatasetName,
    cohortConfig,
    setCohortConfig,
    syntheticPatients,
    generationStatus,
    hasGenerated,
    generateCohort,
    resetCohort,
    originalSummary,
    // Phase 6 — custom cohort (backend-driven)
    customCohort,
    customCohortStatus,
    generateCustomCohort,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
