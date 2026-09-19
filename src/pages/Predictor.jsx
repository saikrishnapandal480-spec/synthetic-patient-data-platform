import { useCallback, useEffect, useState } from 'react'
import { api, API_BASE, ApiError } from '../api/client.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import Button from '../components/predictor/Button.jsx'
import Alert from '../components/predictor/Alert.jsx'
import SectionCard from '../components/predictor/SectionCard.jsx'
import ConnectionBanner from '../components/predictor/ConnectionBanner.jsx'
import PatientSelector from '../components/predictor/PatientSelector.jsx'
import PatientProfile from '../components/predictor/PatientProfile.jsx'
import TimelineView from '../components/predictor/TimelineView.jsx'
import AnalysisResult from '../components/predictor/AnalysisResult.jsx'
import RiskSummary from '../components/predictor/RiskSummary.jsx'
import SeverityChart from '../components/predictor/SeverityChart.jsx'
import MedicationTimelineChart from '../components/predictor/MedicationTimelineChart.jsx'

export default function Predictor() {
  const [connStatus, setConnStatus] = useState('checking')
  const [patients, setPatients] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [medications, setMedications] = useState([])
  const [symptoms, setSymptoms] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loadingPatient, setLoadingPatient] = useState(false)
  const [genCount, setGenCount] = useState(5)
  const [genEpsilon, setGenEpsilon] = useState(1.0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // ---- Backend connection check (GET /api/health) --------------------------
  // Retries briefly before declaring offline: the backend can be momentarily
  // unresponsive right after a cohort generation rewrites its patient store.
  const checkHealth = useCallback(async (attempts = 3) => {
    setConnStatus('checking')
    for (let i = 0; i < attempts; i += 1) {
      try {
        await api.health()
        setConnStatus('online')
        return true
      } catch {
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 800))
      }
    }
    setConnStatus('offline')
    return false
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  // ---- Load patients once the backend is reachable -------------------------
  // Returns the fetched list so callers (e.g. generate) can act on its contents.
  const loadPatients = useCallback(async () => {
    try {
      const list = await api.patients()
      const safe = Array.isArray(list) ? list : []
      setPatients(safe)
      setError(null)
      return safe
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the patient list from the backend.')
      return null
    }
  }, [])

  useEffect(() => {
    if (connStatus !== 'online') return
    loadPatients().then((list) => {
      // First successful load: default to the newest custom-cohort patient so
      // the dropdown is never left sitting on the empty placeholder after a
      // Custom Cohort generation. A manual selection is never overridden.
      if (Array.isArray(list) && list.length) {
        setSelectedId((prev) => {
          if (prev) return prev
          const coh = list.filter((p) => String(p?.patient_id || '').startsWith('COH-'))
          return (coh.length ? coh[coh.length - 1] : list[list.length - 1])?.patient_id || ''
        })
      }
    })
  }, [connStatus, loadPatients])

  // ---- Patient detail bundle ------------------------------------------------
  const loadPatientBundle = useCallback(async (id) => {
    if (!id) {
      setDetail(null)
      setMedications([])
      setSymptoms([])
      setTimeline([])
      return
    }
    setLoadingPatient(true)
    setError(null)
    try {
      const p = await api.patient(id)
      const meds = await api.medications(id).catch(() => [])
      const syms = await api.symptoms(id).catch(() => [])
      const tl = await api.timeline(id).catch(() => null)
      setDetail(p)
      setMedications(Array.isArray(meds) ? meds : [])
      setSymptoms(Array.isArray(syms) ? syms : [])
      // Timeline endpoint returns { patient_id, count, observations: [...] }
      setTimeline(Array.isArray(tl?.observations) ? tl.observations : [])
    } catch (err) {
      setDetail(null)
      setMedications([])
      setSymptoms([])
      setTimeline([])
      setError(err instanceof ApiError ? err.message : `Failed to load patient ${id}.`)
    } finally {
      setLoadingPatient(false)
    }
  }, [])

  useEffect(() => {
    loadPatientBundle(selectedId)
  }, [selectedId, loadPatientBundle])

  // ---- Generate synthetic patients (POST /api/patients/generate) -----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenResult(null)
    setError(null)
    setNotice(null)
    try {
      // 1) POST /api/patients/generate — returns a job ack with the new patient_id.
      const res = await api.generatePatients(Number(genCount) || 1, Number(genEpsilon) || 0.1)
      setGenResult(res)
      const newId = typeof res?.patient_id === 'string' ? res.patient_id : null

      // 2) After HTTP 200, GET /api/patients and refresh the dropdown.
      let list = await loadPatients()

      // 3) Auto-select the returned patient once it appears in the list.
      //    Retry briefly in case the backend's write lags the generate response.
      if (newId) {
        const exists = (l) => Array.isArray(l) && l.some((p) => p?.patient_id === newId)
        let tries = 0
        while (!exists(list) && tries < 3) {
          await sleep(600)
          list = await loadPatients()
          tries += 1
        }
        if (exists(list)) {
          setAnalysis(null)
          setSelectedId(newId) // triggers loadPatientBundle → profile, meds, symptoms, timeline
          setNotice(`${res?.message || 'Generation successful.'} Patient ${newId} was selected automatically.`)
        } else {
          setNotice(
            `${res?.message || 'Generation successful.'} Patient ${newId} was returned by the backend but did not appear in GET /api/patients yet — pick it from the dropdown (or type its ID) once it is listed.`
          )
        }
      } else {
        setNotice(res?.message || 'Generation request accepted by the backend.')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Generation request failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ---- Analyze interactions (POST /api/interactions/analyze) ---------------
  const handleAnalyze = async () => {
    if (!selectedId) {
      setError('Select a patient before running the interaction analysis.')
      return
    }
    setIsAnalyzing(true)
    setAnalysis(null)
    setError(null)
    const meds = medications.map((m) => `${m.name} ${m.dosage}`.trim())
    try {
      const res = await api.analyzeInteractions(selectedId, meds)
      setAnalysis(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Interaction analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Longitudinal Adverse Drug Interaction Predictor"
        badge={<Badge variant="mock">Synthetic demo — not medical advice</Badge>}
        description="This dashboard queries the FastAPI backend for synthetic patient records and displays a longitudinal view with adverse drug interaction analysis. Every value shown is synthetic demo data, and nothing here is medical advice."
      />
      <ConnectionBanner status={connStatus} baseUrl={API_BASE} onRetry={checkHealth} />

      {error && <Alert kind="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice(null)}>{notice}</Alert>}

      {/* Controls */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          icon="synthetic"
          title="Synthetic Patient"
          description="Requests new synthetic patients from the backend generator."
          badge={<Badge variant="mock">POST /api/patients/generate</Badge>}
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Patients</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={genCount}
                onChange={(e) => setGenCount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-200 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Privacy budget (ε)</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={genEpsilon}
                onChange={(e) => setGenEpsilon(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-200 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </label>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Icon name="synthetic" className="h-4 w-4" />
                    Generate Synthetic Patient
                  </>
                )}
              </Button>
            </div>
          </div>
          {genResult && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3.5">
              <p className="text-xs text-slate-400">Backend acknowledged the request:</p>
              <p className="mt-1 break-all font-mono text-xs text-sky-300">{JSON.stringify(genResult)}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon="users"
          title="Patient Selection"
          description="Pick any synthetic patient returned by the backend."
        >
          <PatientSelector
            patients={patients}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setAnalysis(null)
            }}
          />
        </SectionCard>
      </div>

      {/* Patient bundle */}
      {loadingPatient && (
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
          <span className="text-sm text-slate-300">Loading patient bundle…</span>
        </div>
      )}

      {!loadingPatient && !selectedId && (
        <EmptyState
          icon="users"
          title="No patient selected"
          message="Select a synthetic patient to see their profile, longitudinal timeline, and interaction analysis. All data comes live from the backend."
        />
      )}

      {!loadingPatient && selectedId && detail && (
        <>
          <SectionCard
            icon="users"
            title={`Patient Profile — ${detail.patient_id}`}
            description="All fields exactly as returned by the backend's patient detail endpoint."
            badge={<Badge variant="mock">Synthetic data</Badge>}
          >
            <PatientProfile patient={detail} medications={medications} symptoms={symptoms} />
          </SectionCard>

          <SectionCard
            icon="timeline"
            title="Longitudinal Timeline"
            description="Weekly clinical observations generated by the backend for this synthetic patient."
            badge={<Badge variant="data">Backend timeline</Badge>}
          >
            <TimelineView events={timeline} />
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              icon="chart"
              title="Symptom Severity Over Time"
              description="Plotted only from numeric severities present in the backend data."
            >
              <SeverityChart symptoms={symptoms} />
            </SectionCard>
            <SectionCard
              icon="database"
              title="Medication Timeline"
              description="Doses and timing as returned by the backend."
            >
              <MedicationTimelineChart medications={medications} />
            </SectionCard>
          </div>

          <SectionCard
            icon="sparkles"
            title="Interaction Analysis"
            description="Runs the backend's interaction analyzer on this patient's medication list."
            badge={<Badge variant="mock">POST /api/interactions/analyze</Badge>}
          >
            <div className="space-y-4">
              {medications.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Medication list sent</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {medications.map((m, i) => (
                      <span key={i} className="rounded-lg bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] text-sky-300">
                        {m.name} {m.dosage}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Built from the patient's actual medication records.</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Icon name="sparkles" className="h-4 w-4" />
                      Analyze Interactions
                    </>
                  )}
                </Button>
                {medications.length === 0 && (
                  <p className="text-xs text-amber-300/80">No medication records for this patient — analysis will use an empty list.</p>
                )}
              </div>
              <RiskSummary result={analysis} />
              <AnalysisResult result={analysis} isAnalyzing={isAnalyzing} />
            </div>
          </SectionCard>
        </>
      )}

      {selectedId && !loadingPatient && !detail && !error && (
        <EmptyState icon="alert" title="Patient not found" message={`The backend returned no detail record for ${selectedId}.`} />
      )}
    </div>
  )
}
