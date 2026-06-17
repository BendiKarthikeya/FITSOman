import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Settings } from 'lucide-react';
import { useUnifiedMetrics } from '../hooks/api';
import { useSelectedSurveyId } from '../hooks/surveyFilter';

const CustomTooltip = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 shadow-lg font-['IBM_Plex_Sans']">
      <p className="text-[13px] font-semibold text-[#0f172a]">{d.name}</p>
      <p className="text-[12px] text-[#64748b]">
        {d.value} ({((d.value / total) * 100).toFixed(1)}%)
      </p>
    </div>
  );
};

export const SentimentalAnalysisCard: React.FC = () => {
  const selectedSurveyId = useSelectedSurveyId();
  const { data: metrics } = useUnifiedMetrics('30d', selectedSurveyId);

  const { chartData, total } = useMemo(() => {
    const sb = metrics?.sentimentBreakdown ?? { positive: 0, neutral: 0, negative: 0, total: 0 };
    return {
      chartData: [
        { name: 'Positive', value: sb.positive, color: '#0d9488' },
        { name: 'Neutral', value: sb.neutral, color: '#64748b' },
        { name: 'Negative', value: sb.negative, color: '#e11d48' },
      ],
      total: sb.total,
    };
  }, [metrics?.sentimentBreakdown]);

  return (
    <div className="bg-white border border-[#f1f5f9] flex flex-col items-start relative rounded-xl h-full overflow-hidden">
      {/* Settings icon */}
      <button
        className="absolute right-[9px] top-[9px] p-1 hover:bg-slate-50 rounded transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4 text-[#94a3b8]" />
      </button>

      <div className="flex flex-col gap-6 py-6 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col gap-[6px] items-start justify-center px-6">
          <p className="font-['IBM_Plex_Sans'] font-semibold text-[20px] leading-[1.4] text-[#0f172a] whitespace-nowrap">
            Sentimental Analysis
          </p>
          <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] leading-[1.5] text-[#64748b] whitespace-nowrap">
            Total Responses:{total}
          </p>
        </div>

        {/* Chart + floating annotation */}
        <div className="flex flex-col items-center justify-center px-6 w-full flex-1">
          {/* relative wrapper — pie is 192×192 centered; annotation absolute at left=195 top=-20.5 */}
          <div className="relative h-[214px] w-full flex items-center justify-center">
            {total === 0 ? (
              <div className="text-center text-sm text-slate-500">No feedback yet — submit a survey to populate this chart.</div>
            ) : (
            <PieChart width={192} height={192}>
              <Pie
                data={chartData}
                cx={96}
                cy={96}
                outerRadius={90}
                innerRadius={58}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
            </PieChart>
            )}
          </div>
        </div>

        {/* Legends */}
        <div className="flex items-center justify-center gap-2 py-2 w-full">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-1">
              <div
                className="rounded-[2px] shrink-0 size-2"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-['IBM_Plex_Sans'] font-medium text-[12px] leading-[1.4] text-[#1e293b] tracking-[0.0288px]">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
