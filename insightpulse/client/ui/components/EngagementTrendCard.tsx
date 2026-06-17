import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useUnifiedMetrics } from '../hooks/api';

// Stable industry benchmark per calendar month (Jan=0 … Dec=11)
const BENCHMARK_BY_MONTH = [62, 63, 65, 67, 68, 70, 69, 67, 66, 64, 63, 62];

export const EngagementTrendCard: React.FC = () => {
  const { data: metrics } = useUnifiedMetrics('1y');

  const chartData = useMemo(() => {
    // Build last 12 calendar months skeleton
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push({ key, label });
    }

    // Aggregate real eviTrends by YYYY-MM
    const realByMonth: Record<string, { eviSum: number; count: number }> = {};
    (metrics?.eviTrends ?? []).forEach((trend) => {
      const d = new Date(trend.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!realByMonth[key]) realByMonth[key] = { eviSum: 0, count: 0 };
      realByMonth[key].eviSum += trend.evi;
      realByMonth[key].count += 1;
    });

    return months.map(({ key, label }) => {
      const real = realByMonth[key];
      const monthIdx = parseInt(key.split('-')[1], 10) - 1;
      return {
        month: label,
        engagement: real ? Math.round(real.eviSum / real.count) : 0,
        benchmark: BENCHMARK_BY_MONTH[monthIdx],
      };
    });
  }, [metrics?.eviTrends]);

  return (
    <div className="bg-white border border-[#e2e8f0] flex flex-col gap-6 items-start rounded-[8px] py-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full">
      {/* Header */}
      <div className="flex flex-col gap-1.5 items-start justify-center px-6 w-full">
        <div className="flex items-center w-full">
          <p className="flex-1 font-semibold leading-[1.4] text-[20px] text-slate-900">
            Engagement Trend
          </p>
        </div>
        <div className="flex items-center w-full">
          <div className="flex flex-1 flex-col justify-center text-[14px] text-slate-500">
            <p className="leading-[1.5]">Showing engagement for the last 12 months</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex flex-col items-center justify-center px-6 w-full">
        <div className="flex flex-col gap-2.5 items-start w-full" style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal
                vertical={false}
                stroke="#e2e8f0"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  fill: '#64748b',
                }}
                dy={8}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
                formatter={(value: any, name: string) =>
                  value === null ? ['—', name] : [value, name]
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#64748b', paddingBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="benchmark"
                name="Benchmark"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="url(#benchmarkGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#fbbf24' }}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="engagement"
                name="Engagement"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#engagementGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#38bdf8' }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
