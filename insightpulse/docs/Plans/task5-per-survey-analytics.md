# Task 5 — Analytics Based on Each Survey

## Context

The survey dropdown in `AnalyticsFilters.tsx` (line 103) fetches real survey names from `/api/surveys` and shows them in a dropdown. But when a survey is selected, the value is never passed anywhere — `useUnifiedMetrics()` always fetches org-wide data. All analytics tabs show aggregate data regardless of which survey is selected.

---

## Step 1 — Extend service `getUnifiedMetrics`

**File:** `server/services/unifiedAnalyticsService.ts`

Add `surveyId?: string` to the optional `filters` param (same object as Task 1):
```ts
async getUnifiedMetrics(userId?: string, dateRange = '30d', filters?: {
  departmentId?: string;
  tags?: string[];
  surveyId?: string;
})
```

When `filters.surveyId` is provided:
- Override the `userSurveyIds` array to be just `[filters.surveyId]` (after verifying the survey belongs to the user)
- All existing `inArray(responses.surveyId, userSurveyIds)` conditions already handle this automatically

Verify ownership:
```ts
if (filters?.surveyId) {
  const [survey] = await db.select({ id: surveys.id })
    .from(surveys)
    .where(and(eq(surveys.id, filters.surveyId), eq(surveys.createdBy, userId)));
  if (!survey) return emptyMetrics; // survey not found or not owned
  userSurveyIds = [filters.surveyId];
}
```

---

## Step 2 — Extend route to read `surveyId`

**File:** `server/routes/unifiedAnalyticsRoutes.ts`

```ts
const surveyId = req.query.surveyId as string | undefined;
const metrics = await unifiedAnalyticsService.getUnifiedMetrics(userId, dateRange, {
  departmentId,
  tags,
  surveyId,
});
```

---

## Step 3 — Update `useUnifiedMetrics` hook

**File:** `client/ui/hooks/api.ts` (line 161)

Add `surveyId` to the params:
```ts
export function useUnifiedMetrics(params?: {
  dateRange?: string;
  departmentId?: string;
  tags?: string[];
  surveyId?: string;
}) {
  const { dateRange = '30d', departmentId, tags, surveyId } = params ?? {};
  const query = new URLSearchParams({ dateRange });
  if (departmentId) query.set('departmentId', departmentId);
  if (tags?.length) query.set('tags', tags.join(','));
  if (surveyId) query.set('surveyId', surveyId);
  return useQuery({
    queryKey: ['/api/unified-analytics/metrics', dateRange, departmentId, tags, surveyId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/unified-analytics/metrics?${query}`);
      return res.json();
    },
  });
}
```

---

## Step 4 — Update `AnalyticsFilters` to emit `surveyId`

**File:** `client/ui/components/AnalyticsFilters.tsx`

- The surveys query already returns `surveysData` with `id` and `title`
- Store `selectedSurveyId: string | null` alongside the display name
- Export `onFilterChange?: (v: { surveyId: string | null; ... }) => void`
- When survey dropdown changes, map name → id and emit both

---

## Step 5 — Wire in `AnalyticsPage`

**File:** `client/ui/pages/AnalyticsPage.tsx`

```tsx
const [filters, setFilters] = useState<{ surveyId: string | null }>({ surveyId: null });
const { data: metrics } = useUnifiedMetrics({
  surveyId: filters.surveyId ?? undefined,
});
...
<AnalyticsFilters onFilterChange={(f) => setFilters(f)} />
```

---

## Note on Sub-Pages

The sub-tab pages (`/analyticsOverview`, `/customerJourney`, `/analyticsTrends`, `/insights`) each call `useUnifiedMetrics()` independently without filter params. They will continue to show org-wide data. Filtering these pages requires passing filter state via URL params or Context — that is a larger refactor and can be a follow-up.

---

## Files Changed

| File | Change |
|------|--------|
| `server/services/unifiedAnalyticsService.ts` | Accept + apply `surveyId` in `getUnifiedMetrics` |
| `server/routes/unifiedAnalyticsRoutes.ts` | Read and forward `surveyId` query param |
| `client/ui/hooks/api.ts` | Add `surveyId` to `useUnifiedMetrics` params |
| `client/ui/components/AnalyticsFilters.tsx` | Emit `surveyId` in `onFilterChange` |
| `client/ui/pages/AnalyticsPage.tsx` | Lift filter state, pass `surveyId` to hook |

---

## Verification

1. `npm run dev` → Analytics Overview
2. Select "Survey A" from survey dropdown → network request has `?surveyId=xxx`
3. Metric cards (EVI, NPS, CSAT, Response Rate) change to show Survey A values only
4. Select "All Surveys" → metrics return to org-wide aggregate
5. `npm run check` — no TS errors
