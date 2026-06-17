import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Settings } from 'lucide-react';
import { getQueryFn } from '@/lib/queryClient';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 shadow-lg font-['IBM_Plex_Sans']">
      <p className="text-[13px] font-semibold text-[#0f172a]">{label}</p>
      <p className="text-[12px] text-[#64748b]">NPS Score: {payload[0].value}</p>
    </div>
  );
};

export const OverallNpsCard: React.FC = () => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDepartmentNps = async () => {
      try {
        const queryFn = getQueryFn({ on401: 'throw' }) as any;
        const data = await queryFn({ queryKey: ['/api/department-nps'] });
        
        if (data?.departments && Array.isArray(data.departments)) {
          const formattedData = data.departments.map((dept: any) => ({
            department: dept.departmentName || 'Unknown',
            score: Math.round(dept.npsScore || 0),
          }));
          setChartData(formattedData);
        }
      } catch (error) {
        console.error('Failed to fetch department NPS:', error);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentNps();
  }, []);

  return (
    <div className="bg-white border border-[#f1f5f9] flex flex-col items-start relative rounded-xl">
      {/* Settings icon */}
      <button
        className="absolute right-[9px] top-[9px] p-1 hover:bg-slate-50 rounded transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4 text-[#94a3b8]" />
      </button>

      <div className="flex flex-col gap-6 py-6 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col gap-[6px] items-start justify-center px-6 w-full">
          <p className="font-['IBM_Plex_Sans'] font-semibold text-[20px] leading-[1.4] text-[#0f172a]">
            Overall NPS
          </p>
          <p className="font-['IBM_Plex_Sans'] text-[14px] leading-[1.5] text-[#64748b]">
            Showing nps score based on the department
          </p>
        </div>

        {/* Chart */}
        <div className="flex flex-col items-center justify-center px-6 w-full shrink-0">
          <div className="h-[320px] w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                No department NPS data yet — assign employees to departments and submit surveys to populate this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 2, right: 36, left: 0, bottom: 2 }}
                >
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={80}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 500,
                      fill: '#64748b',
                      letterSpacing: '0.0288px',
                    }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="score" barSize={20} radius={0}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.score < 0 ? '#e11d48' : '#0d9488'}
                      />
                    ))}
                    <LabelList
                      dataKey="score"
                      position="right"
                      style={{
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        fill: '#0f172a',
                        letterSpacing: '0.0288px',
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
