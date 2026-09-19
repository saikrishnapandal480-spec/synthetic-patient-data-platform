import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getOriginalSummary, backendPatientsToCanonical } from '../data/mockData.js'
import { api, cohortErrorMessage } from '../api/client.js'

const AppContext = createContext(null)

export const DEFAULT_COHORT = {
  count: 500,
  ageGroups: { '18–35': 20, '36–55': 35, '56–75': 32, '76+': 13 },
  diabetesPct: 20,
  highBpPct: 30,
  activity: 'Mirror source distribution',
}

const STORAGE_KEY = 'spdp.session.v2'

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
  // Phase 6 — custom cohort generated via the FastAPI backend.
  const [customCohort, setCustomCohort] = useState(persisted.customCohort || null)
  const [customCohortStatus, setCustomCohortStatus] = useState('idle') // idle | generating | done | error
  const [generationStatus, setGenerationStatus] = useState('idle') // idle | generating | done

  // Keep the session alive across page reloads.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ datasetName, cohortConfig, syntheticPatients, hasGenerated, customCohort }),
      )
    } catch {
      // Storage full or unavailable
    }
  }, [datasetName, cohortConfig, syntheticPatients, hasGenerated, customCohort])

  // Legacy entry point (Synthetic Data "Generate Again") — now routed through
  // the real backend cohort generator instead of client-side mock generation.
  const generateCohort = (config) =>
    generateCustomCohort({
      patient_count: config.count,
      diabetes_percentage: config.diabetesPct,
      hypertension_percentage: config.highBpPct,
      activity_level: 'any',
      medication_adherence: 'any',
      pain_score: 'any',
    })

  const resetCohort = () => {
    setSyntheticPatients(null)
    setHasGenerated(false)
    setGenerationStatus('idle')
    setCustomCohort(null)
    setCustomCohortStatus('idle')
  }

  // Phase 6 — calls POST /api/cohort/generate on the FastAPI backend
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

  // Alias so both entry points share one implementation.
  // (generateCohort above delegates to generateCustomCohort.)

  // Phase 7 — session recovery
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
      .catch(() => {})
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
