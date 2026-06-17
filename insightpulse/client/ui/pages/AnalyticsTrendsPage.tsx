import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  FileCheck,
  Smile,
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
  ArrowUp,
  ArrowDown,
  TrendingDown,
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { AnalyticsFilters } from '../components/AnalyticsFilters';
import { Tabs } from '../components/Tabs';
import { useUnifiedMetrics } from '../hooks/api';
import { useSelectedSurveyId } from '../hooks/surveyFilter';

const ANALYTICS_TABS = ['Overview', 'CSAT/NPS', 'Customer Journey', 'Trends', 'Insights'];
const ANALYTICS_TAB_KEYS: Record<string, string> = {
  'Overview': 'analytics.tabs.overview',
  'CSAT/NPS': 'analytics.tabs.csatNps',
  'Customer Journey': 'analytics.tabs.customerJourney',
  'Trends': 'analytics.tabs.trends',
  'Insights': 'analytics.tabs.insights',
};

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

const SATISFACTION_META = [
  { key: 'verySatisfied',    label: 'Very Satisfied',    bgColor: '#cde7ff', fgColor: '#0095ff', textColor: '#0095ff', borderColor: '#0095ff', badgeBg: '#f0f9ff' },
  { key: 'satisfied',        label: 'Satisfied',         bgColor: '#8cfac7', fgColor: '#00c47a', textColor: '#00a866', borderColor: '#00a866', badgeBg: '#f0fdf4' },
  { key: 'neutral',          label: 'Neutral',           bgColor: '#c5a8ff', fgColor: '#884dff', textColor: '#884dff', borderColor: '#884dff', badgeBg: '#fbf1ff' },
  { key: 'dissatisfied',     label: 'Dissatisfied',      bgColor: '#ffd5a4', fgColor: '#ff8f0d', textColor: '#ff8900', borderColor: '#ff8900', badgeBg: '#fef6e6' },
  { key: 'veryDissatisfied', label: 'Very Dissatisfied', bgColor: '#ffc8c8', fgColor: '#e11d48', textColor: '#e11d48', borderColor: '#e11d48', badgeBg: '#fff1f2' },
] as const;

export const AnalyticsTrendsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const selectedSurveyId = useSelectedSurveyId();
  const [filterStart, setFilterStart] = useState<Date | undefined>(undefined);
  const [filterEnd, setFilterEnd] = useState<Date | undefined>(undefined);
  const { data: metrics, isLoading: metricsLoading } = useUnifiedMetrics('30d', selectedSurveyId, filterStart, filterEnd);

  const eviScore = metrics?.eviScore ?? 0;
  const npsScore = metrics?.npsScore ?? 0;
  const csatScore = metrics?.csatScore ?? 0;
  const promoters = metrics?.promotersPercent ?? 0;
  const passives = metrics?.passivesPercent ?? 0;
  const detractors = metrics?.detractorsPercent ?? 0;
  const dist = metrics?.satisfactionDistribution ?? { verySatisfied: 45, satisfied: 29, neutral: 18, dissatisfied: 5, veryDissatisfied: 3 };
  const satisfactionData = SATISFACTION_META.map(m => ({ ...m, value: dist[m.key] ?? 0 }));
  const maxSatisfaction = Math.max(...satisfactionData.map(d => d.value), 1);

  const eviPct = Math.min(100, Math.max(0, eviScore));
  const csatPct = Math.min(100, Math.max(0, csatScore));

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.analytics', { defaultValue: 'Analytics' }), href: '/analytics' }, { label: t('analytics.tabs.trends', { defaultValue: 'Trends' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div id="analytics-pdf-content" className="flex-1 overflow-auto p-6">
          <div className="space-y-6">

            {/* Analytics Tabs */}
            <Tabs
              items={ANALYTICS_TABS}
              labels={ANALYTICS_TABS.map(tab => t(ANALYTICS_TAB_KEYS[tab], { defaultValue: tab }))}
              value="Trends"
              onChange={(tab) => {
                if (tab === 'Overview') { setLocation('/analytics'); return; }
                if (tab === 'CSAT/NPS') { setLocation('/analyticsOverview'); return; }
                if (tab === 'Customer Journey') { setLocation('/customerJourney'); return; }
                if (tab === 'Insights') { setLocation('/insights'); return; }
              }}
            />

            {/* Header Controls */}
            <AnalyticsFilters activeTab="Trends" metrics={metrics ?? undefined} onDateChange={(s, e) => { setFilterStart(s); setFilterEnd(e); }} />

            {/* Charts section — captured by PDF export */}
            <div id="analytics-charts-section" className="space-y-6">

            {/* 3 Metric Cards Row */}
            <div className="grid grid-cols-3 gap-4">

              {/* Emotional Connection (EVI) */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-6">
                <div className="flex flex-col gap-3 px-6">
                  <div className="bg-slate-100 p-[10px] rounded-lg w-fit">
                    <Smile className="h-[18px] w-[18px] text-slate-600" />
                  </div>
                  <p className="font-['IBM_Plex_Sans'] font-bold text-lg leading-[1.6] text-slate-900 whitespace-nowrap">
                    {t('analytics.emotionalConnectionEVI', { defaultValue: 'Emotional Connection (EVI)' })}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] leading-[1.25] tracking-[0.09px]">
                      <span className="text-slate-900">{eviScore}</span>
                      <span className="text-slate-200">/100</span>
                    </p>
                    {metrics?.trends?.evi && (
                      <span className={`border border-slate-100 rounded-md px-2 py-0.5 font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] ${metrics.trends.evi.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {metrics.trends.evi.direction === 'up' ? '+' : '-'}{metrics.trends.evi.value}%
                      </span>
                    )}
                  </div>
                  {!metricsLoading && metrics ? (
                    <>
                      <div className="flex items-center gap-[5px]">
                        {eviPct >= 60
                          ? <ArrowUp className="h-4 w-4 text-emerald-500" />
                          : <TrendingDown className="h-4 w-4 text-slate-500" />}
                        <span className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-500">
                          {eviPct >= 70 ? t('analytics.onTrack', { defaultValue: 'On Track' }) : t('analytics.needsImprovement', { defaultValue: 'Needs Improvement' })}
                        </span>
                      </div>
                      <div className="relative h-1 w-full rounded-full bg-slate-200">
                        <div className="absolute left-0 top-0 h-full rounded-full bg-[#0d9488] transition-all" style={{ width: `${eviPct}%` }} />
                      </div>
                    </>
                  ) : (
                    <div className="h-1 w-full rounded-full bg-slate-100" />
                  )}
                </div>
              </div>

              {/* Net Promotor Score (NPS) */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-6 h-[226px]">
                <div className="flex flex-col gap-3 px-6">
                  <div className="bg-slate-100 p-[10px] rounded-lg w-fit">
                    <FileCheck className="h-[18px] w-[18px] text-slate-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <p className="font-['IBM_Plex_Sans'] font-bold text-lg leading-[1.6] text-slate-900 whitespace-nowrap">
                      {t('analytics.netPromotorScore', { defaultValue: 'Net Promotor Score (NPS)' })}
                    </p>
                    <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] leading-[1.25] tracking-[0.09px] text-[#0d9488]">
                      {npsScore}
                    </p>
                  </div>
                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col gap-3 items-center justify-center">
                      <p className="font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] text-[#0d9488]">{promoters}%</p>
                      <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-[#0d9488]">{t('analytics.metrics.promoters', { defaultValue: 'Promoters' })}</p>
                    </div>
                    <div className="flex flex-col gap-3 items-center justify-center">
                      <p className="font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] text-slate-900">{passives}%</p>
                      <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-900">{t('analytics.metrics.passives', { defaultValue: 'Passives' })}</p>
                    </div>
                    <div className="flex flex-col gap-3 items-center justify-center">
                      <p className="font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] text-[#e11d48]">{detractors}%</p>
                      <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-[#e11d48]">{t('analytics.metrics.detractors', { defaultValue: 'Detractors' })}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Satisfaction */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-6">
                <div className="flex flex-col gap-3 px-6">
                  <div className="bg-slate-100 p-[10px] rounded-lg w-fit">
                    <Smile className="h-[18px] w-[18px] text-slate-600" />
                  </div>
                  <p className="font-['IBM_Plex_Sans'] font-bold text-lg leading-[1.6] text-slate-900 whitespace-nowrap">
                    {t('analytics.customerSatisfaction', { defaultValue: 'Customer Satisfaction' })}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-['IBM_Plex_Sans'] font-semibold text-2xl leading-[1.3]">
                      <span className="text-slate-900">{csatScore}</span>
                      <span className="text-slate-200">/100</span>
                    </p>
                    {metrics?.trends?.csat && (
                      <span className={`border border-slate-100 rounded-md px-2 py-0.5 font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] ${metrics.trends.csat.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {metrics.trends.csat.direction === 'up' ? '+' : '-'}{metrics.trends.csat.value}%
                      </span>
                    )}
                  </div>
                  {!metricsLoading && metrics ? (
                    <>
                      <div className="flex items-center gap-[5px]">
                        {csatPct >= 60
                          ? <ArrowUp className="h-4 w-4 text-emerald-500" />
                          : <TrendingDown className="h-4 w-4 text-slate-500" />}
                        <span className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-500">
                          {csatPct >= 70 ? t('analytics.onTrack', { defaultValue: 'On Track' }) : t('analytics.needsWork', { defaultValue: 'Needs Work' })}
                        </span>
                      </div>
                      <div className="relative h-1 w-full rounded-full bg-slate-200">
                        <div className="absolute left-0 top-0 h-full rounded-full bg-[#0d9488] transition-all" style={{ width: `${csatPct}%` }} />
                      </div>
                    </>
                  ) : (
                    <div className="h-1 w-full rounded-full bg-slate-100" />
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Row */}
            <div className="flex gap-4 items-start">

              {/* Survey Engagement – 2×2 sub-card grid */}
              <div
                className="border border-slate-100 rounded-xl p-3 flex flex-col gap-2.5 flex-[578_0_0] min-w-0"
                style={{ height: '351px' }}
              >
                <p className="font-['IBM_Plex_Sans'] font-bold text-lg leading-[1.6] text-slate-900">{t('analytics.surveyEngagement', { defaultValue: 'Survey Engagement' })}</p>
                <div className="flex gap-2.5 flex-1 min-h-0">

                  {/* Left column */}
                  <div className="flex flex-col gap-5 flex-1">
                    {/* Total Response */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-3 flex-1 flex flex-col justify-center">
                      <div className="flex flex-col gap-3 px-6">
                        <div className="flex gap-3 items-start">
                          <div className="bg-slate-100 p-[10px] rounded-lg shrink-0">
                            <Smile className="h-[18px] w-[18px] text-slate-600" />
                          </div>
                          <div className="flex flex-col">
                            <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-600">{t('analytics.totalResponses', { defaultValue: 'Total Response' })}</p>
                            <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] leading-[1.25] tracking-[0.09px] text-slate-900">{metrics?.totalFeedback30d ?? 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-xs text-slate-400 tracking-[0.029px]">{t('common.last30Days', { defaultValue: 'Last 30 Days' })}</p>
                          {metrics?.trends?.responseRate && (
                            <>
                              <span className="text-slate-300 text-xs">·</span>
                              {metrics.trends.responseRate.direction === 'up'
                                ? <ArrowUp className="h-3 w-3 text-emerald-600" />
                                : <ArrowDown className="h-3 w-3 text-rose-600" />}
                              <p className={`font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] ${metrics.trends.responseRate.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {metrics.trends.responseRate.direction === 'up' ? '+' : '-'}{metrics.trends.responseRate.value}% vs prev 30d
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Daily Average */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-3 flex-1 flex flex-col justify-center">
                      <div className="flex flex-col gap-3 px-6">
                        <div className="flex gap-3 items-start">
                          <div className="bg-slate-100 p-[10px] rounded-lg shrink-0">
                            <FileCheck className="h-[18px] w-[18px] text-slate-600" />
                          </div>
                          <div className="flex flex-col">
                            <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-600">{t('analytics.dailyAverage', { defaultValue: 'Daily Average' })}</p>
                            <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] leading-[1.25] tracking-[0.09px] text-slate-900">{Math.round((metrics?.totalFeedback30d ?? 0) / 30)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-xs text-slate-400 tracking-[0.029px]">{t('common.last30Days', { defaultValue: 'Last 30 Days' })}</p>
                          {metrics?.trends?.evi && (
                            <>
                              <span className="text-slate-300 text-xs">·</span>
                              {metrics.trends.evi.direction === 'up'
                                ? <ArrowUp className="h-3 w-3 text-emerald-600" />
                                : <ArrowDown className="h-3 w-3 text-rose-600" />}
                              <p className={`font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] ${metrics.trends.evi.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {metrics.trends.evi.direction === 'up' ? '+' : '-'}{metrics.trends.evi.value}% vs prev 30d
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-5 flex-1">
                    {/* Happy Customers */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-3 flex-1 flex flex-col justify-center">
                      <div className="flex flex-col gap-3 px-6">
                        <div className="flex gap-3 items-start">
                          <div className="bg-slate-100 p-[10px] rounded-lg shrink-0">
                            <Users className="h-[18px] w-[18px] text-slate-600" />
                          </div>
                          <div className="flex flex-col">
                            <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-600">{t('analytics.happyCustomers', { defaultValue: 'Happy Customers' })}</p>
                            <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] leading-[1.25] tracking-[0.09px] text-slate-900">{metrics?.sentimentBreakdown?.positive ?? 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-xs text-slate-400 tracking-[0.029px]">{t('common.last30Days', { defaultValue: 'Last 30 Days' })}</p>
                          {metrics?.trends?.nps && (
                            <>
                              <span className="text-slate-300 text-xs">·</span>
                              {metrics.trends.nps.direction === 'up'
                                ? <ArrowUp className="h-3 w-3 text-emerald-600" />
                                : <ArrowDown className="h-3 w-3 text-rose-600" />}
                              <p className={`font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] ${metrics.trends.nps.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {metrics.trends.nps.direction === 'up' ? '+' : '-'}{metrics.trends.nps.value}% vs prev 30d
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Per Survey */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] py-3 flex-1 flex flex-col justify-center">
                      <div className="flex flex-col gap-3 px-6">
                        <div className="flex gap-3 items-start">
                          <div className="bg-slate-100 p-[10px] rounded-lg shrink-0">
                            <FileCheck className="h-[18px] w-[18px] text-slate-600" />
                          </div>
                          <div className="flex flex-col">
                            <p className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-600">{t('analytics.perSurvey', { defaultValue: 'Per Survey' })}</p>
                            <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] leading-[1.25] tracking-[0.09px] text-slate-900">{metrics?.responseRate != null ? `${metrics.responseRate.toFixed(1)}%` : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-xs text-slate-400 tracking-[0.029px]">{t('common.last30Days', { defaultValue: 'Last 30 Days' })}</p>
                          {metrics?.trends?.responseRate && (
                            <>
                              <span className="text-slate-300 text-xs">·</span>
                              {metrics.trends.responseRate.direction === 'up'
                                ? <ArrowUp className="h-3 w-3 text-emerald-600" />
                                : <ArrowDown className="h-3 w-3 text-rose-600" />}
                              <p className={`font-['IBM_Plex_Sans'] font-medium text-xs tracking-[0.029px] ${metrics.trends.responseRate.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {metrics.trends.responseRate.direction === 'up' ? '+' : '-'}{metrics.trends.responseRate.value}% vs prev 30d
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Satisfaction Breakdown */}
              <div
                className="bg-white border border-slate-100 rounded-[20px] shadow-[0px_4px_20px_0px_rgba(238,238,238,0.5)] flex-[541_0_0] min-w-0 px-3 pt-3 pb-4 flex flex-col"
                style={{ height: '351px' }}
              >
                <p className="font-['IBM_Plex_Sans'] font-bold text-lg leading-[1.6] text-slate-900 mb-1 ml-[10px]">
                  {t('analytics.satisfactionBreakdown', { defaultValue: 'Satisfaction Breakdown' })}
                </p>
                <div className="flex flex-col flex-1 justify-around">
                  {satisfactionData.map((item, index) => (
                    <React.Fragment key={item.label}>
                      {index > 0 && <div className="h-px bg-[#edf2f6] w-full" />}
                      <div className="flex items-center gap-3 px-3 py-2">
                        <p
                          className="font-['IBM_Plex_Sans'] font-medium text-sm text-slate-600 shrink-0"
                          style={{ width: '120px' }}
                        >
                          {item.label}
                        </p>
                        <div className="flex-1 relative h-2.5 rounded-lg overflow-hidden">
                          {/* light background track */}
                          <div
                            className="absolute inset-0 rounded-lg"
                            style={{ backgroundColor: item.bgColor }}
                          />
                          {/* filled foreground bar */}
                          <div
                            className="absolute left-0 top-0 h-full rounded-lg transition-all"
                            style={{
                              backgroundColor: item.fgColor,
                              width: `${(item.value / maxSatisfaction) * 100}%`,
                            }}
                          />
                        </div>
                        {/* Badge */}
                        <div
                          className="border rounded-lg px-2 py-0.5 text-xs font-normal text-center shrink-0"
                          style={{
                            minWidth: '40px',
                            borderColor: item.borderColor,
                            color: item.textColor,
                            backgroundColor: item.badgeBg,
                          }}
                        >
                          {item.value}%
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

            </div>

              {/* Survey Comparison */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-6">
                <p className="font-['IBM_Plex_Sans'] font-bold text-lg text-slate-900 mb-4">Survey Performance Comparison</p>
                {(metrics?.surveyComparison ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-['IBM_Plex_Sans'] text-[14px] text-slate-400">
                      {t('analytics.noSurveyComparisonYet', { defaultValue: 'No survey comparison data yet. Data appears once multiple surveys have received responses.' })}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-['IBM_Plex_Sans']">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['Survey', 'EVI', 'NPS', 'CSAT', 'Sentiment', 'Composite', 'vs Best'].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(metrics?.surveyComparison ?? []).map((s, i) => (
                          <tr key={s.surveyId} className={`border-b border-slate-50 ${i === 0 ? 'bg-teal-50/40' : ''}`}>
                            <td className="py-2 px-3 font-medium text-slate-800 max-w-[200px] truncate">{s.surveyTitle}</td>
                            <td className="py-2 px-3 text-slate-700">{s.evi}</td>
                            <td className="py-2 px-3 text-slate-700">{s.nps}</td>
                            <td className="py-2 px-3 text-slate-700">{s.csat}</td>
                            <td className="py-2 px-3 text-slate-700">{s.sentimentScore}%</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{s.compositeScore}</td>
                            <td className="py-2 px-3">
                              {i === 0
                                ? <span className="text-teal-600 font-semibold">Best</span>
                                : <span className={s.vsBestPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                    {s.vsBestPct > 0 ? '+' : ''}{s.vsBestPct}%
                                  </span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>{/* end analytics-charts-section */}

          </div>
        </div>
      </div>
    </div>
  );
};
