# Synthetic Patient Data Platform — API Contract (Phase 2)

**Planning deliverable only.** No backend is implemented in this phase: no FastAPI, no database, no external APIs, no API keys. All documented data is **synthetic / demo data** for a fictional cohort.

The contract is designed so Phase 3 can implement it with FastAPI and the Phase 1 frontend can adopt it with minimal changes — field names mirror `src/data/mockData.js` and `src/state/AppContext.jsx`.

## Documents

| File | Contents |
|---|---|
| [`00-conventions.md`](00-conventions.md) | REST conventions, response envelope, pagination, error structure + status mapping, shared object schemas (CohortConfig, Patient, Summary, Medication, SymptomEvent, Interaction) |
| [`10-core-endpoints.md`](10-core-endpoints.md) | Cohort generation & status, patient list/detail, medications, symptoms, longitudinal timeline, dashboard stats, validation compare, privacy report, export |
| [`20-clinical-endpoints.md`](20-clinical-endpoints.md) | Drug interactions, pharmacological risk explanation, suspected combinations (cohort-level), chatbot-ready `POST /assistant/analyze` |
| [`30-phase3-plan.md`](30-phase3-plan.md) | Recommended Phase 3 FastAPI implementation plan (layout, milestones, wiring notes, out-of-scope list) |

## Endpoint summary

| # | Method | Path | Purpose | Doc |
|---|---|---|---|---|
| 1 | POST | `/api/v1/cohorts/generate` | Generate synthetic cohort from cohort-builder config | core §1 |
| 2 | GET | `/api/v1/cohorts/{cohortId}/status` | Generation job status/progress | core §2 |
| 3 | GET | `/api/v1/patients` | Paginated, searchable, filterable patient list | core §3 |
| 4 | GET | `/api/v1/patients/{patientId}` | Patient detail | core §4 |
| 5 | GET | `/api/v1/patients/{patientId}/medications` | Medication history | core §5 |
| 6 | GET | `/api/v1/patients/{patientId}/symptoms` | Symptom events | core §6 |
| 7 | GET | `/api/v1/patients/{patientId}/timeline` | Unified longitudinal timeline | core §7 |
| 8 | GET | `/api/v1/dashboard/stats` | Dashboard/analysis statistics | core §8 |
| 9 | POST | `/api/v1/validation/compare` | Original vs synthetic comparison | core §9 |
| 10 | GET | `/api/v1/privacy/report` | Privacy evaluation report | core §10 |
| 11 | POST | `/api/v1/export` | Export cohort CSV (placeholder) | core §11 |
| 12 | GET | `/api/v1/patients/{patientId}/interactions` | Suspected drug–drug interactions | clinical §1 |
| 13 | GET | `/api/v1/patients/{patientId}/risk-explanation` | Pharmacological risk narrative | clinical §2 |
| 14 | GET | `/api/v1/interactions/suspected-combinations` | Cohort-level top combinations | clinical §3 |
| 15 | POST | `/api/v1/assistant/analyze` | Chatbot-ready patient/dataset analysis | clinical §4 |

## Key contract decisions

- **One envelope everywhere** — `data` / `meta` / `errors`; `meta.dataSource` is always `synthetic` or `demo` so the UI can keep its demo labeling.
- **One error shape everywhere** — stable `snake_case` codes mapped to HTTP statuses in `00-conventions.md` §3.
- **Generation is asynchronous** — `POST /cohorts/generate` returns `202` + a job to poll, matching the Phase 1 loading UI.
- **Raw values, no invented scores** — validation reports actual statistics; no fake similarity percentages. Interaction `confidence` values are explicitly marked demo heuristics.
- **No auth, no keys, no AI calls** — hackathon-simple; the assistant endpoint is specified as rule-based.
