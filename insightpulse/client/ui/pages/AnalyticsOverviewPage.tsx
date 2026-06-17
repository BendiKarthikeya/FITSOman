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
  FileCheck,
  Activity,
  Smile,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { AnalyticsFilters } from '../components/AnalyticsFilters';
import { Navbar } from '../layout/Navbar';
import { Tabs } from '../components/Tabs';
import { OverallNpsCard } from '../components/OverallNpsCard';
import { useUnifiedMetrics } from '../hooks/api';
import { useSelectedSurveyId } from '../hooks/surveyFilter';

// ─── Data ─────────────────────────────────────────────────────────────────────

const sidebarItems = [
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AnalyticsOverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab] = useState('CSAT/NPS');
  const selectedSurveyId = useSelectedSurveyId();
  const [filterStart, setFilterStart] = useState<Date | undefined>(undefined);
  const [filterEnd, setFilterEnd] = useState<Date | undefined>(undefined);
  const { data: metrics, isLoading: metricsLoading } = useUnifiedMetrics('30d', selectedSurveyId, filterStart, filterEnd);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.analytics', { defaultValue: 'Analytics' }), href: '/analytics' }, { label: t('analytics.tabs.csatNps', { defaultValue: 'CSAT/NPS' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

          {/* ── Scrollable content ── */}
          <div id="analytics-pdf-content" className="flex-1 overflow-auto py-6 px-6">
            <div className="flex flex-col gap-4">

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

              {/* Filter bar */}
              <AnalyticsFilters activeTab="CSAT/NPS" metrics={metrics ?? undefined} onDateChange={(s, e) => { setFilterStart(s); setFilterEnd(e); }} />

              {/* Empty state banner */}
              {!metricsLoading && metrics?.totalFeedback30d === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
                  <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                  </svg>
                  <p className="font-['IBM_Plex_Sans'] text-[13px] text-amber-800">
                    {t('analytics.noResponsesYet', { defaultValue: 'No responses collected yet. Send out surveys to start seeing CSAT and NPS data.' })}
                  </p>
                </div>
              )}

              {/* KPI Cards — 3 cards */}
              <div className="flex gap-4 items-start">

                {/* Left 2 cards */}
                <div className="flex gap-4 flex-[736_736_0%] min-w-0">

                  {/* Card 1: Total Responses */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-1 flex-col gap-0 items-start py-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-3 items-start px-6 w-full">
                      <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-lg">
                        <Smile className="h-[18px] w-[18px] text-[#0f172a]" />
                      </div>
                      <div className="flex flex-col items-start w-full">
                        <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] leading-[1.6] text-[#0f172a] whitespace-nowrap">{t('analytics.totalResponses', { defaultValue: 'Total Responses' })}</p>
                        <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-[#64748b]">{t('common.last30Days', { defaultValue: 'Last 30 Days' })}</p>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <p className="font-['IBM_Plex_Sans'] font-semibold text-[24px] leading-[1.3] text-[#0f172a]">{metrics?.totalFeedback30d ?? '—'}</p>
                        <div className="border border-[#f1f5f9] flex h-[22px] items-center justify-center px-2 py-[2px] rounded-md">
                          <p className={`font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] tracking-[0.0288px] whitespace-nowrap ${metrics?.trends?.responseRate?.direction === 'up' ? 'text-[#059669]' : 'text-[#e11d48]'}`}>
                            {metrics?.trends?.responseRate ? `${metrics.trends.responseRate.direction === 'up' ? '+' : '-'}${metrics.trends.responseRate.value}%` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Customer Satisfaction Score */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-1 flex-col items-start py-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-3 items-start px-6 w-full">
                      <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-lg">
                        <FileCheck className="h-[18px] w-[18px] text-[#0f172a]" />
                      </div>
                      <div className="flex flex-col items-start w-full">
                        <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] leading-[1.6] text-[#0f172a] whitespace-pre">{t('analytics.customerSatisfactionScore', { defaultValue: 'Customer  Satisfaction Score' })}</p>
                        <div className="flex items-start justify-between w-full">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-[#64748b]">{t('analytics.currentMonth', { defaultValue: 'Current Month' })}</p>
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-[#64748b]">{t('analytics.lastMonth', { defaultValue: 'Last month' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <p className="font-['IBM_Plex_Sans'] font-semibold text-[24px] leading-[1.3] text-[#0f172a]">{metrics?.csatScore?.toFixed(2) ?? '—'}%</p>
                        <div className="border border-[#f1f5f9] flex h-[22px] items-center justify-center px-2 py-[2px] rounded-md">
                          <p className={`font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] tracking-[0.0288px] whitespace-nowrap ${metrics?.trends?.csat?.direction === 'up' ? 'text-[#059669]' : 'text-[#e11d48]'}`}>
                            {metrics?.trends?.csat ? `${metrics.trends.csat.direction === 'up' ? '+' : '-'}${metrics.trends.csat.value}%` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Promoters */}
                <div className="bg-white border border-[#f1f5f9] flex flex-1 flex-col items-start py-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] h-[191px]">
                  <div className="flex flex-col gap-3 items-start px-6 w-full">
                    <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-lg">
                      <Activity className="h-[18px] w-[18px] text-[#0f172a]" />
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] leading-[1.6] text-[#0f172a] whitespace-nowrap">{t('analytics.metrics.promoters', { defaultValue: 'Promoters' })}</p>
                    </div>
                    <div className="flex items-center w-full">
                      <p className="font-['IBM_Plex_Sans'] font-semibold text-[24px] leading-[1.3] text-[#0f172a]">{metrics?.promotersPercent != null ? metrics.promotersPercent.toFixed(2) : '—'}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts section — captured by PDF export */}
              <div id="analytics-charts-section">

              {/* Bottom row: Left column (stacked 2 cards) + Right (OverallNpsCard) */}
              <div className="flex gap-4 items-start">

                {/* Left column */}
                <div className="flex flex-col gap-4 w-[363px] shrink-0">

                  {/* Customer Satisfaction Score mini card */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-col rounded-xl overflow-hidden" style={{ height: 105 }}>
                    <div className="flex flex-1 flex-col gap-0 py-4 w-full">
                      <div className="flex flex-col items-start justify-center px-6">
                        <p className="font-['IBM_Plex_Sans'] font-semibold text-[20px] leading-[1.4] text-[#0f172a] whitespace-nowrap">{t('analytics.customerSatisfactionScore', { defaultValue: 'Customer Satisfaction Score' })}</p>
                      </div>
                      <div className="flex items-center justify-center py-2 w-full">
                        <div className="flex flex-wrap gap-2 items-center justify-center">
                          <div className="flex items-center gap-1">
                            <div className="rounded-[2px] shrink-0 size-2 bg-[#0d9488]" />
                            <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px] whitespace-nowrap">Positive {(metrics?.satisfactionDistribution?.verySatisfied ?? 0).toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="rounded-[2px] shrink-0 size-2 bg-[#e11d48]" />
                            <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px] whitespace-nowrap">Neutral {(metrics?.satisfactionDistribution?.neutral ?? 0).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Effort Score (CES) card */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-col rounded-xl overflow-hidden" style={{ height: 220 }}>
                    <div className="flex flex-1 flex-col gap-4 py-6 w-full">
                      <div className="flex flex-col items-start justify-center px-6">
                        <p className="font-['IBM_Plex_Sans'] font-semibold text-[20px] leading-[1.4] text-[#0f172a] whitespace-nowrap">{t('analytics.customerEffortScore', { defaultValue: 'Customer Effort Score(CES)' })}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center px-6 w-full gap-2">
                        {/* Half-donut gauge — arc sweeps 0–180° proportional to cesScore (0–100) */}
                        {(() => {
                          const ces = metrics?.cesScore ?? 0;
                          // Convert 0-100 % to sweep angle 0-180°
                          const angle = (ces / 100) * 180;
                          const rad = (angle - 180) * (Math.PI / 180);
                          const cx = 76, cy = 76, r = 66;
                          const ex = cx + r * Math.cos(rad);
                          const ey = cy + r * Math.sin(rad);
                          const large = angle > 180 ? 1 : 0;
                          const arcPath = ces === 0
                            ? ''
                            : `M 10 76 A 66 66 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
                          const color = ces < 40 ? '#0d9488' : ces < 70 ? '#f59e0b' : '#e11d48';
                          return (
                            <div className="relative flex items-end justify-center" style={{ width: 152, height: 80 }}>
                              <svg width="152" height="80" viewBox="0 0 152 80">
                                <path d="M 10 76 A 66 66 0 0 1 142 76" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
                                {arcPath && <path d={arcPath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />}
                              </svg>
                              <div className="absolute flex flex-col items-center" style={{ bottom: 2 }}>
                                <p className="font-['IBM_Plex_Sans'] font-semibold text-[22px] leading-[1.2] text-[#1e293b]">{ces > 0 ? `${Math.round(ces)}%` : '—'}</p>
                                <p className="font-['IBM_Plex_Sans'] text-[12px] leading-[1.4] text-[#0f172a]">Effort Score</p>
                              </div>
                            </div>
                          );
                        })()}
                        {/* Legends */}
                        <div className="flex flex-wrap gap-2 items-center justify-center w-full">
                          <div className="flex items-center gap-1">
                            <div className="rounded-[2px] shrink-0 size-2 bg-[#0d9488]" />
                            <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px]">Low effort</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="rounded-[2px] shrink-0 size-2 bg-[#64748b]" />
                            <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px]">Lower is Better</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="rounded-[2px] shrink-0 size-2 bg-[#e11d48]" />
                            <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px]">High effort</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Overall NPS */}
                <div className="flex-1 min-w-0 self-stretch">
                  <OverallNpsCard />
                </div>
              </div>
              </div>{/* end analytics-charts-section */}

            </div>
          </div>
      </div>
    </div>
  );
};
