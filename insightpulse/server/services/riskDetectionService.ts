/**
 * Risk Detection Service
 * Detects high-risk indicators in open-text survey comments
 * Uses LLM + keyword analysis for comprehensive detection
 */

import { db } from '../db';
import { responses, riskDetectionBatches, riskDetectionResults } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { OpenRouter } from "@openrouter/sdk";
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.Open_Router_API_New || '';

// Initialize OpenRouter client
const openrouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY
});

const PRIMARY_MODEL = 'google/gemini-2.0-flash-001';
const FALLBACK_MODEL = 'meta-llama/llama-3-8b-instruct:free';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type RiskCategory = 'safety' | 'legal' | 'churn' | 'compliance' | 'mental_health' | 'harassment' | 'financial_stress' | 'health_concerns' | 'relationship_issues' | 'substance_abuse' | 'other';

export interface RiskIndicator {
  indicator: string;
  category: RiskCategory;
  severity: RiskLevel;
  trigger: string;
  confidence: number; // 0-100
  description: string;
  quote?: string;
}

export interface RiskAnalysisResult {
  hasRisks: boolean;
  overallRiskLevel: RiskLevel;
  riskScore: number; // 0-100
  riskCategories: RiskCategory[];
  indicators: RiskIndicator[];
  riskAnalysis: string; // Summary of specific findings
  recommendations: string[];
  requiresManualReview: boolean;
  flaggedAt: Date;
}

/**
 * Call OpenRouter LLM with streaming
 */
/**
 * Call LLM with timeout
 */
async function callLLMForRiskAnalysis(prompt: string, systemPrompt: string): Promise<string> {
  console.log('[RiskDetection] Setting up timeout for API call...');

  const apiCall = async () => {
    console.log('[RiskDetection] Calling OpenRouter LLM for analysis...');
    const startTime = Date.now();

    // This is where it might hang - wrap the entire call
    const stream = await openrouter.chat.send({
      model: PRIMARY_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
      temperature: 0.7,
      maxTokens: 2000,
    });

    console.log(`[RiskDetection] Stream opened after ${Date.now() - startTime}ms`);
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

    const elapsed = Date.now() - startTime;
    console.log(`[RiskDetection] LLM response received successfully after ${elapsed}ms`);
    return fullContent || fullReasoning;
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.error('[RiskDetection] ⏰ TIMEOUT: API call exceeded 120 seconds, aborting...');
      reject(new Error('LLM API call timed out after 120 seconds'));
    }, 120000);
  });

  try {
    // CRITICAL: The timeout needs to win if apiCall hangs indefinitely
    console.log('[RiskDetection] Racing API call vs 120s timeout...');
    const result = await Promise.race([apiCall(), timeoutPromise]);
    console.log('[RiskDetection] ✅ API call completed before timeout');
    return result;
  } catch (error) {
    console.error('[RiskDetection] Primary model failed, trying fallback:', error);

    try {
      // Add timeout for fallback too
      const fallbackTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Fallback LLM API call timed out')), 60000);
      });

      const fallbackCall = async () => {
        const fallbackStream = await openrouter.chat.send({
          model: FALLBACK_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: true,
          temperature: 0.7,
          maxTokens: 2000,
        });

        let fallbackContent = '';

        for await (const chunk of fallbackStream) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) {
            fallbackContent += delta.content;
          }
        }

        console.log('[RiskDetection] Fallback model response received');
        return fallbackContent;
      };

      return await Promise.race([fallbackCall(), fallbackTimeoutPromise]);
    } catch (fallbackError) {
      console.error('[RiskDetection] Fallback model also failed:', fallbackError);
      throw new Error('Both primary and fallback LLM models failed');
    }
  }
}

/**
 * Start batch risk detection for a survey
 * Processes responses in batches of 50
 */
export async function startRiskDetectionBatch(
  surveyId: string,
  userId: string,
  batchSize: number = 50
) {
  try {
    // Get all responses for the survey
    const surveyResponses = await db
      .select()
      .from(responses)
      .where(eq(responses.surveyId, surveyId));

    const totalResponses = surveyResponses.length;

    if (totalResponses === 0) {
      return {
        success: false,
        message: 'No responses found for this survey',
      };
    }

    // Create batch record
    const [batch] = await db
      .insert(riskDetectionBatches)
      .values({
        surveyId,
        status: 'processing',
        totalResponses,
        processedResponses: 0,
        batchSize,
        createdBy: userId,
      })
      .returning();

    console.log(`[RiskDetection] Started batch ${batch.id} for survey ${surveyId}`);
    console.log(`[RiskDetection] Total responses: ${totalResponses}`);

    // Queue background processing with error handling
    processRiskDetectionBatchInBackground(batch.id, surveyId, surveyResponses, batchSize)
      .catch(async (error) => {
        console.error(`[RiskDetection] Uncaught error in background processing:`, error);
        // Mark batch as failed if there's an uncaught error
        try {
          await db
            .update(riskDetectionBatches)
            .set({
              status: 'failed',
              errorMessage: String(error),
            })
            .where(eq(riskDetectionBatches.id, batch.id));
        } catch (updateError) {
          console.error(`[RiskDetection] Failed to update batch status:`, updateError);
        }
      });

    return {
      success: true,
      batchId: batch.id,
      totalResponses,
      message: `Batch processing started. Processing ${totalResponses} responses in groups of ${batchSize}.`,
    };
  } catch (error) {
    console.error('[RiskDetection] Error starting batch:', error);
    return {
      success: false,
      message: 'Error starting batch detection',
      error: String(error),
    };
  }
}

/**
 * Process batch in background
 * Handles all 50-response batches for the survey
 */
async function processRiskDetectionBatchInBackground(
  batchId: string,
  surveyId: string,
  surveyResponses: any[],
  batchSize: number = 50
) {
  console.log(`\n🚀 [RiskDetection] BACKGROUND PROCESS STARTED for batch ${batchId}`);
  console.log(`[RiskDetection] Process ID: ${process.pid}`);
  console.log(`[RiskDetection] Timestamp: ${new Date().toISOString()}`);
  console.log(`[RiskDetection] Survey: ${surveyId}, Responses: ${surveyResponses.length}\n`);

  try {
    let processedCount = 0;
    let riskDetectedCount = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    const allRiskCategories = new Set<string>();
    const allRiskIndicators: any[] = [];

    // Collect all responses text for batch analysis
    console.log(`[RiskDetection] Collecting all response texts for combined analysis...`);
    const allResponses = surveyResponses.map((response, idx) => {
      const answers = response.answers as Record<string, any>;

      // Filter to ONLY text comments (exclude ratings, numbers, short answers)
      const textComments = Object.entries(answers)
        .filter(([key, value]) => {
          // Only include if it's a string
          if (typeof value !== 'string') return false;

          // Skip numeric-only values (ratings like "5", "4.5")
          if (/^\d+(\.\d+)?$/.test(value.trim())) return false;

          // Skip very short answers (less than 10 characters)
          if (value.trim().length < 10) return false;

          // Skip single words
          if (!value.includes(' ')) return false;

          return true;
        })
        .map(([key, value]) => `Response ${idx + 1}: ${value}`)
        .join('\n');

      return { responseId: response.id, text: textComments, answers };
    });

    // Filter out responses with no text comments
    const responsesWithText = allResponses.filter(r => r.text.trim().length > 0);

    if (responsesWithText.length === 0) {
      console.log('[RiskDetection] No text comments found in responses, skipping batch');
      await db
        .update(riskDetectionBatches)
        .set({
          status: 'completed',
          processedResponses: 0,
          completedAt: new Date()
        })
        .where(eq(riskDetectionBatches.id, batchId));
      return { batchId, status: 'completed' };
    }

    const combinedText = responsesWithText.map(r => r.text).join('\n\n');

    console.log(`[RiskDetection] Filtered to ${responsesWithText.length} responses with text comments`);
    console.log(`[RiskDetection] Combined text length: ${combinedText.length} characters`);

    // Do ONE combined analysis for the entire batch
    console.log(`[RiskDetection] Analyzing ${responsesWithText.length} text responses as a batch...`);
    const batchAnalysis = await analyzeBatchRisks(combinedText, responsesWithText.length);

    // Safety check to ensure proper structure
    if (!batchAnalysis || !batchAnalysis.indicators || !Array.isArray(batchAnalysis.riskCategories)) {
      console.error('[RiskDetection] Invalid batch analysis result, aborting batch');
      await db
        .update(riskDetectionBatches)
        .set({
          status: 'failed',
          errorMessage: 'Invalid analysis result structure'
        })
        .where(eq(riskDetectionBatches.id, batchId));
      return { batchId, status: 'error' };
    }

    console.log('[RiskDetection] Batch analysis result:', {
      hasRisks: batchAnalysis.hasRisks,
      riskLevel: batchAnalysis.overallRiskLevel,
      score: batchAnalysis.riskScore,
      keyPoints: batchAnalysis.indicators.length,
    });

    // Store individual response data with reference to batch analysis
    // Only process responses that had text comments
    for (let i = 0; i < responsesWithText.length; i++) {
      const response = responsesWithText[i];
      const surveyResponse = surveyResponses.find(sr => sr.id === response.responseId);

      if (!surveyResponse) continue;

      try {
        // Determine individual risk level based on batch findings
        const hasRisks = batchAnalysis.hasRisks;
        const riskLevel = batchAnalysis.overallRiskLevel;

        // Store result
        await db.insert(riskDetectionResults).values({
          batchId,
          responseId: response.responseId,
          surveyId,
          hasRisks,
          riskLevel,
          riskScore: batchAnalysis.riskScore,
          riskCategories: batchAnalysis.riskCategories,
          riskIndicators: batchAnalysis.indicators as any,
          riskAnalysis: batchAnalysis.riskAnalysis,
          recommendations: batchAnalysis.recommendations as any,
          analyzedComments: Object.keys(response.answers),
        });

        // Update response with risk info
        await db
          .update(responses)
          .set({
            hasRisks,
            riskLevel,
            riskScore: batchAnalysis.riskScore,
            riskCategories: batchAnalysis.riskCategories,
            riskIndicators: batchAnalysis.indicators as any,
            riskAnalysis: batchAnalysis.riskAnalysis,
            riskRecommendations: batchAnalysis.recommendations as any,
            requiresManualReview: batchAnalysis.requiresManualReview,
          })
          .where(eq(responses.id, response.responseId));

        processedCount++;
        if (hasRisks) riskDetectedCount++;
        if (riskLevel === 'critical') criticalCount++;
        if (riskLevel === 'high') highCount++;
        if (riskLevel === 'medium') mediumCount++;
        if (riskLevel === 'low') lowCount++;

        // Safely add risk categories
        if (Array.isArray(batchAnalysis.riskCategories)) {
          batchAnalysis.riskCategories.forEach(c => allRiskCategories.add(c));
        }
      } catch (error) {
        console.error(`[RiskDetection] Error storing response ${response.responseId}:`, error);
        processedCount++;
      }
    }

    // Update batch progress
    await db
      .update(riskDetectionBatches)
      .set({
        processedResponses: processedCount,
      })
      .where(eq(riskDetectionBatches.id, batchId));

    console.log(
      `[RiskDetection] Batch progress: ${processedCount}/${surveyResponses.length}`
    );

    // Generate summary from batch analysis
    const summary = {
      riskDetectedCount,
      categoryCounts: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      topCategories: Array.from(allRiskCategories).slice(0, 5),
      keyFindings: batchAnalysis.indicators.map((ind: any) => ({
        indicator: ind.indicator,
        category: ind.category,
        quote: ind.quote,
        severity: ind.severity,
      })),
      recommendations: batchAnalysis.recommendations,
    };

    // Mark batch as completed
    await db
      .update(riskDetectionBatches)
      .set({
        status: 'completed',
        processedResponses: processedCount,
        riskDetectedCount,
        criticalRiskCount: criticalCount,
        highRiskCount: highCount,
        mediumRiskCount: mediumCount,
        lowRiskCount: lowCount,
        summary: summary as any,
        completedAt: new Date(),
      })
      .where(eq(riskDetectionBatches.id, batchId));

    console.log(`[RiskDetection] Batch ${batchId} completed successfully`);
    console.log(`[RiskDetection] Summary:`, summary);
  } catch (error) {
    console.error('[RiskDetection] Batch processing failed:', error);

    await db
      .update(riskDetectionBatches)
      .set({
        status: 'failed',
        errorMessage: String(error),
        completedAt: new Date(),
      })
      .where(eq(riskDetectionBatches.id, batchId));
  }
}

/**
 * Get batch status
 */
export async function getBatchStatus(batchId: string) {
  const batch = await db
    .select()
    .from(riskDetectionBatches)
    .where(eq(riskDetectionBatches.id, batchId))
    .then(results => results[0]);

  if (!batch) {
    return null;
  }

  // Check for stale processing - auto-fail if older than 5 minutes
  if (batch.status === 'processing') {
    const startTime = new Date(batch.startedAt || 0).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - startTime > fiveMinutes) {
      console.log(`[RiskDetection] Batch ${batchId} is stale (running > 5m). Marking as failed.`);

      await db
        .update(riskDetectionBatches)
        .set({
          status: 'failed',
          errorMessage: 'Batch processing timed out (exceeded 5 minutes)',
          completedAt: new Date()
        })
        .where(eq(riskDetectionBatches.id, batchId));

      // Return updated failed status
      return {
        batch: { ...batch, status: 'failed', errorMessage: 'Batch processing timed out (exceeded 5 minutes)' },
        results: [],
        progressPercentage: 0
      };
    }
  }

  const results = await db
    .select()
    .from(riskDetectionResults)
    .where(eq(riskDetectionResults.batchId, batchId));

  return {
    batch,
    results,
    progressPercentage: batch.totalResponses > 0
      ? Math.round(((batch.processedResponses || 0) / batch.totalResponses) * 100)
      : 0,
  };
}

/**
 * Get survey risk summary
 */
export async function getSurveyRiskSummary(surveyId: string) {
  const batches = await db
    .select()
    .from(riskDetectionBatches)
    .where(eq(riskDetectionBatches.surveyId, surveyId))
    .orderBy(riskDetectionBatches.startedAt);

  const latestBatch = batches[batches.length - 1];

  if (!latestBatch) {
    return null;
  }

  // Get one sample result to extract the batch-level analysis
  const sampleResult = await db
    .select()
    .from(riskDetectionResults)
    .where(eq(riskDetectionResults.batchId, latestBatch.id))
    .limit(1);

  const riskCounts = {
    critical: latestBatch.criticalRiskCount || 0,
    high: latestBatch.highRiskCount || 0,
    medium: latestBatch.mediumRiskCount || 0,
    low: latestBatch.lowRiskCount || 0,
    none: latestBatch.totalResponses - (latestBatch.riskDetectedCount || 0),
  };

  // Extract batch-level indicators and analysis from the sample
  const batchData = sampleResult[0] || null;

  return {
    batch: latestBatch,
    riskCounts,
    // Return batch-level findings, not individual results
    keyFindings: batchData?.riskIndicators || [],
    riskAnalysis: batchData?.riskAnalysis || 'Analysis pending',
    recommendations: batchData?.recommendations || [],
    riskCategories: batchData?.riskCategories || [],
  };
}


const RISK_PATTERNS = {
  safety: {
    keywords: [
      'suicide', 'kill myself', 'end my life', 'self harm', 'hurt myself',
      'violence', 'violent', 'harm others', 'threat', 'threatening',
      'attack', 'assault', 'weapon', 'gun', 'knife', 'dangerous'
    ],
    phrases: [
      'want to kill', 'harm myself', 'end it all', 'no point living',
      'kill myself', 'threatening to', 'going to hurt'
    ],
    severity: 'critical' as RiskLevel
  },

  legal: {
    keywords: [
      'lawsuit', 'sue', 'court', 'lawyer', 'attorney', 'legal action',
      'complaint', 'violation', 'breach', 'copyright', 'patent',
      'infringement', 'fraud', 'illegal', 'unlawful'
    ],
    phrases: [
      'taking legal action', 'suing for', 'filing a complaint',
      'breach of contract', 'court case', 'consulting lawyer'
    ],
    severity: 'high' as RiskLevel
  },

  churn: {
    keywords: [
      'leaving', 'quitting', 'resign', 'quit', 'exit', 'leave',
      'switch', 'competitor', 'alternative', 'found another',
      'moving to', 'switching to', 'considering leaving',
      'looking elsewhere', 'dissatisfied', 'disappointed', 'frustrated'
    ],
    phrases: [
      'planning to leave', 'will be leaving', 'about to quit',
      'switching to competitor', 'found better', 'moving to rival',
      'very dissatisfied with', 'extremely disappointed', 'fed up with'
    ],
    severity: 'high' as RiskLevel
  },

  compliance: {
    keywords: [
      'data breach', 'security', 'privacy', 'gdpr', 'ccpa', 'pci',
      'encrypted', 'password', 'hacked', 'compromised', 'vulnerability',
      'exposure', 'compliance', 'regulatory', 'audit', 'scandal'
    ],
    phrases: [
      'data was compromised', 'security breach', 'privacy violation',
      'not encrypted', 'personal data', 'unauthorized access',
      'regulatory investigation', 'compliance issue'
    ],
    severity: 'high' as RiskLevel
  },

  mental_health: {
    keywords: [
      'depressed', 'depression', 'anxiety', 'stressed', 'burnout',
      'overwhelmed', 'hopeless', 'worthless', 'exhausted', 'broken',
      'crying', 'sad', 'lonely', 'isolated', 'help', 'crisis'
    ],
    phrases: [
      'feeling depressed', 'having anxiety', 'complete burnout',
      'feel hopeless', 'can\'t cope', 'falling apart', 'need help'
    ],
    severity: 'high' as RiskLevel
  },

  harassment: {
    keywords: [
      'harassment', 'bullying', 'discriminated', 'discrimination',
      'mistreated', 'abuse', 'abused', 'racist', 'sexist', 'homophobic',
      'offensive', 'disrespectful', 'insulted', 'humiliated', 'intimidated'
    ],
    phrases: [
      'being harassed', 'bullied by', 'discriminated against',
      'facing discrimination', 'subject to', 'called out', 'laughed at'
    ],
    severity: 'high' as RiskLevel
  }
};

// Negative sentiment intensifiers
const INTENSITY_AMPLIFIERS = [
  'extremely', 'absolutely', 'completely', 'totally', 'very', 'really',
  'so', 'awful', 'terrible', 'horrible', 'worst', 'never', 'always'
];

/**
 * Combine multiple risk indicators into overall assessment
 */
function calculateOverallRiskLevel(indicators: RiskIndicator[]): RiskLevel {
  if (indicators.length === 0) return 'none';

  const hasCritical = indicators.some(i => i.severity === 'critical');
  if (hasCritical) return 'critical';

  const hasHigh = indicators.some(i => i.severity === 'high');
  if (hasHigh) return 'high';

  const hasMedium = indicators.some(i => i.severity === 'medium');
  if (hasMedium) return 'medium';

  return 'low';
}

/**
 * Convert risk level to numeric score (0-100)
 */
function riskLevelToScore(level: RiskLevel): number {
  const scores = {
    'critical': 90,
    'high': 70,
    'medium': 50,
    'low': 25,
    'none': 0
  };
  return scores[level];
}

/**
 * Check if text contains intensity amplifiers
 */
function hasIntensityAmplifiers(text: string): boolean {
  const lowercaseText = text.toLowerCase();
  return INTENSITY_AMPLIFIERS.some(amplifier => lowercaseText.includes(amplifier));
}

/**
 * Analyze entire batch of responses together for aggregate insights
 * Extract 5-6 key risk points from across all responses
 */
export async function analyzeBatchRisks(combinedText: string, responseCount: number): Promise<RiskAnalysisResult> {
  if (!combinedText || combinedText.trim().length === 0) {
    return {
      hasRisks: false,
      overallRiskLevel: 'none',
      riskScore: 0,
      riskCategories: [],
      indicators: [],
      riskAnalysis: 'No text content to analyze',
      recommendations: [],
      requiresManualReview: false,
      flaggedAt: new Date(),
    };
  }

  try {
    const systemPrompt = `You are an expert in analyzing organizational survey data for high-risk indicators. Analyze ALL ${responseCount} survey responses together to identify the top 5-6 MOST SIGNIFICANT risk patterns across the entire organization.

IMPORTANT: 
- Extract SPECIFIC quotes from the actual responses that show concerning patterns
- Identify themes that appear across multiple responses
- Focus on actionable organizational insights
- Return ONLY valid JSON (no markdown, no explanations)`;

    const userPrompt = `Analyze these ${responseCount} survey responses and extract the 5-6 MOST SIGNIFICANT risk patterns across the organization.

ALL RESPONSES:
${combinedText}

Return ONLY valid JSON (no markdown):
{
  "hasRisks": boolean,
  "riskLevel": "critical" | "high" | "medium" | "low" | "none",
  "riskScore": number (0-100),
  "riskCategories": ["depression", "anxiety", "financial_stress", "relationship_issues", "health_concerns", "substance_abuse", "violence", "other"],
  "riskIndicators": [
    {
      "indicator": "Description of the key risk pattern found",
      "category": "one of the categories above",
      "confidence": number (0-100),
      "severity": "critical" | "high" | "medium" | "low",
      "quote": "SPECIFIC QUOTE from responses that exemplifies this risk"
    }
  ],
  "riskAnalysis": "3-4 sentences summarizing the OVERALL risk situation across all ${responseCount} responses. What are the main organizational concerns?",
  "recommendations": [
    "Organizational-level action based on the aggregate findings",
    "Another specific recommendation for the organization",
    "Third organizational recommendation"
  ]
}

CRITICAL REQUIREMENTS:
- riskIndicators: Extract 5-6 KEY organizational risk patterns with actual quotes
- Each quote should be representative example from the responses
- riskAnalysis: Summarize OVERALL organizational risk situation
- recommendations: Organizational-level actions (not individual)

SCORING:
- 80-100 (critical): Widespread crisis issues, multiple severe concerns
- 60-79 (high): Significant organizational problems affecting many
- 40-59 (medium): Moderate concerns across some areas
- 1-39 (low): Minor issues, general feedback
- 0 (none): No significant concerns

Focus on PATTERNS across responses, not individual cases.`;

    console.log(`[RiskDetection] Analyzing batch of ${responseCount} responses with LLM...`);
    const llmResponse = await callLLMForRiskAnalysis(userPrompt, systemPrompt);
    const llmResult = parseLLMResponse(llmResponse);

    console.log('[RiskDetection] Batch analysis complete:', {
      hasRisks: llmResult.hasRisks,
      riskLevel: llmResult.overallRiskLevel,
      score: llmResult.riskScore,
      patterns: llmResult.indicators.length,
    });

    return llmResult;
  } catch (llmError) {
    console.warn('[RiskDetection] LLM batch analysis failed, falling back to keyword analysis:', llmError);
    // Fallback to keyword-based analysis
    const textComments = { combined: combinedText };
    return analyzeRisksWithKeywords(textComments);
  }
}

/**
 * Main risk detection analysis
 */
export async function analyzeRisks(textComments: Record<string, string>): Promise<RiskAnalysisResult> {
  const combinedText = Object.values(textComments)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!combinedText || combinedText.trim().length === 0) {
    return {
      hasRisks: false,
      overallRiskLevel: 'none',
      riskScore: 0,
      riskCategories: [],
      indicators: [],
      riskAnalysis: 'No text content to analyze',
      recommendations: [],
      requiresManualReview: false,
      flaggedAt: new Date(),
    };
  }

  try {
    // Try LLM analysis first
    const systemPrompt = `You are an expert in identifying high-risk indicators in survey responses. Analyze the provided text for signs of mental health issues, financial stress, relationship problems, health concerns, substance abuse, or safety risks. 

IMPORTANT: 
- Extract SPECIFIC quotes and phrases from the actual text
- Generate UNIQUE recommendations based on the specific content
- Focus on actionable insights from what was actually said
- Return ONLY valid JSON (no markdown, no explanations)`;

    const userPrompt = `Analyze this survey response for high-risk indicators. Extract 5-6 SPECIFIC risk points with actual quotes.

SURVEY RESPONSE:
"${combinedText}"

Return ONLY valid JSON (no markdown):
{
  "hasRisks": boolean,
  "riskLevel": "critical" | "high" | "medium" | "low" | "none",
  "riskScore": number (0-100),
  "riskCategories": ["depression", "anxiety", "financial_stress", "relationship_issues", "health_concerns", "substance_abuse", "violence", "other"],
  "riskIndicators": [
    {
      "indicator": "Brief description of what was detected",
      "category": "one of the categories above",
      "confidence": number (0-100),
      "severity": "critical" | "high" | "medium" | "low",
      "quote": "EXACT QUOTE from the text that indicates this risk - MUST be actual words from the response"
    }
  ],
  "riskAnalysis": "2-3 sentences describing specific concerns found in THIS response",
  "recommendations": [
    "Specific action based on what this person said",
    "Another specific recommendation relevant to their situation",
    "Third recommendation addressing their unique concerns"
  ]
}

CRITICAL REQUIREMENTS:
- riskIndicators: Include 5-6 specific points with ACTUAL QUOTES from the text
- Each quote MUST be exact words from the response (not paraphrased)
- recommendations: Must be UNIQUE and specific to what this person said (not generic)
- riskAnalysis: Summarize the specific concerns in THIS response

SCORING:
- 80-100 (critical): Immediate danger, self-harm risk, violence threats
- 60-79 (high): Severe stress, serious mental health concerns, major life issues
- 40-59 (medium): Moderate concerns, work stress, relationship difficulties
- 1-39 (low): Minor frustrations, general complaints
- 0 (none): No concerns

Extract specific evidence from the actual text, not generic observations.`;

    console.log('[RiskDetection] Analyzing with LLM...');
    const llmResponse = await callLLMForRiskAnalysis(userPrompt, systemPrompt);
    const llmResult = parseLLMResponse(llmResponse);

    console.log('[RiskDetection] LLM analysis result:', {
      hasRisks: llmResult.hasRisks,
      riskLevel: llmResult.overallRiskLevel,
      score: llmResult.riskScore,
    });

    return llmResult;
  } catch (llmError) {
    console.warn('[RiskDetection] LLM analysis failed, falling back to keyword analysis:', llmError);
    return analyzeRisksWithKeywords(textComments);
  }
}

/**
 * Parse LLM response for risk analysis
 */
function parseLLMResponse(response: string): RiskAnalysisResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const data = JSON.parse(jsonMatch[0]);

    // Convert confidence from 0-100 to normalized indicators
    const indicators: RiskIndicator[] = (data.riskIndicators || []).map((ind: any) => ({
      indicator: ind.indicator,
      category: ind.category,
      severity: ind.severity,
      trigger: ind.indicator,
      confidence: Math.min(100, Math.max(0, ind.confidence || 0)),
      description: ind.indicator,
      quote: ind.quote,
    }));

    // Determine if requires manual review
    const requiresManualReview =
      data.riskLevel === 'critical' || data.riskLevel === 'high';

    return {
      hasRisks: Boolean(data.hasRisks),
      overallRiskLevel: (data.riskLevel || 'none') as RiskLevel,
      riskScore: Math.min(100, Math.max(0, data.riskScore || 0)),
      riskCategories: (data.riskCategories || []) as RiskCategory[],
      indicators,
      riskAnalysis: data.riskAnalysis || 'No specific analysis provided',
      recommendations: data.recommendations || [],
      requiresManualReview,
      flaggedAt: new Date(),
    };
  } catch (error) {
    console.error('[RiskDetection] Failed to parse LLM response:', error);
    // Fall back to keyword analysis
    throw error;
  }
}

/**
 * Fallback keyword-based risk analysis
 */
async function analyzeRisksWithKeywords(textComments: Record<string, string>): Promise<RiskAnalysisResult> {
  const indicators: RiskIndicator[] = [];
  const combinedText = Object.values(textComments)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check each risk category
  for (const [categoryKey, category] of Object.entries(RISK_PATTERNS)) {
    // Check keywords
    for (const keyword of category.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combinedText.match(regex);

      if (matches) {
        const confidence = Math.min(100, 50 + (matches.length * 15));
        const hasAmplifiers = hasIntensityAmplifiers(combinedText);

        const readableCategory = categoryKey.replace(/_/g, ' ');
        indicators.push({
          indicator: `Feedback contains references to "${keyword}", suggesting potential ${readableCategory} concerns.`,
          category: categoryKey as RiskCategory,
          severity: category.severity,
          trigger: keyword,
          confidence: hasAmplifiers ? Math.min(100, confidence + 15) : confidence,
          description: `Detected risk keyword "${keyword}" in feedback`
        });
      }
    }

    // Check phrases
    for (const phrase of category.phrases) {
      if (combinedText.includes(phrase.toLowerCase())) {
        const readableCategory = categoryKey.replace(/_/g, ' ');
        indicators.push({
          indicator: `Feedback matches the risk pattern "${phrase}" related to ${readableCategory}.`,
          category: categoryKey as RiskCategory,
          severity: category.severity,
          trigger: phrase,
          confidence: 85,
          description: `Detected risk phrase "${phrase}" in feedback`
        });
      }
    }
  }

  // Remove duplicate categories (keep highest confidence)
  const uniqueIndicators = Array.from(
    indicators
      .reduce((map, indicator) => {
        const key = `${indicator.category}-${indicator.severity}`;
        if (!map.has(key) || map.get(key)!.confidence < indicator.confidence) {
          map.set(key, indicator);
        }
        return map;
      }, new Map<string, RiskIndicator>())
      .values()
  );

  const overallRiskLevel = calculateOverallRiskLevel(uniqueIndicators);
  const riskScore = riskLevelToScore(overallRiskLevel);
  const recommendations = generateRecommendations(uniqueIndicators);

  // Extract categories from indicators
  const detectedCategories = Array.from(new Set(uniqueIndicators.map(i => i.category))) as RiskCategory[];
  const categoryNames = detectedCategories.join(', ');
  const riskAnalysis = uniqueIndicators.length > 0
    ? `Detected ${uniqueIndicators.length} risk indicator(s) in categories: ${categoryNames}. Risk level assessed as ${overallRiskLevel}.`
    : 'No concerning indicators detected in the response.';

  return {
    hasRisks: uniqueIndicators.length > 0,
    overallRiskLevel,
    riskScore,
    riskCategories: detectedCategories,
    indicators: uniqueIndicators,
    riskAnalysis,
    recommendations,
    requiresManualReview: overallRiskLevel === 'critical' || overallRiskLevel === 'high',
    flaggedAt: new Date(),
  };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(indicators: RiskIndicator[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(indicators.map(i => i.category));

  if (categories.has('safety')) {
    recommendations.push('🚨 URGENT: Contact relevant authorities or support resources');
    recommendations.push('Provide mental health resources and crisis hotline numbers');
    recommendations.push('Document incident for compliance purposes');
  }

  if (categories.has('legal')) {
    recommendations.push('Forward to legal team for review');
    recommendations.push('Document all details for potential litigation');
    recommendations.push('Review company policies and contracts');
  }

  if (categories.has('churn')) {
    recommendations.push('Immediate management escalation recommended');
    recommendations.push('Schedule retention conversation with individual');
    recommendations.push('Review service/product gaps');
    recommendations.push('Offer remediation or improvement plan');
  }

  if (categories.has('compliance')) {
    recommendations.push('Escalate to compliance/security team');
    recommendations.push('Conduct security audit if needed');
    recommendations.push('Review data protection procedures');
    recommendations.push('Provide security awareness training');
  }

  if (categories.has('mental_health')) {
    recommendations.push('Provide employee assistance program (EAP) resources');
    recommendations.push('Encourage employee to seek professional support');
    recommendations.push('Consider workload adjustment or support plan');
    recommendations.push('Check in regularly with employee');
  }

  if (categories.has('harassment')) {
    recommendations.push('Escalate to HR immediately');
    recommendations.push('Initiate investigation process');
    recommendations.push('Provide support resources to affected individual');
    recommendations.push('Review workplace policies and enforcement');
  }

  return recommendations;
}

/**
 * Format risk analysis for display
 */
export function formatRiskAnalysis(analysis: RiskAnalysisResult): {
  badge: string;
  color: string;
  icon: string;
  summary: string;
} {
  const formats = {
    critical: {
      badge: '🔴 CRITICAL',
      color: 'text-red-900 bg-red-100',
      icon: '⚠️',
      summary: 'Critical risk detected - immediate action required'
    },
    high: {
      badge: '🟠 HIGH',
      color: 'text-orange-900 bg-orange-100',
      icon: '⚠️',
      summary: 'High-risk indicators found - prompt review recommended'
    },
    medium: {
      badge: '🟡 MEDIUM',
      color: 'text-yellow-900 bg-yellow-100',
      icon: 'ℹ️',
      summary: 'Moderate risk factors identified - monitor closely'
    },
    low: {
      badge: '🟢 LOW',
      color: 'text-green-900 bg-green-100',
      icon: '✓',
      summary: 'Minor concerns - standard follow-up recommended'
    },
    none: {
      badge: '✓ CLEAR',
      color: 'text-gray-900 bg-gray-100',
      icon: '✓',
      summary: 'No significant risks detected'
    }
  };

  return formats[analysis.overallRiskLevel];
}

/**
 * Check if response requires manual review due to high risks
 */
export function requiresManualReview(analysis: RiskAnalysisResult): boolean {
  return analysis.overallRiskLevel === 'critical' || analysis.overallRiskLevel === 'high';
}

/**
 * Get risk indicators by category
 */
export function getRiskByCategory(indicators: RiskIndicator[], category: RiskCategory): RiskIndicator[] {
  return indicators.filter(i => i.category === category);
}
