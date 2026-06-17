import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Download, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { setGlobalSurveyId } from '../hooks/surveyFilter';

// ─── Types ────────────────────────────────────────────────────────────────────


export interface AnalyticsFiltersProps {
  onSurveyChange?: (surveyId: string | undefined) => void;
  onDateChange?: (start: Date, end: Date) => void;
  activeTab?: string;
  // Accept the API response shape loosely to avoid duplicate-interface conflicts across modules
  metrics?: Record<string, any>;
}

// ─── Small components ─────────────────────────────────────────────────────────

function Dropdown({
  label,
  options,
  value,
  onChange,
  width = 'w-auto',
}: {
  label?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${width}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 px-3 bg-white border border-[#f1f5f9] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#020617] whitespace-nowrap"
      >
        {label && <span className="text-[#64748b] text-[13px]">{label}:</span>}
        <span className="max-w-[160px] truncate">{value}</span>
        <ChevronDown className="h-4 w-4 text-[#64748b] shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[13px] font-['IBM_Plex_Sans'] hover:bg-slate-50 whitespace-nowrap
                ${opt === value ? 'text-[#0d9488] font-medium' : 'text-[#0f172a]'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getMonthOptions() {
  const options: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    options.push({
      label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      start,
      end,
    });
  }
  return options;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const DEFAULT_START = new Date('2026-01-01');
const DEFAULT_END = new Date('2026-02-01');

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsFilters({ onSurveyChange, onDateChange, activeTab = 'Overview', metrics }: AnalyticsFiltersProps = {}) {
  const [department, setDepartment] = useState('All Departments');
  const [dateOpen, setDateOpen] = useState(false);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [survey, setSurvey] = useState('All Surveys');
  const [isExporting, setIsExporting] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const monthOptions = getMonthOptions();

  const { data: surveysData } = useQuery<any[]>({
    queryKey: ['/api/surveys'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
  });

  const surveyOptions = [
    'All Surveys',
    ...((surveysData ?? []).map((s: any) => s.title || s.name || 'Untitled')),
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dateLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const TEAL: [number, number, number] = [13, 148, 136];
      const HEAD_FILL: [number, number, number] = [241, 245, 249];
      const HEAD_TEXT: [number, number, number] = [15, 23, 42];
      const BODY_TEXT: [number, number, number] = [51, 65, 85];

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const usableW = pageW - margin * 2;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(...TEAL);
      pdf.text(`Analytics Report — ${activeTab}`, margin, margin + 6);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Period: ${dateLabel}`, margin, margin + 26);

      let cursorY = margin + 44;

      const m: any = metrics ?? {};
      const fmt = (v: any, d = 1) =>
        v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d).replace(/\.0$/, '');

      const section = (title: string) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, margin, cursorY);
        cursorY += 8;
      };

      const drawTable = (head: string[], body: (string | number)[][]) => {
        autoTable(pdf, {
          head: [head],
          body,
          startY: cursorY,
          margin: { left: margin, right: margin },
          tableWidth: usableW,
          styles: { fontSize: 10, cellPadding: 6, textColor: BODY_TEXT },
          headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 18;
      };

      section('Key Metrics Summary');
      drawTable(['Metric', 'Value'], [
        ['EVI Score', fmt(m.eviScore)],
        ['NPS Score', m.npsScore == null ? '—' : Math.round(m.npsScore)],
        ['CSAT Score', fmt(m.csatScore)],
        ['CES Score', fmt(m.cesScore)],
        ['Response Rate', m.responseRate == null ? '—' : `${Math.round(m.responseRate)}%`],
        ['Active Surveys', m.activeSurveys ?? 0],
      ]);

      const themes = Array.isArray(m.themes) ? m.themes : [];
      if (themes.length) {
        section('Themes');
        drawTable(
          ['Theme', 'Mentions', 'Sentiment'],
          themes.map((t: any) => [t.theme ?? '—', t.mention ?? 0, t.sentiment ?? '—']),
        );
      }

      const insights = m.insights?.topInsights ?? [];
      if (insights.length) {
        section('Top Insights');
        drawTable(
          ['Insight', 'Count'],
          insights.map((i: any) => [i.text ?? '—', i.count ?? 0]),
        );
      }

      const recs = m.insights?.topRecommendations ?? [];
      if (recs.length) {
        section('Top Recommendations');
        drawTable(
          ['Recommendation', 'Count'],
          recs.map((r: any) => [r.text ?? '—', r.count ?? 0]),
        );
      }

      const urg = m.insights?.urgencyBreakdown;
      if (urg) {
        section('Urgency Breakdown');
        drawTable(['High', 'Medium', 'Low'], [[urg.high ?? 0, urg.medium ?? 0, urg.low ?? 0]]);
      }

      // Page 2+ — charts (each card rendered individually to avoid mid-element cuts)
      const chartsEl = document.getElementById('analytics-charts-section') as HTMLElement | null;
      if (chartsEl) {
        // Wait one frame so any responsive charts settle
        await new Promise(r => requestAnimationFrame(() => r(null)));

        const cards = Array.from(chartsEl.querySelectorAll<HTMLElement>(':scope > *'));

        pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(...TEAL);
        pdf.text(`${activeTab} — Charts`, margin, margin + 6);
        let destY = margin + 24;

        for (const card of cards) {
          if (!card.offsetWidth || !card.offsetHeight) continue;

          const canvas = await html2canvas(card, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: card.scrollWidth,
            windowHeight: card.scrollHeight,
            foreignObjectRendering: false,
            onclone: (doc) => {
              doc.querySelectorAll('[data-pdf-skip]').forEach(el => el.remove());
            },
          });

          const renderH = (canvas.height / canvas.width) * usableW;

          if (destY + renderH > pageH - margin) {
            pdf.addPage();
            destY = margin;
          }

          if (renderH <= pageH - margin * 2) {
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, destY, usableW, renderH);
            destY += renderH + 12;
          } else {
            // Card taller than a page — slice across pages
            let srcY = 0;
            const pxPerPage = ((pageH - margin * 2) / usableW) * canvas.width;
            while (srcY < canvas.height) {
              const slice = document.createElement('canvas');
              slice.width = canvas.width;
              slice.height = Math.min(pxPerPage, canvas.height - srcY);
              slice.getContext('2d')!.drawImage(canvas, 0, -srcY);
              const sliceRenderH = (slice.height / canvas.width) * usableW;
              if (destY + sliceRenderH > pageH - margin) {
                pdf.addPage();
                destY = margin;
              }
              pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, destY, usableW, sliceRenderH);
              destY += sliceRenderH + 4;
              srcY += pxPerPage;
            }
            destY += 8;
          }
        }
      }

      pdf.save(`analytics-${activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const DEPARTMENTS = ['All Departments', 'Finance', 'HR', 'IT', 'Governance', 'Strategy', 'Customer'];

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Department + Date */}
      <div className="flex items-center gap-3">
        <Dropdown
          options={DEPARTMENTS}
          value={department}
          onChange={setDepartment}
        />

        {/* Date range — month picker */}
        <div className="relative" ref={dateRef}>
          <button
            type="button"
            onClick={() => setDateOpen(o => !o)}
            className="flex items-center gap-2 h-9 px-3 bg-white border border-[#f1f5f9] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] w-[275px]"
          >
            <span className="flex-1 font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#020617] truncate text-left">
              {dateLabel}
            </span>
            <Calendar className="h-4 w-4 text-[#64748b] shrink-0" />
          </button>
          {dateOpen && (
            <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto min-w-[220px]">
              {monthOptions.map(opt => {
                const isSelected = opt.start.getTime() === startDate.getTime();
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => { setStartDate(opt.start); setEndDate(opt.end); setDateOpen(false); onDateChange?.(opt.start, opt.end); }}
                    className={`w-full text-left px-3 py-2 text-[13px] font-['IBM_Plex_Sans'] hover:bg-slate-50 whitespace-nowrap
                      ${isSelected ? 'text-[#0d9488] font-medium' : 'text-[#0f172a]'}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Survey + Export */}
      <div className="flex items-center gap-3">
        <Dropdown
          options={surveyOptions}
          value={survey}
          onChange={(name) => {
            setSurvey(name);
            const id = name === 'All Surveys'
              ? undefined
              : (surveysData ?? []).find((s: any) => (s.title || s.name) === name)?.id;
            setGlobalSurveyId(id);
            onSurveyChange?.(id);
          }}
          width="w-auto"
        />

        {/* Export PDF */}
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 h-9 px-4 bg-white border border-[#f1f5f9] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#020617] disabled:opacity-60"
        >
          {isExporting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />
          }
          {isExporting ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}
