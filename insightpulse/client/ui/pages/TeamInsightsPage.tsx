import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  EllipsisVertical,
  FileCheck,
  NotebookTabs,
  Smile,
  TrendingDown,
  Users,
  Vibrate,
  Home,
  FilePenLine,
  GitGraph,
  Navigation,
  PieChart,
  Settings,
} from 'lucide-react';

const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';

// ─── KPI Card ──────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: {
    direction: 'up' | 'down' | 'none';
    text: string;
    suffix?: string;
    color: 'emerald' | 'rose' | 'slate';
  };
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, trend }) => (
  <div className="bg-white border border-slate-200 flex flex-1 flex-col gap-3 items-start min-w-0 py-3 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
    <div className="flex flex-col gap-3 items-start px-6 w-full">
      <div className="flex gap-3 items-start w-full">
        <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
          {icon}
        </div>
        <div className="flex flex-col items-start">
          <p className="font-medium text-[14px] leading-[1.5] text-slate-600 whitespace-nowrap">
            {label}
          </p>
          <p className="font-semibold text-[30px] leading-[1.25] text-slate-900 tracking-[0.09px] whitespace-nowrap">
            {value}
          </p>
        </div>
      </div>
      {trend && (
        <div className="flex gap-1 h-[22px] items-center px-2 w-full">
          {trend.direction === 'up' && (
            <ArrowUp
              className={`h-3.5 w-3.5 shrink-0 ${
                trend.color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            />
          )}
          {trend.direction === 'down' && (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          )}
          <p
            className={`font-medium text-[12px] leading-[1.4] tracking-[0.03px] whitespace-nowrap ${
              trend.color === 'emerald'
                ? 'text-emerald-600'
                : trend.color === 'rose'
                ? 'text-rose-600'
                : 'text-slate-600'
            }`}
          >
            {trend.text}
          </p>
          {trend.suffix && (
            <p className="font-medium text-[12px] leading-[1.4] text-slate-600 tracking-[0.03px] whitespace-nowrap">
              {trend.suffix}
            </p>
          )}
        </div>
      )}
    </div>
  </div>
);

// ─── Engagement Trends Area Chart ──────────────────────────────────────────

const engagementData = [
  { month: 'Jan', engaged: 68, disengaged: 23 },
  { month: 'Feb', engaged: 75, disengaged: 24 },
  { month: 'Mar', engaged: 85, disengaged: 29 },
  { month: 'Apr', engaged: 86, disengaged: 29 },
  { month: 'May', engaged: 82, disengaged: 27 },
  { month: 'Jun', engaged: 77, disengaged: 26 },
  { month: 'Jul', engaged: 71, disengaged: 26 },
  { month: 'Aug', engaged: 72, disengaged: 27 },
  { month: 'Sep', engaged: 73, disengaged: 28 },
  { month: 'Oct', engaged: 74, disengaged: 28 },
  { month: 'Nov', engaged: 74, disengaged: 27 },
  { month: 'Dec', engaged: 73, disengaged: 27 },
];

const EngagementTrendsCard: React.FC = () => {
  const { t } = useTranslation();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const colWidth = 370 / 12;

  const topAreaPath =
    'M0,60 C30,45 60,30 90,28 C120,26 150,35 180,48 C210,60 240,55 270,52 C300,49 330,48 370,50 L370,188 L0,188 Z';
  const topLinePath =
    'M0,60 C30,45 60,30 90,28 C120,26 150,35 180,48 C210,60 240,55 270,52 C300,49 330,48 370,50';
  const bottomAreaPath =
    'M0,145 C30,140 60,130 90,133 C120,136 150,138 180,140 C210,142 240,138 270,136 C300,134 330,136 370,138 L370,188 L0,188 Z';
  const bottomLinePath =
    'M0,145 C30,140 60,130 90,133 C120,136 150,138 180,140 C210,142 240,138 270,136 C300,134 330,136 370,138';

  return (
    <div className="bg-white border border-slate-200 flex flex-1 flex-col min-w-0 rounded-xl">
      <div className="flex flex-col gap-4 py-5 w-full h-full">

        {/* Title + legend */}
        <div className="flex items-center justify-between px-6 w-full">
          <p className="font-semibold text-[18px] leading-[1.4] text-slate-900">
            {t('leadership.engagementTrends', { defaultValue: 'Engagement Trends' })}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-[2px] rounded-full bg-[#0891b2]" />
              <span className="text-[12px] text-slate-500 font-medium">Engaged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-[2px] rounded-full bg-[#f59e0b]" />
              <span className="text-[12px] text-slate-500 font-medium">Disengaged</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative px-6 w-full flex-1 flex flex-col">

          {/* Tooltip */}
          {hoveredIdx !== null && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: `calc(${((hoveredIdx + 0.5) / 12) * 100}% + 24px)`,
                top: '4px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-slate-900 text-white rounded-lg px-2.5 py-2 shadow-lg whitespace-nowrap">
                <p className="text-[11px] text-slate-400 font-medium mb-1">{engagementData[hoveredIdx].month}</p>
                <p className="text-[12px] font-semibold text-cyan-400">&#x25CF; Engaged: {engagementData[hoveredIdx].engaged}%</p>
                <p className="text-[12px] font-semibold text-amber-400">&#x25CF; Disengaged: {engagementData[hoveredIdx].disengaged}%</p>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
            </div>
          )}

          <div className="flex flex-col gap-1.5 w-full flex-1">
            <div className="flex-1 relative w-full min-h-[140px]">
              <svg
                viewBox="0 0 370 188"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <linearGradient id="teamTopGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="teamBotGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fde68a" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#fde68a" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {[0, 47, 94, 141, 188].map((y) => (
                  <line key={y} x1="0" y1={y} x2="370" y2={y} stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
                ))}
                <path d={topAreaPath} fill="url(#teamTopGrad)" />
                <path d={topLinePath} fill="none" stroke="#0891b2" strokeWidth="1.5" />
                <path d={bottomAreaPath} fill="url(#teamBotGrad)" />
                <path d={bottomLinePath} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                {/* Hover guide line */}
                {hoveredIdx !== null && (
                  <line
                    x1={(hoveredIdx + 0.5) * colWidth}
                    y1={0}
                    x2={(hoveredIdx + 0.5) * colWidth}
                    y2={188}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                )}
                {/* Invisible hover zones */}
                {engagementData.map((_, i) => (
                  <rect
                    key={i}
                    x={i * colWidth}
                    y={0}
                    width={colWidth}
                    height={188}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                ))}
              </svg>
            </div>
            {/* X-axis */}
            <div className="flex items-center justify-between w-full">
              {engagementData.map(({ month }) => (
                <p key={month} className="font-medium text-[12px] leading-[1.4] text-slate-500 tracking-[0.03px] whitespace-nowrap">
                  {month}
                </p>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Risk Indicator Card ────────────────────────────────────────────────────

const RiskIndicatorCard: React.FC = () => {
  const { t } = useTranslation();
  const risks = [
    {
      icon: <NotebookTabs className="text-slate-600" style={{ width: 18, height: 18 }} />,
      title: t('leadership.riskHighAbsenteeism', { defaultValue: 'High Absenteeism' }),
      description: t('leadership.riskAbsenteeismDesc', { defaultValue: '3 members had >3 unplanned absences this month' }),
    },
    {
      icon: <TrendingDown className="text-slate-600" style={{ width: 18, height: 18 }} />,
      title: t('leadership.riskDecliningProductivity', { defaultValue: 'Declining Productivity' }),
      description: t('leadership.riskProductivityDesc', { defaultValue: 'Output dropped >15% for 2 team members this sprint' }),
    },
    {
      icon: <Vibrate className="text-slate-600" style={{ width: 18, height: 18 }} />,
      title: t('leadership.riskLowFeedback', { defaultValue: 'Low Survey Participation' }),
      description: t('leadership.riskLowFeedbackDesc', { defaultValue: 'Finance dept. at 38% response rate, below 60% threshold' }),
    },
  ];

  return (
    <div className="bg-white border border-slate-200 flex flex-col gap-3 items-start justify-center p-6 rounded-xl shrink-0 w-[363px]">
      <div className="flex flex-col items-start justify-center w-full">
        <p className="font-semibold text-[20px] leading-[1.4] text-slate-900 w-full">
          {t('leadership.riskIndicator', { defaultValue: 'Risk Indicator' })}
        </p>
      </div>
      {risks.map((risk, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 flex gap-6 items-start p-6 rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full"
        >
          <div className="bg-slate-100 flex items-center p-2.5 rounded-lg shrink-0">
            {risk.icon}
          </div>
          <div className="flex flex-col items-start text-[14px] leading-[1.5]">
            <p className="font-bold text-slate-900 whitespace-nowrap">
              {risk.title}
            </p>
            <p className="font-normal text-slate-500">
              {risk.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Heatmap ─────────────────────────────────────────────────────────────────

type HeatCell = 'low' | 'mid' | 'high';

const heatmapData: { label: string; cells: HeatCell[] }[] = [
  { label: 'HR',         cells: ['mid',  'high', 'high', 'mid',  'low',  'low',  'mid' ] },
  { label: 'Finance',    cells: ['high', 'mid',  'mid',  'high', 'mid',  'low',  'low' ] },
  { label: 'IT',         cells: ['low',  'low',  'mid',  'high', 'high', 'mid',  'low' ] },
  { label: 'Governance', cells: ['mid',  'high', 'low',  'mid',  'mid',  'high', 'low' ] },
  { label: 'Strategy',   cells: ['low',  'mid',  'high', 'mid',  'low',  'mid',  'high'] },
];

const cellBg: Record<HeatCell, string> = {
  low:  '#d1e0ff',
  mid:  '#334155',
  high: '#0891b2',
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HeatmapCard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-slate-200 flex flex-col gap-5 items-end justify-center p-6 rounded-xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-2 items-start">
          <p className="font-medium text-[18px] leading-[1.2] text-neutral-500">
            {t('leadership.weeklyCheckins', { defaultValue: 'Weekly Check-ins' })}
          </p>
          <div className="flex gap-3 items-center">
            <p className="font-semibold text-[48px] leading-[1.2] text-slate-950 whitespace-nowrap">
              247
            </p>
            <div className="bg-[#d3f8df] flex gap-1.5 items-center justify-center px-2 py-1.5 rounded-lg">
              <p className="font-medium text-[18px] leading-[1.2] text-[#087443] whitespace-nowrap">
                4.1%
              </p>
              <ArrowUp className="h-4 w-4 text-[#087443]" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 items-end justify-center">
          <div className="border border-neutral-300 flex items-center justify-center p-2 rounded-xl w-10">
            <EllipsisVertical className="h-6 w-6 text-slate-600" />
          </div>
          <div className="flex gap-2 items-center">
            {([
              { label: '< 40%',   bg: '#d1e0ff' },
              { label: '40–75%',  bg: '#1e293b' },
              { label: '> 75%',   bg: '#0891b2' },
            ] as const).map(({ label, bg }) => (
              <div key={label} className="flex flex-col gap-1 items-center">
                <p className="text-[14px] leading-[1.2] text-neutral-500 text-center">
                  {label}
                </p>
                <div className="h-3 rounded-[4px] w-20" style={{ backgroundColor: bg }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-2 items-start w-full">
        {heatmapData.map((row) => (
          <div key={row.label} className="flex gap-10 items-center w-full">
            <p className="font-medium text-[16px] leading-[1.2] text-neutral-500 w-40 shrink-0">
              {row.label}
            </p>
            <div className="flex flex-1 gap-2">
              {row.cells.map((cell, ci) => (
                <div key={ci} className="flex-1 h-12 min-w-0 rounded-[4px]" style={{ backgroundColor: cellBg[cell] }} />
              ))}
            </div>
          </div>
        ))}
        {/* Day labels */}
        <div className="flex items-center w-full">
          <div className="w-40 shrink-0 mr-10" />
          <div className="flex flex-1">
            {days.map((d) => (
              <div key={d} className="flex flex-1 items-center justify-center py-2.5">
                <p className="font-medium text-[16px] leading-[1.2] text-neutral-500 whitespace-nowrap">
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Domain Table ─────────────────────────────────────────────────────────────

const domainRows = [
  { department: 'Management',    score: 62, riskLevel: 'Low',    example: '"Clear direction from leadership"' },
  { department: 'Workload',      score: 41, riskLevel: 'Medium', example: '"Too much on my plate lately"' },
  { department: 'Career Growth', score: 28, riskLevel: 'High',   example: '"No visibility into growth paths"' },
  { department: 'Collaboration', score: 74, riskLevel: 'Low',    example: '"Team atmosphere is really positive"' },
  { department: 'Recognition',   score: 33, riskLevel: 'High',   example: '"Efforts often go unnoticed"' },
];

const riskColor: Record<string, string> = {
  Low: 'text-emerald-600',
  Medium: 'text-amber-600',
  High: 'text-rose-600',
};

const DomainTable: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 items-start w-full">
      <div className="flex items-center justify-between w-full">
        <p className="font-semibold text-[20px] leading-[1.4] text-slate-900 whitespace-nowrap">
          {t('leadership.domainNeedingAttention', { defaultValue: 'Domain Needing attention' })}
        </p>
        <div className="bg-slate-900 border border-slate-950 flex items-center justify-center h-8 px-2.5 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
          <p className="font-medium text-[14px] leading-[1.5] text-slate-50 whitespace-nowrap">
            {t('common.viewAll', { defaultValue: 'View All' })}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 flex flex-col items-start overflow-hidden rounded-lg w-full">
        {/* Header row */}
        <div className="bg-slate-50 border-b border-slate-200 flex items-start w-full">
          <div className="flex flex-1 flex-col h-10 items-start justify-center min-w-0 px-2">
            <p className="font-medium text-[14px] leading-[1.5] text-slate-900 truncate w-full">{t('leadership.domain', { defaultValue: 'Domain' })}</p>
          </div>
          <div className="flex flex-col h-10 items-start justify-center px-2 w-24">
            <p className="font-medium text-[14px] leading-[1.5] text-slate-900 truncate w-full">{t('dashboard.kpis.nps', { defaultValue: 'Score' })}</p>
          </div>
          <div className="flex flex-col h-10 items-start justify-center px-2 w-28">
            <p className="font-medium text-[14px] leading-[1.5] text-slate-900 truncate w-full">{t('leadership.riskLevel', { defaultValue: 'Risk Level' })}</p>
          </div>
          <div className="flex flex-1 flex-col h-10 items-start justify-center min-w-0 px-2">
            <p className="font-medium text-[14px] leading-[1.5] text-slate-900 truncate w-full">{t('common.example', { defaultValue: 'Example' })}</p>
          </div>
          <div className="h-10 w-12 shrink-0" />
        </div>

        {/* Data rows */}
        {domainRows.map((row, i) => (
          <div
            key={i}
            className={`flex items-start w-full ${i < domainRows.length - 1 ? 'border-b border-slate-200' : ''}`}
          >
            <div className="flex flex-1 flex-col h-[53px] items-start justify-center min-w-0 p-2">
              <p className="font-medium text-[14px] leading-[1.5] text-slate-900 truncate w-full">
                {row.department}
              </p>
            </div>
            <div className="flex flex-col h-[53px] items-start justify-center p-2 w-24">
              <p className="text-[14px] leading-[1.5] text-slate-900">{row.score}</p>
            </div>
            <div className="flex flex-col h-[53px] items-start justify-center p-2 w-28">
              <p className={`text-[14px] leading-[1.5] font-medium ${riskColor[row.riskLevel] ?? 'text-slate-900'}`}>{row.riskLevel}</p>
            </div>
            <div className="flex flex-1 flex-col h-[53px] items-start justify-center min-w-0 p-2">
              <p className="text-[14px] leading-[1.5] text-slate-900 truncate w-full">{row.example}</p>
            </div>
            <div className="flex h-[53px] items-center justify-center w-12 p-2 shrink-0">
              <EllipsisVertical className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS = [
  { label: 'Last 1 month',  value: '1m' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'Last 12 months', value: '12m' },
];

export const TeamInsightsPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dateRange, setDateRange] = useState('1m');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label ?? 'Last 1 month';

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          breadcrumbs={[{ label: t('nav.leadership', { defaultValue: 'Team Insights' }) }]}
          showMenuToggle
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">

            {/* Page title row */}
            <div className="flex items-center justify-between w-full">
              <p className="font-semibold text-[24px] leading-[1.3] text-slate-900 whitespace-nowrap">
                {t('leadership.teamPerformance', { defaultValue: 'Team Performance Analysis' })}
              </p>
              <div className="relative shrink-0" ref={dateDropdownRef}>
                <button
                  type="button"
                  onClick={() => setDateDropdownOpen(o => !o)}
                  className="bg-white border border-slate-100 flex items-center gap-2.5 h-9 px-3 py-1 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                >
                  <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium text-slate-950 whitespace-nowrap">
                    {selectedLabel}
                  </span>
                  <Calendar className="h-4 w-4 text-slate-600 shrink-0" />
                  <ChevronDown className="h-4 w-4 text-slate-600 shrink-0" />
                </button>
                {dateDropdownOpen && (
                  <div className="absolute z-50 top-full mt-1 right-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                    {DATE_RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setDateRange(opt.value); setDateDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[13px] font-['IBM_Plex_Sans'] hover:bg-slate-50 whitespace-nowrap
                          ${opt.value === dateRange ? 'text-[#0d9488] font-medium' : 'text-slate-900'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="flex gap-4 items-start w-full">
              <KpiCard
                icon={<Smile className="text-slate-600" style={{ width: 18, height: 18 }} />}
                label={t('leadership.avgEngagement', { defaultValue: 'Avg Engagement' })}
                value="84%"
                trend={{ direction: 'up', text: '+12.5%', suffix: t('common.vsLastMonth', { defaultValue: 'vs last month' }), color: 'emerald' }}
              />
              <KpiCard
                icon={<Users className="text-slate-600" style={{ width: 18, height: 18 }} />}
                label={t('leadership.metrics.teamSize', { defaultValue: 'Team Size' })}
                value="12"
                trend={{ direction: 'none', text: t('leadership.activeUsers', { defaultValue: 'Active users' }), color: 'slate' }}
              />
              <KpiCard
                icon={
                  <svg viewBox="0 0 18 18" width="18" height="18" fill="none">
                    <path
                      d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9C1.5 13.14 4.86 16.5 9 16.5C13.14 16.5 16.5 13.14 16.5 9C16.5 4.86 13.14 1.5 9 1.5ZM9 13.5C8.58 13.5 8.25 13.17 8.25 12.75C8.25 12.33 8.58 12 9 12C9.42 12 9.75 12.33 9.75 12.75C9.75 13.17 9.42 13.5 9 13.5ZM9.75 10.5H8.25V4.5H9.75V10.5Z"
                      fill="#475569"
                    />
                  </svg>
                }
                label={t('leadership.atRisk', { defaultValue: 'At Risk' })}
                value="2"
                trend={{ direction: 'down', text: '+1', suffix: t('leadership.sinceReview', { defaultValue: 'since review' }), color: 'rose' }}
              />
              <KpiCard
                icon={<FileCheck className="text-slate-600" style={{ width: 18, height: 18 }} />}
                label={t('leadership.metrics.responseRate', { defaultValue: 'Response Rate' })}
                value="92%"
                trend={{ direction: 'up', text: '+5.5%', suffix: t('leadership.completion', { defaultValue: 'completion' }), color: 'emerald' }}
              />
            </div>

            {/* Engagement Trends + Risk Indicator */}
            <div className="flex gap-2.5 items-stretch w-full">
              <EngagementTrendsCard />
              <RiskIndicatorCard />
            </div>

            {/* Heatmap */}
            <HeatmapCard />

            {/* Domain Table */}
            <DomainTable />

          </div>
        </div>
      </div>
    </div>
  );
};
