# Task 1 — Tags & Department (Real Data)

## Context

`AnalyticsFilters.tsx` shows a department dropdown hardcoded to `['All Departments', 'Finance', 'HR', 'IT', 'Governance', 'Strategy']`. There is no tags filter at all. Real departments live in the `departments` DB table and real tags live in `feedbackAnalytics.tags` (jsonb array). Selecting a department or tag should narrow the analytics metrics returned.

---

## Step 1 — Extend service: `getFilterOptions` + `getUnifiedMetrics` params

**File:** `server/services/unifiedAnalyticsService.ts`

**Add imports:** `departments`, `employees`, `sql`, `or` from drizzle/schema

**Add method `getFilterOptions(orgId?: string)`:**
```ts
async getFilterOptions(orgId?: string): Promise<{
  departments: { id: string; name: string }[];
  tags: string[];
}>
```
- Query `departments` table WHERE `isActive = true` AND (if orgId) `organizationId = orgId`
- Return `{id, name}[]`
- Query `feedbackAnalytics.tags` WHERE `tags IS NOT NULL`, collect distinct values across all jsonb arrays
- Return sorted `tags: string[]`

**Extend `getUnifiedMetrics(userId, dateRange, filters?)`:**
```ts
filters?: { departmentId?: string; tags?: string[] }
```
- If `filters.departmentId` provided:
  1. Query `employees` WHERE `departmentId = filters.departmentId` → collect `emails[]` and `phoneNumbers[]`
  2. Add `or(inArray(responses.respondentEmail, emails), inArray(responses.respondentPhone, phones))` to all `responses` WHERE clauses
  3. Same filter on `feedbackAnalytics` via existing `surveyId` join (feedbackAnalytics is already filtered by surveyId)
- If `filters.tags` provided (non-empty):
  - Add `sql\`${feedbackAnalytics.tags} ?| array[${tags.join(',')}]\`` to `feedbackAnalytics` WHERE clauses

---

## Step 2 — New route endpoint

**File:** `server/routes/unifiedAnalyticsRoutes.ts`

Add `GET /api/unified-analytics/filter-options`:
```ts
router.get("/filter-options", async (req: AuthRequest, res) => {
  const orgId = req.user?.organizationId;
  const options = await unifiedAnalyticsService.getFilterOptions(orgId);
  res.json(options);
});
```

Extend existing `GET /metrics` to read + forward filter params:
```ts
const departmentId = req.query.departmentId as string | undefined;
const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
const metrics = await unifiedAnalyticsService.getUnifiedMetrics(userId, dateRange, { departmentId, tags });
```

---

## Step 3 — Update `useUnifiedMetrics` hook

**File:** `client/ui/hooks/api.ts` (line 161)

```ts
export function useUnifiedMetrics(params?: {
  dateRange?: string;
  departmentId?: string;
  tags?: string[];
}) {
  const { dateRange = '30d', departmentId, tags } = params ?? {};
  const query = new URLSearchParams({ dateRange });
  if (departmentId) query.set('departmentId', departmentId);
  if (tags?.length) query.set('tags', tags.join(','));
  // queryKey includes all params for correct cache invalidation
}
```

---

## Step 4 — Update `AnalyticsFilters` component

**File:** `client/ui/components/AnalyticsFilters.tsx`

- Remove `const DEPARTMENTS = [...]` hardcoded array
- Add `useQuery('/api/unified-analytics/filter-options')` → `{departments: {id,name}[], tags: string[]}`
- Replace department `Dropdown` options with `['All Departments', ...filterOptions.departments.map(d => d.name)]`
- Track selected `departmentId: string | null` (map name→id on selection)
- Add `TagsDropdown` multi-select component (checkboxes) beside department dropdown, hidden when `availableTags.length === 0`
- Export `onFilterChange?: (v: { departmentId: string | null; tags: string[] }) => void` prop

---

## Step 5 — Wire filters in `AnalyticsPage`

**File:** `client/ui/pages/AnalyticsPage.tsx`

- Add `useState` for `{ departmentId: null, tags: [] }`
- Pass `onFilterChange` to `<AnalyticsFilters />`
- Pass filter state to `useUnifiedMetrics({ departmentId, tags })`

---

## Files Changed

| File | Change |
|------|--------|
| `server/services/unifiedAnalyticsService.ts` | Add `getFilterOptions()`, extend `getUnifiedMetrics()` signature |
| `server/routes/unifiedAnalyticsRoutes.ts` | Add `/filter-options` endpoint, forward `departmentId`/`tags` to metrics |
| `client/ui/hooks/api.ts` | Extend `useUnifiedMetrics` to accept filter params |
| `client/ui/components/AnalyticsFilters.tsx` | Replace hardcoded depts with API data, add Tags multi-select, emit `onFilterChange` |
| `client/ui/pages/AnalyticsPage.tsx` | Lift filter state, pass to hook |

---

## Verification

1. `npm run check` — no TS errors
2. Open Analytics → Department dropdown shows real org department names from DB
3. Tags dropdown appears when tags exist in `feedbackAnalytics.tags`
4. Selecting a department → network tab shows `?departmentId=xxx` → metrics cards change values
5. Selecting tags → `?tags=tag1,tag2` → themes table narrows
