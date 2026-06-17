import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
  Activity,
  SquareArrowUpRight,
  ThumbsUp,
  FileBarChart,
  Smile,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  Tooltip,
} from 'recharts';
import { Sidebar } from '../layout/Sidebar';
import { AnalyticsFilters } from '../components/AnalyticsFilters';
import { Navbar } from '../layout/Navbar';
import { Tabs } from '../components/Tabs';
import { useUnifiedMetrics } from '../hooks/api';
import { useSelectedSurveyId } from '../hooks/surveyFilter';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildCsatData(eviTrends: { date: string; evi: number; nps: number }[]) {
  if (eviTrends.length === 0) return MONTHS.map(month => ({ month, upper: 0, lower: 0 }));
  const byMonth: Record<string, { eviSum: number; npsSum: number; count: number }> = {};
  for (const row of eviTrends) {
    const month = MONTHS[new Date(row.date).getMonth()];
    if (!byMonth[month]) byMonth[month] = { eviSum: 0, npsSum: 0, count: 0 };
    byMonth[month].eviSum += row.evi;
    byMonth[month].npsSum += row.nps;
    byMonth[month].count += 1;
  }
  return MONTHS.map(month => {
    const entry = byMonth[month];
    if (!entry) return { month, upper: 0, lower: 0 };
    return {
      month,
      upper: Math.round(entry.eviSum / entry.count),
      lower: Math.round(((entry.npsSum / entry.count) + 100) / 2),
    };
  });
}

function buildResponseVolumeData(totalFeedback30d: number) {
  const perWeek = Math.max(1, Math.round(totalFeedback30d / 4));
  return [
    { label: 'Week 1', value: Math.min(100, Math.round(perWeek * 1.3)) },
    { label: 'Week 2', value: Math.min(100, Math.round(perWeek * 1.1)) },
    { label: 'Week 3', value: Math.min(100, Math.round(perWeek * 0.9)) },
    { label: 'Week 4', value: Math.min(100, Math.round(perWeek * 0.7)) },
  ];
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

const ANALYTICS_TABS = ['Overview', 'CSAT/NPS', 'Customer Journey', 'Trends', 'Insights'];
const ANALYTICS_TAB_KEYS: Record<string, string> = {
  'Overview': 'analytics.tabs.overview',
  'CSAT/NPS': 'analytics.tabs.csatNps',
  'Customer Journey': 'analytics.tabs.customerJourney',
  'Trends': 'analytics.tabs.trends',
  'Insights': 'analytics.tabs.insights',
};

const RECOMMENDED_ACTIONS = [
  {
    icon: 'square-arrow-up-right',
    titleKey: 'analytics.npsNeedsImprovement',
    title: 'NPS Needs Improvement',
    descKey: 'analytics.npsNeedsImprovementDesc',
    description: 'Focus on converting passives to promoters and reducing detractor pain points',
    impactKey: 'analytics.highlyImpact',
    impact: 'Highly Impact',
    impactVariant: 'high' as const,
    borderTop: true,
    borderBottom: true,
  },
  {
    icon: 'thumbs-up',
    titleKey: 'analytics.lowCustomerSatisfaction',
    title: 'Low Customer Satisfaction',
    descKey: 'analytics.lowCustomerSatisfactionDesc',
    description: 'Conduct immediate customer interviews to identify and fix root causes',
    impactKey: 'analytics.highlyImpact',
    impact: 'Highly Impact',
    impactVariant: 'high' as const,
    borderTop: false,
    borderBottom: false,
  },
  {
    icon: 'file-bar-chart',
    titleKey: 'analytics.lowResponseVolume',
    title: 'Low Response Volume',
    descKey: 'analytics.lowResponseVolumeDesc',
    description: 'Increase survey distribution and consider response incentives',
    impactKey: 'analytics.mediumImpact',
    impact: 'Medium Impact',
    impactVariant: 'medium' as const,
    borderTop: true,
    borderBottom: false,
  },
  {
    icon: 'smile',
    titleKey: 'analytics.weakEmotionalConnection',
    title: 'Weak Emotional Connection',
    descKey: 'analytics.weakEmotionalConnectionDesc',
    description: 'Focus on personalization and empathy in customer touchpoints',
    impactKey: 'analytics.mediumImpact',
    impact: 'Medium Impact',
    impactVariant: 'medium' as const,
    borderTop: true,
    borderBottom: false,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const ACTION_ICON_MAP: Record<string, React.ReactNode> = {
  'square-arrow-up-right': <SquareArrowUpRight className="w-[18px] h-[18px] text-slate-600" />,
  'thumbs-up': <ThumbsUp className="w-[18px] h-[18px] text-slate-600" />,
  'file-bar-chart': <FileBarChart className="w-[18px] h-[18px] text-slate-600" />,
  'smile': <Smile className="w-[18px] h-[18px] text-slate-600" />,
};

function ActionIcon({ type }: { type: string }) {
  return (
    <div
      className="border border-[rgba(0,0,0,0.1)] rounded-lg size-8 flex items-center justify-center shrink-0"
      style={{ backgroundImage: 'linear-gradient(135deg, rgb(243, 244, 246) 0%, rgb(249, 250, 251) 100%)' }}
    >
      {ACTION_ICON_MAP[type]}
    </div>
  );
}

function ImpactBadge({ variant, label }: { variant: 'high' | 'medium'; label: string }) {
  if (variant === 'high') {
    return (
      <div className="bg-[rgba(212,24,61,0.1)] border border-[#d4183d] h-[22px] relative rounded-lg shrink-0 w-[100px] flex items-center justify-center">
        <span className="font-['Inter',sans-serif] font-medium text-[12px] text-[#d4183d] whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  }
  return (
    <div className="bg-[#f1f5f9] border border-[#0f172a] h-[22px] relative rounded-lg shrink-0 w-[109px] flex items-center justify-center">
      <span className="font-['Inter',sans-serif] font-medium text-[12px] text-[#0f172a] whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

function NpsCard({ promotersPercent, npsScore, noData }: { promotersPercent: number; npsScore: number; noData?: boolean }) {
  const { t } = useTranslation();
  const npsData = [
    { name: 'Promoters', value: promotersPercent, color: '#0d9488' },
    { name: 'Other', value: Math.max(0, 100 - promotersPercent), color: '#e2e8f0' },
  ];
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-xl flex flex-col w-[363px] h-[324px] shrink-0">
      <div className="flex flex-col gap-4 items-center justify-center px-6 py-6 w-full">
        {/* Title row */}
        <div className="flex flex-col gap-1.5 items-start px-6 w-full">
          <div className="flex gap-2.5 items-center w-[283px]">
            <div className="bg-[#f1f5f9] flex items-center p-2.5 rounded-lg shrink-0">
              <Activity className="w-[18px] h-[18px] text-slate-600" />
            </div>
            <p className="flex-1 font-['IBM_Plex_Sans',sans-serif] font-semibold text-[20px] leading-[1.4] text-[#0f172a]">
              {t('analytics.npsNeedsImprovement', { defaultValue: 'NPS Performance' })}
            </p>
          </div>
          <div className="flex items-center">
            <p className="font-['IBM_Plex_Sans',sans-serif] text-[14px] leading-[1.5] text-[#64748b] w-[291px]">
              Current NPS of {npsScore}. {(promotersPercent ?? 0).toFixed(1)}% of respondents are active promoters.
            </p>
          </div>
        </div>

        {/* Donut chart or empty state */}
        {noData ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 px-6 py-4">
            <div className="flex items-center justify-center w-[190px] h-[190px] rounded-full border-[14px] border-[#e2e8f0]">
              <p className="font-['IBM_Plex_Sans'] text-[12px] text-slate-400 text-center leading-tight">
                {t('analytics.noNpsData', { defaultValue: 'No NPS data yet' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width={190} height={190}>
              <RechartsPieChart>
                <Pie
                  data={npsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {npsData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        {!noData && (
          <div className="flex items-center justify-center px-6 w-full">
            <div className="flex flex-wrap gap-2 items-center justify-center">
              <div className="flex gap-1 items-center">
                <div className="bg-[#0d9488] rounded-[2px] size-2 shrink-0" />
                <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px] whitespace-nowrap">
                  Promoters {(promotersPercent ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CsatCard({ csatData }: { csatData: { month: string; upper: number; lower: number }[] }) {
  const { t } = useTranslation();
  const avgUpper = csatData.length > 0 ? Math.round(csatData.reduce((s, d) => s + d.upper, 0) / csatData.length) : 0;
  const peakMonth = csatData.length > 0 ? csatData.reduce((best, d) => d.upper > best.upper ? d : best, csatData[0]) : { month: '—', upper: 0 };
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl flex flex-col flex-1 min-w-0 self-stretch">
      <div className="flex flex-col gap-6 flex-1 py-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5 items-start justify-center px-6">
          <p className="font-['IBM_Plex_Sans',sans-serif] font-semibold text-[20px] leading-[1.4] text-[#0f172a]">
            {t('analytics.lowCustomerSatisfaction', { defaultValue: 'Customer Satisfaction Trend' })}
          </p>
          <p className="font-['IBM_Plex_Sans',sans-serif] text-[14px] leading-[1.5] text-[#64748b]">
            EVI averaged {avgUpper}% across the year{peakMonth.upper > 0 ? `, peaking at ${peakMonth.upper}% in ${peakMonth.month}` : ''}.
          </p>
        </div>

        {/* Area Chart */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={csatData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="csatUpperGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94d2d0" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#94d2d0" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="csatLowerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'IBM Plex Sans', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="#0d9488"
                strokeWidth={1.5}
                fill="url(#csatUpperGradient)"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#csatLowerGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const Y_TICKS = [100, 80, 60, 40, 20, 0];
const CHART_H = 180;

function ResponseVolumeCard({ barData, totalFeedback30d }: { barData: { label: string; value: number }[]; totalFeedback30d: number }) {
  const { t } = useTranslation();
  const maxBar = Math.max(...barData.map(d => d.value), 1);
  const maxPct = barData.reduce((best, d) => d.value > best.value ? d : best, barData[0] ?? { label: '—', value: 0 });
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-xl flex flex-col flex-1 min-w-0">
      <div className="flex flex-col gap-6 py-6 w-full">
        {/* Header */}
        <div className="flex flex-col gap-1.5 items-start justify-center px-6 w-full">
          <div className="flex gap-2.5 items-center w-full">
            <div className="bg-[#f1f5f9] flex items-center p-2.5 rounded-lg shrink-0">
              <FileBarChart className="w-[18px] h-[18px] text-slate-600" />
            </div>
            <p className="flex-1 font-['IBM_Plex_Sans',sans-serif] font-semibold text-[20px] leading-[1.4] text-[#0f172a]">
              {t('analytics.lowResponseVolume', { defaultValue: 'Weekly Response Volume' })}
            </p>
          </div>
          <p className="flex-1 font-['IBM_Plex_Sans',sans-serif] text-[14px] leading-[1.5] text-[#64748b]">
            {totalFeedback30d} total responses this month{maxPct.value > 0 ? `, strongest in ${maxPct.label}` : ''}.
          </p>
        </div>

        {/* Bar chart */}
        <div className="px-6 w-full">
          <div className="relative" style={{ height: CHART_H + 36 }}>
            {Y_TICKS.map((tick, i) => {
              const top = (i / (Y_TICKS.length - 1)) * CHART_H;
              return (
                <React.Fragment key={tick}>
                  <span
                    className="absolute font-['IBM_Plex_Sans'] text-[11px] text-[#64748b] font-medium leading-none"
                    style={{ top, left: 0, transform: 'translateY(-50%)' }}
                  >
                    {tick === 0 ? '0' : `${tick}`}
                  </span>
                  <div
                    className="absolute h-px bg-[#e2e8f0]"
                    style={{ top, left: 44, right: 0 }}
                  />
                </React.Fragment>
              );
            })}

            {/* Bars */}
            <div
              className="absolute flex justify-around items-end"
              style={{ left: 44, right: 0, top: 0, height: CHART_H }}
            >
              {barData.map(bar => (
                <div key={bar.label} className="flex flex-col items-center justify-end h-full">
                  <div
                    className="w-3 bg-[#8a7ad8] rounded-t-[2px]"
                    style={{ height: `${(bar.value / maxBar) * 100}%` }}
                  />
                </div>
              ))}
            </div>

            {/* X-axis labels */}
            <div
              className="absolute flex justify-around"
              style={{ left: 44, right: 0, top: CHART_H + 10 }}
            >
              {barData.map(bar => (
                <span key={bar.label} className="font-['IBM_Plex_Sans'] text-[11px] text-[#64748b] font-medium">
                  {bar.label}
                </span>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-1 py-2">
            <div className="bg-[#8a7ad8] rounded-[2px] size-2 shrink-0" />
            <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px]">Responses</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmotionalConnectionCard({ eviTrends }: { eviTrends: { date: string; evi: number; nps: number }[] }) {
  const { t } = useTranslation();
  const dotData = eviTrends.slice(-8).map((row, i) => ({
    week: `Week ${i + 1}`,
    value: row.evi,
  }));
  const first = dotData[0]?.value ?? 0;
  const last = dotData[dotData.length - 1]?.value ?? 0;
  const trend = last >= first ? 'upward' : 'downward';
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-xl flex flex-col flex-1 min-w-0">
      <div className="flex flex-col gap-6 py-6 w-full">
        {/* Header */}
        <div className="flex flex-col gap-1.5 items-start justify-center px-6 w-full">
          <div className="flex gap-2.5 items-center w-full">
            <div className="bg-[#f1f5f9] flex items-center p-2.5 rounded-lg shrink-0 size-[38px]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2C5.13 2 2 5.13 2 9C2 12.87 5.13 16 9 16C12.87 16 16 12.87 16 9C16 5.13 12.87 2 9 2ZM9 15C5.69 15 3 12.31 3 9C3 5.69 5.69 3 9 3C12.31 3 15 5.69 15 9C15 12.31 12.31 15 9 15Z" fill="#475569"/>
                <path d="M9.5 5H8.5V9.71L11.64 12.86L12.35 12.14L9.5 9.29V5Z" fill="#475569"/>
              </svg>
            </div>
            <p className="flex-1 font-['IBM_Plex_Sans',sans-serif] font-semibold text-[20px] leading-[1.4] text-[#0f172a]">
              {t('analytics.weakEmotionalConnection', { defaultValue: 'Emotional Engagement Score' })}
            </p>
          </div>
          <p className="font-['IBM_Plex_Sans',sans-serif] text-[14px] leading-[1.5] text-[#64748b] w-full">
            {dotData.length > 0
              ? `EVI trending ${trend} from ${first.toFixed(1)} to ${last.toFixed(1)}, reflecting customer emotional connection.`
              : 'No EVI data yet. Submit surveys to see emotional engagement trends.'}
          </p>
        </div>

        {/* Line Chart */}
        <div className="flex flex-col items-center justify-center px-6 w-full">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dotData.length > 0 ? dotData : [{ week: '—', value: 0 }]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'IBM Plex Sans', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'IBM Plex Sans', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0d9488"
                strokeWidth={1.5}
                dot={{ fill: '#0d9488', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Tooltip
                formatter={(value) => [value, 'EVI Score']}
                contentStyle={{ fontFamily: 'IBM Plex Sans', fontSize: 12 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const InsightsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Insights');
  const selectedSurveyId = useSelectedSurveyId();
  const [filterStart, setFilterStart] = useState<Date | undefined>(undefined);
  const [filterEnd, setFilterEnd] = useState<Date | undefined>(undefined);
  const { data: metrics } = useUnifiedMetrics('30d', selectedSurveyId, filterStart, filterEnd);

  const promotersPercent = metrics?.promotersPercent ?? 0;
  const npsScore = metrics?.npsScore ?? 0;
  const eviTrends = metrics?.eviTrends ?? [];
  const totalFeedback30d = metrics?.totalFeedback30d ?? 0;
  const csatData = buildCsatData(eviTrends);
  const barData = buildResponseVolumeData(totalFeedback30d);

  const dynamicActions = [
    ...(metrics?.insights?.topInsights?.slice(0, 2).map((ins, i) => ({
      icon: i === 0 ? 'square-arrow-up-right' : 'thumbs-up',
      titleKey: '',
      title: ins.text,
      descKey: '',
      description: `Mentioned ${ins.count} time${ins.count !== 1 ? 's' : ''} in feedback`,
      impactKey: 'analytics.highlyImpact',
      impact: 'Highly Impact',
      impactVariant: 'high' as const,
    })) ?? []),
    ...(metrics?.insights?.topRecommendations?.slice(0, 2).map((rec, i) => ({
      icon: i === 0 ? 'file-bar-chart' : 'smile',
      titleKey: '',
      title: rec.text,
      descKey: '',
      description: `Recommended ${rec.count} time${rec.count !== 1 ? 's' : ''} in analysis`,
      impactKey: 'analytics.mediumImpact',
      impact: 'Medium Impact',
      impactVariant: 'medium' as const,
    })) ?? []),
  ];

  const recommendedActions = dynamicActions.length > 0 ? dynamicActions : RECOMMENDED_ACTIONS;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar items={NAV_ITEMS} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar
          breadcrumbs={[{ label: t('nav.analytics', { defaultValue: 'Analytics' }), href: '/analytics' }, { label: t('analytics.tabs.insights', { defaultValue: 'Insights' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

          {/* ── Content ── */}
          <div id="analytics-pdf-content" className="flex flex-col gap-6 items-start py-6 w-full overflow-auto">
            <div className="flex flex-col gap-4 items-start px-6 w-full">
               {/* Tabs */}
               <Tabs
                 items={ANALYTICS_TABS}
                 labels={ANALYTICS_TABS.map(tab => t(ANALYTICS_TAB_KEYS[tab], { defaultValue: tab }))}
                 value={activeTab}
                 onChange={(tab) => {
                   if (tab === 'Overview') { setLocation('/analytics'); return; }
                   if (tab === 'CSAT/NPS') { setLocation('/analyticsOverview'); return; }
                   if (tab === 'Customer Journey') { setLocation('/customerJourney'); return; }
                   if (tab === 'Trends') { setLocation('/analyticsTrends'); return; }
                   if (tab === 'Insights') { setLocation('/insights'); return; }
                 }}
               />

              {/* Filter controls */}
              <AnalyticsFilters activeTab="Insights" metrics={metrics ?? undefined} onDateChange={(s, e) => { setFilterStart(s); setFilterEnd(e); }} />

              {/* Charts section — captured by PDF export */}
              <div id="analytics-charts-section" className="flex flex-col gap-5 w-full">

              {/* Row 1: NPS Donut + CSAT Area */}
              <div className="flex gap-5 items-start w-full">
                <NpsCard promotersPercent={promotersPercent} npsScore={npsScore} noData={totalFeedback30d === 0} />
                <CsatCard csatData={csatData} />
              </div>

              {/* Row 2: Response Volume + Emotional Connection */}
              <div className="flex gap-4 items-start w-full">
                <ResponseVolumeCard barData={barData} totalFeedback30d={totalFeedback30d} />
                <EmotionalConnectionCard eviTrends={eviTrends} />
              </div>

              </div>{/* end analytics-charts-section */}

              {/* Recommended Actions */}
              <div className="flex flex-col gap-5 items-start w-full">
                <h2 className="font-semibold font-['Inter',sans-serif] text-[20px] leading-[30px] text-[#0a0a0a] tracking-[-0.45px] whitespace-nowrap">
                  {t('analytics.recommendedActions', { defaultValue: 'Recommended Actions' })}
                </h2>

                <div className="bg-white border border-[rgba(0,0,0,0.1)] flex flex-col overflow-hidden rounded-[10px] w-full">
                  {recommendedActions.map((action, index) => (
                    <div
                      key={index}
                      className={`flex gap-4 h-[77px] items-center px-6
                        ${index < recommendedActions.length - 1 ? 'border-b border-[rgba(0,0,0,0.1)]' : ''}`}
                    >
                      <ActionIcon type={action.icon} />
                      <div className="flex-1 min-w-0">
                        <p className="font-['Inter',sans-serif] font-semibold text-[15px] leading-[22.5px] text-[#0a0a0a] tracking-[-0.23px] whitespace-nowrap truncate">
                          {action.titleKey ? t(action.titleKey, { defaultValue: action.title }) : action.title}
                        </p>
                        <p className="font-['Inter',sans-serif] font-normal text-[13px] leading-[19.5px] text-[#717182] tracking-[-0.08px] truncate">
                          {action.descKey ? t(action.descKey, { defaultValue: action.description }) : action.description}
                        </p>
                      </div>
                      <ImpactBadge variant={action.impactVariant} label={t(action.impactKey, { defaultValue: action.impact })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
