# Task 2 — Response Rate Calculation

## Context

`unifiedAnalyticsService.ts` line 296 calculates:
```ts
const responseRate = activeSurveys > 0
  ? Math.round((uniqueResponses.length / activeSurveys) * 10) / 10
  : 0;
```
This divides total responses by the number of active surveys — producing a raw decimal (e.g. 2.3), not a percentage. The "Response Rate" metric card shows this raw number. There is no `surveyInvites` table (checked schema), so we cannot use actual sent-invite counts.

**Correct formula (without invite tracking):**
Estimate target audience from `employees` table (active employees in same org) and compare to actual respondents in the period. Fallback: if no employees exist, cap at 100% using `min(responses / activeSurveys * 20, 100)` as a rough rate assumption.

---

## Step 1 — Fix calculation in service

**File:** `server/services/unifiedAnalyticsService.ts`

Replace the `responseRate` block (lines ~296–302):

```ts
// Response rate = unique respondent emails / total active employees in org (capped at 100%)
// Falls back to rough estimate if no employee data
let responseRate = 0;
if (userId) {
  // Get org's active employee count (via user's surveys → org)
  const [orgRow] = await db.select({ organizationId: users.organizationId })
    .from(users).where(eq(users.id, userId));
  const orgId = orgRow?.organizationId;
  
  let targetAudience = 0;
  if (orgId) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(and(eq(employees.organizationId, orgId), eq(employees.isActive, true)));
    targetAudience = Number(count);
  }

  const uniqueRespondents = new Set(
    uniqueResponses.map(r => r.respondentEmail).filter(Boolean)
  ).size;

  if (targetAudience > 0) {
    responseRate = Math.min(Math.round((uniqueRespondents / targetAudience) * 100), 100);
  } else if (activeSurveys > 0) {
    // Fallback: treat each survey as targeting 10 people
    responseRate = Math.min(Math.round((uniqueRespondents / (activeSurveys * 10)) * 100), 100);
  }
}
```

**Also add imports:** `users` from schema, `sql` from drizzle-orm (may already be imported)

---

## Step 2 — Fix display in AnalyticsPage

**File:** `client/ui/pages/AnalyticsPage.tsx` (line ~94)

The "Response Rate" card currently shows `metrics.csatScore` (appears to be a copy-paste bug). Fix:
```tsx
value={metrics ? `${metrics.responseRate}%` : '—'}
```
Also use `trends.responseRate` trend for this card (already done at line ~104).

---

## Files Changed

| File | Change |
|------|--------|
| `server/services/unifiedAnalyticsService.ts` | Replace responseRate calculation with employee-based %, add `users`/`employees` imports |
| `client/ui/pages/AnalyticsPage.tsx` | Fix Response Rate card to show `responseRate` value with `%` suffix |

---

## Verification

1. `npm run check` — no TS errors
2. If org has 50 active employees and 10 unique respondents in period → card shows 20%
3. If no employees seeded → card shows capped fallback estimate with `%` suffix
4. Value is always 0–100
