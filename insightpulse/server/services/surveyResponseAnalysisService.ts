/**
 * Survey Response Analysis Service
 * Processes survey answers through AI to extract insights, sentiment, emotions, and structured data
 */

import { OpenRouter } from "@openrouter/sdk";
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.Open_Router_API_New || '';

// Initialize OpenRouter client
const openrouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY
});

export interface SurveyResponseAnalysisRequest {
  surveyId: string;
  surveyTitle: string;
  surveyDescription?: string;
  answers: Record<string, any>;
  respondentEmail?: string | null;
  respondentPhone?: string | null;
}

export interface SurveyResponseAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // 0-100
  emotions: {
    joy: number;
    trust: number;
    fear: number;
    surprise: number;
    sadness: number;
    disgust: number;
    anger: number;
    anticipation: number;
  };
  eviScore: number; // 0-100
  npsScore: number; // 0-10 individual respondent score (9-10=promoter, 7-8=passive, 0-6=detractor)
  csatScore: number; // 1-5
  cesScore: number; // 1-5
  keyInsights: string[];
  recommendations: string[];
  category: string;
  urgency: 'low' | 'medium' | 'high';
  summary: string;
  actionItems: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    owner?: string;
  }>;
}

/**
 * Call OpenRouter with fallback support
 */
async function callOpenRouterWithFallback(messages: any[], useFallback: boolean = false): Promise<string> {
  // Free-tier models — no credits required.
  // Primary: NVIDIA Nemotron 3 Super 120B (free, non-Google/Venice provider)
  // Fallback: Llama 3.3 70B (free fallback)
  // Override via OPENROUTER_PRIMARY_MODEL / OPENROUTER_FALLBACK_MODEL env vars.
  const PRIMARY_MODEL = process.env.OPENROUTER_PRIMARY_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';
  const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  const modelToUse = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;

  try {
    const stream = await openrouter.chat.send({
      model: modelToUse,
      messages,
      stream: true,
      temperature: 0.7,
      maxTokens: 4000,
    });

    let fullContent = '';
    let fullReasoning = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        fullContent += delta.content;
      }

      if (delta?.reasoning) {
        fullReasoning += delta.reasoning;
      }
    }

    const response = fullContent || fullReasoning;
    return response;
  } catch (error: any) {
    const status = error?.rawResponse?.status ?? error?.status ?? 'n/a';
    const msg = error?.message ?? String(error);
    console.warn(`[OpenRouter] ${modelToUse} failed (status=${status}): ${msg}`);
    if (!useFallback) {
      return callOpenRouterWithFallback(messages, true);
    }
    throw error;
  }
}

/**
 * Build analysis prompt for survey responses
 */
function buildAnalysisPrompt(request: SurveyResponseAnalysisRequest): string {
  const answersText = Object.entries(request.answers)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  return `
Analyze this survey response and provide comprehensive insights. Return ONLY valid JSON (no markdown, no explanations).

Survey: ${request.surveyTitle}
${request.surveyDescription ? `Description: ${request.surveyDescription}` : ''}
Respondent: ${request.respondentEmail || request.respondentPhone || 'Anonymous'}

SURVEY ANSWERS:
${answersText}

Analyze and return JSON with this complete structure:

{
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 75,
  "emotions": {
    "joy": 30,
    "trust": 15,
    "fear": 5,
    "surprise": 10,
    "sadness": 10,
    "disgust": 5,
    "anger": 10,
    "anticipation": 15
  },
  "eviScore": 75,
  "npsScore": 9,
  "csatScore": 4,
  "cesScore": 4,
  "keyInsights": [
    "Customer is satisfied with product quality",
    "Concerns about pricing",
    "Positive experience with support team"
  ],
  "recommendations": [
    "Review pricing strategy",
    "Maintain current support quality",
    "Expand product features based on feedback"
  ],
  "category": "Product Quality|Customer Service|Pricing|User Experience|General",
  "urgency": "low|medium|high",
  "summary": "Overall assessment of the survey response",
  "actionItems": [
    {
      "action": "Follow up on pricing concerns",
      "priority": "high",
      "owner": "Sales Team"
    }
  ]
}

IMPORTANT RULES:
1. Sentiment must be one of: positive, neutral, negative
2. All scores must be numbers (not strings)
3. Emotions must include all 8 Plutchik emotions (joy, trust, fear, surprise, sadness, disgust, anger, anticipation) and sum to 100
4. EVI Score: 0-100 (higher is better)
5. NPS Score: 0-10 (individual respondent likelihood to recommend — 9-10=promoter, 7-8=passive, 0-6=detractor)
6. CSAT Score: 1-5 (1=very dissatisfied, 5=very satisfied)
7. CES Score: 1-5 (1=very difficult, 5=very easy)
8. Urgency must be one of: low, medium, high (high=negative sentiment or NPS≤4 or explicit complaints; medium=mixed/neutral or NPS 5-6; low=positive or NPS≥7)
9. Category must be one of the listed options
10. Return ONLY valid JSON, no additional text
`;
}

/**
 * Analyze survey response using OpenRouter
 */
export async function analyzeSurveyResponse(request: SurveyResponseAnalysisRequest): Promise<SurveyResponseAnalysis> {
  if (!OPENROUTER_API_KEY) {
    console.error('OpenRouter API key not configured');
    return getFallbackAnalysis(request);
  }

  const prompt = buildAnalysisPrompt(request);
  const messages = [
    {
      role: 'system',
      content: `You are an expert survey analyst. Your task is to analyze survey responses and return ONLY valid JSON (no reasoning, no explanation, no markdown). The JSON must include ALL required fields with correct data types.`,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  async function tryParse(text: string): Promise<any> {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  }

  try {
    const contentPrimary = await callOpenRouterWithFallback(messages, false);

    try {
      const data = await tryParse(contentPrimary);
      return normalizeAnalysisResponse(data);
    } catch (parseError) {
      const contentFallback = await callOpenRouterWithFallback(messages, true);
      const data = await tryParse(contentFallback);
      return normalizeAnalysisResponse(data);
    }
  } catch (error: any) {
    console.error('Error analyzing survey response:', error);
    return getFallbackAnalysis(request);
  }
}

/**
 * Normalize and validate analysis response
 */
function normalizeAnalysisResponse(data: any): SurveyResponseAnalysis {
  return {
    sentiment: (data.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
    sentimentScore: Math.min(100, Math.max(0, Number(data.sentimentScore) || 50)),
    emotions: {
      joy: Math.max(0, Number(data.emotions?.joy) || 0),
      trust: Math.max(0, Number(data.emotions?.trust) || 0),
      fear: Math.max(0, Number(data.emotions?.fear) || 0),
      surprise: Math.max(0, Number(data.emotions?.surprise) || 0),
      sadness: Math.max(0, Number(data.emotions?.sadness) || 0),
      disgust: Math.max(0, Number(data.emotions?.disgust) || 0),
      anger: Math.max(0, Number(data.emotions?.anger) || 0),
      anticipation: Math.max(0, Number(data.emotions?.anticipation) || 0),
    },
    eviScore: Math.min(100, Math.max(0, Number(data.eviScore) || 50)),
    npsScore: Math.min(10, Math.max(0, Number(data.npsScore) || 0)),
    csatScore: Math.min(5, Math.max(1, Number(data.csatScore) || 3)),
    cesScore: Math.min(5, Math.max(1, Number(data.cesScore) || 3)),
    keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights.slice(0, 5) : [],
    recommendations: Array.isArray(data.recommendations) ? data.recommendations.slice(0, 5) : [],
    category: data.category || 'General',
    urgency: (data.urgency || 'low') as 'low' | 'medium' | 'high',
    summary: data.summary || 'Survey response analyzed',
    actionItems: Array.isArray(data.actionItems) ? data.actionItems.slice(0, 5) : [],
  };
}

/**
 * Fallback analysis when AI is unavailable
 */
function getFallbackAnalysis(request: SurveyResponseAnalysisRequest): SurveyResponseAnalysis {
  // Simple heuristic-based analysis
  const answersText = JSON.stringify(request.answers).toLowerCase();
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let sentimentScore = 50;

  const positiveWords = ['great', 'excellent', 'good', 'happy', 'satisfied', 'love', 'amazing'];
  const negativeWords = ['bad', 'poor', 'disappointed', 'hate', 'terrible', 'awful'];

  const positiveCount = positiveWords.filter(w => answersText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => answersText.includes(w)).length;

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    sentimentScore = 70 + Math.random() * 20;
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    sentimentScore = 30 + Math.random() * 20;
  }

  return {
    sentiment,
    sentimentScore: Math.round(sentimentScore),
    emotions: {
      joy: sentiment === 'positive' ? 30 : 5,
      trust: sentiment === 'positive' ? 25 : 10,
      fear: 5,
      surprise: 10,
      sadness: sentiment === 'negative' ? 25 : 5,
      disgust: sentiment === 'negative' ? 15 : 5,
      anger: sentiment === 'negative' ? 25 : 5,
      anticipation: sentiment === 'positive' ? 15 : 10,
    },
    eviScore: Math.round(sentimentScore),
    npsScore: sentiment === 'positive' ? 50 : sentiment === 'negative' ? -50 : 0,
    csatScore: sentiment === 'positive' ? 4 : sentiment === 'negative' ? 2 : 3,
    cesScore: sentiment === 'positive' ? 4 : sentiment === 'negative' ? 2 : 3,
    keyInsights: [
      `Customer sentiment is ${sentiment}`,
      'Survey response received and analyzed',
    ],
    recommendations: [
      'Follow up with customer',
      'Document feedback for team review',
    ],
    category: 'General',
    urgency: sentiment === 'negative' ? 'high' : 'low',
    summary: `Survey response analyzed with ${sentiment} sentiment`,
    actionItems: [
      {
        action: 'Review customer feedback',
        priority: sentiment === 'negative' ? 'high' : 'low',
      },
    ],
  };
}
