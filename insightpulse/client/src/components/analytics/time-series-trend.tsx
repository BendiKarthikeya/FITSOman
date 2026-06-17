import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Calendar, Activity, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeSeriesDataPoint {
  date: string;
  eviScore: number;
  npsScore: number;
  csatScore: number;
  responseCount: number;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  significance: 'high' | 'medium' | 'low';
}

export default function TimeSeriesTrend() {
  const [metric, setMetric] = useState<'evi' | 'nps' | 'csat'>('evi');
  const [view, setView] = useState<'short' | 'long'>('short');
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimeSeriesData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('insightpulse_token');
        const dateRange = view === 'short' ? '30d' : '365d';
        const response = await fetch(`/api/analytics/time-series?dateRange=${dateRange}`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          setTimeSeriesData(data);
        } else {
          // Use mock data if API not available
          setTimeSeriesData(generateMockData(view));
        }
      } catch (error) {
        console.error('Error fetching time series data:', error);
        setTimeSeriesData(generateMockData(view));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeSeriesData();
  }, [view]);

  const generateMockData = (viewType: 'short' | 'long'): TimeSeriesDataPoint[] => {
    const dataPoints = viewType === 'short' ? 30 : 365;
    const data: TimeSeriesDataPoint[] = [];
    const now = new Date();
    
    let baseEvi = 70;
    let baseNps = 30;
    let baseCsat = 75;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Add some trend and variation
      const trendFactor = (dataPoints - i) / dataPoints;
      const variation = (Math.random() - 0.5) * 10;
      
      data.push({
        date: date.toISOString().split('T')[0],
        eviScore: Math.max(0, Math.min(100, baseEvi + (trendFactor * 10) + variation)),
        npsScore: Math.max(-100, Math.min(100, baseNps + (trendFactor * 20) + variation)),
        csatScore: Math.max(0, Math.min(100, baseCsat + (trendFactor * 8) + variation)),
        responseCount: Math.floor(Math.random() * 50) + 20
      });
    }
    
    return data;
  };

  const calculateTrend = (): TrendAnalysis => {
    if (timeSeriesData.length < 2) {
      return { direction: 'stable', percentage: 0, significance: 'low' };
    }

    const getValue = (point: TimeSeriesDataPoint): number => {
      switch (metric) {
        case 'evi': return point.eviScore;
        case 'nps': return point.npsScore;
        case 'csat': return point.csatScore;
        default: return 0;
      }
    };

    // Calculate moving average for trend detection
    const windowSize = view === 'short' ? 7 : 30;
    const recentData = timeSeriesData.slice(-windowSize);
    const olderData = timeSeriesData.slice(-windowSize * 2, -windowSize);

    const recentAvg = recentData.reduce((sum, d) => sum + getValue(d), 0) / recentData.length;
    const olderAvg = olderData.length > 0 
      ? olderData.reduce((sum, d) => sum + getValue(d), 0) / olderData.length
      : recentAvg;

    const change = ((recentAvg - olderAvg) / Math.abs(olderAvg || 1)) * 100;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(change) > 2) {
      direction = change > 0 ? 'up' : 'down';
    }

    let significance: 'high' | 'medium' | 'low' = 'low';
    const absChange = Math.abs(change);
    if (absChange > 10) significance = 'high';
    else if (absChange > 5) significance = 'medium';

    return {
      direction,
      percentage: Math.abs(change),
      significance
    };
  };

  const getMetricValue = (point: TimeSeriesDataPoint): number => {
    switch (metric) {
      case 'evi': return point.eviScore;
      case 'nps': return point.npsScore;
      case 'csat': return point.csatScore;
      default: return 0;
    }
  };

  const getMetricLabel = (): string => {
    switch (metric) {
      case 'evi': return 'EVI Score';
      case 'nps': return 'NPS Score';
      case 'csat': return 'CSAT Score';
      default: return 'Score';
    }
  };

  const trend = calculateTrend();
  const maxValue = Math.max(...timeSeriesData.map(getMetricValue));
  const minValue = Math.min(...timeSeriesData.map(getMetricValue));

  // Calculate moving average for smoothing
  const calculateMovingAverage = (data: TimeSeriesDataPoint[], window: number) => {
    return data.map((point, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(data.length, index + Math.ceil(window / 2));
      const slice = data.slice(start, end);
      const avg = slice.reduce((sum, p) => sum + getMetricValue(p), 0) / slice.length;
      return avg;
    });
  };

  const movingAvg = calculateMovingAverage(timeSeriesData, view === 'short' ? 3 : 7);

  if (isLoading) {
    return (
      <Card className="dashboard-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Time-Series Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-600">Loading trend data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Time-Series Trend Analysis
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evi">EVI Score</SelectItem>
                <SelectItem value="nps">NPS Score</SelectItem>
                <SelectItem value="csat">CSAT Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="short">
              Short-Term (30 Days)
            </TabsTrigger>
            <TabsTrigger value="long">
              Long-Term (1 Year)
            </TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="space-y-4">
            {/* Trend Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${
                trend.direction === 'up' ? 'bg-green-50' :
                trend.direction === 'down' ? 'bg-red-50' :
                'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {trend.direction === 'up' && <TrendingUp className="w-5 h-5 text-green-600" />}
                  {trend.direction === 'down' && <TrendingDown className="w-5 h-5 text-red-600" />}
                  {trend.direction === 'stable' && <Calendar className="w-5 h-5 text-gray-600" />}
                  <span className="font-semibold text-gray-700">Trend Direction</span>
                </div>
                <div className={`text-2xl font-bold ${
                  trend.direction === 'up' ? 'text-green-600' :
                  trend.direction === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {trend.direction === 'up' ? 'Improving' :
                   trend.direction === 'down' ? 'Declining' :
                   'Stable'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {trend.percentage.toFixed(1)}% change
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-700">Significance</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 capitalize">
                  {trend.significance}
                </div>
                <Badge variant={
                  trend.significance === 'high' ? 'destructive' :
                  trend.significance === 'medium' ? 'default' :
                  'secondary'
                } className="mt-2">
                  {trend.significance === 'high' ? 'Requires Attention' :
                   trend.significance === 'medium' ? 'Monitor Closely' :
                   'Normal Variation'}
                </Badge>
              </div>

              <div className="p-4 rounded-lg bg-purple-50">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-700">Data Points</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {timeSeriesData.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {view === 'short' ? 'Daily readings' : 'Annual data'}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>{getMetricLabel()}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-orange-500"></div>
                    <span>Trend</span>
                  </div>
                </div>
              </div>
              
              <div className="relative h-64 border border-gray-200 rounded-lg p-4 bg-white">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
                  <span>{maxValue.toFixed(0)}</span>
                  <span>{((maxValue + minValue) / 2).toFixed(0)}</span>
                  <span>{minValue.toFixed(0)}</span>
                </div>

                {/* Chart area */}
                <div className="ml-12 h-full relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="border-t border-gray-100"></div>
                    ))}
                  </div>

                  {/* Line chart */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    {/* Actual values line */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points={timeSeriesData.map((point, index) => {
                        const x = (index / (timeSeriesData.length - 1)) * 100;
                        const y = 100 - ((getMetricValue(point) - minValue) / (maxValue - minValue) * 100);
                        return `${x}%,${y}%`;
                      }).join(' ')}
                    />
                    
                    {/* Moving average line */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      points={movingAvg.map((value, index) => {
                        const x = (index / (timeSeriesData.length - 1)) * 100;
                        const y = 100 - ((value - minValue) / (maxValue - minValue) * 100);
                        return `${x}%,${y}%`;
                      }).join(' ')}
                    />

                    {/* Data points */}
                    {timeSeriesData.map((point, index) => {
                      const x = (index / (timeSeriesData.length - 1)) * 100;
                      const y = 100 - ((getMetricValue(point) - minValue) / (maxValue - minValue) * 100);
                      return (
                        <circle
                          key={index}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="3"
                          fill="#3b82f6"
                          className="hover:r-5 transition-all cursor-pointer"
                        >
                          <title>{`${point.date}: ${getMetricValue(point).toFixed(1)}`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="ml-12 mt-2 flex justify-between text-xs text-gray-500">
                  <span>{timeSeriesData[0]?.date}</span>
                  {timeSeriesData.length > 2 && (
                    <span>{timeSeriesData[Math.floor(timeSeriesData.length / 2)]?.date}</span>
                  )}
                  <span>{timeSeriesData[timeSeriesData.length - 1]?.date}</span>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📊 Key Insights</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>
                  • {view === 'short' ? 'Short-term' : 'Long-term'} trend shows{' '}
                  <strong>
                    {trend.direction === 'up' ? 'positive growth' :
                     trend.direction === 'down' ? 'declining performance' :
                     'stable performance'}
                  </strong>
                  {' '}of {trend.percentage.toFixed(1)}%
                </li>
                <li>
                  • Current {getMetricLabel()}: <strong>{getMetricValue(timeSeriesData[timeSeriesData.length - 1]).toFixed(1)}</strong>
                </li>
                <li>
                  • Average over period: <strong>
                    {(timeSeriesData.reduce((sum, d) => sum + getMetricValue(d), 0) / timeSeriesData.length).toFixed(1)}
                  </strong>
                </li>
                {trend.significance === 'high' && (
                  <li className="text-red-700">
                    • ⚠️ High significance change detected - Review required
                  </li>
                )}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
