/**
 * Turnover Rate Analytics Chart Component
 * Displays turnover rate over time using standard HR formula
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiRequest } from '@/lib/queryClient';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface TurnoverRateData {
  period: string;
  startDate: string;
  endDate: string;
  turnoverRate: number;
  employeesLeft: number;
  averageEmployees: number;
  beginningCount: number;
  endingCount: number;
}

interface TurnoverRateResponse {
  success: boolean;
  data: TurnoverRateData[];
  metadata: {
    period: string;
    months: number;
    totalContacts: number;
    crmType: string;
  };
  error?: string;
}

export function TurnoverRateChart({ selectedCRM = 'hubspot' }: { selectedCRM?: string }) {
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [months, setMonths] = useState('6');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Fetch turnover rate data
  const { data: turnoverData, isLoading, error } = useQuery({
    queryKey: ['/api/turnover-analytics/rate-by-period', selectedCRM, period, months],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/turnover-analytics/rate-by-period?crm=${selectedCRM}&period=${period}&months=${months}`
      );
      const result = await response.json() as TurnoverRateResponse;
      if (!result.success) throw new Error(result.error || 'Failed to fetch turnover data');
      return result;
    },
    enabled: !!selectedCRM,
  });

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Turnover Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 p-4 bg-red-50 rounded">
            Error loading turnover data: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = turnoverData?.data || [];
  const hasData = chartData.length > 0;

  // Calculate statistics
  const avgTurnover = hasData
    ? Math.round((chartData.reduce((sum, d) => sum + d.turnoverRate, 0) / chartData.length) * 100) / 100
    : 0;
  const maxTurnover = hasData ? Math.max(...chartData.map(d => d.turnoverRate)) : 0;
  const totalLeft = hasData ? chartData.reduce((sum, d) => sum + d.employeesLeft, 0) : 0;

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Turnover Rate Analysis
                </CardTitle>
                <CardDescription className="mt-2">
                  Formula: (Employees Left ÷ Average Employees) × 100%
                </CardDescription>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Period Type</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Lookback Period</label>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Last 3 {period === 'monthly' ? 'Months' : 'Weeks'}</SelectItem>
                    <SelectItem value="6">Last 6 {period === 'monthly' ? 'Months' : 'Weeks'}</SelectItem>
                    <SelectItem value="12">Last 12 {period === 'monthly' ? 'Months' : 'Weeks'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Chart Type</label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Average Turnover Rate</p>
                <p className="text-3xl font-bold text-blue-600">{avgTurnover}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Peak Turnover Rate</p>
                <p className="text-3xl font-bold text-red-600">{maxTurnover}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Employees Left</p>
                <p className="text-3xl font-bold text-orange-600">{totalLeft}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Contacts</p>
                <p className="text-3xl font-bold text-purple-600">{turnoverData?.metadata.totalContacts || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Turnover Rate by {period === 'monthly' ? 'Month' : 'Week'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-600">Loading chart...</p>
            </div>
          ) : !hasData ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-600">No turnover data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'line' ? (
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis
                    label={{ value: 'Turnover Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Turnover Rate']}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="turnoverRate"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Turnover Rate (%)"
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis
                    label={{ value: 'Turnover Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Turnover Rate']}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="turnoverRate"
                    fill="#3b82f6"
                    name="Turnover Rate (%)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Details Table */}
      {hasData && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Detailed Period Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4">Period</th>
                  <th className="text-right py-2 px-4">Turnover Rate</th>
                  <th className="text-right py-2 px-4">Left</th>
                  <th className="text-right py-2 px-4">Avg Employees</th>
                  <th className="text-right py-2 px-4">Beginning</th>
                  <th className="text-right py-2 px-4">Ending</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{row.period}</td>
                    <td className="text-right py-2 px-4">
                      <span className={`font-bold ${row.turnoverRate > 10 ? 'text-red-600' :
                          row.turnoverRate > 5 ? 'text-orange-600' :
                            'text-green-600'
                        }`}>
                        {row.turnoverRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-2 px-4">{row.employeesLeft}</td>
                    <td className="text-right py-2 px-4">{row.averageEmployees}</td>
                    <td className="text-right py-2 px-4">{row.beginningCount}</td>
                    <td className="text-right py-2 px-4">{row.endingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Formula Explanation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-900">How Turnover Rate is Calculated:</h4>
            <div className="space-y-2 text-sm text-blue-900">
              <p>
                <strong>Formula:</strong> Turnover Rate = (Employees Left ÷ Average Employees) × 100%
              </p>
              <p>
                <strong>Example for a month:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Beginning active employees: 100</li>
                <li>Ending active employees: 95</li>
                <li>Employees left: 5</li>
                <li>Average: (100 + 95) ÷ 2 = 97.5</li>
                <li>Turnover Rate: (5 ÷ 97.5) × 100 = <strong>5.13%</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TurnoverRateChart;
