import { db } from '../db';
import { structuredOutputs } from '../../shared/schema';
import type { InsertStructuredOutput } from '../../shared/schema';

/**
 * Interface for VAPI structured outputs
 * Based on the 4 structured outputs configured in VAPI:
 * 1. Supervisor Review Needed (Boolean)
 * 2. Customer Frustrated (Boolean)
 * 3. Customer Sentiment (String)
 * 4. CSAT (Number)
 */
export interface VAPIStructuredOutputs {
  // From VAPI structured output configuration
  supervisorReviewNeeded?: boolean;
  customerFrustrated?: boolean;
  customerSentiment?: string; // "positive", "negative", "neutral", "mixed"
  csatScore?: number;   // 1-10 scale ("CSAT" output)
  npsScore?: number;    // 0-10 scale ("NPS Score" output)
  cesScore?: number;    // 1-5 scale ("How easy was it to resolve your issue" output)
  eviScore?: number;    // 0-100 scale (derived from sentiment if not explicit)

  // Additional context that might be provided
  supervisorReviewReason?: string;
  frustrationIndicators?: string;
  sentimentConfidence?: number;
  sentimentKeywords?: string;
  csatSource?: string;

  // Raw analysis data
  rawAnalysis?: any;
}

export interface StoreStructuredOutputInput {
  responseId: string;
  callId?: string;
  outputs: VAPIStructuredOutputs;
}

/**
 * Stores structured outputs from VAPI call analysis
 */
export async function storeStructuredOutput(input: StoreStructuredOutputInput) {
  const { responseId, callId, outputs } = input;

  
  

  const payload: InsertStructuredOutput = {
    responseId,
    callId: callId || null,
    supervisorReviewNeeded: outputs.supervisorReviewNeeded ?? false,
    supervisorReviewReason: outputs.supervisorReviewReason || null,
    customerFrustrated: outputs.customerFrustrated ?? false,
    frustrationIndicators: outputs.frustrationIndicators || null,
    customerSentiment: outputs.customerSentiment || null,
    sentimentConfidence: outputs.sentimentConfidence?.toString() || null,
    sentimentKeywords: outputs.sentimentKeywords || null,
    csatScore: outputs.csatScore ?? null,
    csatSource: outputs.csatSource || null,
    npsScore: outputs.npsScore ?? null,
    cesScore: outputs.cesScore ?? null,
    eviScore: outputs.eviScore ?? null,
    rawAnalysis: outputs.rawAnalysis || outputs,
  } as InsertStructuredOutput;

  const [row] = await db.insert(structuredOutputs).values(payload).returning();
  
  
  
  return row;
}

/**
 * Parse structured outputs from VAPI webhook payload
 * VAPI may send structured outputs in different formats depending on configuration
 */
export function parseVAPIStructuredOutputs(webhookBody: any): VAPIStructuredOutputs | null {
  
  
  // Try different possible locations where VAPI might send structured data
  const possibleLocations = [
    webhookBody.analysis,
    webhookBody.structuredData,
    webhookBody.call?.analysis,
    webhookBody.call?.structuredData,
    webhookBody.message?.structuredData,
    webhookBody.artifact,
  ];

  for (const location of possibleLocations) {
    if (location && typeof location === 'object') {
      
      
      // Map VAPI field names to our schema
      // VAPI might use different naming conventions
      const outputs: VAPIStructuredOutputs = {
        // Try different field name variations
        supervisorReviewNeeded: 
          location.supervisorReviewNeeded ?? 
          location.supervisor_review_needed ??
          location.needsSupervisorReview ??
          location.requiresSupervisor ??
          false,
        
        customerFrustrated: 
          location.customerFrustrated ?? 
          location.customer_frustrated ??
          location.isFrustrated ??
          location.frustrated ??
          false,
        
        customerSentiment: 
          location.customerSentiment ?? 
          location.customer_sentiment ??
          location.sentiment ??
          null,
        
        csatScore:
          location.csatScore ??
          location.csat_score ??
          location.csat ??
          location.CSAT ??
          location.satisfactionScore ??
          null,

        npsScore:
          location.npsScore ??
          location.nps_score ??
          location.nps ??
          location['NPS Score'] ??
          location.netPromoterScore ??
          null,

        cesScore:
          location.cesScore ??
          location.ces_score ??
          location.ces ??
          location['How easy was it to resolve your issue on a scale of 1-5?'] ??
          location.easeOfResolution ??
          location.effortScore ??
          null,

        eviScore:
          location.eviScore ??
          location.evi_score ??
          location.evi ??
          location.emotionalValueIndex ??
          null,

        // Additional fields
        supervisorReviewReason: 
          location.supervisorReviewReason ?? 
          location.supervisor_review_reason ??
          location.reviewReason ??
          null,
        
        frustrationIndicators: 
          location.frustrationIndicators ?? 
          location.frustration_indicators ??
          location.frustrationReasons ??
          null,
        
        sentimentConfidence: 
          location.sentimentConfidence ?? 
          location.sentiment_confidence ??
          null,
        
        sentimentKeywords: 
          location.sentimentKeywords ?? 
          location.sentiment_keywords ??
          null,
        
        csatSource: 
          location.csatSource ?? 
          location.csat_source ??
          null,
        
        rawAnalysis: location,
      };
      
      // If we found at least one meaningful value, return it
      if (
        outputs.supervisorReviewNeeded ||
        outputs.customerFrustrated ||
        outputs.customerSentiment ||
        outputs.csatScore ||
        outputs.npsScore != null ||
        outputs.cesScore != null ||
        outputs.eviScore != null
      ) {
        return outputs;
      }
    }
  }
  
  
  return null;
}
