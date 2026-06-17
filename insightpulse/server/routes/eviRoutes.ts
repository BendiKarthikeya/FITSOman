import { Router } from 'express';
import { db } from '../db.js';
import { eviAssessments, eviResults } from '../../shared/schema.js';
import { desc, eq } from 'drizzle-orm';
import { scoreEVI, getZoneLabel } from '../services/eviScoringService.js';
import type { EviQA } from '../services/eviScoringService.js';

const router = Router();

// POST /evi/submit — accept Q&A responses, score via LLM, store and return result
router.post('/submit', async (req, res) => {
  const { user_id, responses } = req.body as { user_id?: string; responses?: EviQA[] };

  if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
    return res.status(400).json({ error: 'user_id is required' });
  }
  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'No responses provided' });
  }

  try {
    const [assessment] = await db
      .insert(eviAssessments)
      .values({ userId: user_id.trim(), responses })
      .returning({ id: eviAssessments.id });

    const { evi_score, summary } = await scoreEVI(responses);
    const zone_label = getZoneLabel(evi_score);

    await db.insert(eviResults).values({
      assessmentId: assessment.id,
      userId: user_id.trim(),
      eviScore: String(evi_score),
      zoneLabel: zone_label,
      summary,
    });

    return res.json({
      assessment_id: assessment.id,
      result: { evi_score, zone_label, summary },
    });
  } catch (err: any) {
    console.error('[EVI] submit error:', err);
    return res.status(500).json({ error: 'Scoring failed, please try again' });
  }
});

// GET /evi/result/:user_id — return latest EVI result for a user
router.get('/result/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const rows = await db
      .select()
      .from(eviResults)
      .where(eq(eviResults.userId, user_id))
      .orderBy(desc(eviResults.createdAt))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No EVI result found for this user' });
    }

    const row = rows[0];
    return res.json({
      assessment_id: row.assessmentId,
      result: {
        evi_score: Number(row.eviScore),
        zone_label: row.zoneLabel,
        summary: row.summary,
      },
    });
  } catch (err: any) {
    console.error('[EVI] result fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch EVI result' });
  }
});

export default router;
