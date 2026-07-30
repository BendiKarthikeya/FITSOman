# Task 4 — Engagement Graph X and Y Axis Labels

## Context

`EngagementTrendCard.tsx` uses Recharts `AreaChart` with two data lines (Engagement/EVI and Benchmark/NPS). Currently:
- No Y-axis label → readers don't know if the scale is 0–100, 0–10, or percentage
- No X-axis label → axis shows month ticks but no "Month" label
- No `<Legend />` → the two colored areas have no visible name labels
- Y-axis has no `domain` → scale shifts with data, making comparisons inconsistent

---

## Step 1 — Update `EngagementTrendCard.tsx`

**File:** `client/ui/components/EngagementTrendCard.tsx`

**Changes:**

1. **Add Y-axis label** to `<YAxis>`:
```tsx
<YAxis
  domain={[0, 100]}
  tickLine={false}
  axisLine={false}
  tick={{ fontSize: 11, fill: '#94a3b8' }}
  label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 15, style: { fontSize: 11, fill: '#94a3b8' } }}
/>
```

2. **Add X-axis label** to `<XAxis>`:
```tsx
<XAxis
  dataKey="monthKey"
  tickLine={false}
  axisLine={false}
  tick={{ fontSize: 11, fill: '#94a3b8' }}
  label={{ value: 'Month', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#94a3b8' } }}
/>
```

3. **Add `<Legend />`** after `</defs>` (or before closing `</AreaChart>`):
```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
...
<Legend
  verticalAlign="top"
  align="right"
  iconType="circle"
  iconSize={8}
  wrapperStyle={{ fontSize: 12, color: '#64748b', paddingBottom: 4 }}
/>
```

4. Rename `Area` `name` props to human-readable labels so Legend shows them correctly:
```tsx
<Area ... name="Engagement" ... />
<Area ... name="NPS Benchmark" ... />
```

5. Add bottom margin to chart so X-axis label isn't clipped:
```tsx
<AreaChart margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
```

---

## Files Changed

| File | Change |
|------|--------|
| `client/ui/components/EngagementTrendCard.tsx` | Add Y/X axis labels, `<Legend />`, `domain={[0,100]}`, bottom margin |

---

## Verification

1. `npm run dev` → Analytics → Overview tab
2. Graph shows "Score" label on Y-axis (rotated left)
3. Graph shows "Month" label on X-axis (below ticks)
4. Top-right legend shows "Engagement" (blue) and "NPS Benchmark" (yellow) circles
5. Y-axis always shows 0–100 even with sparse data
