import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  TrendingUp,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TurnoverRateChart } from './turnover-rate-chart';

export function EmployeeTurnoverRiskDashboard() {
  const { toast } = useToast();
  const [selectedCRM, setSelectedCRM] = useState<string>('hubspot');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  // Test CRM connection
  const testCRMConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await apiRequest('GET', '/api/turnover-risks/health/check');
      const data = await response.json();
      setConnectionStatus(data.crmStatus);

      if (data.crmStatus[selectedCRM]?.configured && data.crmStatus[selectedCRM]?.active) {
        toast({
          title: 'Success',
          description: `${selectedCRM.toUpperCase()} is configured and active!`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Not Connected',
          description: `${selectedCRM.toUpperCase()} is not configured. Please set it up in Settings.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check CRM connection',
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Fetch available CRM configurations
  const { data: crmConfigs, isLoading: isLoadingCRMs } = useQuery({
    queryKey: ['/api/crm-configs'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/crm-configs');
        return response.json();
      } catch (error) {
        console.log('CRM configs not available');
        return { configs: [] };
      }
    },
  });

  if (isLoadingCRMs) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with CRM Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Turnover Analytics
            </h2>
            <p className="text-gray-600 mt-1">Analyze employee turnover trends using CRM data</p>
          </div>
        </div>

        {/* CRM Selector */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Select CRM Integration</label>
                <div className="flex gap-2">
                  <Select value={selectedCRM} onValueChange={setSelectedCRM}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select a CRM..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hubspot">
                        <div className="flex items-center gap-2">
                          <span>HubSpot</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="salesforce">Salesforce</SelectItem>
                      <SelectItem value="zoho">Zoho CRM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={testCRMConnection}
                    disabled={testingConnection}
                    variant="outline"
                    className="gap-2 whitespace-nowrap bg-white"
                  >
                    {testingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-blue-700 p-3 bg-blue-100 rounded flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Using <strong>{selectedCRM.toUpperCase()}</strong> customer data (Active vs Inactive)</span>
              </div>
            </div>

            {/* Connection Status Message */}
            {connectionStatus && (
              <div className={`mt-4 p-3 rounded-md border ${connectionStatus[selectedCRM]?.active
                ? 'bg-green-100 border-green-200 text-green-800'
                : 'bg-yellow-100 border-yellow-200 text-yellow-800'
                }`}>
                <div className="flex items-center gap-2">
                  {connectionStatus[selectedCRM]?.active ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {connectionStatus[selectedCRM]?.active ? 'Connected Successfully' : 'Connection Issue Detected'}
                  </span>
                </div>
                {!connectionStatus[selectedCRM]?.active && (
                  <p className="text-sm mt-1 ml-6">
                    Please check your CRM configuration in Settings.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Turnover Analytics Chart */}
      <TurnoverRateChart selectedCRM={selectedCRM} />
    </div>
  );
}

export default EmployeeTurnoverRiskDashboard;
