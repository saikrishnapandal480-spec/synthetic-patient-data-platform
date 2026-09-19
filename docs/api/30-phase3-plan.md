# Phase 3 — Recommended Backend Implementation Plan (FastAPI)

Phase 3 guidance for implementing the Phase 2 contract. **Not built yet** — this is the plan only. No database, no external APIs, no API keys are required for the hackathon scope.

---

## 1. Scope & principles

- **Implement the contract as documented** in `docs/api/` — envelopes, error codes, and field names match exactly so the Phase 1 frontend can be wired with minimal changes.
- **In-memory state only.** Cohorts, patients, jobs, and reports live in Python objects for the session lifetime. SQLite can be a later optimization; it is not needed for a hackathon demo.
- **Reuse the Phase 1 mock logic.** Port `src/data/mockData.js` (seeded PRNG, cohort generation, summaries, histograms, correlations) to `app/synthetic/engine.py`. Same seed → same patients → the demo stays reproducible.
- **No AI integration.** The assistant endpoint is rule-based templating over computed stats, exactly as specified in `20-clinical-endpoints.md` §4.
- **Everything labeled synthetic/demo.** Every response carries `meta.dataSource`.

---

## 2. Suggested project layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── core/
│   │   ├── config.py        # Settings (CORS origin, demo seed, limits)
│   │   ├── errors.py        # Error envelope helpers, exception handlers
│   │   └── envelope.py      # ok(data, meta) / pagination meta builders
│   ├── schemas/             # Pydantic models mirroring docs/api §4
│   │   ├── cohort.py        #   CohortConfig, CohortJob
│   │   ├── patient.py       #   Patient, Medication, SymptomEvent
│   │   ├── clinical.py      #   Interaction, RiskExplanation
│   │   ├── dashboard.py     #   Summary, histograms, correlation
│   │   └── assistant.py     #   AnalyzeRequest, AnalyzeResponse
│   ├── routers/
│   │   ├── cohorts.py       # POST /cohorts/generate, GET /cohorts/{id}/status
│   │   ├── patients.py      # list/detail/medications/symptoms/timeline
│   │   ├── clinical.py      # interactions / risk-explanation / suspected-combinations
│   │   ├── dashboard.py     # GET /dashboard/stats
│   │   ├── validation.py    # POST /validation/compare
│   │   ├── privacy.py       # GET /privacy/report
│   │   ├── exports.py       # POST /export, GET /exports/{id}
│   │   └── assistant.py     # POST /assistant/analyze
│   ├── store/
│   │   └── memory.py        # Session-scoped dict store: cohorts, jobs, patients
│   └── synthetic/
│       ├── engine.py        # Port of mockData.js generators (seeded)
│       ├── medications.py   # Deterministic medication/symptom synthesizers
│       └── interactions.py  # Demo interaction rules + risk explanation builder
├── tests/
│   ├── test_contract.py     # Assert envelope shape, error codes, status codes
│   └── test_generation.py   # Same seed ⇒ same cohort
├── requirements.txt         # fastapi, uvicorn, pydantic (nothing else needed)
└── README.md
```

---

## 3. Implementation milestones

| Step | Deliverable | Contract refs |
|---|---|---|
| 1 | Skeleton: FastAPI app, CORS for `http://localhost:5174`, envelope + error handlers, health route | `00-conventions.md` §2–3 |
| 2 | Port mock engine from Phase 1 JS to Python (keep seed math identical) | `10-core-endpoints.md` |
| 3 | Cohort generation + status (in-memory job dict; `asyncio.create_task` or fake progress via polling timestamps) | §1–2 core |
| 4 | Patients list/detail with query filters, sorting, pagination | §3–4 core |
| 5 | Medications, symptoms, timeline synthesizers (deterministic from `patientId` seed) | §5–7 core |
| 6 | Dashboard stats, validation compare, privacy report | §8–10 core |
| 7 | Interactions, risk explanation, suspected combinations (demo rule table, e.g. Warfarin+NSAID → major) | clinical §1–3 |
| 8 | Assistant analyze (template matcher, `sources` filled from real endpoints) | clinical §4 |
| 9 | Export: build CSV in memory with `StreamingResponse` | §11 core |
| 10 | Contract tests + OpenAPI check (`app.openapi()` against documented paths) | all |

Steps 1–6 make the existing Phase 1 pages fully backend-driven; 7–8 add the new clinical capabilities.

---

## 4. Frontend wiring notes (later phase — do not touch now)

- Replace `AppContext.generateCohort`'s `setTimeout` simulation with `POST /cohorts/generate` + `GET /cohorts/{id}/status` polling.
- Swap `mockData.js` reads for `fetch` calls; the response field names were designed to match the existing components 1:1.
- Keep `sessionStorage` as an offline fallback so the demo still works without the backend running.
- Add an API base URL constant (e.g. `VITE_API_BASE`) in `.env` — no secrets, since the demo backend has no auth.

---

## 5. Explicitly out of scope (Phase 3)

- Real AI/LLM integration (the assistant stays rule-based; `sources` keeps answers traceable)
- Database persistence, auth, multi-tenancy
- Real pharmacological databases (interaction rules are a small hand-written demo table)
- Deployment/hosting concerns
