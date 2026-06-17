import dotenv from 'dotenv';
dotenv.config();

const GROK_API_KEY = process.env.GROK_API_KEY || '';
const GROK_MODEL = 'grok-3-mini';

export interface EviQA {
  question: string;
  answer: string;
}

export interface EviScoreResult {
  evi_score: number; // 0.0–10.0
  summary: string;
}

const SYSTEM_PROMPT = `You are an expert emotional intelligence analyst trained in the Emotional Value Index (EVI) framework.

The EVI measures a person's emotional intelligence across exactly 10 dimensions. Your job is to:
1. Analyse the provided assessment question and answer responses.
2. Calculate a score (0.0–10.0) for each of the 10 dimensions based on what the answers reveal.
3. Calculate a weighted composite EVI score using the dimension weights below.
4. Write one overall summary paragraph about this person's emotional profile.

Always respond ONLY in valid JSON. No preamble, no explanation, no markdown code blocks. Raw JSON only.

The 10 EVI dimensions and their weights are:
1. Emotional Awareness – 10%
2. Emotional Regulation – 12%
3. Empathy – 12%
4. Motivation & Drive – 10%
5. Interpersonal Value – 10%
6. Resilience – 11%
7. Communication Quality – 10%
8. Trust & Authenticity – 10%
9. Conflict Resolution – 10%
10. Overall Emotional Impact – 5%

Composite EVI formula:
- Score each dimension 0.0–10.0 based on what the answers reveal about that area.
- composite_evi = sum of (dimension_score × weight) across all 10 dimensions.
- Round composite_evi to 1 decimal place.

Return ONLY this JSON shape:
{
  "evi_score": 7.2,
  "summary": "One paragraph overall summary of this person's emotional profile, their strengths, their main gap, and one actionable recommendation."
}`;

function buildUserPrompt(responses: EviQA[]): string {
  const lines = responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n');
  return `Here are the EVI assessment responses:\n\n${lines}\n\nAnalyse these and return the JSON result.`;
}

async function callModel(messages: any[]): Promise<string> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok API error ${res.status}: ${body}`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? '';
}

function parseScore(text: string): EviScoreResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in LLM response');
  const data = JSON.parse(match[0]);
  const score = Math.min(10, Math.max(0, Number(data.evi_score) || 0));
  return {
    evi_score: Math.round(score * 10) / 10,
    summary: String(data.summary || ''),
  };
}

export function getZoneLabel(score: number): string {
  if (score >= 9.5) return 'Exemplary Zone';
  if (score >= 8.0) return 'Proficient Zone';
  if (score >= 6.0) return 'Capable Zone';
  if (score >= 4.0) return 'Developing Zone';
  return 'Critical Zone';
}

export async function scoreEVI(responses: EviQA[]): Promise<EviScoreResult> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(responses) },
  ];

  const text = await callModel(messages);
  try {
    return parseScore(text);
  } catch {
    // retry once
    const text2 = await callModel(messages);
    return parseScore(text2);
  }
}
