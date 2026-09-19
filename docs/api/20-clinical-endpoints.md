# Clinical Endpoints — Interactions, Risk, Assistant

Phase 2 contract, planning only. Conventions: [`00-conventions.md`](00-conventions.md). All data is **synthetic/demo**; interaction "confidence" scores are demo heuristics, **not clinical guidance**.

---

## 1. `GET /api/v1/patients/{patientId}/interactions`

Suspected drug–drug interactions for a patient, derived from their active medication list.

### Path / query parameters

| Param | In | Type | Required | Notes |
|---|---|---|---|---|
| `patientId` | path | string | Yes | e.g. `SYN-50042` |
| `minSeverity` | query | string | No | `major` \| `moderate` \| `minor` — return this severity and above |
| `activeOnly` | query | string | No | `true` (default) — only analyze active medications |

### Response `200 OK`

`data[]` items use the shared **Interaction** schema (§4.6), ordered `major → moderate → minor`.

```json
{
  "data": [
    {
      "pairId": "IX-4001",
      "patientId": "SYN-50042",
      "drugA": "Warfarin",
      "drugB": "Ibuprofen",
      "severity": "major",
      "mechanism": "NSAID inhibition of platelet function plus anticoagulant effect",
      "effect": "Increased bleeding risk",
      "recommendation": "Consider alternative analgesic",
      "confidence": 0.91
    },
    {
      "pairId": "IX-4002",
      "patientId": "SYN-50042",
      "drugA": "Amlodipine",
      "drugB": "Simvastatin",
      "severity": "moderate",
      "mechanism": "CYP3A4 competition raises simvastatin exposure",
      "effect": "Increased statin side-effect risk",
      "recommendation": "Cap simvastatin dose at 20 mg/day",
      "confidence": 0.74
    }
  ],
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | Unknown `minSeverity` value |
| 404 | `not_found` | Unknown `patientId` |

An empty `data: []` is a valid result (patient has no flagged combinations).

---

## 2. `GET /api/v1/patients/{patientId}/risk-explanation`

Pharmacological risk explanation for one patient: a plain-language narrative plus a risk-factor breakdown.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `detail` | string | No | `summary` (default) \| `full` — `full` adds per-factor detail |

### Response `200 OK`

```json
{
  "data": {
    "patientId": "SYN-50042",
    "riskLevel": "moderate",
    "headline": "2 active medication interactions detected",
    "narrative": "This synthetic patient takes an anticoagulant and an NSAID concurrently, which raises bleeding risk. A calcium channel blocker overlaps with a statin on CYP3A4, modestly increasing statin exposure. Combined with age 74 and Type 2 Diabetes, pharmacological monitoring is advised.",
    "riskFactors": [
      { "factor": "Warfarin + Ibuprofen interaction", "category": "interaction", "level": "high" },
      { "factor": "Amlodipine + Simvastatin interaction", "category": "interaction", "level": "moderate" },
      { "factor": "Age 74", "category": "demographic", "level": "moderate" },
      { "factor": "Type 2 Diabetes", "category": "condition", "level": "moderate" }
    ],
    "relatedInteractions": ["IX-4001", "IX-4002"]
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | Unknown `detail` value |
| 404 | `not_found` | Unknown `patientId` |

---

## 3. `GET /api/v1/interactions/suspected-combinations`

Cohort-level view: the most frequent suspected drug combinations across a cohort. Powers a future "top suspected combinations" panel.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `cohortId` | string | No | Defaults to latest completed cohort |
| `limit` | int | No | 1–50, default `10` |
| `minSeverity` | string | No | `major` \| `moderate` \| `minor` |

### Response `200 OK`

```json
{
  "data": {
    "cohortId": "COH-2024-0007",
    "combinations": [
      {
        "drugA": "Warfarin",
        "drugB": "Ibuprofen",
        "severity": "major",
        "patientCount": 23,
        "patientSharePct": 4.6,
        "examplePairIds": ["IX-4001", "IX-4017"]
      },
      {
        "drugA": "Amlodipine",
        "drugB": "Simvastatin",
        "severity": "moderate",
        "patientCount": 17,
        "patientSharePct": 3.4,
        "examplePairIds": ["IX-4002"]
      }
    ]
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | `limit: 0`, unknown `minSeverity` |
| 404 | `not_found` | Unknown `cohortId`; no cohort exists |

---

## 4. `POST /api/v1/assistant/analyze`

Chatbot-ready patient analysis endpoint. **No external AI API is connected** — Phase 3 implements this with rule-based templating over the platform's own computed statistics (optionally OpenAI-compatible later; **no API keys are part of this contract**).

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `question` | string | Yes | 1–500 chars, trimmed |
| `patientId` | string | No | Scope the analysis to one patient |
| `cohortId` | string | No | Defaults to latest completed cohort; ignored when `patientId` is set |
| `includeChartsData` | boolean | No | Default `false`; `true` attaches compact chart-ready series |

### Example request

```http
POST /api/v1/assistant/analyze
Content-Type: application/json

{
  "question": "What is the average age?",
  "cohortId": "COH-2024-0007",
  "includeChartsData": false
}
```

```json
{
  "question": "Why is this patient high risk?",
  "patientId": "SYN-50042",
  "includeChartsData": true
}
```

### Response `200 OK`

```json
{
  "data": {
    "answer": "The average age across this cohort of 500 synthetic patients is 53.1 years.",
    "question": "What is the average age?",
    "patientId": null,
    "cohortId": "COH-2024-0007",
    "dataSource": "synthetic",
    "confidence": 0.95,
    "sources": [
      { "type": "dataset_summary", "endpoint": "/api/v1/dashboard/stats?scope=synthetic" }
    ],
    "chartData": null
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

With `includeChartsData: true` (cohort-scoped question):

```json
{
  "data": {
    "answer": "The synthetic cohort skews slightly younger than the original dataset (53.1 vs 53.8 years).",
    "question": "Compare original and synthetic data",
    "patientId": null,
    "cohortId": "COH-2024-0007",
    "dataSource": "synthetic",
    "confidence": 0.88,
    "sources": [
      { "type": "validation_comparison", "endpoint": "/api/v1/validation/compare" }
    ],
    "chartData": {
      "type": "bar",
      "series": [
        { "label": "Original avg age", "value": 53.8 },
        { "label": "Synthetic avg age", "value": 53.1 }
      ]
    }
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

With `patientId` set, `sources` points at that patient's endpoints (medications, interactions, risk-explanation) and the answer is scoped to the individual.

### Field notes

- `confidence` — heuristic completeness score (0–1), demo only.
- `sources` — which platform endpoints back the answer, so the UI can link evidence.
- `chartData` — optional tagged payload (`type: "bar" | "donut" | "overlay"`) the frontend can render directly.

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | Missing/empty `question`, `question` > 500 chars, `patientId` and `cohortId` both unknown |
| 404 | `not_found` | Unknown `patientId` or `cohortId`; question asked but no cohort exists yet |

### Design note for Phase 3

Implementation stays offline: pattern-match the question against the four suggested-question templates and fall back to a dataset-summary answer. The `sources` field exists so answers are traceable to platform endpoints rather than model output.
