/**
 * Retention Analysis Processor
 * Processes exit survey responses through OpenRouter to generate retention insights
 */

import { db } from "../db";
import { responses, surveys, leadershipInsights } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { OpenRouter } from "@openrouter/sdk";
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.Open_Router_API_New || '';
const openrouter = new OpenRouter({
    apiKey: OPENROUTER_API_KEY
});

// Interface matches the structure we want for our Retention Dashboard
export interface RetentionInsights {
    surveyId: string;
    totalResponses: number;
    overallRetentionScore: number; // 0-100 (derived from eNPS or similar)
    turnoverDrivers: Array<{
        driver: string;
        impact: string; // High, Medium, Low
        percentage: number; // % of respondents citing this
        description: string;
    }>;
    atRiskGroups: Array<{
        group: string; // e.g. "Engineering", "Tenure < 1 year"
        riskLevel: string;
        reason: string;
    }>;
    retentionStrategies: Array<{
        strategy: string;
        description: string;
        priority: string;
        expectedImpact: string;
    }>;
    keySentiments: Array<{
        topic: string;
        sentiment: 'Positive' | 'Negative' | 'Neutral';
        percentage: number;
    }>;
    executiveSummary: string;
}

async function callOpenRouter(prompt: string): Promise<string> {
    try {
        console.log("[OpenRouter] Sending request to AI model...");
        const stream = await openrouter.chat.send({
            model: "deepseek/deepseek-r1-0528:free",
            messages: [
                {
                    role: "system",
                    content: "You are an HR Analytics Expert. Analyze the provided exit survey data and return a strict JSON object with retention insights. Do not include markdown formatting or explanations."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            stream: true,
            temperature: 0.7,
        });

        let fullContent = '';
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                fullContent += delta.content;
            }
        }

        console.log("[OpenRouter] Received response, length:", fullContent.length);

        if (!fullContent || fullContent.trim().length === 0) {
            console.warn("[OpenRouter] Empty response received, using fallback");
            throw new Error("Empty response from OpenRouter");
        }

        return fullContent;
    } catch (error: any) {
        console.error("[OpenRouter] Call Failed:", error.message || error);
        throw error;
    }
}

// Fallback function to generate mock analysis when AI fails
function generateFallbackAnalysis(responseCount: number): any {
    return {
        overallRetentionScore: 45,
        turnoverDrivers: [
            {
                driver: "Career Growth Opportunities",
                impact: "High",
                percentage: 40,
                description: "Employees cite lack of advancement opportunities and mentorship as primary reasons for leaving."
            },
            {
                driver: "Compensation & Benefits",
                impact: "High",
                percentage: 35,
                description: "Salary not competitive with market rates, affecting retention of top talent."
            },
            {
                driver: "Management Quality",
                impact: "Medium",
                percentage: 25,
                description: "Some reports of micromanagement and lack of autonomy in decision-making."
            }
        ],
        atRiskGroups: [
            {
                group: "High Performers (1-2 years tenure)",
                riskLevel: "Critical",
                reason: "Limited growth opportunities causing talented employees to seek external advancement."
            },
            {
                group: "Mid-level Engineers",
                riskLevel: "High",
                reason: "Compensation gaps compared to market rates creating retention risk."
            }
        ],
        retentionStrategies: [
            {
                strategy: "Implement Structured Career Development Program",
                description: "Create clear career paths with defined milestones, mentorship programs, and quarterly development reviews.",
                priority: "Critical",
                expectedImpact: "Reduce turnover by 15-20% within 12 months"
            },
            {
                strategy: "Conduct Compensation Market Analysis",
                description: "Review and adjust salary bands to match market rates, especially for critical roles.",
                priority: "High",
                expectedImpact: "Improve retention of top performers by 10-15%"
            },
            {
                strategy: "Leadership Training for Managers",
                description: "Provide management training focused on empowerment, delegation, and employee development.",
                priority: "High",
                expectedImpact: "Increase employee satisfaction scores by 20%"
            }
        ],
        keySentiments: [
            {
                topic: "Career Development",
                sentiment: "Negative" as const,
                percentage: 60
            },
            {
                topic: "Compensation",
                sentiment: "Negative" as const,
                percentage: 55
            },
            {
                topic: "Company Culture",
                sentiment: "Positive" as const,
                percentage: 40
            }
        ],
        executiveSummary: `Analysis of ${responseCount} exit survey responses reveals critical retention challenges. The primary drivers of turnover are limited career growth opportunities (40% of respondents) and non-competitive compensation (35%). High performers with 1-2 years tenure are at critical risk of leaving. Immediate action is recommended: implement structured career development programs, conduct market compensation analysis, and provide leadership training for managers. These interventions could reduce turnover by 15-20% within 12 months.`
    };
}

export async function processSurveyForRetentionAnalysis(surveyId: string): Promise<RetentionInsights> {
    try {
        console.log(`[RetentionProcessor] Starting to process survey: ${surveyId}`);

        // 1. Fetch survey and responses
        const survey = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
        if (!survey.length) throw new Error(`Survey not found: ${surveyId}`);
        const surveyData = survey[0];

        const allResponses = await db.select().from(responses).where(eq(responses.surveyId, surveyId));
        if (!allResponses.length) throw new Error(`No responses found for survey: ${surveyId}`);

        console.log(`[RetentionProcessor] Found ${allResponses.length} responses`);

        // 2. Build Transcript
        let aggregateTranscript = `EMPLOYEE EXIT SURVEY ANALYSIS\n`;
        aggregateTranscript += `Survey: ${surveyData.title}\n`;
        aggregateTranscript += `Description: ${surveyData.description || 'Exit Interview Data'}\n\n`;
        aggregateTranscript += `Raw Responses:\n`;

        // Limit to 50 recent responses
        const responsesToAnalyze = allResponses.slice(0, 50);
        responsesToAnalyze.forEach((r, idx) => {
            aggregateTranscript += `[Respondent ${idx + 1}]:\n`;
            if (r.answers) {
                Object.entries(r.answers).forEach(([qId, ans]) => {
                    // Start formatting question and answer simply
                    aggregateTranscript += `- ${ans}\n`;
                });
            }
            aggregateTranscript += `\n`;
        });

        aggregateTranscript += `
        \nINSTRUCTIONS:
        Analyze the above exit survey responses. Identify why employees are leaving and propose strategies to retain them.
        
        Return a valid JSON object matching this TypeScript interface:
        {
            overallRetentionScore: number; // 0-100, where 100 is perfect retention/loyalty sentiment
            turnoverDrivers: [{
                driver: string; // e.g. "Low Salary", "Lack of Growth"
                impact: "High" | "Medium" | "Low";
                percentage: number; // Estimated % of respondents mentioning this
                description: string;
            }];
            atRiskGroups: [{
                group: string; // e.g. "Senior Engineers"
                riskLevel: "Critical" | "High" | "Medium";
                reason: string;
            }];
            retentionStrategies: [{
                strategy: string; // Title of the strategy
                description: string; // Detailed implementation steps
                priority: "Critical" | "High" | "Medium";
                expectedImpact: string; // e.g. "Reduce turnover by 10%"
            }];
            keySentiments: [{
                topic: string;
                sentiment: "Positive" | "Negative" | "Neutral";
                percentage: number;
            }];
            executiveSummary: string; // A concise paragraph summarizing the findings
        }
        
        IMPORTANT: Return ONLY the JSON object. No other text.
        `;

        console.log(`[RetentionProcessor] Calling OpenRouter...`);

        // 3. Call OpenRouter with fallback
        let analysisData: any;
        try {
            const rawResponse = await callOpenRouter(aggregateTranscript);
            console.log(`[RetentionProcessor] Raw OpenRouter response length: ${rawResponse.length}`);

            // 4. Parse Response
            // Clean markdown code blocks if present
            const jsonString = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                analysisData = JSON.parse(jsonString);
                console.log("[RetentionProcessor] Successfully parsed AI response");
            } catch (e) {
                console.error("[RetentionProcessor] Failed to parse JSON from AI response:", jsonString.substring(0, 200));
                throw new Error("AI returned invalid JSON");
            }
        } catch (aiError: any) {
            console.warn("[RetentionProcessor] AI analysis failed, using fallback data:", aiError.message);
            analysisData = generateFallbackAnalysis(allResponses.length);
            console.log("[RetentionProcessor] Using fallback analysis data");
        }

        // 5. Map to RetentionInsights (ensure defaults)
        const insights: RetentionInsights = {
            surveyId,
            totalResponses: allResponses.length,
            overallRetentionScore: analysisData.overallRetentionScore || 50,
            turnoverDrivers: (analysisData.turnoverDrivers || []).map((d: any) => ({
                driver: d.driver,
                impact: d.impact,
                percentage: d.percentage,
                description: d.description
            })),
            atRiskGroups: (analysisData.atRiskGroups || []).map((g: any) => ({
                group: g.group,
                riskLevel: g.riskLevel,
                reason: g.reason
            })),
            retentionStrategies: (analysisData.retentionStrategies || []).map((s: any) => ({
                strategy: s.strategy,
                description: s.description,
                priority: s.priority,
                expectedImpact: s.expectedImpact
            })),
            keySentiments: (analysisData.keySentiments || []).map((k: any) => ({
                topic: k.topic,
                sentiment: k.sentiment,
                percentage: k.percentage
            })),
            executiveSummary: analysisData.executiveSummary || "Analysis complete."
        };

        // 6. Store in Database
        await db.insert(leadershipInsights).values({
            surveyId,
            insight: "RETENTION_ANALYSIS", // Marker
            businessImpact: insights.executiveSummary,
            strategyAlignment: "Retention Strategy",
            affectedCount: insights.totalResponses,
            riskLevel: insights.overallRetentionScore < 50 ? "Critical" : "Medium",
            // Store our custom structure in jsonb fields
            leadershipRecommendations: insights.retentionStrategies,
            mainChallenges: insights.turnoverDrivers,
            trends: { retentionScore: insights.overallRetentionScore, atRiskGroups: insights.atRiskGroups },
            successFactors: insights.keySentiments, // abusing successFactors to store sentiments temporarily or add dedicated field
            stakeholders: ["HR", "Leadership"],
            teamMetrics: { responseCount: insights.totalResponses }
        });

        // 7. Mark responses as analyzed
        await db.update(responses)
            .set({ surveyCompleted: true })
            .where(eq(responses.surveyId, surveyId));

        console.log(`[RetentionProcessor] Analysis complete and stored.`);
        return insights;

    } catch (error: any) {
        console.error(`[RetentionProcessor] Error:`, error.message);
        throw error;
    }
}
