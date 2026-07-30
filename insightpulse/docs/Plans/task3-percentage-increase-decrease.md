# Task 3 — Percentage Increase/Decrease Dynamic

## Context

`unifiedAnalyticsService.ts` already queries a prior period (lines 193–216) and calculates `prevEvi`, `prevNps`, `prevCsat`. But the `TrendDelta` interface only has:
```ts
interface TrendDelta {
  value: number; // signed % change vs previous period
  direction: 'up' | 'down' | 'flat';
}
```

The `value` field is populated but the metric cards in `AnalyticsPage.tsx` and `AnalyticsTrendsPage.tsx` never actually display it as `+X%` or `-X%` — they only show an arrow icon based on `direction`. Users cannot see the magnitude of the change.

---

## Step 1 — Verify `value` is populated correctly in service

**File:** `server/services/unifiedAnalyticsService.ts`

Check the trend delta calculation (around line 305). It should compute:
```ts
const eviDelta = prevEvi > 0 ? Math.round(((eviScore - prevEvi) / prevEvi) * 100) : 0;
const trends = {
  evi: { value: eviDelta, direction: eviDelta > 2 ? 'up' : eviDelta < -2 ? 'down' : 'flat' },
  ...
};
```

If `value` is already correct (it's the % change), no service change needed. Confirm and move to Step 2.

---

## Step 2 — Display `+X%` / `-X%` in MetricCard

**File:** `client/ui/components/MetricCard.tsx` (find exact path — likely `client/ui/components/MetricCard.tsx` or `client/ui/components/index.tsx`)

Update the trend display section to show the numeric % alongside the arrow:

Current likely markup:
```tsx
{trend && (
  <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
    {trend.direction === 'up' ? '↑' : '↓'}
  </span>
)}
```

Updated:
```tsx
{trend && trend.value !== 0 && (
  <span className={trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-slate-400'}>
    {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
    {' '}{Math.abs(trend.value)}%
  </span>
)}
```

---

## Step 3 — Same update in AnalyticsTrendsPage metric cards

**File:** `client/ui/pages/AnalyticsTrendsPage.tsx`

Same pattern — find trend display inline code and add `{Math.abs(trend.value)}%` next to arrow.

---

## Step 4 — Verify prior-period window matches selected dateRange

The prior period is calculated at line 194:
```ts
const periodMs = endDate.getTime() - startDate.getTime();
const prevStart = new Date(startDate.getTime() - periodMs);
const prevEnd = startDate;
```
This is correct (equal-length prior window). No change needed here.

---

## Files Changed

| File | Change |
|------|--------|
| `server/services/unifiedAnalyticsService.ts` | Verify `value` field is % change (fix if wrong) |
| `client/ui/components/MetricCard.tsx` | Show `↑ X%` / `↓ X%` using `trend.value` |
| `client/ui/pages/AnalyticsTrendsPage.tsx` | Same trend display update |

---

## Verification

1. Seed responses in current period (last 30 days) with EVI=80, and prior period with EVI=60
2. `npm run dev` → Analytics Overview → EVI card shows `↑ 33%`
3. No data in current period vs prior → card shows `↓ 100%`
4. Equal periods → shows `→ 0%` or nothing
