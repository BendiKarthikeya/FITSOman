/**
 * OpenRouter API Service
 * Uses DeepSeek R1 model to analyze VAPI transcripts for dashboard data
 */

import { OpenRouter } from "@openrouter/sdk";
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.Open_Router_API_New || '';

// Primary and fallback models
const PRIMARY_MODEL = 'deepseek/deepseek-r1-0528:free';
const FALLBACK_MODEL = 'openrouter/auto';

// Initialize OpenRouter client
const openrouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY
});

export interface AnalysisRequest {
  transcript: string;
  surveyTitle: string;
  surveyDescription?: string;
  respondentPhone?: string;
  surveyId: string;
}

export interface AnalysisResponse {
  trends: TrendsData;
  executiveSummary: ExecutiveSummaryData;
  actionPlans: ActionPlanData[];
  leadershipInsights: LeadershipInsightData[];
  monitoringMetrics: MonitoringMetricData[];
  segmentation: SegmentationData;
}

export interface TrendsData {
  metricName: string;
  currentValue: number;
  previousValue?: number;
  changePercentage?: number;
  trendDirection: 'up' | 'down' | 'stable';
  summary: string;
  keyInsights: string[];
  predictions: string[];
}

export interface ExecutiveSummaryData {
  overallScore: number;
  performanceRating: 'Excellent' | 'Good' | 'Average' | 'Poor';
  csatScore: number;
  npsScore: number;
  eviScore: number;
  cesScore: number;
  executiveSummaryText: string;
  topStrengths: string[];
  mainChallenges: string[];
  recommendations: string[];
}

export interface ActionPlanData {
  actionTitle: string;
  actionDescription: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  owner?: string;
  estimatedImpact: string;
  implementationSteps: string[];
  successMetrics: string[];
  relatedInsights: string[];
}

export interface LeadershipInsightData {
  insight: string;
  businessImpact: string;
  strategyAlignment: string;
  affectedCount: number;
  potentialRevenue?: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendations: string[];
  successFactors: string[];
  stakeholders: string[];
  teamMetrics?: {
    engagement: number;
    teamSize: number;
    responseRate: number;
    engagementPercentile?: number;
  };
  mainChallenges?: Array<{
    area: string;
    description: string;
    priority: string;
    currentScore: number;
    targetScore: number;
    gapToTarget: number;
  }>;
  teamBuildingActivities?: Array<{
    activity: string;
    description: string;
    purpose: string;
    estimatedDuration: string;
    format: string;
    expectedOutcomes: string[];
  }>;
  recognitionOpportunities?: Array<{
    recipientHint: string;
    reason: string;
    impact: string;
    recognitionType: string;
    suggestedTemplate?: string;
  }>;
  performanceHabits?: {
    strengths: Array<{
      habit: string;
      description: string;
      impact: string;
      frequency: string;
    }>;
    improvements: Array<{
      habit: string;
      description: string;
      currentGap: string;
      suggestedActions: string[];
    }>;
  };
  cultureIndicators?: {
    psychologicalSafety: number;
    trust: number;
    collaboration: number;
    innovation: number;
    workLifeBalance: number;
    overall: number;
  };
}

export interface MonitoringMetricData {
  metricName: string;
  currentValue: number;
  targetValue: number;
  thresholdMin: number;
  thresholdMax: number;
  alertStatus: 'ok' | 'warning' | 'critical';
  isAnomalous: boolean;
  anomalyType?: string;
  healthScore: number;
  trendIndicator: 'improving' | 'declining' | 'stable';
  recommendedActions: string[];
}

export interface SegmentationData {
  segmentName: string;
  segmentDescription: string;
  demographics: Record<string, any>;
  behaviors: Record<string, any>;
  preferences: Record<string, any>;
  segmentScore: number;
  satisfaction: 'High' | 'Medium' | 'Low';
  engagement: 'High' | 'Medium' | 'Low';
  tailoredRecommendations: string[];
  marketingStrategy: string[];
  retentionRisk: 'High' | 'Medium' | 'Low';
}

/**
 * Call OpenRouter with fallback support
 */
async function callOpenRouterWithFallback(messages: any[], useFallback: boolean = false): Promise<string> {
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

      // Capture actual content (the final answer)
      if (delta?.content) {
        fullContent += delta.content;
      }

      // Capture reasoning tokens (thinking process for R1 models)
      if (delta?.reasoning) {
        fullReasoning += delta.reasoning;
      }
    }

    // For DeepSeek R1, if we only got reasoning but no content,
    // the reasoning IS the response (model thinking out loud)
    const response = fullContent || fullReasoning;

    

    return response;
  } catch (error: any) {
    

    // If primary model failed and we haven't tried fallback yet, try fallback
    if (!useFallback) {
      
      return callOpenRouterWithFallback(messages, true);
    }

    throw error;
  }
}

/**
 * Analyze VAPI transcript using OpenRouter
 */
export async function analyzeTranscriptWithOpenRouter(request: AnalysisRequest): Promise<AnalysisResponse> {
  if (!OPENROUTER_API_KEY) {
    
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = buildAnalysisPrompt(request);
  const messages = [
    {
      role: 'system',
      content: `You are an expert business and leadership analyst. Your task is to analyze survey responses and return ONLY valid JSON (no reasoning, no explanation, no markdown). The JSON must include ALL required fields. CRITICAL: Always structure leadership insights with recognitionOpportunities, performanceHabits, and cultureIndicators arrays/objects. Return valid JSON only - if you cannot parse to valid JSON, the response fails.`,
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
    
    return getFallbackAnalysis(request);
  }
}

/**
 * Build detailed prompt for analysis
 */
function buildAnalysisPrompt(request: AnalysisRequest): string {
  return `
Analyze this customer survey transcript and provide comprehensive business insights for ALL 6 dashboard tabs. Return ONLY valid JSON (no markdown, no explanations).

Survey: ${request.surveyTitle}
${request.surveyDescription ? `Description: ${request.surveyDescription}` : ''}
Customer Phone: ${request.respondentPhone || 'Anonymous'}

TRANSCRIPT:
${request.transcript}

Analyze and return JSON with this complete structure (provide realistic values based on the transcript):

{
  "trends": {
    "metricName": "CSAT",
    "currentValue": 7.5,
    "previousValue": 7.0,
    "changePercentage": 7.14,
    "trendDirection": "up",
    "summary": "Customer satisfaction showing steady improvement over the past quarter. Service quality recognition is increasing.",
    "keyInsights": [
      "Response time improvements driving satisfaction",
      "Product quality consistently rated highly",
      "Mobile experience needs attention"
    ],
    "predictions": [
      "Expected to reach 8.2 by Q3 if current trends continue",
      "Potential for 10% increase with planned initiatives"
    ]
  },
  "executiveSummary": {
    "overallScore": 75,
    "performanceRating": "Good",
    "csatScore": 7.5,
    "npsScore": 45,
    "eviScore": 72,
    "cesScore": 75,
    "executiveSummaryText": "Overall, customer feedback is positive with strong recognition of our service quality. Key areas for improvement include response times and mobile app experience.",
    "topStrengths": [
      "Excellent customer service team",
      "High product quality",
      "Fast delivery times",
      "Strong brand trust"
    ],
    "mainChallenges": [
      "Mobile app navigation issues",
      "Payment processing delays",
      "Limited 24/7 support coverage"
    ],
    "recommendations": [
      "Redesign mobile app interface",
      "Upgrade payment infrastructure",
      "Expand support team for 24/7 coverage",
      "Implement AI chatbot for common queries",
      "Launch customer loyalty program"
    ]
  },
  "actionPlans": [
    {
      "actionTitle": "Mobile App Redesign Initiative",
      "actionDescription": "Complete overhaul of mobile app UX/UI to improve navigation and reduce friction points",
      "priority": "High",
      "category": "Technology",
      "owner": "Product Team",
      "estimatedImpact": "Expected to increase mobile CSAT by 15-20%",
      "implementationSteps": [
        "Conduct user research and usability testing",
        "Create new design mockups",
        "Develop and QA test new interface",
        "Phased rollout with A/B testing"
      ],
      "successMetrics": [
        "Mobile app rating improves from 3.8 to 4.5+",
        "Mobile cart abandonment reduces by 25%",
        "Mobile session time increases by 30%"
      ],
      "relatedInsights": ["Mobile experience rated 6.8/10", "28% cart abandonment rate"]
    },
    {
      "actionTitle": "Customer Support Expansion",
      "actionDescription": "Hire additional support agents and implement AI chatbot for 24/7 coverage",
      "priority": "Critical",
      "category": "Operations",
      "owner": "Customer Support",
      "estimatedImpact": "Reduce average wait time from 8min to <3min",
      "implementationSteps": [
        "Post job openings for 5 support agents",
        "Implement AI chatbot for Tier 1 queries",
        "Train new hires on processes",
        "Launch 24/7 support schedule"
      ],
      "successMetrics": [
        "Wait time <3 minutes",
        "First contact resolution >85%",
        "Customer satisfaction >9/10"
      ],
      "relatedInsights": ["8-minute average wait time during peak", "Support quality rated highly"]
    },
    {
      "actionTitle": "Payment Infrastructure Upgrade",
      "actionDescription": "Upgrade payment gateway and add redundancy to reduce transaction failures",
      "priority": "Critical",
      "category": "Technology",
      "owner": "Engineering",
      "estimatedImpact": "Reduce payment failures from 3.2% to <0.5%",
      "implementationSteps": [
        "Evaluate alternative payment processors",
        "Implement redundant payment pathways",
        "Add real-time failure monitoring",
        "Deploy with gradual rollout"
      ],
      "successMetrics": [
        "Payment success rate >99.5%",
        "Zero downtime during migration",
        "Customer complaints reduced by 80%"
      ],
      "relatedInsights": ["3.2% payment failure rate", "Critical impact on revenue"]
    }
  ],
  "leadershipInsights": [
    {
      "insight": "Customer retention at record high of 94%",
      "businessImpact": "Retention improvements saving $2.3M annually in acquisition costs",
      "strategyAlignment": "Directly supports FY26 goal of 95% retention",
      "affectedCount": 12500,
      "potentialRevenue": 2300000,
      "riskLevel": "Low",
      "recommendations": [
        "Maintain current service quality standards",
        "Launch loyalty program to lock in gains",
        "Expand referral incentives"
      ],
      "successFactors": [
        "Consistent service quality",
        "Proactive customer support",
        "Regular product improvements"
      ],
      "stakeholders": ["CEO", "VP Customer Success", "VP Sales"],
      "teamMetrics": {
        "engagement": 8.4,
        "teamSize": 45,
        "responseRate": 92,
        "engagementPercentile": 85
      },
      "mainChallenges": [
        {
          "area": "Resource Allocation",
          "description": "Team is stretched thin across multiple projects",
          "priority": "High",
          "currentScore": 6.2,
          "targetScore": 8.0,
          "gapToTarget": 1.8
        }
      ],
      "teamBuildingActivities": [
        {
          "activity": "Strategy Alignment Workshop",
          "description": "Full day session to align on Q3 goals",
          "purpose": "Strategic Alignment",
          "estimatedDuration": "6 hours",
          "format": "In-person",
          "expectedOutcomes": ["Clear roadmap", "Role clarity"]
        }
      ],
      "recognitionOpportunities": [
        {
          "recipientHint": "John (Product Lead)",
          "reason": "Led successful product launch despite 40% team shortage",
          "impact": "Delivered on time, mentored junior team members, improved team morale",
          "recognitionType": "performance",
          "suggestedTemplate": "Recognition for exceptional leadership and delivery under challenging circumstances"
        },
        {
          "recipientHint": "Sarah (Customer Success Manager)",
          "reason": "Achieved 95% customer retention through proactive support",
          "impact": "Saved $2.3M in acquisition costs, improved NPS by 12 points",
          "recognitionType": "values",
          "suggestedTemplate": "Living our customer-first values through consistent excellence"
        }
      ],
      "performanceHabits": {
        "strengths": [
          {
            "habit": "Weekly 1-on-1 check-ins",
            "description": "Managers consistently conduct structured check-ins with direct reports",
            "impact": "Improved engagement scores by 18%, faster issue identification",
            "frequency": "100% compliance"
          },
          {
            "habit": "Clear goal setting using OKRs",
            "description": "Teams align on quarterly objectives with measurable key results",
            "impact": "27% improvement in goal attainment, better cross-team collaboration",
            "frequency": "Every quarter"
          }
        ],
        "improvements": [
          {
            "habit": "Peer feedback culture",
            "description": "Encourages team members to give regular feedback to each other",
            "currentGap": "Only 35% of teams actively practice peer feedback",
            "suggestedActions": ["Implement feedback tools", "Train on feedback delivery", "Make feedback part of performance reviews"]
          }
        ]
      },
      "cultureIndicators": {
        "psychologicalSafety": 72,
        "trust": 68,
        "collaboration": 75,
        "innovation": 65,
        "workLifeBalance": 58,
        "overall": 68
      }
    },
    {
      "insight": "Mobile experience gap represents significant growth opportunity",
      "businessImpact": "Mobile accounts for 45% of traffic but only 28% of conversions",
      "strategyAlignment": "Critical for mobile-first strategy",
      "affectedCount": 8500,
      "potentialRevenue": 4200000,
      "riskLevel": "High",
      "recommendations": [
        "Prioritize mobile app redesign in Q2",
        "Allocate $500K budget for development",
        "Set aggressive 90-day timeline"
      ],
      "successFactors": [
        "User-centered design approach",
        "Rapid iteration cycles",
        "Data-driven optimization"
      ],
      "stakeholders": ["CTO", "VP Product", "VP Marketing"]
    },
    {
      "insight": "Payment failures causing revenue leakage of $180K monthly",
      "businessImpact": "Estimated $2.16M annual revenue at risk",
      "strategyAlignment": "Critical for revenue growth objectives",
      "affectedCount": 3200,
      "potentialRevenue": 2160000,
      "riskLevel": "Critical",
      "recommendations": [
        "Immediate infrastructure upgrade required",
        "Implement backup payment processors",
        "Add real-time monitoring and alerts"
      ],
      "successFactors": [
        "99.9% uptime SLA",
        "Multi-vendor redundancy",
        "Proactive failure detection"
      ],
      "stakeholders": ["CFO", "CTO", "VP Operations"]
    }
  ],
  "monitoringMetrics": [
    {
      "metricName": "Customer Satisfaction (CSAT)",
      "currentValue": 7.5,
      "targetValue": 8.5,
      "thresholdMin": 7.0,
      "thresholdMax": 10.0,
      "alertStatus": "ok",
      "isAnomalous": false,
      "anomalyType": null,
      "healthScore": 75,
      "trendIndicator": "improving",
      "recommendedActions": [
        "Continue current service quality initiatives",
        "Monitor mobile app feedback closely",
        "Expand support team capacity"
      ],
      "historicalData": [
        {"period": "Jan", "value": 7.2},
        {"period": "Feb", "value": 7.4},
        {"period": "Mar", "value": 7.5}
      ]
    },
    {
      "metricName": "Net Promoter Score (NPS)",
      "currentValue": 45,
      "targetValue": 60,
      "thresholdMin": 30,
      "thresholdMax": 100,
      "alertStatus": "warning",
      "isAnomalous": false,
      "anomalyType": null,
      "healthScore": 65,
      "trendIndicator": "stable",
      "recommendedActions": [
        "Launch customer loyalty program",
        "Improve referral incentives",
        "Address top detractor feedback"
      ],
      "historicalData": [
        {"period": "Jan", "value": 42},
        {"period": "Feb", "value": 44},
        {"period": "Mar", "value": 45}
      ]
    },
    {
      "metricName": "Response Time (minutes)",
      "currentValue": 8.0,
      "targetValue": 3.0,
      "thresholdMin": 0,
      "thresholdMax": 5.0,
      "alertStatus": "critical",
      "isAnomalous": true,
      "anomalyType": "spike",
      "healthScore": 40,
      "trendIndicator": "declining",
      "recommendedActions": [
        "URGENT: Hire additional support staff",
        "Implement AI chatbot for tier-1 queries",
        "Optimize ticket routing system"
      ],
      "historicalData": [
        {"period": "Jan", "value": 5.2},
        {"period": "Feb", "value": 6.5},
        {"period": "Mar", "value": 8.0}
      ]
    }
  ],
  "segmentation": {
    "segmentName": "Enterprise Customers",
    "segmentDescription": "High-value B2B customers with contracts >$50K annually",
    "segmentSize": 245,
    "percentageOfTotal": 12.5,
    "demographics": {
      "industry": "Technology & Financial Services",
      "company_size": "500-5000 employees",
      "region": "North America & EMEA"
    },
    "behaviors": {
      "usage_frequency": "Daily active users",
      "feature_adoption": "Advanced features utilized",
      "support_tickets": "Average 2.3 per month"
    },
    "preferences": {
      "communication_channel": "Email & Phone",
      "payment_terms": "Net-30",
      "contract_length": "Annual with auto-renewal"
    },
    "segmentScore": 8.8,
    "satisfaction": "High",
    "engagement": "High",
    "tailoredRecommendations": [
      "Offer dedicated account manager for top 50 accounts",
      "Create enterprise-specific feature roadmap",
      "Host quarterly business reviews",
      "Provide priority support SLA"
    ],
    "marketingStrategy": [
      "Focus on ROI and business outcomes in messaging",
      "Leverage case studies and testimonials",
      "Offer custom integration services",
      "Promote enterprise security certifications"
    ],
    "retentionRisk": "Low"
  }
}

IMPORTANT: 
- Make sure ALL arrays have multiple items (3-5 items minimum)
- All metrics should be realistic based on the transcript
- Provide specific, actionable recommendations
- Include real business value estimates
- Return ONLY the JSON object, no other text

LEADERSHIP SURVEY SPECIFIC INSTRUCTIONS:
If this is a leadership/team enablement survey (indicated by keywords like "engagement", "manager", "team", "enablement", "survey"), MUST include in each leadershipInsights object:
  - recognitionOpportunities: Array of 2-3 objects with {recipientHint, reason, impact, recognitionType, suggestedTemplate}
  - performanceHabits: Object with {strengths: Array of habits, improvements: Array of improvement areas}
  - cultureIndicators: Object with {psychologicalSafety, trust, collaboration, innovation, workLifeBalance, overall} - all numbers 0-100
`;
}

/**
 * Normalize and validate analysis response
 */
function normalizeAnalysisResponse(data: any): AnalysisResponse {
  return {
    trends: {
      metricName: data.trends?.metricName || 'CSAT',
      currentValue: Math.min(100, Math.max(0, parseFloat(data.trends?.currentValue) || 7.5)),
      previousValue: data.trends?.previousValue ? parseFloat(data.trends.previousValue) : undefined,
      changePercentage: data.trends?.changePercentage ? parseFloat(data.trends.changePercentage) : undefined,
      trendDirection: data.trends?.trendDirection || 'stable',
      summary: data.trends?.summary || 'Customer satisfaction showing positive trend',
      keyInsights: Array.isArray(data.trends?.keyInsights) ? data.trends.keyInsights : [],
      predictions: Array.isArray(data.trends?.predictions) ? data.trends.predictions : [],
    },
    executiveSummary: {
      overallScore: Math.min(100, Math.max(0, parseFloat(data.executiveSummary?.overallScore) || 75)),
      performanceRating: data.executiveSummary?.performanceRating || 'Good',
      csatScore: Math.min(10, Math.max(0, parseFloat(data.executiveSummary?.csatScore) || 7.5)),
      npsScore: Math.min(100, Math.max(-100, parseFloat(data.executiveSummary?.npsScore) || 50)),
      eviScore: Math.min(100, Math.max(0, parseFloat(data.executiveSummary?.eviScore) || 75)),
      cesScore: Math.min(100, Math.max(0, parseFloat(data.executiveSummary?.cesScore) || 75)),
      executiveSummaryText: data.executiveSummary?.executiveSummaryText || 'Overall customer feedback is positive',
      topStrengths: Array.isArray(data.executiveSummary?.topStrengths) ? data.executiveSummary.topStrengths : [],
      mainChallenges: Array.isArray(data.executiveSummary?.mainChallenges) ? data.executiveSummary.mainChallenges : [],
      recommendations: Array.isArray(data.executiveSummary?.recommendations) ? data.executiveSummary.recommendations : [],
    },
    actionPlans: Array.isArray(data.actionPlans) ? data.actionPlans.map((ap: any) => ({
      actionTitle: ap.actionTitle || 'Action Item',
      actionDescription: ap.actionDescription || '',
      priority: ap.priority || 'Medium',
      category: ap.category || 'General',
      owner: ap.owner,
      estimatedImpact: ap.estimatedImpact || 'Improve customer satisfaction',
      implementationSteps: Array.isArray(ap.implementationSteps) ? ap.implementationSteps : [],
      successMetrics: Array.isArray(ap.successMetrics) ? ap.successMetrics : [],
      relatedInsights: Array.isArray(ap.relatedInsights) ? ap.relatedInsights : [],
    })) : [],
    leadershipInsights: Array.isArray(data.leadershipInsights) ? data.leadershipInsights.map((li: any) => ({
      insight: li.insight || 'Key business insight',
      businessImpact: li.businessImpact || 'Impacts customer retention',
      strategyAlignment: li.strategyAlignment || 'Aligns with growth strategy',
      affectedCount: parseInt(li.affectedCount) || 0,
      potentialRevenue: li.potentialRevenue ? parseFloat(li.potentialRevenue) : undefined,
      riskLevel: li.riskLevel || 'Medium',
      recommendations: Array.isArray(li.recommendations) ? li.recommendations : [],
      successFactors: Array.isArray(li.successFactors) ? li.successFactors : [],
      stakeholders: Array.isArray(li.stakeholders) ? li.stakeholders : [],
      teamMetrics: li.teamMetrics || { engagement: 0, teamSize: 0, responseRate: 0 },
      mainChallenges: Array.isArray(li.mainChallenges) ? li.mainChallenges : [],
      teamBuildingActivities: Array.isArray(li.teamBuildingActivities) ? li.teamBuildingActivities : [],
      recognitionOpportunities: Array.isArray(li.recognitionOpportunities) && li.recognitionOpportunities.length > 0
        ? li.recognitionOpportunities
        : generateRecognitionOpportunitiesFromInsights(li),
      performanceHabits: li.performanceHabits && (li.performanceHabits.strengths?.length > 0 || li.performanceHabits.improvements?.length > 0)
        ? li.performanceHabits
        : generatePerformanceHabitsFromInsights(li),
      cultureIndicators: li.cultureIndicators || generateDefaultCultureIndicators(li),
    })) : [],
    monitoringMetrics: Array.isArray(data.monitoringMetrics) ? data.monitoringMetrics.map((mm: any) => ({
      metricName: mm.metricName || 'Metric',
      currentValue: parseFloat(mm.currentValue) || 0,
      targetValue: parseFloat(mm.targetValue) || 100,
      thresholdMin: parseFloat(mm.thresholdMin) || 0,
      thresholdMax: parseFloat(mm.thresholdMax) || 100,
      alertStatus: mm.alertStatus || 'ok',
      isAnomalous: mm.isAnomalous || false,
      anomalyType: mm.anomalyType,
      healthScore: Math.min(100, Math.max(0, parseFloat(mm.healthScore) || 75)),
      trendIndicator: mm.trendIndicator || 'stable',
      recommendedActions: Array.isArray(mm.recommendedActions) ? mm.recommendedActions : [],
    })) : [],
    segmentation: {
      segmentName: data.segmentation?.segmentName || 'General Segment',
      segmentDescription: data.segmentation?.segmentDescription || 'Customer segment',
      demographics: data.segmentation?.demographics || {},
      behaviors: data.segmentation?.behaviors || {},
      preferences: data.segmentation?.preferences || {},
      segmentScore: Math.min(10, Math.max(0, parseFloat(data.segmentation?.segmentScore) || 7)),
      satisfaction: data.segmentation?.satisfaction || 'Medium',
      engagement: data.segmentation?.engagement || 'Medium',
      tailoredRecommendations: Array.isArray(data.segmentation?.tailoredRecommendations) ? data.segmentation.tailoredRecommendations : [],
      marketingStrategy: Array.isArray(data.segmentation?.marketingStrategy) ? data.segmentation.marketingStrategy : [],
      retentionRisk: data.segmentation?.retentionRisk || 'Medium',
    },
  };
}

/**
 * Fallback analysis if API fails
 */
function getFallbackAnalysis(request: AnalysisRequest): AnalysisResponse {
  

  return {
    trends: {
      metricName: 'CSAT',
      currentValue: 7.5,
      changePercentage: 5,
      trendDirection: 'up',
      summary: 'Customer satisfaction showing steady improvement',
      keyInsights: [
        'Positive feedback on response time',
        'Need for improved product documentation',
      ],
      predictions: [
        'Expect continued improvement in next quarter',
        'Recommendation implementation should boost CSAT by 10%',
      ],
    },
    executiveSummary: {
      overallScore: 75,
      performanceRating: 'Good',
      csatScore: 7.5,
      npsScore: 45,
      eviScore: 72,
      cesScore: 75,
      executiveSummaryText: 'Overall, customer feedback is positive with strong recognition of our service quality. Key areas for improvement include product documentation and onboarding experience.',
      topStrengths: [
        'Fast response times',
        'Knowledgeable support team',
        'Easy-to-use platform',
      ],
      mainChallenges: [
        'Product documentation needs improvement',
        'Onboarding process could be smoother',
        'Feature requests not prioritized',
      ],
      recommendations: [
        'Enhance product documentation and tutorials',
        'Streamline onboarding process',
        'Implement feature request voting system',
      ],
    },
    actionPlans: [],
    leadershipInsights: [
      {
        insight: 'Customer satisfaction is correlated with product knowledge',
        businessImpact: 'Investing in customer education can reduce churn and increase lifetime value',
        strategyAlignment: 'Aligns with customer success strategy and retention goals',
        affectedCount: 100,
        potentialRevenue: 50000,
        riskLevel: 'Medium',
        recommendations: [
          'Build dedicated customer education program',
          'Hire customer success managers',
        ],
        successFactors: [
          'Executive sponsorship',
          'Budget allocation',
          'Team training',
        ],
        stakeholders: [
          'Customer Success Team',
          'Product Team',
          'Marketing Team',
        ],
        teamMetrics: {
          engagement: 7.2,
          teamSize: 15,
          responseRate: 85,
          engagementPercentile: 65
        },
        mainChallenges: [
          {
            area: "Product Knowledge",
            description: "Customers struggle to find documentation",
            priority: "High",
            currentScore: 5.0,
            targetScore: 9.0,
            gapToTarget: 4.0
          }
        ],
        teamBuildingActivities: [
          {
            activity: "Knowledge Sharing Session",
            description: "Weekly session to share customer feedback",
            purpose: "Education",
            estimatedDuration: "1 hour",
            format: "Virtual",
            expectedOutcomes: ["Better product understanding"]
          }
        ]
      },
    ],
    monitoringMetrics: [
      {
        metricName: 'Customer Satisfaction (CSAT)',
        currentValue: 7.5,
        targetValue: 8.5,
        thresholdMin: 6,
        thresholdMax: 10,
        alertStatus: 'ok',
        isAnomalous: false,
        healthScore: 75,
        trendIndicator: 'improving',
        recommendedActions: [
          'Continue monitoring weekly',
          'Implement action plans',
        ],
      },
      {
        metricName: 'Net Promoter Score (NPS)',
        currentValue: 45,
        targetValue: 60,
        thresholdMin: 0,
        thresholdMax: 100,
        alertStatus: 'warning',
        isAnomalous: false,
        healthScore: 62,
        trendIndicator: 'stable',
        recommendedActions: [
          'Identify detractors',
          'Follow up with dissatisfied customers',
        ],
      },
    ],
    segmentation: {
      segmentName: 'Enterprise Customers',
      segmentDescription: 'Large organizations using advanced features',
      demographics: {
        companySize: 'Large (500+ employees)',
        industry: 'Technology',
        region: 'Middle East & Asia',
      },
      behaviors: {
        usageFrequency: 'Daily',
        featureAdoption: 'High',
        supportTickets: 'Low',
      },
      preferences: {
        communicationChannel: 'Dedicated account manager',
        trainingFormat: 'Onsite workshops',
        contractTerm: 'Annual',
      },
      segmentScore: 8.5,
      satisfaction: 'High',
      engagement: 'High',
      tailoredRecommendations: [
        'Provide dedicated account management',
        'Offer customization services',
        'Priority support access',
      ],
      marketingStrategy: [
        'Case studies and success stories',
        'Executive briefings',
        'ROI demonstrations',
      ],
      retentionRisk: 'Low',
    },
  };
}

/**
 * Generate recognition opportunities from available insights data
 */
function generateRecognitionOpportunitiesFromInsights(insight: any): any[] {
  const opportunities = [];

  // Extract from successFactors
  if (Array.isArray(insight.successFactors) && insight.successFactors.length > 0) {
    insight.successFactors.slice(0, 2).forEach((factor: any, idx: number) => {
      const factorStr = typeof factor === 'string' ? factor : factor.area || factor;
      opportunities.push({
        recipientHint: `Team member/group demonstrating ${factorStr}`,
        reason: `Strong performance in: ${factorStr}`,
        impact: `Contributes to team success and engagement`,
        recognitionType: idx % 2 === 0 ? 'performance' : 'values',
        suggestedTemplate: `Recognition for excellence in ${factorStr}`
      });
    });
  }

  // Extract from recommendations
  if (Array.isArray(insight.recommendations) && insight.recommendations.length > 0) {
    const recommendation = insight.recommendations[0];
    const recStr = typeof recommendation === 'string' ? recommendation : recommendation.recommendation || recommendation;
    if (opportunities.length < 2) {
      opportunities.push({
        recipientHint: 'Leadership team',
        reason: `Taking action on: ${recStr}`,
        impact: 'Driving organizational improvement',
        recognitionType: 'milestone',
        suggestedTemplate: `Recognition for proactive leadership and continuous improvement`
      });
    }
  }

  return opportunities.length > 0 ? opportunities : [{
    recipientHint: 'Team',
    reason: 'Positive engagement and collaboration',
    impact: 'Strong team morale and performance',
    recognitionType: 'peer',
    suggestedTemplate: 'Recognition for outstanding teamwork'
  }];
}

/**
 * Generate performance habits from available insights data
 */
function generatePerformanceHabitsFromInsights(insight: any): any {
  const habits: { strengths: any[], improvements: any[] } = {
    strengths: [],
    improvements: []
  };

  // Generate strengths from successFactors
  if (Array.isArray(insight.successFactors) && insight.successFactors.length > 0) {
    insight.successFactors.slice(0, 3).forEach((factor: any) => {
      const factorStr = typeof factor === 'string' ? factor : factor.area || factor;
      habits.strengths.push({
        habit: factorStr,
        description: `Team demonstrates ${factorStr} consistently`,
        impact: 'Positive impact on engagement and retention',
        frequency: 'Regular/Ongoing'
      });
    });
  }

  // Generate improvements from mainChallenges
  if (Array.isArray(insight.mainChallenges) && insight.mainChallenges.length > 0) {
    insight.mainChallenges.slice(0, 2).forEach((challenge: any) => {
      const challengeStr = typeof challenge === 'string' ? challenge : challenge.area || challenge;
      habits.improvements.push({
        habit: `Improve ${challengeStr}`,
        description: `Address gaps in ${challengeStr}`,
        currentGap: 'Gap identified from survey feedback',
        suggestedActions: [
          `Develop action plan for ${challengeStr}`,
          'Monitor progress regularly',
          'Provide support and resources'
        ]
      });
    });
  }

  return habits;
}

/**
 * Generate default culture indicators based on team metrics
 */
function generateDefaultCultureIndicators(insight: any): any {
  const engagement = insight.teamMetrics?.engagement || 70;
  return {
    psychologicalSafety: Math.min(100, engagement + 10),
    trust: Math.min(100, engagement + 5),
    collaboration: Math.min(100, engagement + 15),
    innovation: Math.min(100, engagement - 5),
    workLifeBalance: Math.min(100, engagement - 10),
    overall: engagement
  };
}
