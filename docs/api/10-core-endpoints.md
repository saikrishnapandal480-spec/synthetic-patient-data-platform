# Core Endpoints — Generation, Patients, Dashboard

Phase 2 contract, planning only. Conventions, envelope, and shared schemas: [`00-conventions.md`](00-conventions.md). All data is **synthetic/demo**.

---

## 1. `POST /api/v1/cohorts/generate`

Generate a synthetic patient cohort from cohort-builder settings.

**Auth:** none (Phase 2 / hackathon scope)

### Request body — `CohortConfig` (all optional, schema 4.1)

```json
{
  "count": 500,
  "ageGroups": { "18–35": 20, "36–55": 35, "56–75": 32, "76+": 13 },
  "diabetesPct": 20,
  "highBpPct": 30,
  "activity": "Mirror source distribution",
  "seed": 42
}
```

### Response `202 Accepted`

Enqueue generation; the UI polls `/cohorts/{cohortId}/status`.

```json
{
  "data": {
    "cohortId": "COH-2024-0007",
    "status": "queued",
    "progressPct": 0,
    "config": {
      "count": 500,
      "ageGroups": { "18–35": 20, "36–55": 35, "56–75": 32, "76+": 13 },
      "diabetesPct": 20,
      "highBpPct": 30,
      "activity": "Mirror source distribution"
    },
    "createdAt": "2024-06-07T12:00:00Z",
    "patientIdPrefix": "SYN-"
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger example |
|---|---|---|
| 400 | `validation_error` | `count: 0`, `diabetesPct: 150`, unknown `activity` string, negative age-group weight |
| 409 | `conflict` | Regenerate requested while a job for the same session is still `running` |

Notes:
- `ageGroups` weights are normalized server-side (they need not total 100).
- When `seed` is provided, the same config + seed yields the same patients.

---

## 2. `GET /api/v1/cohorts/{cohortId}/status`

Cohort generation status. The Phase 1 UI simulates ~1.8 s of progress client-side; Phase 3 replaces that with polling.

### Response `200 OK`

```json
{
  "data": {
    "cohortId": "COH-2024-0007",
    "status": "done",
    "progressPct": 100,
    "patientCount": 500,
    "startedAt": "2024-06-07T12:00:00Z",
    "completedAt": "2024-06-07T12:00:03Z"
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

`status` ∈ `queued` → `running` (`progressPct` 0–100) → `done` | `failed`.

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 404 | `not_found` | Unknown `cohortId` |

---

## 3. `GET /api/v1/patients`

Paginated patient list across generated cohorts. Mirrors the Synthetic Data page (search, filters, sort, pagination).

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `cohortId` | string | No | Restrict to one cohort; omit = all synthetic cohorts |
| `page` / `per_page` | int | No | §2 conventions |
| `q` | string | No | Free-text match on `name` or `patientId` |
| `diabetes` | string | No | `true` \| `false` |
| `ageMin` / `ageMax` | int | No | 18–90 |
| `activity` | string | No | `Sedentary` \| `Light` \| `Moderate` \| `Active` |
| `gender` | string | No | `Female` \| `Male` \| `Other` |
| `sort` | string | No | `patientId`, `name`, `age`, `painScore`, `bmi`, `systolic` |
| `order` | string | No | `asc` \| `desc` (default `asc`) |

### Example request

```http
GET /api/v1/patients?cohortId=COH-2024-0007&diabetes=true&ageMin=50&sort=age&order=desc&page=1&per_page=5
```

### Response `200 OK`

```json
{
  "data": [
    {
      "patientId": "SYN-50042",
      "name": "Grace Lindqvist",
      "age": 74,
      "gender": "Female",
      "diabetes": true,
      "systolic": 152,
      "diastolic": 91,
      "painScore": 5,
      "activity": "Light",
      "bmi": 31.2,
      "ageGroup": "56–75",
      "cohortId": "COH-2024-0007"
    },
    {
      "patientId": "SYN-50007",
      "name": "Mason Okafor",
      "age": 68,
      "gender": "Male",
      "diabetes": true,
      "systolic": 148,
      "diastolic": 88,
      "painScore": 4,
      "activity": "Moderate",
      "bmi": 29.8,
      "ageGroup": "56–75",
      "cohortId": "COH-2024-0007"
    }
  ],
  "meta": {
    "dataSource": "synthetic",
    "pagination": { "page": 1, "per_page": 5, "total": 500, "total_pages": 100 }
  },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | Bad enum (`activity=Extreme`), non-numeric `ageMin`, unknown `sort` field |
| 404 | `not_found` | `cohortId` does not exist |

---

## 4. `GET /api/v1/patients/{patientId}`

Single patient detail — the anchor for medications, symptoms, timeline, and interactions.

### Response `200 OK`

```json
{
  "data": {
    "patientId": "SYN-50042",
    "name": "Grace Lindqvist",
    "age": 74,
    "gender": "Female",
    "diabetes": true,
    "systolic": 152,
    "diastolic": 91,
    "painScore": 5,
    "activity": "Light",
    "bmi": 31.2,
    "ageGroup": "56–75",
    "cohortId": "COH-2024-0007",
    "createdAt": "2024-06-07T12:00:03Z"
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 404 | `not_found` | Unknown `patientId` (e.g. `SYN-99999`) |

---

## 5. `GET /api/v1/patients/{patientId}/medications`

Medication history for one patient. Supports §5 longitudinal timeline and §6 interaction analysis.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `status` | string | No | `active` \| `completed` \| `discontinued` |
| `activeOnly` | string | No | `true` = shorthand for `status=active` |

### Example request

```http
GET /api/v1/patients/SYN-50042/medications?activeOnly=true
```

### Response `200 OK`

```json
{
  "data": [
    {
      "medicationId": "RX-2001",
      "patientId": "SYN-50042",
      "name": "Metformin",
      "genericName": "metformin hydrochloride",
      "drugClass": "Biguanide",
      "dose": "500 mg",
      "frequency": "Twice daily",
      "route": "Oral",
      "startDate": "2023-02-14",
      "endDate": null,
      "adherencePct": 87.5,
      "status": "active",
      "prescribedFor": "Type 2 Diabetes"
    },
    {
      "medicationId": "RX-2002",
      "patientId": "SYN-50042",
      "name": "Amlodipine",
      "genericName": "amlodipine besylate",
      "drugClass": "Calcium channel blocker",
      "dose": "5 mg",
      "frequency": "Once daily",
      "route": "Oral",
      "startDate": "2023-02-14",
      "endDate": null,
      "adherencePct": 92.0,
      "status": "active",
      "prescribedFor": "Hypertension"
    }
  ],
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | `status=unknown` |
| 404 | `not_found` | Unknown `patientId` |

---

## 6. `GET /api/v1/patients/{patientId}/symptoms`

Symptom events for one patient, newest first.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `from` / `to` | date | No | ISO 8601 date filter on `date` |
| `minSeverity` | int | No | 1–10 |
| `resolved` | string | No | `true` \| `false` |
| `sort` | string | No | `date`, `severity` (default `date`, `desc`) |

### Response `200 OK`

```json
{
  "data": [
    {
      "eventId": "SYM-3001",
      "patientId": "SYN-50042",
      "date": "2024-05-21",
      "symptom": "Fatigue",
      "severity": 6,
      "durationDays": 4,
      "resolved": true,
      "note": "Worsened after missed metformin doses"
    },
    {
      "eventId": "SYM-3002",
      "patientId": "SYN-50042",
      "date": "2024-04-02",
      "symptom": "Dizziness",
      "severity": 4,
      "durationDays": 2,
      "resolved": true,
      "note": null
    }
  ],
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | `from` after `to`, `minSeverity: 11`, bad `resolved` value |
| 404 | `not_found` | Unknown `patientId` |

---

## 7. `GET /api/v1/patients/{patientId}/timeline`

Unified longitudinal timeline: diagnoses, medications, symptoms, and lab-style readings merged and ordered by date. One endpoint so the UI renders a single scrollable history.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `from` / `to` | date | No | Filter on event date |
| `type` | string | No | Repeatable: `medication` \| `symptom` \| `reading` \| `diagnosis`; omit = all |
| `sort` | string | No | `date` only; `order` `asc` \| `desc` (default `desc`) |

### Response `200 OK`

`events[]` is a tagged union: every event has `eventType`, `date`, `eventId`, `summary`; the remaining fields depend on `eventType`.

```json
{
  "data": {
    "patientId": "SYN-50042",
    "eventCount": 4,
    "events": [
      {
        "eventType": "symptom",
        "eventId": "SYM-3001",
        "date": "2024-05-21",
        "summary": "Fatigue (severity 6, resolved)",
        "severity": 6,
        "resolved": true
      },
      {
        "eventType": "reading",
        "eventId": "RD-5001",
        "date": "2024-05-10",
        "summary": "Blood pressure 152/91 mmHg",
        "readingType": "blood_pressure",
        "value": "152/91",
        "unit": "mmHg"
      },
      {
        "eventType": "medication",
        "eventId": "RX-2002",
        "date": "2023-02-14",
        "summary": "Started Amlodipine 5 mg (Hypertension)",
        "name": "Amlodipine",
        "dose": "5 mg",
        "status": "active"
      },
      {
        "eventType": "diagnosis",
        "eventId": "DX-6001",
        "date": "2023-02-14",
        "summary": "Type 2 Diabetes diagnosed",
        "code": "E11",
        "label": "Type 2 Diabetes"
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
| 400 | `validation_error` | Unknown `type` value, `from` after `to` |
| 404 | `not_found` | Unknown `patientId` |

---

## 8. `GET /api/v1/dashboard/stats`

Aggregated statistics for the Dashboard and Analysis pages.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `scope` | string | No | `original` (default) \| `synthetic` \| `both` |
| `cohortId` | string | No | Required when `scope=synthetic` if multiple cohorts exist; otherwise the latest cohort is used |

### Response `200 OK`

`Summary` = schema 4.3. Histograms reuse the Phase 1 chart labels exactly. `correlation` uses the Phase 1 field order: `Age, Diabetes, Systolic BP, Pain, BMI, Activity`.

```json
{
  "data": {
    "scope": "both",
    "original": {
      "summary": {
        "n": 1000, "avgAge": 53.8, "diabetesPct": 22.0,
        "avgSystolic": 127.1, "avgDiastolic": 79.2, "avgPain": 3.4, "avgBmi": 28.4,
        "activityCounts": [240, 300, 280, 180]
      },
      "ageHistogram": [{ "label": "18–25", "original": 96 }, { "label": "26–35", "original": 148 }],
      "genderHistogram": [{ "label": "Female", "value": 520 }, { "label": "Male", "value": 460 }, { "label": "Other", "value": 20 }],
      "bpHistogram": [{ "label": "Normal", "original": 312 }],
      "painHistogram": [{ "label": "0", "original": 61 }],
      "correlation": {
        "fields": ["Age", "Diabetes", "Systolic BP", "Pain", "BMI", "Activity"],
        "matrix": [[1.0, 0.24, 0.38, 0.12, 0.18, -0.15], [0.24, 1.0, 0.21, 0.26, 0.31, -0.19]]
      },
      "missingCells": 314,
      "missingPct": 2.86
    },
    "synthetic": {
      "cohortId": "COH-2024-0007",
      "summary": {
        "n": 500, "avgAge": 53.1, "diabetesPct": 19.8,
        "avgSystolic": 129.4, "avgDiastolic": 80.1, "avgPain": 3.3, "avgBmi": 28.1,
        "activityCounts": [118, 152, 139, 91]
      },
      "ageHistogram": [{ "label": "18–25", "synthetic": 45 }],
      "genderHistogram": [{ "label": "Female", "value": 261 }],
      "bpHistogram": [{ "label": "Normal", "synthetic": 140 }],
      "painHistogram": [{ "label": "0", "synthetic": 30 }],
      "correlation": {
        "fields": ["Age", "Diabetes", "Systolic BP", "Pain", "BMI", "Activity"],
        "matrix": [[1.0, 0.22, 0.36, 0.09, 0.16, -0.12], [0.22, 1.0, 0.19, 0.24, 0.29, -0.17]]
      }
    }
  },
  "meta": { "dataSource": "demo" },
  "errors": null
}
```

(Example truncated — every histogram includes all bins: age 7 bins, BP 4 bands, pain 0–10, activity/gender all categories.)

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | `scope=past`, unknown value |
| 404 | `not_found` | `scope=synthetic` with an unknown `cohortId`; synthetic requested but no cohort exists |

---

## 9. `POST /api/v1/validation/compare`

Statistical comparison of original vs synthetic. Raw values only — the platform deliberately reports **no** fake accuracy/similarity percentages (Phase 1 requirement carried forward).

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `cohortId` | string | No | Defaults to latest completed cohort |
| `fields` | array[string] | No | Subset of `age, diabetes, systolic, painScore, activity, bmi`; default = all |

### Response `200 OK`

```json
{
  "data": {
    "cohortId": "COH-2024-0007",
    "metrics": [
      { "metric": "avgAge", "original": 53.8, "synthetic": 53.1 },
      { "metric": "diabetesPct", "original": 22.0, "synthetic": 19.8 },
      { "metric": "avgSystolic", "original": 127.1, "synthetic": 129.4 },
      { "metric": "avgPain", "original": 3.4, "synthetic": 3.3 },
      { "metric": "activityDistribution", "original": [240, 300, 280, 180], "synthetic": [118, 152, 139, 91] }
    ],
    "correlation": {
      "original": { "fields": ["Age", "Diabetes", "Systolic BP", "Pain", "BMI", "Activity"], "matrix": [[1.0, 0.24]] },
      "synthetic": { "fields": ["Age", "Diabetes", "Systolic BP", "Pain", "BMI", "Activity"], "matrix": [[1.0, 0.22]] }
    }
  },
  "meta": { "dataSource": "demo" },
  "errors": null
}
```

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | Unknown `fields` entry |
| 404 | `not_found` | Unknown `cohortId`; no cohort exists |

---

## 10. `GET /api/v1/privacy/report`

Privacy evaluation placeholders, shaped for the Privacy page.

### Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `cohortId` | string | No | Defaults to latest completed cohort |

### Response `200 OK`

```json
{
  "data": {
    "cohortId": "COH-2024-0007",
    "status": "passed",
    "checks": [
      { "check": "exact_duplicates", "label": "Exact duplicate records", "count": 0, "passed": true },
      { "check": "highly_similar", "label": "Highly similar records", "count": 3, "passed": true },
      { "check": "unique_records", "label": "Unique synthetic records", "count": 500, "passed": true }
    ],
    "evaluatedAt": "2024-06-07T12:05:00Z"
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

`status` ∈ `not_evaluated` | `running` | `passed` | `flagged`.

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 404 | `not_found` | Unknown `cohortId`; no cohort exists |

---

## 11. `POST /api/v1/export`

Export a cohort as CSV. **Placeholder in Phase 2** — the request/response contract is fixed now; Phase 3 returns the file.

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `cohortId` | string | No | Defaults to latest completed cohort |
| `format` | string | No | `csv` (only format in v1) |
| `filters` | object | No | Same shape as `GET /patients` filter params; export applies them server-side |

### Response `202 Accepted`

```json
{
  "data": {
    "exportId": "EXP-9001",
    "cohortId": "COH-2024-0007",
    "format": "csv",
    "status": "queued"
  },
  "meta": { "dataSource": "synthetic" },
  "errors": null
}
```

The file itself is later served by `GET /api/v1/exports/{exportId}` (`200`, `text/csv`, `Content-Disposition: attachment`) — spec'd, not built.

### Errors

| HTTP | code | Trigger |
|---|---|---|
| 400 | `validation_error` | `format=json` (unsupported in v1) |
| 404 | `not_found` | Unknown `cohortId`; no cohort exists |
| 409 | `conflict` | Export already `queued` for the same cohort |
