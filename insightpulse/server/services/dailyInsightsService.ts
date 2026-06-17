/**
 * Daily Insights Service
 * Runs once per day per org. Collects all that day's response summaries,
 * sends them in a single LLM call, and stores synthesised top insights +
 * top recommendations in the daily_insights table.
 */

import { OpenRouter } from "@openrouter/sdk";
import { db } from "../db";
import { responses, surveys, users, dailyInsights } from "../../shared/schema";
import { eq, gte, lt, and, inArray, sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const openrouter = new OpenRouter({ apiKey: process.env.Open_Router_API_New || "" });
const PRIMARY_MODEL = process.env.OPENROUTER_PRIMARY_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

async function callLLM(prompt: string, useFallback = false): Promise<string> {
  const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
  try {
    const stream = await openrouter.chat.send({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.4,
      maxTokens: 1500,
    });
    let out = "";
    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) out += c;
    }
    return out.trim();
  } catch (err) {
    if (!useFallback) return callLLM(prompt, true);
    throw err;
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(dateStr + "T00:00:00.000Z");
  const end = new Date(dateStr + "T23:59:59.999Z");
  return { start, end };
}

/**
 * Process one org (identified by userId) for a given date.
 * Skips if already processed.
 */
export async function processDailyInsightsForUser(userId: string, dateStr: string): Promise<void> {
  // Check if already processed today
  const existing = await db
    .select({ id: dailyInsights.id })
    .from(dailyInsights)
    .where(and(eq(dailyInsights.userId, userId), eq(dailyInsights.date, dateStr)))
    .limit(1);

  if (existing.length > 0) return; // already done

  const { start, end } = dayBounds(dateStr);

  // Get all surveys owned by this user
  const userSurveys = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(eq(surveys.createdBy, userId));

  if (userSurveys.length === 0) return;
  const surveyIds = userSurveys.map((s) => s.id);

  // Collect that day's responses with summaries / detailed responses
  const rows = await db
    .select({
      analysisSummary: responses.analysisSummary,
      detailedResponses: responses.detailedResponses,
    })
    .from(responses)
    .where(
      and(
        inArray(responses.surveyId, surveyIds),
        gte(responses.submittedAt, start),
        lt(responses.submittedAt, end),
      ),
    );

  if (rows.length === 0) return;

  // Build text corpus from summaries and recommendation arrays
  const summaries: string[] = [];
  const painPoints: string[] = [];

  for (const r of rows) {
    if (r.analysisSummary) summaries.push(r.analysisSummary);
    const dr = r.detailedResponses as any;
    if (dr && Array.isArray(dr.recommendations)) {
      for (const rec of dr.recommendations) {
        if (typeof rec === "string" && rec.trim()) painPoints.push(rec.trim());
        else if (rec?.action) painPoints.push(String(rec.action).trim());
      }
    }
    if (dr && Array.isArray(dr.keyInsights)) {
      for (const ins of dr.keyInsights) {
        if (typeof ins === "string" && ins.trim()) summaries.push(ins.trim());
      }
    }
  }

  const summaryText = summaries.slice(0, 80).join("\n- ");
  const painText = painPoints.slice(0, 80).join("\n- ");

  const prompt = `You are an analytics assistant. Below are survey response summaries and pain points collected on ${dateStr}.

RESPONSE SUMMARIES:
- ${summaryText || "(none)"}

PAIN POINTS / RECOMMENDATIONS FROM RESPONSES:
- ${painText || "(none)"}

Based on the above, produce:
1. Top 5 synthesised INSIGHTS that describe what employees/customers are experiencing (not raw quotes, synthesised patterns).
2. Top 5 synthesised RECOMMENDATIONS that would help the organisation improve.

Respond ONLY with valid JSON in this exact shape:
{
  "topInsights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "topRecommendations": ["rec 1", "rec 2", "rec 3", "rec 4", "rec 5"]
}`;

  let parsed: { topInsights: string[]; topRecommendations: string[] } | null = null;
  try {
    const raw = await callLLM(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[dailyInsights] LLM parse error", err);
    return;
  }

  if (!parsed) return;

  const topInsights = (parsed.topInsights || []).filter(Boolean).slice(0, 5).map((text) => ({ text }));
  const topRecommendations = (parsed.topRecommendations || []).filter(Boolean).slice(0, 5).map((text) => ({ text }));

  await db
    .insert(dailyInsights)
    .values({
      userId,
      date: dateStr,
      topInsights,
      topRecommendations,
      responseCount: rows.length,
    })
    .onConflictDoUpdate({
      target: [dailyInsights.userId, dailyInsights.date],
      set: {
        topInsights,
        topRecommendations,
        responseCount: rows.length,
        processedAt: new Date(),
      },
    });

  console.log(`[dailyInsights] Processed ${rows.length} responses for user ${userId} on ${dateStr}`);
}

/**
 * Run daily insights for ALL users that have responses today.
 * Called once per day by the scheduler.
 */
export async function runDailyInsightsForAllUsers(): Promise<void> {
  const dateStr = todayDateString();
  console.log(`[dailyInsights] Starting daily run for ${dateStr}`);

  // Find distinct createdBy values from surveys that have responses today
  const { start, end } = dayBounds(dateStr);

  const activeRows = await db
    .selectDistinct({ createdBy: surveys.createdBy })
    .from(surveys)
    .innerJoin(responses, eq(responses.surveyId, surveys.id))
    .where(and(gte(responses.submittedAt, start), lt(responses.submittedAt, end)));

  for (const row of activeRows) {
    if (!row.createdBy) continue;
    try {
      await processDailyInsightsForUser(row.createdBy, dateStr);
    } catch (err) {
      console.error(`[dailyInsights] Error for user ${row.createdBy}:`, err);
    }
  }

  console.log(`[dailyInsights] Daily run complete — processed ${activeRows.length} orgs`);
}
