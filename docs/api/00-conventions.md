# API Conventions & Shared Schemas

Phase 2 deliverable — **contract planning only.** Nothing here is implemented yet: no FastAPI, no database, no external APIs, no API keys. All example data is **synthetic / demo data** for a fictional cohort.

These conventions apply to every endpoint spec in `docs/api/`.

---

## 1. General conventions

| Item | Convention |
|---|---|
| Style | REST, JSON over HTTP |
| Base path | `/api/v1` |
| Content type | `application/json` (uploads may use `multipart/form-data`) |
| IDs | Patient identifiers are strings: `PT-10042` (original) or `SYN-50042` (synthetic) |
| Dates | ISO 8601 strings, e.g. `2024-06-07T00:00:00Z` |
| Booleans | JSON `true` / `false` |
| Percentages | Numbers, `0–100`, rounded to 1 decimal |
| Pagination | Query params `page` (≥ 1, default 1) and `per_page` (1–100, default 20) |
| Sorting | Query param `sort` (field name) + `order` = `asc` \| `desc` |
| Phase-2 behavior | Endpoints marked **[mock]** return synthetic/demo data from the Phase 1 seeded generator; the contract is what Phase 3 implements |

### Versioning
A single `v1` path prefix. Breaking changes later would add `/api/v2`.

### IDs & linkage
- `patientId` — canonical patient identifier (`PT-…` original, `SYN-…` synthetic).
- A synthetic cohort's `cohortId` ties generation outputs, validation, and privacy results together.
- Original datasets use `datasetId` (Phase 3: one per uploaded CSV; Phase 2 mock uses a fixed sample dataset).

---

## 2. Response envelope

Every success response uses the same envelope. Resource payloads live under `data`; pagination under `meta.pagination` when the response is a list.

```json
{
  "data": { },
  "meta": { },
  "errors": null
}
```

- `data` — the resource or list (object or array).
- `meta` — request-level metadata. Always includes `"dataSource": "synthetic"` or `"demo"`.
- `errors` — always `null` on success; an object per §4 on failure.

List responses additionally carry:

```json
{
  "data": [ ],
  "meta": {
    "dataSource": "synthetic",
    "pagination": { "page": 1, "per_page": 20, "total": 500, "total_pages": 25 }
  },
  "errors": null
}
```

**Pagination params** (query string):

| Param | Type | Required | Constraints |
|---|---|---|---|
| `page` | integer | No (default `1`) | ≥ 1; values past the last page → empty `data` array, not an error |
| `per_page` | integer | No (default `20`) | 1–100; out-of-range values are clamped |

**Sorting/filtering params** (where a spec lists them):

| Param | Type | Required | Notes |
|---|---|---|---|
| `sort` | string | No | One of the listed fields |
| `order` | string | No | `asc` \| `desc`, default `desc` |
| `q` | string | No | Free-text search (name, patientId) |

---

## 3. Error response structure

All error responses share one shape (`errors` is an array so multiple validation issues can be reported at once):

```json
{
  "data": null,
  "meta": { "dataSource": "synthetic" },
  "errors": [
    {
      "code": "validation_error",
      "message": "count must be between 1 and 10000.",
      "field": "count",
      "details": null
    }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | Yes | Stable machine-readable code, `snake_case` |
| `message` | string | Yes | Human-readable, safe to display |
| `field` | string \| null | No | Body/query field the error relates to |
| `details` | object \| null | No | Optional structured extras (e.g. constraint list) |

### Error codes & HTTP status mapping

| HTTP | code | When |
|---|---|---|
| 400 | `validation_error` | Malformed body/query; constraint violations (also used for 422-class issues to keep the code simple) |
| 404 | `not_found` | Unknown route, unknown `patientId`, unknown `cohortId`/`datasetId` |
| 405 | `method_not_allowed` | Wrong HTTP verb |
| 409 | `conflict` | Duplicate action, e.g. regenerating while a job is still `running` |
| 413 | `payload_too_large` | Uploaded CSV over size limit |
| 415 | `unsupported_media_type` | Non-CSV upload |
| 500 | `internal_error` | Unexpected server failure |
| 503 | `service_unavailable` | Dependency unavailable (reserved; not expected in the demo) |

### Common validation error examples

```json
// per_page = 250 → clamped, NOT an error. Server returns 200 with per_page=100 in meta.
```

```json
// page beyond the end
{
  "data": [],
  "meta": {
    "dataSource": "synthetic",
    "pagination": { "page": 9999, "per_page": 20, "total": 500, "total_pages": 25 }
  },
  "errors": null
}
```

```json
// unknown sort field
{
  "data": null,
  "meta": { "dataSource": "synthetic" },
  "errors": [
    {
      "code": "validation_error",
      "message": "sort must be one of: age, name, patientId, painScore, bmi, systolic.",
      "field": "sort",
      "details": null
    }
  ]
}
```

---

## 4. Shared object schemas

Field names match the Phase 1 frontend (`src/data/mockData.js`, `src/state/AppContext.jsx`) so Phase 3 responses drop straight into the existing UI.

### 4.1 CohortConfig (request body for `POST /cohorts/generate`)

| Field | Type | Required | Constraints / Default |
|---|---|---|---|
| `count` | integer | No | 1–10000, default `500` |
| `ageGroups` | object | No | Keys `18–35`, `36–55`, `56–75`, `76+` → weights, default `{ "18–35": 20, "36–55": 35, "56–75": 32, "76+": 13 }` |
| `diabetesPct` | number | No | 0–100, default `20` |
| `highBpPct` | number | No | 0–100, default `30` |
| `activity` | string | No | One of `Mirror source distribution`, `Sedentary`, `Light`, `Moderate`, `Active`; default `Mirror source distribution` |
| `seed` | integer | No | Reproducibility; omit for server default |

### 4.2 Patient (list/detail object)

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | string | Yes | `PT-10042` or `SYN-50042` |
| `name` | string | Yes | Synthetic name |
| `age` | integer | Yes | 18–90 |
| `gender` | string | Yes | `Female` \| `Male` \| `Other` |
| `diabetes` | boolean | Yes | |
| `systolic` | integer | Yes | mmHg |
| `diastolic` | integer | Yes | mmHg |
| `painScore` | integer | Yes | 0–10 |
| `activity` | string | Yes | `Sedentary` \| `Light` \| `Moderate` \| `Active` |
| `bmi` | number | Yes | 1 decimal |
| `ageGroup` | string | Synthetic only | `18–35` \| `36–55` \| `56–75` \| `76+` |

### 4.3 Summary (cohort/dataset statistics)

Computed over a set of patients.

| Field | Type | Notes |
|---|---|---|
| `n` | integer | Number of patients |
| `avgAge` | number | |
| `diabetesPct` | number | 0–100 |
| `avgSystolic` | number | |
| `avgDiastolic` | number | |
| `avgPain` | number | |
| `avgBmi` | number | |
| `activityCounts` | array[integer] | Counts in order `Sedentary, Light, Moderate, Active` |

### 4.4 Medication

| Field | Type | Required | Notes |
|---|---|---|---|
| `medicationId` | string | Yes | e.g. `RX-2001` |
| `patientId` | string | Yes | Owning patient |
| `name` | string | Yes | e.g. `Metformin` |
| `genericName` | string | No | e.g. `metformin hydrochloride` |
| `drugClass` | string | Yes | e.g. `Biguanide` |
| `dose` | string | Yes | e.g. `500 mg` |
| `frequency` | string | Yes | e.g. `Twice daily` |
| `route` | string | Yes | `Oral`, `Subcutaneous`, … |
| `startDate` | date | Yes | ISO 8601 |
| `endDate` | date \| null | Yes | `null` = ongoing |
| `adherencePct` | number | Yes | 0–100, 1 decimal |
| `status` | string | Yes | `active` \| `completed` \| `discontinued` |
| `prescribedFor` | string | Yes | Indication, e.g. `Type 2 Diabetes` |

### 4.5 SymptomEvent

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventId` | string | Yes | e.g. `SYM-3001` |
| `patientId` | string | Yes | |
| `date` | date | Yes | ISO 8601 |
| `symptom` | string | Yes | e.g. `Fatigue` |
| `severity` | integer | Yes | 1–10 |
| `durationDays` | integer | Yes | |
| `resolved` | boolean | Yes | |
| `note` | string \| null | No | Short synthetic note |

### 4.6 Interaction

| Field | Type | Required | Notes |
|---|---|---|---|
| `pairId` | string | Yes | e.g. `IX-4001` |
| `patientId` | string | Yes | |
| `drugA` | string | Yes | e.g. `Warfarin` |
| `drugB` | string | Yes | e.g. `Ibuprofen` |
| `severity` | string | Yes | `major` \| `moderate` \| `minor` |
| `mechanism` | string | Yes | Short pharmacological explanation |
| `effect` | string | Yes | Clinical effect, e.g. `Increased bleeding risk` |
| `recommendation` | string | Yes | e.g. `Consider alternative analgesic` |
| `confidence` | number | Yes | 0–1, 2 decimals — demo heuristic, **not** clinical guidance |

### 4.7 `dataSource` metadata values

| Value | Meaning |
|---|---|
| `"synthetic"` | Generated patient data |
| `"demo"` | Fixed demo/sample dataset (the seeded 1,000-patient "uploaded" set) |

Every response carries `meta.dataSource` so the UI can keep its "Demo mode" labeling.