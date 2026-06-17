/**
 * High-Risk Indicator Detection Dashboard
 * Displays risk detection batch progress and results
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Activity,
  TrendingUp,
  Timer,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RiskDetectionDashboardProps {
  surveyId: string;
  totalResponses: number;
}

interface RiskBatch {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalResponses: number;
  processedResponses: number;
  riskDetectedCount: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  summary: any;
  completedAt?: string;
  errorMessage?: string;
}

interface BatchStatus {
  batch: RiskBatch;
  results: any[];
  progressPercentage: number;
}

export default function RiskDetectionDashboard({
  surveyId,
  totalResponses,
}: RiskDetectionDashboardProps) {
  const { toast } = useToast();
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch survey risk summary
  const { data: riskSummary, isLoading: isLoadingRiskSummary } = useQuery<any>({
    queryKey: [`/api/risk-detection/survey/${surveyId}`],
    enabled: !!surveyId,
  });

  // Fetch batch status
  const { data: batchStatus, isLoading: isLoadingBatch, refetch: refetchBatchStatus } = useQuery<any>({
    queryKey: [`/api/risk-detection/batch/${riskSummary?.batch?.id}`],
    enabled: !!riskSummary?.batch?.id && riskSummary?.batch?.status !== 'completed',
    refetchInterval: riskSummary?.batch?.status === 'processing' ? 3000 : false,
  });

  // Start risk detection batch
  const { mutate: startDetection, isPending: isStarting } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/risk-detection/start', { surveyId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Risk Detection Started',
          description: `Processing ${data.totalResponses} responses in batches of 50`,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/risk-detection/survey/${surveyId}`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start risk detection',
        variant: 'destructive',
      });
    },
  });

  const batch = riskSummary?.batch || batchStatus?.batch;
  const progressPercentage = batchStatus?.progressPercentage || 0;
  const isProcessing = batch?.status === 'processing';
  const isCompleted = batch?.status === 'completed';
  const isFailed = batch?.status === 'failed';

  // Get batch-level key findings (not per-response)
  const keyFindings = riskSummary?.keyFindings || [];
  const filteredFindings = selectedRiskLevel
    ? keyFindings.filter((f: any) => f.severity === selectedRiskLevel)
    : keyFindings;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner for No Responses */}
      {totalResponses === 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">
                  Survey Has No Responses Yet
                </h4>
                <p className="text-sm text-orange-800 mb-3">
                  Risk detection requires survey responses to analyze. This survey currently has 0 responses.
                </p>
                <div className="text-sm text-orange-700 space-y-1">
                  <p><strong>To use this feature:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Ensure your survey has been distributed to respondents</li>
                    <li>Wait for responses to be submitted</li>
                    <li>Return to this page once responses are available</li>
                    <li>Click "Start Risk Detection" to analyze responses</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Risk Detection Card */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                High-Risk Indicator Detection
              </CardTitle>
              <CardDescription>
                Detect high-risk indicators in open-text survey comments using AI analysis
              </CardDescription>
            </div>
            {isCompleted && (
              <Badge className="bg-green-200 text-green-800">✓ Completed</Badge>
            )}
            {isProcessing && (
              <Badge className="bg-blue-200 text-blue-800 animate-pulse">Processing...</Badge>
            )}
            {isFailed && (
              <Badge className="bg-red-200 text-red-800">Failed</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Start Detection Button */}
          {!batch || batch.status === 'failed' ? (
            <div className={`p-4 rounded-lg border space-y-4 ${
              totalResponses === 0 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div>
                <h3 className={`font-semibold mb-2 ${
                  totalResponses === 0 ? 'text-yellow-900' : 'text-blue-900'
                }`}>
                  {totalResponses === 0 ? 'No Responses Available' : 'Ready to Analyze'}
                </h3>
                <p className={`text-sm ${
                  totalResponses === 0 ? 'text-yellow-700' : 'text-blue-700'
                }`}>
                  {totalResponses === 0 ? (
                    <>
                      This survey has no responses yet. Responses are needed to detect high-risk indicators.
                      <br />
                      <strong>Next steps:</strong> Wait for survey responses to be submitted, or check if this survey has been distributed to respondents.
                    </>
                  ) : (
                    <>
                      Process {totalResponses} response{totalResponses !== 1 ? 's' : ''} to detect high-risk indicators in open-text comments. 
                      Responses will be processed in batches of 50.
                    </>
                  )}
                </p>
              </div>
              <Button
                onClick={() => startDetection()}
                disabled={isStarting || totalResponses === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={totalResponses === 0 ? 'No responses available to analyze' : 'Click to start risk detection'}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Start Risk Detection
                    {totalResponses === 0 && ' (Disabled)'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Progress Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processing Progress</span>
                  <span className="text-sm text-gray-600">
                    {batch.processedResponses} / {batch.totalResponses}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-gray-500">
                  {progressPercentage}% Complete - {isProcessing ? 'Processing...' : 'Done'}
                </p>
              </div>

              {/* Risk Counts Grid */}
              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                  <div className="text-2xl font-bold text-red-700">{batch.criticalRiskCount || 0}</div>
                  <div className="text-xs text-red-600 mt-1">Critical</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                  <div className="text-2xl font-bold text-orange-700">{batch.highRiskCount || 0}</div>
                  <div className="text-xs text-orange-600 mt-1">High</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{batch.mediumRiskCount || 0}</div>
                  <div className="text-xs text-yellow-600 mt-1">Medium</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-700">{batch.lowRiskCount || 0}</div>
                  <div className="text-xs text-blue-600 mt-1">Low</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-gray-700">
                    {batch.totalResponses - batch.riskDetectedCount || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">No Risk</div>
                </div>
              </div>

              {/* Summary Stats */}
              {batch.summary && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-semibold text-gray-900">Detection Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700">
                      <strong>Total at Risk:</strong> {batch.riskDetectedCount} / {batch.totalResponses}
                    </p>
                    {batch.summary.topCategories && batch.summary.topCategories.length > 0 && (
                      <p className="text-gray-700">
                        <strong>Top Categories:</strong> {batch.summary.topCategories.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {batch.summary?.recommendations && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Recommended Actions</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {batch.summary.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Message */}
              {isFailed && batch.errorMessage && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">{batch.errorMessage}</p>
                </div>
              )}

              {/* View Details Button */}
              {isCompleted && (
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Detailed Results
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organizational Risk Analysis</DialogTitle>
            <DialogDescription>
              Key risk patterns identified across {batch?.totalResponses} survey responses
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Overall Analysis Summary */}
            {riskSummary?.riskAnalysis && (
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Overall Assessment</h4>
                  <p className="text-sm text-gray-700">{riskSummary.riskAnalysis}</p>
                </CardContent>
              </Card>
            )}

            {/* Risk Categories */}
            {riskSummary?.riskCategories && riskSummary.riskCategories.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Identified Risk Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {riskSummary.riskCategories.map((cat: string) => (
                    <Badge key={cat} variant="secondary">
                      {cat.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Severity Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedRiskLevel === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRiskLevel(null)}
              >
                All Findings ({keyFindings.length})
              </Button>
              <Button
                variant={selectedRiskLevel === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRiskLevel('critical')}
              >
                Critical
              </Button>
              <Button
                variant={selectedRiskLevel === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRiskLevel('high')}
              >
                High
              </Button>
              <Button
                variant={selectedRiskLevel === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRiskLevel('medium')}
              >
                Medium
              </Button>
              <Button
                variant={selectedRiskLevel === 'low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRiskLevel('low')}
              >
                Low
              </Button>
            </div>

            {/* Key Risk Patterns */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Key Risk Patterns</h4>
              {filteredFindings.map((finding: any, idx: number) => (
                <Card key={idx} className={`border-l-4 ${getRiskColor(finding.severity)}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getRiskIcon(finding.severity)}
                        <span className="font-semibold capitalize">{finding.severity} Risk</span>
                        {finding.confidence && (
                          <Badge variant="outline">{finding.confidence}% confidence</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{finding.indicator}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {finding.category?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      {finding.quote && (
                        <div className="bg-gray-50 p-3 rounded-md border-l-2 border-gray-300">
                          <p className="text-xs text-gray-500 mb-1">Example Quote:</p>
                          <p className="text-sm italic text-gray-700">"{finding.quote}"</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredFindings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No findings match the selected filter
                </p>
              )}
            </div>

            {/* Recommendations */}
            {riskSummary?.recommendations && riskSummary.recommendations.length > 0 && (
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-green-900 mb-3">Recommended Actions</h4>
                  <ul className="space-y-2">
                    {riskSummary.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
