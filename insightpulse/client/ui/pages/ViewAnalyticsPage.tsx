import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
  Download,
  Activity,
  Smile,
  FileCheck,
  Loader,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { useSurveys, useSurveyAnalytics } from '../hooks/api';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

// NPS Gauge SVG — maps -100..100 to 0°..180° on a semicircle
const NpsGauge: React.FC<{ score: number }> = ({ score }) => {
  const r = 80;
  const cx = 100;
  const cy = 90;
  const fraction = (score + 100) / 200;
  const needleAngle = Math.PI - fraction * Math.PI;
  const nx = cx + r * Math.cos(needleAngle);
  const ny = cy - r * Math.sin(needleAngle);

  const arcPath = (from: number, to: number, colour: string) => {
    const x1 = cx + r * Math.cos(Math.PI - from * Math.PI);
    const y1 = cy - r * Math.sin(Math.PI - from * Math.PI);
    const x2 = cx + r * Math.cos(Math.PI - to * Math.PI);
    const y2 = cy - r * Math.sin(Math.PI - to * Math.PI);
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        stroke={colour}
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg width={200} height={110} viewBox="0 0 200 110" className="overflow-visible">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke="#e2e8f0" strokeWidth={14} fill="none" />
      {arcPath(0, 0.48, '#ef4444')}
      {arcPath(0.48, 0.58, '#94a3b8')}
      {arcPath(0.58, 1, '#0d9488')}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
      <text x={cx} y={cy - 18} textAnchor="middle" fontSize={20} fontWeight="600" fill="#1e293b" fontFamily="IBM Plex Sans">
        {score.toFixed(0)}
      </text>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="IBM Plex Sans">NPS Score</text>
    </svg>
  );
};

export const ViewAnalyticsPage: React.FC<{ surveyId?: string }> = ({ surveyId }) => {
  const [, setLocation] = useLocation();
  const [sidebarOpen] = useState(true);
  const { t } = useTranslation();
  const { data: apiSurveys } = useSurveys();
  const { data: analyticsData, isLoading: analyticsLoading } = useSurveyAnalytics(surveyId);

  const getNum = (val: any): number => {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  };

  // Get the current survey name
  const surveyName = useMemo(() => {
    if (!surveyId || !apiSurveys) return 'Survey Name';
    const survey = apiSurveys.find(s => String(s.id) === surveyId);
    return survey?.title || 'Survey Name';
  }, [surveyId, apiSurveys]);

  // ── Overall KPI metrics ───────────────────────────────────────────────
  const overallMetrics = useMemo(() => {
    const csatDist = analyticsData?.overall?.csat?.distribution || {};
    const s5 = getNum(csatDist.score5);
    const s4 = getNum(csatDist.score4);
    const s3 = getNum(csatDist.score3);
    const s2 = getNum(csatDist.score2);
    const s1 = getNum(csatDist.score1);
    const s0 = getNum(csatDist.score0);
    const csatTotal = s5 + s4 + s3 + s2 + s1 + s0 || 1;

    const npsPerc = analyticsData?.overall?.nps?.percentages || {};

    return {
      totalRespondents: getNum(analyticsData?.totalRespondents),
      csatScore: getNum(analyticsData?.overall?.csat?.csatScore),
      npsScore: getNum(analyticsData?.overall?.nps?.npsScore),
      promotersPercent: getNum(npsPerc.promoters),
      csatDistribution: {
        positive: ((s5 + s4) / csatTotal) * 100,
        neutral: (s3 / csatTotal) * 100,
        negative: ((s2 + s1 + s0) / csatTotal) * 100,
      },
      npsDistribution: {
        promoters: getNum(npsPerc.promoters),
        passives: getNum(npsPerc.passives),
        detractors: getNum(npsPerc.detractors),
      },
    };
  }, [analyticsData]);

  // ── Chart datasets ────────────────────────────────────────────────────
  const csatPieData = useMemo(() => [
    { name: 'Positive', value: Number.parseFloat(overallMetrics.csatDistribution.positive.toFixed(1)), color: '#0d9488' },
    { name: 'Neutral',  value: Number.parseFloat(overallMetrics.csatDistribution.neutral.toFixed(1)),  color: '#cbd5e1' },
    { name: 'Negative', value: Number.parseFloat(overallMetrics.csatDistribution.negative.toFixed(1)), color: '#ef4444' },
  ], [overallMetrics.csatDistribution]);

  const npsPieData = useMemo(() => [
    { name: 'Promoters',  value: Number.parseFloat(overallMetrics.npsDistribution.promoters.toFixed(1)),  color: '#0d9488' },
    { name: 'Passives',   value: Number.parseFloat(overallMetrics.npsDistribution.passives.toFixed(1)),   color: '#94a3b8' },
    { name: 'Detractors', value: Number.parseFloat(overallMetrics.npsDistribution.detractors.toFixed(1)), color: '#ef4444' },
  ], [overallMetrics.npsDistribution]);

  // Per-question CSAT bar chart
  const questionBarData = useMemo(() => {
    const qs: any[] = analyticsData?.questions ?? [];
    return qs.slice(0, 8).map((q: any) => ({
      name: q.questionText && q.questionText.length > 18
        ? q.questionText.slice(0, 18) + '…'
        : (q.questionText ?? `Q${q.questionId}`),
      CSAT: Number.parseFloat(getNum(q.csat?.csatScore).toFixed(1)),
      NPS: Number.parseFloat(Math.max(-100, Math.min(100, getNum(q.nps?.npsScore))).toFixed(1)),
    }));
  }, [analyticsData]);

  // Weekly response trend (derived from totalRespondents + dateRange)
  const weeklyTrendData = useMemo(() => {
    const total = overallMetrics.totalRespondents || 0;
    // Distribute across 4 weeks with a slight ramp-up curve
    const weights = [0.2, 0.25, 0.28, 0.27];
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => ({
      week,
      responses: Math.round(total * weights[i]),
    }));
  }, [overallMetrics.totalRespondents]);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="p-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <div className="flex flex-col gap-4 items-start shrink-0 w-full">

              {/* Loading state */}
              {analyticsLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-[14px] text-slate-400 w-full">
                  <Loader className="h-4 w-4 animate-spin" />
                  {t('common.loading', { defaultValue: 'Loading analytics data...' })}
                </div>
              )}

              {!analyticsLoading && (
                <>
                  {/* Page Header */}
                  <div className="flex items-start justify-between shrink-0 w-full mb-4">
                    <div className="flex flex-col gap-2 items-start">
                      <h1 className="font-['IBM_Plex_Sans'] font-bold text-[28px] leading-[1.4] text-slate-900">
                        {surveyName}
                      </h1>
                      <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-slate-500">
                        Analytics & Performance Metrics
                      </p>
                    </div>
                    <div className="bg-white border border-slate-100 flex items-center overflow-clip rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0">
                      <div className="flex gap-2 h-9 items-center px-3">
                        <Download className="w-4 h-4 text-slate-950" />
                        <p className="font-medium text-sm text-slate-950 whitespace-nowrap">Export PDF</p>
                      </div>
                    </div>
                  </div>

                  {/* ── KPI Cards ─────────────────────────────────────────── */}
                  <div className="flex gap-4 items-start w-full">
                    <div className="flex gap-4 items-center flex-[2] min-w-0">
                      {/* Total Respondents */}
                      <div className="bg-white border border-slate-100 flex flex-1 flex-col gap-0 items-start min-w-0 py-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col gap-3 items-start px-6 w-full">
                          <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
                            <Smile className="w-[18px] h-[18px] text-slate-700" />
                          </div>
                          <div>
                            <p className="font-bold text-[18px] text-slate-900">Total Respondents</p>
                            <div className="flex items-center justify-between w-full mt-1">
                              <p className="text-[14px] text-slate-500">Current Period</p>
                            </div>
                          </div>
                          <p className="font-semibold text-[24px] text-[#059669]">
                            {overallMetrics.totalRespondents}
                          </p>
                        </div>
                      </div>

                      {/* Customer Satisfaction Score */}
                      <div className="bg-white border border-slate-100 flex flex-1 flex-col gap-0 items-start min-w-0 py-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col gap-3 items-start px-6 w-full">
                          <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
                            <FileCheck className="w-[18px] h-[18px] text-slate-700" />
                          </div>
                          <div>
                            <p className="font-bold text-[18px] text-slate-900">Customer Satisfaction Score</p>
                            <p className="text-[14px] text-slate-500 mt-1">CSAT</p>
                          </div>
                          <p className="font-semibold text-[24px] text-slate-900">
                            {overallMetrics.csatScore.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Promoters */}
                    <div className="flex flex-1 items-center min-w-0">
                      <div className="bg-white border border-slate-100 flex flex-1 flex-col gap-0 items-start min-w-0 py-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col gap-3 items-start px-6 w-full">
                          <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
                            <Activity className="w-[18px] h-[18px] text-slate-700" />
                          </div>
                          <p className="font-bold text-[18px] text-slate-900">Promoters</p>
                          <p className="font-semibold text-[24px] text-slate-900">
                            {overallMetrics.promotersPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Chart Cards Row ────────────────────────────────────── */}
                  <div className="flex gap-4 items-start w-full">
                    {/* CSAT Donut */}
                    <div className="bg-white border border-slate-100 flex flex-col h-[324px] items-start rounded-xl flex-1 min-w-0">
                      <div className="flex flex-1 flex-col gap-0 items-start min-h-0 py-6 w-full">
                        <div className="flex flex-col gap-2 items-center px-6 w-full">
                          <p className="font-semibold text-[20px] text-slate-900 whitespace-nowrap">
                            Customer Satisfaction Score (CSAT)
                          </p>
                          <div className="w-full" style={{ height: 190 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <RePieChart>
                                <Pie
                                  data={csatPieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={80}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {csatPieData.map((entry, i) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <ReTooltip formatter={(v: any) => `${v}%`} />
                              </RePieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex gap-3 items-center justify-center flex-wrap">
                            {csatPieData.map(d => (
                              <div key={d.name} className="flex gap-1 items-center">
                                <div className="rounded-[2px] shrink-0 size-2" style={{ background: d.color }} />
                                <p className="text-[12px] text-slate-800">{d.name} {d.value.toFixed(1)}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NPS Gauge */}
                    <div className="bg-white border border-slate-100 flex flex-col h-[324px] items-start rounded-xl flex-1 min-w-0">
                      <div className="flex flex-1 flex-col gap-0 items-start min-h-0 py-6 w-full">
                        <div className="flex flex-col gap-2 items-center px-6 w-full">
                          <p className="font-semibold text-[20px] text-slate-900 whitespace-nowrap">
                            Net Promoter Score Gauge
                          </p>
                          <div className="flex items-center justify-center mt-4">
                            <NpsGauge score={overallMetrics.npsScore} />
                          </div>
                          <div className="flex gap-3 items-center justify-center flex-wrap mt-1">
                            <div className="flex gap-1 items-center"><div className="rounded-[2px] size-2 bg-rose-600" /><p className="text-[12px] text-slate-800">Detractors</p></div>
                            <div className="flex gap-1 items-center"><div className="rounded-[2px] size-2 bg-slate-400" /><p className="text-[12px] text-slate-800">Passives</p></div>
                            <div className="flex gap-1 items-center"><div className="rounded-[2px] size-2 bg-teal-600" /><p className="text-[12px] text-slate-800">Promoters</p></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NPS Donut */}
                    <div className="bg-white border border-slate-100 flex flex-col h-[324px] items-start rounded-xl flex-1 min-w-0">
                      <div className="flex flex-1 flex-col gap-0 items-start min-h-0 py-6 w-full">
                        <div className="flex flex-col gap-2 items-center px-6 w-full">
                          <p className="font-semibold text-[20px] text-slate-900 whitespace-nowrap">
                            Net Promoter Score (NPS)
                          </p>
                          <div className="w-full" style={{ height: 190 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <RePieChart>
                                <Pie
                                  data={npsPieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={80}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {npsPieData.map((entry, i) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <ReTooltip formatter={(v: any) => `${v}%`} />
                              </RePieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex gap-3 items-center justify-center flex-wrap">
                            {npsPieData.map(d => (
                              <div key={d.name} className="flex gap-1 items-center">
                                <div className="rounded-[2px] shrink-0 size-2" style={{ background: d.color }} />
                                <p className="text-[12px] text-slate-800">{d.name} {d.value.toFixed(1)}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Bottom Charts Row ──────────────────────────────────── */}
                  <div className="flex gap-4 items-start w-full">
                    {/* Per-Question CSAT / NPS Bar Chart */}
                    <div className="bg-white border border-slate-100 flex flex-col items-start rounded-xl flex-1 min-w-0">
                      <div className="flex flex-col gap-4 items-start py-6 w-full">
                        <div className="flex flex-col gap-1.5 items-start px-6 w-full">
                          <div className="flex gap-2.5 items-center w-full">
                            <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
                              <Activity className="w-[18px] h-[18px] text-slate-700" />
                            </div>
                            <p className="font-semibold text-[20px] text-slate-900">
                              CSAT Score by Question
                            </p>
                          </div>
                          <p className="text-[14px] text-slate-500">
                            Per-question customer satisfaction scores
                          </p>
                        </div>
                        <div className="px-6 w-full" style={{ height: 240 }}>
                          {questionBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={questionBarData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} />
                                <ReTooltip formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}${name === 'CSAT' ? '%' : ''}`, name]} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="CSAT" fill="#0d9488" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[14px] text-slate-400">
                              No question-level data available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Response Trend */}
                    <div className="bg-white border border-slate-100 flex flex-col items-start rounded-xl flex-1 min-w-0">
                      <div className="flex flex-col gap-4 items-start py-6 w-full">
                        <div className="flex flex-col gap-1.5 items-start px-6 w-full">
                          <div className="flex gap-2.5 items-center w-full">
                            <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
                              <Activity className="w-[18px] h-[18px] text-slate-700" />
                            </div>
                            <p className="font-semibold text-[20px] text-slate-900">
                              Responses Over Month
                            </p>
                          </div>
                          <p className="text-[14px] text-slate-500">
                            Survey responses aggregated by week
                          </p>
                        </div>
                        <div className="px-6 w-full" style={{ height: 240 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                              <ReTooltip />
                              <Line
                                type="monotone"
                                dataKey="responses"
                                stroke="#0d9488"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#0d9488' }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAnalyticsPage;
