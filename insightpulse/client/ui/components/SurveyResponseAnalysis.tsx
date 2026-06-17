/**
 * Survey Response Analysis Component
 * Displays AI-analyzed survey response data with insights, emotions, and recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Heart, Brain, Target } from 'lucide-react';

interface SurveyResponseAnalysisProps {
  analysis: {
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

const EMOTION_COLORS = {
  joy: '#fbbf24',
  anger: '#ef4444',
  sadness: '#3b82f6',
  fear: '#8b5cf6',
  surprise: '#ec4899',
  trust: '#10b981',
};

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-100 text-green-800';
    case 'negative':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-green-100 text-green-800';
  }
};

const getScoreColor = (score: number, maxScore: number = 100) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return 'text-green-600';
  if (percentage >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

export function SurveyResponseAnalysis({ analysis }: SurveyResponseAnalysisProps) {
  const emotionData = analysis.emotions
    ? Object.entries(analysis.emotions).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: EMOTION_COLORS[name as keyof typeof EMOTION_COLORS],
      }))
    : [];

  const scoreData = [
    { name: 'EVI', value: analysis.eviScore, max: 100 },
    { name: 'NPS', value: (analysis.npsScore + 100) / 2, max: 100 }, // Normalize NPS to 0-100
    { name: 'CSAT', value: (analysis.csatScore / 5) * 100, max: 100 }, // Normalize CSAT to 0-100
    { name: 'CES', value: (analysis.cesScore / 5) * 100, max: 100 }, // Normalize CES to 0-100
  ];

  return (
    <div className="space-y-6">
      {/* Header with Sentiment and Urgency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge className={getSentimentColor(analysis.sentiment)}>
                {analysis.sentiment.toUpperCase()}
              </Badge>
              <span className={`text-2xl font-bold ${getScoreColor(analysis.sentimentScore)}`}>
                {analysis.sentimentScore}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getUrgencyColor(analysis.urgency)}>
              {analysis.urgency.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{analysis.category}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Scores Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Key Metrics
          </CardTitle>
          <CardDescription>Survey response scores and indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(analysis.eviScore)}`}>
                {analysis.eviScore}
              </div>
              <div className="text-sm text-muted-foreground">EVI Score</div>
              <div className="text-xs text-muted-foreground">(0-100)</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor((analysis.npsScore + 100) / 2)}`}>
                {analysis.npsScore}
              </div>
              <div className="text-sm text-muted-foreground">NPS Score</div>
              <div className="text-xs text-muted-foreground">(-100 to +100)</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor((analysis.csatScore / 5) * 100)}`}>
                {analysis.csatScore}
              </div>
              <div className="text-sm text-muted-foreground">CSAT Score</div>
              <div className="text-xs text-muted-foreground">(1-5)</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor((analysis.cesScore / 5) * 100)}`}>
                {analysis.cesScore}
              </div>
              <div className="text-sm text-muted-foreground">CES Score</div>
              <div className="text-xs text-muted-foreground">(1-5)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotions and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotions Chart */}
        {emotionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Emotional Analysis
              </CardTitle>
              <CardDescription>Detected emotions in the response</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emotionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {emotionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Key Insights
            </CardTitle>
            <CardDescription>AI-extracted insights from the response</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.keyInsights.map((insight, index) => (
                <li key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 text-sm">{insight}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recommendations
          </CardTitle>
          <CardDescription>Suggested actions based on the analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <Alert key={index} className="border-l-4 border-l-primary">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scores Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Comparison</CardTitle>
          <CardDescription>Normalized comparison of all metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${Math.round(value as number)}%`} />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
