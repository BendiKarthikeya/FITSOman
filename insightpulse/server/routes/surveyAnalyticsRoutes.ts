import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { responses, surveys } from "../../shared/schema";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/analytics/survey/:surveyId
 * Per-survey analytics: CSAT, NPS, promoters, per-question breakdown
 */
router.get("/survey/:surveyId", async (req: AuthRequest, res) => {
  try {
    const { surveyId } = req.params;

    // Verify survey belongs to the authenticated user's org
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const allResponses = await db
      .select({
        id: responses.id,
        csatScore: responses.csatScore,
        npsScore: responses.npsScore,
        detailedResponses: responses.detailedResponses,
        answers: responses.answers,
      })
      .from(responses)
      .where(eq(responses.surveyId, surveyId));

    const totalRespondents = allResponses.length;

    // ── CSAT ──────────────────────────────────────────────────────────────
    const csatScores = allResponses.map(r => r.csatScore).filter((s): s is number => s != null);
    const avgCsat = csatScores.length > 0
      ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
      : 0;

    // Distribution: map 0-10 csat scores to score0..score5 buckets
    const dist: Record<string, number> = { score5: 0, score4: 0, score3: 0, score2: 0, score1: 0, score0: 0 };
    for (const s of csatScores) {
      if (s >= 9) dist.score5++;
      else if (s >= 7) dist.score4++;
      else if (s >= 5) dist.score3++;
      else if (s >= 3) dist.score2++;
      else if (s >= 1) dist.score1++;
      else dist.score0++;
    }

    // ── NPS ───────────────────────────────────────────────────────────────
    const npsScores = allResponses.map(r => r.npsScore).filter((s): s is number => s != null);
    const promoters = npsScores.filter(s => s >= 9).length;
    const detractors = npsScores.filter(s => s <= 6).length;
    const passives = npsScores.length - promoters - detractors;
    const npsScore = npsScores.length > 0
      ? Math.round(((promoters - detractors) / npsScores.length) * 100)
      : 0;
    const pct = (n: number) => npsScores.length > 0 ? parseFloat(((n / npsScores.length) * 100).toFixed(1)) : 0;

    // ── Per-question CSAT ─────────────────────────────────────────────────
    const questionMap: Record<string, { text: string; scores: number[] }> = {};
    for (const r of allResponses) {
      const detailed: any[] = Array.isArray(r.detailedResponses) ? r.detailedResponses : [];
      for (const q of detailed) {
        const qid = String(q.questionId ?? q.id ?? '');
        if (!qid) continue;
        if (!questionMap[qid]) questionMap[qid] = { text: q.questionText ?? `Q${qid}`, scores: [] };
        const rating = Number(q.rating ?? q.score ?? q.answer);
        if (!Number.isNaN(rating)) questionMap[qid].scores.push(rating);
      }
    }

    const questions = Object.entries(questionMap).map(([qid, { text, scores }]) => {
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const qPromoters = scores.filter(s => s >= 9).length;
      const qDetractors = scores.filter(s => s <= 6).length;
      const qNps = scores.length > 0 ? Math.round(((qPromoters - qDetractors) / scores.length) * 100) : 0;
      const csatPct = scores.length > 0 ? parseFloat(((scores.filter(s => s >= 7).length / scores.length) * 100).toFixed(1)) : 0;
      return {
        questionId: qid,
        questionText: text,
        csat: { csatScore: csatPct },
        nps: { npsScore: qNps },
      };
    });

    res.json({
      surveyId,
      totalRespondents,
      overall: {
        csat: {
          csatScore: parseFloat(avgCsat.toFixed(2)),
          distribution: dist,
        },
        nps: {
          npsScore,
          percentages: {
            promoters: pct(promoters),
            passives: pct(passives),
            detractors: pct(detractors),
          },
        },
      },
      questions,
    });
  } catch (error) {
    console.error("Survey analytics error:", error);
    res.status(500).json({ error: "Failed to fetch survey analytics" });
  }
});

export default router;
