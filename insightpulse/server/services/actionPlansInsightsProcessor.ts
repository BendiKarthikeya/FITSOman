import { db } from "../db";
import { sql } from "drizzle-orm";
import { analyzeTranscriptWithOpenRouter } from "../integrations/openRouterService";

/**
 * Action Plans & Recommendations Insights Processor
 * Processes survey responses through LLM to generate action planning insights
 * Follows same pattern as leadershipInsightsProcessor.ts
 */

export interface ActionPlansInsights {
  surveyId: string;
  totalResponses: number;
  actionItems: Array<{
    id: string;
    title: string;
    description: string;
    priority: "Critical" | "High" | "Medium" | "Low";
    category: string;
    owner?: string;
    estimatedImpact?: string;
    estimatedTimeline: string;
    implementationSteps?: string[];
    successMetrics?: string[];
    relatedInsights?: string[];
  }>;
}

export async function processActionPlansInsights(surveyId: string): Promise<ActionPlansInsights> {
  

  try {
    // 1. Get survey and responses
    const survey = await db.query.surveys.findFirst({
      where: (surveys, { eq }) => eq(surveys.id, surveyId),
    });

    if (!survey) {
      throw new Error(`Survey not found: ${surveyId}`);
    }

    

    const responses = await db.query.responses.findMany({
      where: (responses, { eq }) => eq(responses.surveyId, surveyId),
    });

    

    if (responses.length === 0) {
      throw new Error("No responses found for this survey");
    }

    const processedResponseIds = await getProcessedResponseIds(surveyId);
    const pendingResponses = responses.filter((response: any) => !processedResponseIds.has(response.id));
    const pendingCount = pendingResponses.length;

    

    if (pendingCount === 0) {
      
      return {
        surveyId,
        totalResponses: responses.length,
        actionItems: [],
      };
    }

    // 2. Build aggregate transcript
    const aggregateTranscript = buildAggregateTranscript(
      survey.title || "Survey",
      pendingResponses
    );
    

    // 3. Call OpenRouter API
    
    const analysisResponse = await analyzeTranscriptWithOpenRouter({
      transcript: aggregateTranscript,
      surveyTitle: survey.title || "Action Plans Survey",
      surveyDescription: survey.description || undefined,
      surveyId: surveyId
    });

    

    // 4. Extract insights from response
    const insights = extractActionPlansInsights(
      surveyId,
      responses.length,
      JSON.stringify(analysisResponse.actionPlans)
    );
    

    // 5. Store in database
    await storeActionPlansInsights(surveyId, insights);
    await storeProcessedResponseIds(surveyId, responses.map((response: any) => response.id));
    

    return insights;
  } catch (error) {
    
    console.error('Error:', error); throw error;
  }
}

function buildAggregateTranscript(
  surveyTitle: string,
  responses: any[]
): string {
  let transcript = `Survey: ${surveyTitle}\n`;
  transcript += `Total Responses: ${responses.length}\n`;
  transcript += `\n=== SURVEY RESPONSES ===\n\n`;

  responses.forEach((response, idx) => {
    transcript += `Response ${idx + 1}:\n`;
    if (response.responseText) {
      transcript += response.responseText;
    } else if (response.data) {
      // Handle JSON responses
      const data =
        typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      transcript += Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    }
    transcript += "\n\n";
  });

  return transcript;
}

function extractActionPlansInsights(
  surveyId: string,
  totalResponses: number,
  actionPlansJson: string
): ActionPlansInsights {
  try {
    // Parse the action plans from the response
    const actionPlans = JSON.parse(actionPlansJson);
    
    const items = Array.isArray(actionPlans) ? actionPlans : [actionPlans];

    // Transform into our interface
    return {
      surveyId,
      totalResponses,
      actionItems: items.map((plan: any, idx: number) => ({
        id: `action-${idx + 1}`,
        title: plan.actionTitle || plan.title || `Action Item ${idx + 1}`,
        description: plan.actionDescription || plan.description || "",
        priority: plan.priority || "Medium",
        category: plan.category || "General",
        owner: plan.owner || "Team",
        estimatedImpact: plan.estimatedImpact || "",
        estimatedTimeline: plan.implementationSteps?.[0] || "TBD",
        implementationSteps: plan.implementationSteps || [],
        successMetrics: plan.successMetrics || [],
        relatedInsights: plan.relatedInsights || [],
      })),
    };
  } catch (error) {
    
    // Return minimal structure on parsing error
    return {
      surveyId,
      totalResponses,
      actionItems: [],
    };
  }
}

async function storeActionPlansInsights(
  surveyId: string,
  insights: ActionPlansInsights
): Promise<void> {
  try {
    // Store the action plans insights in the database
    // Using raw SQL to insert into action_plans with all fields

    // Insert action items as action plans
    const insertPromises = insights.actionItems.map((actionItem) =>
      db.execute(
        sql`
          INSERT INTO action_plans (
            survey_id,
            action_title,
            action_description,
            priority,
            category,
            owner,
            estimated_impact,
            status,
            implementation_steps,
            success_metrics,
            related_insights,
            created_at,
            updated_at
          ) VALUES (
            ${surveyId},
            ${actionItem.title},
            ${actionItem.description},
            ${actionItem.priority},
            ${actionItem.category},
            ${actionItem.owner || 'Team'},
            ${actionItem.estimatedImpact || ''},
            'not_started',
            ${JSON.stringify(actionItem.implementationSteps || [])},
            ${JSON.stringify(actionItem.successMetrics || [])},
            ${JSON.stringify(actionItem.relatedInsights || [])},
            NOW(),
            NOW()
          )
        `
      )
    );

    await Promise.all(insertPromises);

    // Store the full insights JSON in action_plans_insights table if it exists
    // Otherwise, we store it as metadata in action_plans
    
  } catch (error) {
    
    // Don't fail the whole process if storage fails
    throw error;
  }
}

async function getProcessedResponseIds(surveyId: string): Promise<Set<string>> {
  const data = await db.execute(sql`
    SELECT related_insights
    FROM action_plans
    WHERE survey_id = ${surveyId}
      AND category = 'system'
      AND action_title = '__processed__'
    LIMIT 1
  `);

  if (!data.rows.length) {
    return new Set();
  }

  const related = data.rows[0]?.related_insights;
  if (!related) {
    return new Set();
  }

  try {
    const parsed = typeof related === "string" ? JSON.parse(related) : related;
    const responseIds = Array.isArray(parsed?.responseIds) ? parsed.responseIds : [];
    return new Set(responseIds);
  } catch {
    return new Set();
  }
}

async function storeProcessedResponseIds(surveyId: string, responseIds: string[]): Promise<void> {
  const payload = { responseIds };

  await db.execute(sql`
    DELETE FROM action_plans
    WHERE survey_id = ${surveyId}
      AND category = 'system'
      AND action_title = '__processed__'
  `);

  await db.execute(sql`
    INSERT INTO action_plans (
      survey_id,
      action_title,
      category,
      status,
      related_insights,
      created_at,
      updated_at
    ) VALUES (
      ${surveyId},
      '__processed__',
      'system',
      'completed',
      CAST(${JSON.stringify(payload)} AS JSONB),
      NOW(),
      NOW()
    )
  `);
}
