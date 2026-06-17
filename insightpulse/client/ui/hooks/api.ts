import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SurveyType = 'web' | 'mobile' | 'voice' | 'email';
export type SurveyAudience = 'employee' | 'customer';

export interface ApiSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: any[];
  isActive: boolean | null;
  surveyType: SurveyType | null;
  sharedWith: SurveyAudience | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface TrendDelta {
  value: number;
  direction: 'up' | 'down' | 'flat';
}

export interface InsightsBundle {
  topInsights: { text: string; count: number }[];
  topRecommendations: { text: string; count: number }[];
  urgencyBreakdown: { high: number; medium: number; low: number };
}

export interface ThemeRow {
  theme: string;
  mention: number;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  example: string;
}

export interface UnifiedMetrics {
  eviScore: number;
  npsScore: number;
  csatScore: number;
  cesScore: number;
  totalFeedback30d: number;
  responseRate: number;
  activeSurveys: number;
  trends: {
    evi: TrendDelta;
    nps: TrendDelta;
    csat: TrendDelta;
    responseRate: TrendDelta;
  };
  themes: ThemeRow[];
  insights: InsightsBundle;
  sentimentBreakdown: { positive: number; neutral: number; negative: number; total: number };
  promotersPercent: number;
  passivesPercent: number;
  detractorsPercent: number;
  satisfactionDistribution: {
    verySatisfied: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    veryDissatisfied: number;
  };
  emotionTrends: { date: string; joy: number; trust: number; fear: number; surprise: number; sadness: number; disgust: number; anger: number; anticipation: number }[];
  eviTrends: { date: string; evi: number; nps: number }[];
  recentFeedback: { id: string; surveyId: string; surveyName: string; respondentEmail: string; eviScore: number | null; npsScore: number | null; csatScore: number | null; submittedAt: string; sentiment: string | null }[];
  surveyComparison: { surveyId: string; surveyTitle: string; evi: number; nps: number; csat: number; sentimentScore: number; responseRate: number; compositeScore: number; vsBestPct: number }[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string | null;
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  questions?: any[];
  surveyType?: SurveyType;
  sharedWith?: SurveyAudience;
  createdBy?: string;
}

// ─── Surveys ─────────────────────────────────────────────────────────────────

export function useSurveys() {
  return useQuery<ApiSurvey[]>({
    queryKey: ['/api/surveys'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/surveys');
      return res.json();
    },
    retry: false,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  const user = auth.getUser();

  return useMutation<ApiSurvey, Error, CreateSurveyInput>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/surveys', {
        title: data.title,
        description: data.description || '',
        questions: data.questions || [],
        createdBy: data.createdBy || user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
    },
  });
}

export function useSurvey(id: string | undefined | null) {
  return useQuery<ApiSurvey>({
    queryKey: ['/api/surveys', id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/surveys/${id}`);
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });
}

export function useSurveyResponseCount(surveyId: string | undefined | null) {
  return useQuery<{ count: number }>({
    queryKey: ['/api/surveys', surveyId, 'responses/count'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/surveys/${surveyId}/responses/count`);
      return res.json();
    },
    enabled: !!surveyId,
    retry: false,
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiRequest('DELETE', `/api/surveys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
    },
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function useUnifiedMetrics(dateRange = '30d', surveyId?: string, startDate?: Date, endDate?: Date) {
  const startIso = startDate?.toISOString();
  const endIso = endDate?.toISOString();
  return useQuery<UnifiedMetrics>({
    queryKey: ['/api/unified-analytics/metrics', dateRange, surveyId, startIso, endIso],
    queryFn: async () => {
      const params = new URLSearchParams({ dateRange });
      if (surveyId) params.set('surveyId', surveyId);
      if (startIso) params.set('startDate', startIso);
      if (endIso) params.set('endDate', endIso);
      const res = await apiRequest('GET', `/api/unified-analytics/metrics?${params}`);
      return res.json();
    },
    retry: false,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useSurveyAnalytics(surveyId: string | undefined | null) {
  return useQuery<any>({
    queryKey: ['/api/analytics/survey', surveyId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analytics/survey/${surveyId}`);
      return res.json();
    },
    enabled: !!surveyId,
    retry: false,
  });
}

export function useSurveyResponseTime(surveyId: string | undefined | null) {
  return useQuery<any>({
    queryKey: ['/api/analytics/survey/response-time', surveyId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analytics/surveys/${surveyId}/response-time`);
      return res.json();
    },
    enabled: !!surveyId,
    retry: false,
  });
}

export function useAnalytics() {
  return useQuery<any>({
    queryKey: ['/api/analytics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/analytics');
      return res.json();
    },
    retry: false,
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useUserProfile(userId: string | undefined | null) {
  return useQuery<UserProfile>({
    queryKey: ['/api/user', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/user/${userId}`);
      return res.json();
    },
    enabled: !!userId,
    retry: false,
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery<any[]>({
    queryKey: ['/api/templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/templates');
      return res.json();
    },
    retry: false,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/templates', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiRequest('DELETE', `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
  });
}
