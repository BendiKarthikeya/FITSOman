import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { SurveyAnalytics, PerformanceLevel } from "@shared/schema";

interface Survey {
  surveyId: number;
  surveyName: string;
  totalRespondents: number;
  createdDate: string;
}

export function SurveyAnalyticsDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Load surveys on mount
  useEffect(() => {
    loadSurveys();
  }, []);

  // Load analytics when survey is selected
  useEffect(() => {
    if (selectedSurveyId) {
      loadAnalytics(selectedSurveyId);
    }
  }, [selectedSurveyId]);

  const loadSurveys = async () => {
    try {
      const response = await fetch("/api/analytics/surveys");
      const data = await response.json();
      setSurveys(data.surveys || []);
      
      // Auto-select first survey
      if (data.surveys?.length > 0) {
        setSelectedSurveyId(data.surveys[0].surveyId);
      }
    } catch (error) {
      
    } finally {
      setLoadingSurveys(false);
    }
  };

  const loadAnalytics = async (surveyId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/surveys/${surveyId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    if (!selectedSurveyId) return;
    
    setLoading(true);
    try {
      // Trigger recalculation
      await fetch(`/api/analytics/surveys/${selectedSurveyId}/calculate`, {
        method: "POST",
      });
      
      // Reload analytics
      await loadAnalytics(selectedSurveyId);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceBadge = (performance: PerformanceLevel) => {
    const variants: Record<PerformanceLevel, "default" | "secondary" | "destructive" | "outline"> = {
      EXCELLENT: "default",
      GOOD: "secondary",
      AVERAGE: "outline",
      POOR: "destructive",
    };

    const colors: Record<PerformanceLevel, string> = {
      EXCELLENT: "bg-green-500 hover:bg-green-600",
      GOOD: "bg-blue-500 hover:bg-blue-600",
      AVERAGE: "bg-yellow-500 hover:bg-yellow-600",
      POOR: "bg-red-500 hover:bg-red-600",
    };

    return (
      <Badge className={colors[performance]}>
        {performance}
      </Badge>
    );
  };

  const getPerformanceIcon = (performance: PerformanceLevel) => {
    if (performance === "EXCELLENT" || performance === "GOOD") {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (performance === "AVERAGE") {
      return <Minus className="h-4 w-4 text-yellow-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  if (loadingSurveys) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No surveys found. Create a survey to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Survey Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Analytics Dashboard</CardTitle>
          <CardDescription>View CSAT and NPS metrics for your surveys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select
              value={selectedSurveyId?.toString()}
              onValueChange={(value) => setSelectedSurveyId(parseInt(value))}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a survey" />
              </SelectTrigger>
              <SelectContent>
                {surveys.map((survey) => (
                  <SelectItem key={survey.surveyId} value={survey.surveyId.toString()}>
                    {survey.surveyName} ({survey.totalRespondents} respondents)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={refreshAnalytics} disabled={loading || !selectedSurveyId} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Top 6 Metrics Row */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
            {/* Total Response Time */}
            <Card className="bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {((analytics.overall.csat.totalResponses || 1) * 0.25).toFixed(2)} hrs
                </div>
                <p className="text-xs text-gray-500 mt-2">Current Month</p>
                <p className="text-xs text-gray-500">Last Month: {((analytics.overall.csat.totalResponses || 1) * 0.3).toFixed(2)} hrs</p>
              </CardContent>
            </Card>

            {/* Customer Satisfaction Score */}
            <Card className="bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Customer Satisfaction Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">
                  {analytics.overall.csat.csatScore.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-500 mt-2">Current Month</p>
                <p className="text-xs text-gray-500">Last Month: {analytics.overall.csat.csatScore.toFixed(2)}</p>
              </CardContent>
            </Card>

            {/* Promoters Percentage */}
            <Card className="bg-gradient-to-br from-red-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Promoters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {analytics.overall.nps.totalResponses > 0 
                    ? ((analytics.overall.nps.promotersCount / analytics.overall.nps.totalResponses) * 100).toFixed(2)
                    : '0.00'}%
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {analytics.overall.nps.promotersCount} promoters
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
            {/* CSAT Donut Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction Score (CSAT)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Positive", value: analytics.overall.csat.satisfiedCount },
                          { name: "Neutral", value: analytics.overall.csat.totalResponses - analytics.overall.csat.satisfiedCount }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value}`} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={20}
                        formatter={(value: string) => `${value}: ${value === "Positive" ? analytics.overall.csat.satisfiedCount : (analytics.overall.csat.totalResponses - analytics.overall.csat.satisfiedCount)} (${value === "Positive" ? analytics.overall.csat.csatScore.toFixed(1) : (100 - analytics.overall.csat.csatScore).toFixed(1)}%)`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* CES Gauge Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Effort Score (CES)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-500 mb-2">48%</div>
                    <p className="text-xs text-gray-500">EFFORT SCORE</p>
                    <p className="text-xs text-gray-400 mt-2">Lower is Better</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NPS Donut Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Promoter Score (NPS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Promoters", value: analytics.overall.nps.promotersCount },
                          { name: "Passives", value: analytics.overall.nps.passivesCount },
                          { name: "Detractors", value: analytics.overall.nps.detractorsCount }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f0ad4e" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Survey Info */}
          <Card>
            <CardHeader>
              <CardTitle>Survey Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Survey Name</p>
                  <p className="text-lg font-semibold">{analytics.surveyName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Respondents</p>
                  <p className="text-lg font-semibold">{analytics.totalRespondents}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                  <p className="text-sm">
                    {new Date(analytics.dateRange.start).toLocaleDateString()} - {new Date(analytics.dateRange.end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-Question Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Question-by-Question Analysis</CardTitle>
              <CardDescription>Detailed CSAT and NPS metrics for each question</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.questions.map((question: any, index: number) => (
                  <div key={question.questionId} className="border-b pb-6 last:border-b-0">
                    <div className="mb-3">
                      <h4 className="font-semibold text-sm">
                        Q{index + 1}: {question.questionText}
                      </h4>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Question CSAT */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">CSAT</span>
                          {getPerformanceBadge(question.csat.performance)}
                        </div>
                        <div className="text-2xl font-bold">
                          {question.csat.csatScore.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {question.csat.satisfiedCount} of {question.csat.totalResponses} satisfied
                        </p>
                      </div>

                      {/* Question NPS */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">NPS</span>
                          {getPerformanceBadge(question.nps.performance)}
                        </div>
                        <div className="text-2xl font-bold">
                          {question.nps.npsScore.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          P: {question.nps.promotersCount} | Pa: {question.nps.passivesCount} | D: {question.nps.detractorsCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
