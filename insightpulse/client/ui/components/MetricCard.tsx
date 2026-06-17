import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

type PeriodKey = '30d' | '60d' | '90d';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  '30d': 'Last 30 Days',
  '60d': 'Last 60 Days',
  '90d': 'Last 90 Days',
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  period?: string;
  selectedPeriod?: PeriodKey;
  onPeriodChange?: (period: PeriodKey) => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  period,
  selectedPeriod,
  onPeriodChange,
  className = '',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const trendLabel = trend
    ? trend.direction === 'up'
      ? `+${trend.value}%`
      : `- ${trend.value}%`
    : null;

  const trendColor = trend?.direction === 'up' ? '#059669' : '#e11d48';

  const periodLabel = selectedPeriod ? PERIOD_LABELS[selectedPeriod] : period;
  const hasDropdown = !!onPeriodChange;

  return (
    <div
      className={`bg-white border border-[#e2e8f0] flex flex-col items-start py-6 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="flex flex-col gap-3 items-start px-6 w-full">

        {icon && (
          <div className="bg-slate-100 flex items-center p-[10px] rounded-lg">
            <div className="w-[18px] h-[18px] text-slate-900">
              {icon}
            </div>
          </div>
        )}

        <div className="flex flex-col items-start">
          <p className="font-bold leading-[1.6] text-[18px] text-slate-900 whitespace-nowrap">
            {title}
          </p>
          {periodLabel && (
            <div className="relative" ref={containerRef}>
              <button
                className="flex gap-1 items-center cursor-pointer focus:outline-none"
                onClick={() => hasDropdown && setDropdownOpen(o => !o)}
                type="button"
              >
                <p className="font-medium leading-[1.5] text-[14px] text-slate-500 whitespace-nowrap">
                  {periodLabel}
                </p>
                {hasDropdown && (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                )}
                {!hasDropdown && <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#e2e8f0] rounded-lg shadow-lg min-w-[140px] py-1">
                  {(Object.entries(PERIOD_LABELS) as [PeriodKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors ${
                        selectedPeriod === key ? 'text-slate-900 bg-slate-50' : 'text-slate-600'
                      }`}
                      onClick={() => {
                        onPeriodChange?.(key);
                        setDropdownOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between w-full">
          <p className="font-semibold leading-[1.3] text-[24px] text-slate-900 whitespace-nowrap">
            {value}
          </p>
          {trendLabel && (
            <div
              className="border border-slate-100 flex gap-0 h-[22px] items-center justify-center px-2 py-[2px] rounded-lg"
              style={{ color: trendColor }}
            >
              <p className="font-medium leading-[1.4] text-[12px] tracking-[0.0288px] whitespace-nowrap">
                {trendLabel}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
