import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HeatmapData {
  department: string;
  location: string;
  eviScore: number;
  npsScore: number;
  csatScore: number;
  responseCount: number;
}

interface CRMConfig {
  id: string;
  name: string;
  crmType: string;
  isActive: boolean;
}

interface CRMTable {
  name: string;
  label: string;
}

export default function DepartmentHeatmap() {
  const [metric, setMetric] = useState<'evi' | 'nps' | 'csat'>('evi');
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [crmConfigs, setCrmConfigs] = useState<CRMConfig[]>([]);
  const [selectedCrmId, setSelectedCrmId] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('contacts');
  const [availableTables, setAvailableTables] = useState<CRMTable[]>([]);
  const [error, setError] = useState<string>('');

  // Fetch available CRM configs
  useEffect(() => {
    const fetchCrmConfigs = async () => {
      try {
        const token = localStorage.getItem('insightpulse_token');
        const response = await fetch('/api/analytics/heatmap/configs', {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const configs = await response.json();
          setCrmConfigs(configs);
          // Set first active config as default
          const defaultConfig = configs.find((c: CRMConfig) => c.isActive);
          if (defaultConfig) {
            setSelectedCrmId(defaultConfig.id);
            
            // Debug: Test the contacts endpoint
            console.log('🔍 Testing HubSpot contacts...');
            const testResponse = await fetch(`/api/analytics/heatmap/test-contacts?configId=${defaultConfig.id}`, {
              headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            if (testResponse.ok) {
              const testData = await testResponse.json();
              console.log('📋 HubSpot Contact Test Results:', testData);
            } else {
              console.error('❌ Test endpoint failed:', await testResponse.text());
            }
          } else if (configs.length === 0) {
            setError('No CRM connections found. Please connect a CRM first.');
          }
        } else {
          setError('Failed to load CRM configurations');
        }
      } catch (error) {
        console.error('Error fetching CRM configs:', error);
        setError('Error loading CRM configurations');
      }
    };

    fetchCrmConfigs();
  }, []);

  // Update available tables when CRM changes
  useEffect(() => {
    if (!selectedCrmId) return;
    
    const selectedConfig = crmConfigs.find(c => c.id === selectedCrmId);
    if (!selectedConfig) return;

    // Define available tables based on CRM type
    const tables: Record<string, CRMTable[]> = {
      hubspot: [
        { name: 'contacts', label: 'Contacts' },
        { name: 'companies', label: 'Companies' },
        { name: 'deals', label: 'Deals' }
      ],
      salesforce: [
        { name: 'Contact', label: 'Contacts' },
        { name: 'Lead', label: 'Leads' },
        { name: 'Account', label: 'Accounts' }
      ],
      zoho: [
        { name: 'Contacts', label: 'Contacts' },
        { name: 'Leads', label: 'Leads' },
        { name: 'Accounts', label: 'Accounts' }
      ]
    };

    setAvailableTables(tables[selectedConfig.crmType] || []);
    setSelectedTable(tables[selectedConfig.crmType]?.[0]?.name || 'contacts');
  }, [selectedCrmId, crmConfigs]);

  // Fetch heatmap data when CRM or table selection changes
  useEffect(() => {
    if (!selectedCrmId || !selectedTable) return;

    const fetchHeatmapData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('insightpulse_token');
        const url = `/api/analytics/heatmap?configId=${selectedCrmId}&table=${selectedTable}`;
        const response = await fetch(url, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length === 0) {
            setError('No data found. Make sure contacts have department and location fields, and survey responses exist.');
          }
          setHeatmapData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load heatmap data');
          setHeatmapData([]);
        }
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
        setError('Error loading heatmap data');
        setHeatmapData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmapData();
  }, [selectedCrmId, selectedTable]);

  const generateMockData = (): HeatmapData[] => {
    const departments = ['Sales', 'Marketing', 'Customer Support', 'Engineering', 'HR', 'Finance'];
    const locations = ['New York', 'London', 'Tokyo', 'Singapore', 'Dubai'];
    
    return departments.flatMap(dept => 
      locations.map(loc => ({
        department: dept,
        location: loc,
        eviScore: 50 + Math.random() * 40,
        npsScore: -20 + Math.random() * 80,
        csatScore: 60 + Math.random() * 35,
        responseCount: Math.floor(Math.random() * 100) + 10
      }))
    );
  };

  const getColorForScore = (score: number, type: 'evi' | 'nps' | 'csat'): string => {
    if (type === 'nps') {
      if (score >= 50) return 'bg-green-500';
      if (score >= 0) return 'bg-yellow-500';
      if (score >= -20) return 'bg-orange-500';
      return 'bg-red-500';
    }
    
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getIntensity = (score: number, type: 'evi' | 'nps' | 'csat'): number => {
    if (type === 'nps') {
      // NPS ranges from -100 to 100, normalize to 0-1
      return Math.max(0, Math.min(1, (score + 100) / 200));
    }
    // EVI and CSAT range from 0-100
    return score / 100;
  };

  const departments = Array.from(new Set(heatmapData.map(d => d.department)));
  const locations = Array.from(new Set(heatmapData.map(d => d.location)));

  const getDataPoint = (dept: string, loc: string) => {
    return heatmapData.find(d => d.department === dept && d.location === loc);
  };

  const getMetricValue = (data: HeatmapData | undefined): number => {
    if (!data) return 0;
    switch (metric) {
      case 'evi': return data.eviScore;
      case 'nps': return data.npsScore;
      case 'csat': return data.csatScore;
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

  if (isLoading) {
    return (
      <Card className="dashboard-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Department & Location Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-600">Loading heatmap data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !selectedCrmId) {
    return (
      <Card className="dashboard-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Department & Location Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-amber-600 mb-2">⚠️ {error}</div>
            <p className="text-sm text-gray-500">Go to CRM Integration Settings to connect your CRM</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card shadow-lg">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Department & Location Heatmap
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            {/* CRM Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">CRM:</span>
              <Select value={selectedCrmId} onValueChange={setSelectedCrmId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select CRM" />
                </SelectTrigger>
                <SelectContent>
                  {crmConfigs.length === 0 ? (
                    <SelectItem value="none" disabled>No CRM connected</SelectItem>
                  ) : (
                    crmConfigs.map(config => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Table Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Table:</span>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select Table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map(table => (
                    <SelectItem key={table.name} value={table.name}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Metric Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Metric:</span>
              <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
                <SelectTrigger className="w-40">
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
          
          {/* Error Message */}
          {error && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              {error}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-gray-600 pb-2 border-b">
            <span>Low Performance</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <div className="w-4 h-4 bg-green-500 rounded"></div>
              </div>
            </div>
            <span>High Performance</span>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">
                    Department / Location
                  </th>
                  {locations.map(loc => (
                    <th key={loc} className="p-2 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-300">
                      {loc}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept} className="hover:bg-gray-50">
                    <td className="p-2 text-sm font-medium text-gray-900 border-b border-gray-200">
                      {dept}
                    </td>
                    {locations.map(loc => {
                      const dataPoint = getDataPoint(dept, loc);
                      const value = getMetricValue(dataPoint);
                      const intensity = getIntensity(value, metric);
                      
                      return (
                        <td key={`${dept}-${loc}`} className="p-2 border-b border-gray-200">
                          {dataPoint ? (
                            <div 
                              className={`relative p-3 rounded-lg transition-all hover:scale-105 cursor-pointer ${getColorForScore(value, metric)}`}
                              style={{ 
                                opacity: 0.3 + (intensity * 0.7),
                              }}
                              title={`${dept} - ${loc}\n${getMetricLabel()}: ${value.toFixed(1)}\nResponses: ${dataPoint.responseCount}`}
                            >
                              <div className="text-center text-white font-bold text-sm">
                                {metric === 'nps' ? Math.round(value) : value.toFixed(1)}
                              </div>
                              <div className="text-center text-white text-xs opacity-90">
                                {dataPoint.responseCount} resp.
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-gray-100 text-center text-gray-400 text-xs">
                              N/A
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {departments.length}
              </div>
              <div className="text-sm text-gray-600">Departments</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {locations.length}
              </div>
              <div className="text-sm text-gray-600">Locations</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {heatmapData.reduce((sum, d) => sum + d.responseCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Responses</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
