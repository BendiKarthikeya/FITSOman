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
  TrendingUp,
  MapPin,
  Clock,
  User,
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { AnalyticsFilters } from '../components/AnalyticsFilters';
import { MetricCard } from '../components';
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

export const CustomerJourneyPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useTranslation();
  const selectedSurveyId = useSelectedSurveyId();
  const [filterStart, setFilterStart] = useState<Date | undefined>(undefined);
  const [filterEnd, setFilterEnd] = useState<Date | undefined>(undefined);
  const { data: metrics } = useUnifiedMetrics('30d', selectedSurveyId, filterStart, filterEnd);

  const themes = metrics?.themes ?? [];
  const totalTouchpoints = metrics?.totalFeedback30d ?? 0;
  const avgSatisfaction = metrics?.csatScore != null ? Math.round(metrics.csatScore) : null;
  const sentimentBreakdown = metrics?.sentimentBreakdown ?? { positive: 0, neutral: 0, negative: 0, total: 0 };
  const positiveCount = sentimentBreakdown.positive;
  const rawTotal = sentimentBreakdown.total;
  const totalCount = rawTotal > 0 ? rawTotal : 1;
  const completionRate = metrics?.responseRate != null ? Math.round(metrics.responseRate) : null;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[
            { label: t('nav.analytics', { defaultValue: 'Analytics' }) },
            { label: t('analytics.tabs.customerJourney', { defaultValue: 'Customer Journey' }) }
          ]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div id="analytics-pdf-content" className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Analytics Tabs */}
            <Tabs
              items={ANALYTICS_TABS}
              labels={ANALYTICS_TABS.map(tab => t(ANALYTICS_TAB_KEYS[tab], { defaultValue: tab }))}
              value="Customer Journey"
              onChange={(tab) => {
                if (tab === 'Overview') { setLocation('/analytics'); return; }
                if (tab === 'CSAT/NPS') { setLocation('/analyticsOverview'); return; }
                if (tab === 'Trends') { setLocation('/analyticsTrends'); return; }
                if (tab === 'Insights') { setLocation('/insights'); return; }
              }}
            />

            {/* Header Controls */}
            <AnalyticsFilters activeTab="Customer Journey" metrics={metrics ?? undefined} onDateChange={(s, e) => { setFilterStart(s); setFilterEnd(e); }} />

            {/* Customer Journey Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {t('analytics.tabs.customerJourney', { defaultValue: 'Customer Journey' })}
              </h1>
              <p className="text-slate-600">
                Track customer interactions and satisfaction across all touchpoints in their journey
              </p>
            </div>

            {/* Charts section — captured by PDF export */}
            <div id="analytics-charts-section" className="space-y-6">

            {/* Feedback Themes as Journey Touchpoints */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Feedback Themes</h2>
              {themes.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-lg p-10 text-center text-slate-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                  No feedback themes yet. Submit surveys to see customer journey insights.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {themes.map((theme, index) => {
                    const sentimentPct = (theme.mention > 0 && rawTotal > 0) ? Math.min(100, Math.round((theme.mention / rawTotal) * 100)) : 0;
                    return (
                      <div
                        key={index}
                        className="bg-white border border-slate-100 rounded-lg p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100">
                              <MapPin className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{theme.theme}</h3>
                              <p className="text-sm text-slate-600 line-clamp-1">{theme.example}</p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              theme.sentiment === 'Positive'
                                ? 'bg-green-100 text-green-700'
                                : theme.sentiment === 'Negative'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {theme.sentiment}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600 mb-1">Mentions</span>
                            <span className="text-xl font-semibold text-slate-900">{theme.mention}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600 mb-1">Share</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xl font-semibold text-slate-900">{sentimentPct}%</span>
                              <TrendingUp className={`h-4 w-4 ${theme.sentiment === 'Positive' ? 'text-green-600' : theme.sentiment === 'Negative' ? 'text-red-500' : 'text-yellow-500'}`} />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600 mb-1">Volume</span>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${sentimentPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Journey Flow Visualization */}
            {themes.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-lg p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Theme Flow</h2>
                <div className="flex items-center justify-between overflow-x-auto pb-4">
                  {themes.map((theme, index) => (
                    <div key={index} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-600 mb-2">
                          <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-900 text-center w-20">{theme.theme}</p>
                      </div>
                      {index < themes.length - 1 && (
                        <div className="flex-1 h-1 bg-slate-200 mx-4 min-w-[40px]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Metrics */}
            {totalTouchpoints === 0 && themes.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-6 text-center">
                <p className="font-['IBM_Plex_Sans'] text-[14px] text-slate-500">
                  {t('analytics.noMetricsYet', { defaultValue: 'No data yet. Responses will appear here once surveys are submitted.' })}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total Responses"
                  value={totalTouchpoints}
                  icon={<Clock className="h-5 w-5" />}
                  period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                />
                <MetricCard
                  title="Avg Satisfaction"
                  value={avgSatisfaction != null ? `${avgSatisfaction}%` : '—'}
                  icon={<User className="h-5 w-5" />}
                  period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                />
                <MetricCard
                  title="Positive Responses"
                  value={`${positiveCount}/${totalCount}`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                />
                <MetricCard
                  title="Response Rate"
                  value={completionRate != null ? `${completionRate}%` : '—'}
                  icon={<MapPin className="h-5 w-5" />}
                  period={t('common.last30Days', { defaultValue: 'Last 30 Days' })}
                />
              </div>
            )}
            </div>{/* end analytics-charts-section */}
          </div>
        </div>
      </div>
    </div>
  );
};
