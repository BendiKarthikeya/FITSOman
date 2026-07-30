# EVI API — Test Guide

Once the LLM is working (Grok credits added or alternative model configured), run these tests in order.

---

## Prerequisites

- Dev server running: `npm run dev` (port 5001)
- LLM API key configured and funded in `.env`
- EVI tables exist in DB (already created via `migrations/create-evi-tables.sql`)

---

## 1. Validation Tests (no LLM needed)

### 1a. Missing user_id
```bash
curl -s -X POST http://localhost:5001/api/evi/submit \
  -H "Content-Type: application/json" \
  -d '{"responses":[{"question":"Q","answer":"A"}]}'
```
**Expected:** `{"error":"user_id is required"}`

### 1b. Empty responses array
```bash
curl -s -X POST http://localhost:5001/api/evi/submit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","responses":[]}'
```
**Expected:** `{"error":"No responses provided"}`

### 1c. GET for unknown user
```bash
curl -s http://localhost:5001/api/evi/result/nonexistent-user
```
**Expected:** `{"error":"No EVI result found for this user"}`

---

## 2. Full Score Submission (requires LLM)

```bash
curl -s -X POST http://localhost:5001/api/evi/submit \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-001",
    "responses": [
      {
        "question": "How easily do you identify what you are feeling?",
        "answer": "I usually can tell when something feels off but I struggle to name it exactly. Sometimes I need a few hours to understand my own emotions."
      },
      {
        "question": "How well do you control your reactions under stress?",
        "answer": "Not very well — I tend to snap at people and regret it later. It is something I am actively working on."
      },
      {
        "question": "How do you respond when a colleague is going through a difficult time?",
        "answer": "I try to listen and offer support. I genuinely care about the people around me and want to help when I can."
      },
      {
        "question": "What motivates you to keep going when things get tough?",
        "answer": "My sense of purpose and the people I care about. I remind myself why I started and that keeps me grounded."
      },
      {
        "question": "How do you handle conflict with someone you work closely with?",
        "answer": "I try to address it directly but calmly. Sometimes I avoid it too long before speaking up, which I know is a weakness."
      }
    ]
  }'
```

**Expected response shape:**
```json
{
  "assessment_id": "<uuid>",
  "result": {
    "evi_score": 6.4,
    "zone_label": "Capable Zone",
    "summary": "..."
  }
}
```

**Checks:**
- `evi_score` is a number between 0.0 and 10.0
- `zone_label` is one of: `Critical Zone`, `Developing Zone`, `Capable Zone`, `Proficient Zone`, `Exemplary Zone`
- `summary` is a non-empty paragraph
- `assessment_id` is a UUID

---

## 3. Retrieve Result

Using the `user_id` from the submission above:

```bash
curl -s http://localhost:5001/api/evi/result/test-user-001
```

**Expected:** Same shape as submit response — `assessment_id`, `result.evi_score`, `result.zone_label`, `result.summary`

---

## 4. Zone Label Boundary Tests

Submit responses that should produce extreme scores and verify the zone label:

| Expected score range | Test answers style | Expected zone |
|---|---|---|
| 0.0–3.9 | All answers show complete emotional unawareness, frequent explosive reactions, no empathy | Critical Zone |
| 4.0–5.9 | Mixed — some awareness but many gaps | Developing Zone |
| 6.0–7.9 | Decent EI with a few clear gaps | Capable Zone |
| 8.0–9.4 | Strong across most dimensions, minor gaps | Proficient Zone |
| 9.5–10.0 | Exceptional EI demonstrated across all answers | Exemplary Zone |

---

## 5. Multiple Submissions — Same User

Submit twice with the same `user_id`. `GET /api/evi/result/:user_id` should return the **latest** result.

```bash
# First submission
curl -s -X POST http://localhost:5001/api/evi/submit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"multi-test","responses":[{"question":"Q1","answer":"I struggle a lot with emotions."}]}'

# Second submission (different answers)
curl -s -X POST http://localhost:5001/api/evi/submit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"multi-test","responses":[{"question":"Q1","answer":"I have excellent emotional control in all situations."}]}'

# GET should return the second result
curl -s http://localhost:5001/api/evi/result/multi-test
```

---

## Zone Label Reference

| Score | Zone |
|---|---|
| 0.0 – 3.9 | Critical Zone |
| 4.0 – 5.9 | Developing Zone |
| 6.0 – 7.9 | Capable Zone |
| 8.0 – 9.4 | Proficient Zone |
| 9.5 – 10.0 | Exemplary Zone |
