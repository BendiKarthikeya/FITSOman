# Task 6 — CSV Export (All Analytics Parameters)

## Context

Current export is a PDF screenshot via `html2canvas` + `jspdf` (triggered from `AnalyticsFilters.tsx`). This produces a low-quality image of whatever is visible on screen, not real data. We need a proper CSV download containing all analytics parameters shown across all 5 tabs, respecting the active filters (dateRange, surveyId, departmentId, tags).

There is an existing `exportJobs` table and `dataTransferRoutes.ts` but it's an async job queue — overkill for this. We'll add a synchronous streaming endpoint directly on `unifiedAnalyticsRoutes.ts`.

---

## Step 1 — Add CSV export endpoint

**File:** `server/routes/unifiedAnalyticsRoutes.ts`

```ts
router.get("/export", async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const dateRange = (req.query.dateRange as string) || '30d';
  const surveyId = req.query.surveyId as string | undefined;
  const departmentId = req.query.departmentId as string | undefined;
  const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

  const rows = await unifiedAnalyticsService.getExportRows(userId, dateRange, { surveyId, departmentId, tags });

  const headers = [
    'Survey Name', 'Date', 'Channel', 'Respondent Email', 'Respondent Phone',
    'EVI Score', 'NPS Score', 'CSAT Score', 'CES Score',
    'Sentiment', 'Category', 'Urgency',
    'Insights', 'Recommendations',
    'Joy', 'Trust', 'Fear', 'Surprise', 'Sadness', 'Disgust', 'Anger', 'Anticipation',
    'Department', 'Tags'
  ];

  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map((_, i) => escape(Object.values(r)[i])).join(',')),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${dateRange}.csv"`);
  res.send(lines.join('\n'));
});
```

---

## Step 2 — Add `getExportRows` to service

**File:** `server/services/unifiedAnalyticsService.ts`

```ts
async getExportRows(userId: string, dateRange = '30d', filters?: {
  surveyId?: string; departmentId?: string; tags?: string[];
}): Promise<Record<string, any>[]>
```

Logic:
1. Resolve `userSurveyIds` (same as `getUnifiedMetrics`)
2. If `surveyId` filter → narrow to that survey only
3. Compute `{ startDate, endDate }` from `dateRange`
4. JOIN query: `responses` + `surveys` + `feedbackAnalytics` (left join on `responseId`)
5. For department: join `employees` on `respondentEmail`/`respondentPhone` → join `departments` on `departmentId` → select `departments.name`
6. Map each row to a flat object matching the CSV columns

Key JOIN:
```ts
db.select({
  surveyName: surveys.title,
  submittedAt: responses.submittedAt,
  source: responses.source,             // channel
  respondentEmail: responses.respondentEmail,
  respondentPhone: responses.respondentPhone,
  eviScore: responses.eviScore,
  npsScore: responses.npsScore,
  csatScore: responses.csatScore,
  cesScore: responses.cesScore,
  sentiment: feedbackAnalytics.sentiment,
  category: feedbackAnalytics.category,
  urgency: feedbackAnalytics.urgency,
  insights: feedbackAnalytics.insights,
  recommendations: feedbackAnalytics.recommendations,
  emotions: feedbackAnalytics.emotions,
  tags: feedbackAnalytics.tags,
  departmentName: departments.name,
})
.from(responses)
.leftJoin(surveys, eq(responses.surveyId, surveys.id))
.leftJoin(feedbackAnalytics, eq(feedbackAnalytics.responseId, responses.id))
.leftJoin(employees, eq(employees.email, responses.respondentEmail))
.leftJoin(departments, eq(departments.id, employees.departmentId))
.where(conditions)
```

Flatten `emotions` jsonb `{joy, trust, ...}` into individual columns.
Flatten `insights[]` and `recommendations[]` arrays into comma-joined strings.

---

## Step 3 — Update Export button in `AnalyticsFilters`

**File:** `client/ui/components/AnalyticsFilters.tsx`

Replace the single "Export" button with two actions using the existing split-button UI:
- Primary button: **"Export CSV"** — fetches `/api/unified-analytics/export?...currentFilters` and triggers download
- The `ChevronDown` secondary button → opens a tiny dropdown with "Export PDF" (existing logic)

```ts
const handleExportCSV = async () => {
  setIsExporting(true);
  try {
    const params = new URLSearchParams({ dateRange: '30d' });
    if (currentFilters.surveyId) params.set('surveyId', currentFilters.surveyId);
    if (currentFilters.departmentId) params.set('departmentId', currentFilters.departmentId);
    if (currentFilters.tags?.length) params.set('tags', currentFilters.tags.join(','));

    const res = await fetch(`/api/unified-analytics/export?${params}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'analytics.csv'; a.click();
    URL.revokeObjectURL(url);
  } finally {
    setIsExporting(false);
  }
};
```

Need to expose `getAuthToken()` — check `client/src/lib/queryClient.ts` or auth context for how the bearer token is retrieved in other queries.

---

## Files Changed

| File | Change |
|------|--------|
| `server/routes/unifiedAnalyticsRoutes.ts` | Add `GET /export` streaming CSV endpoint |
| `server/services/unifiedAnalyticsService.ts` | Add `getExportRows()` method with full JOIN query |
| `client/ui/components/AnalyticsFilters.tsx` | Replace Export button with CSV primary + PDF secondary |

---

## Verification

1. `npm run dev` → Analytics → click "Export CSV"
2. File downloads as `analytics-30d.csv`
3. Open in Excel/Google Sheets → columns: Survey Name, Date, Channel, Respondent Email, EVI Score, NPS Score, CSAT Score, CES Score, Sentiment, Category, Urgency, Insights, Recommendations, Joy–Anticipation, Department, Tags
4. Filter by a specific survey → CSV contains only that survey's rows
5. `npm run check` — no TS errors
