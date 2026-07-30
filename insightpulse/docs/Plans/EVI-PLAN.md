# PLAN.md — EVI Analysis Feature

## What This Feature Does

When a user submits an EVI assessment form, their question and answer responses are saved to the database, sent to an LLM, and the LLM returns a single EVI score (0–10) and one overall summary. That result is saved and exposed via one API endpoint.

---

## Database Tables to Add

### Table: `evi_assessments`
Stores the raw form submission.

| Column | Type | Notes |
|---|---|---|
| `id` | string (cuid) | primary key |
| `user_id` | string | who submitted |
| `responses` | JSON | array of `{ question, answer }` |
| `created_at` | timestamp | auto |

### Table: `evi_results`
Stores the LLM output linked to the submission.

| Column | Type | Notes |
|---|---|---|
| `id` | string (cuid) | primary key |
| `assessment_id` | string | FK → `evi_assessments.id` (unique) |
| `user_id` | string | copy from assessment for easy querying |
| `evi_score` | float | 0.0 – 10.0 |
| `zone_label` | string | see Zone Logic below |
| `summary` | string | one overall summary from LLM |
| `created_at` | timestamp | auto |

---

## API Endpoints to Add

### `POST /evi/submit`
Accepts the form data, saves it, triggers LLM scoring, saves the result.

**Request body:**
```json
{
  "user_id": "usr_123",
  "responses": [
    { "question": "How easily do you identify what you are feeling?", "answer": "I usually can tell when something feels off but struggle to name it exactly." },
    { "question": "How well do you control your reactions under stress?", "answer": "Not very well — I tend to snap and regret it later." }
  ]
}
```

**Response:**
```json
{
  "assessment_id": "clx...",
  "result": {
    "evi_score": 6.4,
    "zone_label": "Capable Zone",
    "summary": "You have a developing emotional awareness and show empathy in your relationships, but emotional regulation under pressure remains your primary growth area. With focused effort on pausing before reacting, your EVI score has strong potential to move into the Proficient Zone."
  }
}
```

### `GET /evi/result/:user_id`
Returns the latest EVI result for a user.

**Response:** same shape as above.

---

## Logic Flow

```
POST /evi/submit
  │
  ├── 1. Validate request body (user_id and responses array must not be empty)
  │
  ├── 2. Save to evi_assessments table → get assessment_id
  │
  ├── 3. Call scorer(responses) → sends to LLM → returns { evi_score, summary }
  │
  ├── 4. Derive zone_label from evi_score (see Zone Logic)
  │
  ├── 5. Save result to evi_results table
  │
  └── 6. Return combined response to client
```

---

## Zone Label Logic

Derive `zone_label` from `evi_score` after getting it back from the LLM:

| Score | Zone Label |
|---|---|
| 0.0 – 3.9 | Critical Zone |
| 4.0 – 5.9 | Developing Zone |
| 6.0 – 7.9 | Capable Zone |
| 8.0 – 9.4 | Proficient Zone |
| 9.5 – 10.0 | Exemplary Zone |

---

## LLM Prompt

### System Prompt
```
You are an expert emotional intelligence analyst trained in the Emotional Value Index (EVI) framework.

The EVI measures a person's emotional intelligence across exactly 10 dimensions. Your job is to:
1. Analyse the provided assessment question and answer responses.
2. Calculate a score (0.0–10.0) for each of the 10 dimensions based on what the answers reveal.
3. Calculate a weighted composite EVI score using the dimension weights below.
4. Write one overall summary paragraph about this person's emotional profile.

Always respond ONLY in valid JSON. No preamble, no explanation, no markdown code blocks. Raw JSON only.

The 10 EVI dimensions and their weights are:
1. Emotional Awareness – 10%
2. Emotional Regulation – 12%
3. Empathy – 12%
4. Motivation & Drive – 10%
5. Interpersonal Value – 10%
6. Resilience – 11%
7. Communication Quality – 10%
8. Trust & Authenticity – 10%
9. Conflict Resolution – 10%
10. Overall Emotional Impact – 5%

Composite EVI formula:
- Score each dimension 0.0–10.0 based on what the answers reveal about that area.
- composite_evi = sum of (dimension_score × weight) across all 10 dimensions.
- Round composite_evi to 1 decimal place.

Return ONLY this JSON shape:
{
  "evi_score": 7.2,
  "summary": "One paragraph overall summary of this person's emotional profile, their strengths, their main gap, and one actionable recommendation."
}
```

### User Prompt (build dynamically)
```
Here are the EVI assessment responses:

Q: {{question}}
A: {{answer}}

Q: {{question}}
A: {{answer}}

(repeat for all responses)

Analyse these and return the JSON result.
```

---

## Error Handling

| Scenario | What to do |
|---|---|
| LLM returns invalid JSON | Retry once, then return `500` with `"Scoring failed, please try again"` |
| Responses array is empty | Return `400` with `"No responses provided"` |
| LLM score outside 0–10 | Clamp to 0 or 10 before saving |
| User already has a result | Still save the new one — multiple assessments per user are allowed |

---

## How EVI Score Is Calculated

The LLM reads all Q&A responses and internally maps them across 10 dimensions, scores each one, then applies the weights to arrive at a single composite EVI score.

### The 10 Dimensions & Weights

| # | Dimension | Weight |
|---|---|---|
| 1 | Emotional Awareness | 10% |
| 2 | Emotional Regulation | 12% |
| 3 | Empathy | 12% |
| 4 | Motivation & Drive | 10% |
| 5 | Interpersonal Value | 10% |
| 6 | Resilience | 11% |
| 7 | Communication Quality | 10% |
| 8 | Trust & Authenticity | 10% |
| 9 | Conflict Resolution | 10% |
| 10 | Overall Emotional Impact | 5% |

### Calculation Formula

```
1. LLM reads all Q&A answers and scores each dimension 0.0–10.0

2. composite_evi = sum of (dimension_score × weight) for all 10 dimensions

3. Round to 1 decimal place
```

**Example:**
```
Emotional Awareness:      6.0 × 0.10 = 0.60
Emotional Regulation:     8.0 × 0.12 = 0.96
Empathy:                  5.5 × 0.12 = 0.66
Motivation & Drive:       7.0 × 0.10 = 0.70
Interpersonal Value:      6.5 × 0.10 = 0.65
Resilience:               7.5 × 0.11 = 0.83
Communication Quality:    6.0 × 0.10 = 0.60
Trust & Authenticity:     8.0 × 0.10 = 0.80
Conflict Resolution:      5.0 × 0.10 = 0.50
Overall Emotional Impact: 7.0 × 0.05 = 0.35
──────────────────────────────────────────────
Composite EVI = 6.65 → rounded to 6.7
```

> The per-dimension scores are used internally by the LLM to compute the final score and are not stored. Only `evi_score` and `summary` are saved.
