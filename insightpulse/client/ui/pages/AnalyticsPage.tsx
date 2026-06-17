import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  FileCheck,
  Medal,
  Smile,
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { AnalyticsFilters } from '../components/AnalyticsFilters';
import { MetricCard } from '../components';
import { Tabs } from '../components/Tabs';
import { EngagementTrendCard } from '../components/EngagementTrendCard';
import { SentimentalAnalysisCard } from '../components/SentimentalAnalysisCard';
import { OverallNpsCard } from '../components/OverallNpsCard';
import { TrendsTable } from '../components/TrendsTable';
import { useSurveys, useUnifiedMetrics } from '../hooks/api';

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

export const AnalyticsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const { t } = useTranslation();

  const [eviPeriod, setEviPeriod] = useState<'30d' | '60d' | '90d'>('30d');
  const [rrPeriod, setRrPeriod] = useState<'30d' | '60d' | '90d'>('30d');
  const [asPeriod, setAsPeriod] = useState<'30d' | '60d' | '90d'>('30d');
  const [npsPeriod, setNpsPeriod] = useState<'30d' | '60d' | '90d'>('30d');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | undefined>(undefined);
  const [filterStart, setFilterStart] = useState<Date | undefined>(undefined);
  const [filterEnd, setFilterEnd] = useState<Date | undefined>(undefined);

  const handleDateChange = (start: Date, end: Date) => { setFilterStart(start); setFilterEnd(end); };

  const { data: apiSurveys } = useSurveys();
  const { data: eviMetrics, isLoading: metricsLoading } = useUnifiedMetrics(eviPeriod, selectedSurveyId, filterStart, filterEnd);
  const { data: rrMetrics } = useUnifiedMetrics(rrPeriod, selectedSurveyId, filterStart, filterEnd);
  const { data: asMetrics } = useUnifiedMetrics(asPeriod, selectedSurveyId, filterStart, filterEnd);
  const { data: npsMetrics } = useUnifiedMetrics(npsPeriod, selectedSurveyId, filterStart, filterEnd);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.analytics', { defaultValue: 'Analytics' }) }, { label: t('analytics.tabs.overview', { defaultValue: 'Overview' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div id="analytics-pdf-content" className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Analytics Tabs */}
            <Tabs
              items={ANALYTICS_TABS}
              labels={ANALYTICS_TABS.map(tab => t(ANALYTICS_TAB_KEYS[tab], { defaultValue: tab }))}
              value={activeTab}
              onChange={(tab) => {
              if (tab === 'CSAT/NPS') { setLocation('/analyticsOverview'); return; }
              if (tab === 'Customer Journey') { setLocation('/customerJourney'); return; }
              if (tab === 'Trends') { setLocation('/analyticsTrends'); return; }
              if (tab === 'Insights') { setLocation('/insights'); return; }
              setActiveTab(tab);
            }} />

            {/* Header Controls */}
            <AnalyticsFilters onSurveyChange={setSelectedSurveyId} onDateChange={handleDateChange} activeTab="Overview" metrics={eviMetrics ?? undefined} />

            {/* Metric Cards - 4 columns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metricsLoading && !eviMetrics ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] animate-pulse">
                      <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
                      <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <MetricCard
                    title={t('dashboard.kpis.evi', { defaultValue: 'Engagement Score' })}
                    value={eviMetrics ? `${eviMetrics.eviScore}/100` : '—'}
                    icon={<Smile className="h-5 w-5" />}
                    trend={eviMetrics?.trends?.evi && eviMetrics.trends.evi.direction !== 'flat' ? { value: eviMetrics.trends.evi.value, direction: eviMetrics.trends.evi.direction } : undefined}
                    selectedPeriod={eviPeriod}
                    onPeriodChange={setEviPeriod}
                  />
                  <MetricCard
                    title={t('dashboard.kpis.responseRate', { defaultValue: 'Response Rate' })}
                    value={rrMetrics ? `${rrMetrics.responseRate}%` : '—'}
                    icon={<FileCheck className="h-5 w-5" />}
                    trend={rrMetrics?.trends?.responseRate && rrMetrics.trends.responseRate.direction !== 'flat' ? { value: rrMetrics.trends.responseRate.value, direction: rrMetrics.trends.responseRate.direction } : undefined}
                    selectedPeriod={rrPeriod}
                    onPeriodChange={setRrPeriod}
                  />
                  <MetricCard
                    title={t('survey.activeSurveys', { defaultValue: 'Active Surveys' })}
                    value={asMetrics?.activeSurveys ?? (apiSurveys ?? []).filter(s => s.isActive).length}
                    icon={<Activity className="h-5 w-5" />}
                    trend={asMetrics?.trends?.responseRate && asMetrics.trends.responseRate.direction !== 'flat' ? { value: asMetrics.trends.responseRate.value, direction: asMetrics.trends.responseRate.direction } : undefined}
                    selectedPeriod={asPeriod}
                    onPeriodChange={setAsPeriod}
                  />
                  <MetricCard
                    title={t('dashboard.kpis.nps', { defaultValue: 'NPS Score' })}
                    value={npsMetrics ? npsMetrics.npsScore : '—'}
                    icon={<Medal className="h-5 w-5" />}
                    trend={npsMetrics?.trends?.nps && npsMetrics.trends.nps.direction !== 'flat' ? { value: npsMetrics.trends.nps.value, direction: npsMetrics.trends.nps.direction } : undefined}
                    selectedPeriod={npsPeriod}
                    onPeriodChange={setNpsPeriod}
                  />
                </>
              )}
            </div>

            {/* Charts section — captured by PDF export */}
            <div id="analytics-charts-section" className="space-y-6">

            {/* Engagement Trend Card + Surveys Table side by side */}
            <div className="flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <EngagementTrendCard />
              </div>
              {/* Surveys Table */}
              <div data-pdf-skip className="bg-white border border-[#e2e8f0] flex flex-col overflow-hidden rounded-lg shrink-0 w-[340px]">
                {/* Header */}
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] flex items-start">
                  <div className="flex flex-col h-10 items-start justify-center px-2 flex-1">
                    <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-slate-900 truncate">
                      {t('nav.surveys', { defaultValue: 'Surveys' })}
                    </p>
                  </div>
                  <div className="flex flex-col h-10 items-end justify-center px-2 w-[127px]">
                    <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-slate-900 truncate text-right w-full">
                      {t('common.actions', { defaultValue: 'Actions' })}
                    </p>
                  </div>
                  <div className="h-10 w-[49px] shrink-0" />
                </div>
                {/* Rows */}
                {(apiSurveys ?? []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <p className="font-['IBM_Plex_Sans'] text-[13px] text-slate-400">
                      {t('survey.noSurveysYet', { defaultValue: 'No surveys yet.' })}
                    </p>
                    <button
                      onClick={() => setLocation('/surveys')}
                      className="mt-2 font-['IBM_Plex_Sans'] text-[13px] text-blue-600 hover:text-blue-800 underline transition-colors cursor-pointer"
                    >
                      {t('survey.createFirst', { defaultValue: 'Create your first survey' })}
                    </button>
                  </div>
                )}
                {(apiSurveys ?? []).map((survey) => (
                  <div key={survey.id} className="border-b border-[#e2e8f0] flex items-start last:border-b-0">
                    <div className="flex flex-col h-[53px] items-start justify-center p-2 flex-1 min-w-0">
                      <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-slate-900 truncate w-full">
                        {survey.title}
                      </p>
                    </div>
                    <div className="flex flex-col h-[53px] items-start justify-center p-2 w-[127px]">
                      <button
                        onClick={() => setLocation(`/viewAnalytics/${survey.id}`)}
                        className="font-['IBM_Plex_Sans'] text-[16px] leading-[1.5] text-blue-600 hover:text-blue-800 truncate text-right underline decoration-solid w-full transition-colors cursor-pointer"
                      >
                        {t('survey.viewResults', { defaultValue: 'View Analytics' })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment Analysis and Overall NPS Row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <SentimentalAnalysisCard />
              </div>
              <div className="lg:col-span-2">
                <OverallNpsCard />
              </div>
            </div>

            {/* Insights & Recommendations */}
            {eviMetrics?.insights && (eviMetrics.insights.topInsights.length > 0 || eviMetrics.insights.topRecommendations.length > 0) && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-slate-900">
                      {t('analytics.topInsights', { defaultValue: 'Top Insights' })}
                    </h3>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                        {t('common.high', { defaultValue: 'High' })}: {eviMetrics.insights.urgencyBreakdown.high}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        {t('common.medium', { defaultValue: 'Medium' })}: {eviMetrics.insights.urgencyBreakdown.medium}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        {t('common.low', { defaultValue: 'Low' })}: {eviMetrics.insights.urgencyBreakdown.low}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {eviMetrics.insights.topInsights.length === 0 && (
                      <li className="text-sm text-slate-500">{t('common.none', { defaultValue: 'None yet.' })}</li>
                    )}
                    {eviMetrics.insights.topInsights.map((it, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 text-sm text-slate-700">
                        <span className="truncate">{it.text}</span>
                        <span className="text-xs text-slate-500 shrink-0">×{it.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
                  <h3 className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-slate-900 mb-3">
                    {t('analytics.topRecommendations', { defaultValue: 'Top Recommendations' })}
                  </h3>
                  <ul className="space-y-2">
                    {eviMetrics.insights.topRecommendations.length === 0 && (
                      <li className="text-sm text-slate-500">{t('common.none', { defaultValue: 'None yet.' })}</li>
                    )}
                    {eviMetrics.insights.topRecommendations.map((it, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 text-sm text-slate-700">
                        <span className="truncate">{it.text}</span>
                        <span className="text-xs text-slate-500 shrink-0">×{it.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Trends Table */}
            <TrendsTable
              data={eviMetrics?.themes ?? []}
              onViewAll={() => setLocation('/analyticsTrends')}
            />
            </div>{/* end analytics-charts-section */}
          </div>
        </div>
      </div>
    </div>
  );
};
