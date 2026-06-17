/**
 * Example: How to integrate Risk Indicator detection in Survey Response Viewer
 * This file shows the integration points for displaying risk analysis
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskAnalysisCard, RiskIndicatorBadge } from '@/components/survey/risk-indicator';
import { AlertCircle } from 'lucide-react';

/**
 * Example: Individual Survey Response Viewer with Risk Display
 */
export function SurveyResponseViewer({ responseId }: { responseId: string }) {
  const { data: response, isLoading, error } = useQuery<any>({
    queryKey: ['/api/responses', responseId],
    enabled: !!responseId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading response</div>;
  if (!response) return null;

  return (
    <div className="space-y-6">
      {/* Header with Risk Status */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Survey Response</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{response.respondentEmail}</p>
            </div>
            {/* Display Risk Badge in Header */}
            {response.hasRisks && (
              <RiskIndicatorBadge 
                riskLevel={response.riskLevel} 
                riskScore={response.riskScore}
              />
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Risk Analysis Section - Display prominently if risks detected */}
      {response.hasRisks && (
        <RiskAnalysisCard
          riskLevel={response.riskLevel}
          riskScore={response.riskScore}
          indicators={response.riskIndicators || []}
          recommendations={response.riskRecommendations || []}
          requiresManualReview={response.requiresManualReview}
          respondentEmail={response.respondentEmail}
        />
      )}

      {/* Survey Responses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Responses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(response.answers || {}).map(([questionId, answer]: [string, any]) => (
            <div key={questionId} className="border-b pb-4 last:border-0">
              <p className="font-medium text-sm mb-2">{questionId}</p>
              <p className="text-sm text-gray-700">{answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Scores Tab */}
      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="review">Review Status</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6">
              <ScoreDisplay label="NPS Score" value={response.npsScore} max={10} />
              <ScoreDisplay label="CSAT Score" value={response.csatScore} max={100} />
              <ScoreDisplay label="EVI Score" value={response.eviScore} max={100} />
              <ScoreDisplay label="CES Score" value={response.cesScore} max={10} />
              <ScoreDisplay label="Risk Score" value={response.riskScore} max={100} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Sentiment</p>
                <p className="text-lg font-semibold capitalize">{response.overallSentiment || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Analysis Summary</p>
                <p className="text-sm text-gray-700 mt-1">{response.analysisSummary || 'No analysis available'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {response.requiresManualReview ? (
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-orange-900">Manual Review Required</p>
                    <p className="text-sm text-orange-800 mt-1">
                      This response contains high-risk indicators that require manual review.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-700">No manual review required</p>
              )}

              {response.riskReviewedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Reviewed At</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {new Date(response.riskReviewedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {response.riskReviewNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Reviewer Notes</p>
                  <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded border">
                    {response.riskReviewNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Helper component to display score
 */
function ScoreDisplay({ label, value, max }: { label: string; value: number | null; max: number }) {
  const percentage = value !== null ? (value / max) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              percentage > 66 ? 'bg-green-500' :
              percentage > 33 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-sm font-semibold">{value ?? 'N/A'}</p>
      </div>
    </div>
  );
}

/**
 * Example: Survey Response List with Risk Filter
 */
export function SurveyResponsesList({ surveyId }: { surveyId: string }) {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const { data: responses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/responses', surveyId],
    enabled: !!surveyId,
  });

  const filteredResponses = responses.filter((r: any) => {
    if (riskFilter === 'critical') return r.riskLevel === 'critical';
    if (riskFilter === 'high') return r.riskLevel === 'high' || r.riskLevel === 'critical';
    if (riskFilter === 'risky') return r.hasRisks;
    if (riskFilter === 'safe') return !r.hasRisks;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setRiskFilter('all')}
          className={`px-3 py-1 rounded text-sm ${riskFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          All ({responses.length})
        </button>
        <button
          onClick={() => setRiskFilter('critical')}
          className={`px-3 py-1 rounded text-sm ${riskFilter === 'critical' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
        >
          🔴 Critical ({responses.filter((r: any) => r.riskLevel === 'critical').length})
        </button>
        <button
          onClick={() => setRiskFilter('high')}
          className={`px-3 py-1 rounded text-sm ${riskFilter === 'high' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
        >
          🟠 High Risk ({responses.filter((r: any) => r.riskLevel === 'high' || r.riskLevel === 'critical').length})
        </button>
        <button
          onClick={() => setRiskFilter('safe')}
          className={`px-3 py-1 rounded text-sm ${riskFilter === 'safe' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        >
          ✓ No Risks ({responses.filter((r: any) => !r.hasRisks).length})
        </button>
      </div>

      {/* Response List */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading responses...</p>
        ) : filteredResponses.length === 0 ? (
          <p className="text-center text-gray-500">No responses found</p>
        ) : (
          filteredResponses.map((response: any) => (
            <ResponseListItem key={response.id} response={response} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Individual response list item with risk indicator
 */
function ResponseListItem({ response }: { response: any }) {
  return (
    <div className={`p-3 border rounded-lg transition-colors ${
      response.riskLevel === 'critical' ? 'bg-red-50 border-red-300' :
      response.riskLevel === 'high' ? 'bg-orange-50 border-orange-300' :
      response.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' :
      response.riskLevel === 'low' ? 'bg-blue-50 border-blue-300' :
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm">{response.respondentEmail}</p>
          <p className="text-xs text-gray-600 space-x-2 mt-1">
            <span>NPS: {response.npsScore}</span>
            <span>•</span>
            <span>CSAT: {response.csatScore}</span>
            {response.hasRisks && (
              <>
                <span>•</span>
                <span className="font-medium text-red-600">
                  {response.riskIndicators?.length || 0} risk indicator{response.riskIndicators?.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {response.hasRisks && (
            <RiskIndicatorBadge 
              riskLevel={response.riskLevel} 
              riskScore={response.riskScore}
            />
          )}
          {response.requiresManualReview && (
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
              Review Needed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Risk Summary Dashboard
 */
export function RiskSummaryDashboard({ surveyId }: { surveyId: string }) {
  const { data: responses = [] } = useQuery<any[]>({
    queryKey: ['/api/responses', surveyId],
  });

  const riskStats = {
    total: responses.length,
    critical: responses.filter((r: any) => r.riskLevel === 'critical').length,
    high: responses.filter((r: any) => r.riskLevel === 'high').length,
    medium: responses.filter((r: any) => r.riskLevel === 'medium').length,
    low: responses.filter((r: any) => r.riskLevel === 'low').length,
    noRisk: responses.filter((r: any) => !r.hasRisks).length,
    needsReview: responses.filter((r: any) => r.requiresManualReview).length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Responses" value={riskStats.total} color="text-gray-900 bg-gray-100" />
      <StatCard label="🔴 Critical" value={riskStats.critical} color="text-red-900 bg-red-100" />
      <StatCard label="🟠 High Risk" value={riskStats.high} color="text-orange-900 bg-orange-100" />
      <StatCard label="📋 Needs Review" value={riskStats.needsReview} color="text-blue-900 bg-blue-100" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className={`pt-6 text-center ${color} rounded-lg`}>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs mt-1 opacity-75">{label}</p>
      </CardContent>
    </Card>
  );
}

export default SurveyResponseViewer;
