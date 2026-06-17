/**
 * Survey Responses Page
 * Displays all survey responses with AI analysis
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SurveyResponseAnalysis } from '../components/SurveyResponseAnalysis';
import { Loader2, Download, RefreshCw } from 'lucide-react';

interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentEmail?: string;
  answers: Record<string, any>;
  eviScore?: number;
  npsScore?: number;
  csatScore?: number;
  cesScore?: number;
  sentiment?: string;
  summary?: string;
  submittedAt?: string;
  analysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    sentimentScore: number;
    eviScore: number;
    npsScore: number;
    csatScore: number;
    cesScore: number;
    keyInsights: string[];
    recommendations: string[];
    category: string;
    urgency: 'low' | 'medium' | 'high';
    emotions?: {
      joy: number;
      anger: number;
      sadness: number;
      fear: number;
      surprise: number;
      trust: number;
    };
  };
}

export default function SurveyResponsesPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResponses();
  }, [surveyId]);

  const fetchResponses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/survey-responses/survey/${surveyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }

      const data = await response.json();
      setResponses(data.responses || []);
      
      if (data.responses && data.responses.length > 0) {
        setSelectedResponse(data.responses[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResponses = () => {
    const csv = [
      ['Email', 'Sentiment', 'EVI Score', 'NPS Score', 'CSAT Score', 'CES Score', 'Category', 'Urgency', 'Submitted At'],
      ...responses.map(r => [
        r.respondentEmail || 'Anonymous',
        r.analysis?.sentiment || 'N/A',
        r.analysis?.eviScore || 'N/A',
        r.analysis?.npsScore || 'N/A',
        r.analysis?.csatScore || 'N/A',
        r.analysis?.cesScore || 'N/A',
        r.analysis?.category || 'N/A',
        r.analysis?.urgency || 'N/A',
        r.submittedAt || 'N/A',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-responses-${surveyId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading survey responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchResponses} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Survey Responses</h1>
            <p className="text-muted-foreground">
              {responses.length} response{responses.length !== 1 ? 's' : ''} received
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchResponses}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={downloadResponses} disabled={responses.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {responses.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No responses yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Responses List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Responses</CardTitle>
                  <CardDescription>Click to view details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {responses.map((response) => (
                      <button
                        key={response.id}
                        onClick={() => setSelectedResponse(response)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedResponse?.id === response.id
                            ? 'bg-primary/10 border-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {response.respondentEmail || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(response.submittedAt || '').toLocaleDateString()}
                            </p>
                          </div>
                          {response.analysis && (
                            <Badge
                              variant="outline"
                              className={
                                response.analysis.sentiment === 'positive'
                                  ? 'bg-green-100 text-green-800'
                                  : response.analysis.sentiment === 'negative'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {response.analysis.sentiment.charAt(0).toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Details */}
            <div className="lg:col-span-2">
              {selectedResponse && selectedResponse.analysis ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Details</CardTitle>
                      <CardDescription>
                        Submitted on {new Date(selectedResponse.submittedAt || '').toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedResponse.respondentEmail || 'Anonymous'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Answers</label>
                          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-[200px]">
                            {JSON.stringify(selectedResponse.answers, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <SurveyResponseAnalysis analysis={selectedResponse.analysis} />
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Select a response to view analysis</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
