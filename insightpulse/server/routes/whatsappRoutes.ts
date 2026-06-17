import express, { Request, Response } from 'express';
// @ts-ignore - node-fetch doesn't have types in this version
import fetch from 'node-fetch';
import { db } from '../db';
import { surveys, watiSessions, responses, feedbackAnalytics } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { syncVAPICallToAnalytics } from '../integrations/vapiToAnalyticsBridge';
import { analyzeSurveyResponse } from '../services/surveyResponseAnalysisService';
import { aggregateDepartmentNps } from '../services/departmentNpsService';

const router = express.Router();

const META_GRAPH_VERSION = process.env.META_WA_GRAPH_VERSION || 'v21.0';

function metaCreds() {
  const token = process.env.META_WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  return { token, phoneNumberId };
}

async function sendWhatsAppText(phoneNumber: string, message: string): Promise<any> {
  const { token, phoneNumberId } = metaCreds();
  if (!token || !phoneNumberId) {
    throw new Error('Meta WhatsApp credentials not configured');
  }
  const to = phoneNumber.replace(/^\+/, '');
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: message },
    }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const errMsg = data?.error?.message || `Meta WA error ${resp.status}`;
    throw new Error(errMsg);
  }
  return data;
}

function buildQuestionPrompt(q: any, qIndex: number, total: number, language: string): string {
  const qText = q.title || q.text || q.questionText || 'Question';
  const qType = q.type || q.questionType || 'text';
  let prompt = `Q${qIndex + 1}/${total}: ${qText}`;
  if (qType === 'nps') {
    prompt += language === 'ar' ? '\n(ردّ برقم من 0-10)' : '\n(Reply with a number 0-10)';
  } else if (qType === 'csat' || qType === 'rating') {
    prompt += language === 'ar' ? '\n(ردّ برقم من 1-5)' : '\n(Reply with a number 1-5)';
  } else if (qType === 'yes-no') {
    prompt += language === 'ar' ? '\n(ردّ: نعم أو لا)' : '\n(Reply: Yes or No)';
  } else if (qType === 'evi-slider') {
    prompt += language === 'ar' ? '\n(ردّ برقم من 0-100)' : '\n(Reply with a number 0-100)';
  } else if (qType === 'multiple-choice' && Array.isArray(q.options)) {
    prompt += '\n' + q.options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
    prompt += language === 'ar' ? '\n(ردّ برقم الخيار)' : '\n(Reply with option number)';
  }
  return prompt;
}

async function sendNextQuestion(sessionId: string, phoneNumber: string, surveyId: string, language: string) {
  const [session] = await db.select().from(watiSessions).where(eq(watiSessions.id, sessionId));
  if (!session) return;
  const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId));
  if (!survey) return;

  const qs = (survey.questions || []) as Array<any>;
  const qIndex = session.currentQuestionIndex || 0;

  if (qIndex >= qs.length) {
    await db.update(watiSessions).set({ status: 'completed', updatedAt: new Date() }).where(eq(watiSessions.id, sessionId));
    await sendWhatsAppText(
      phoneNumber,
      language === 'ar'
        ? '✅ شكرًا لإكمالك الاستبيان! سيتم حفظ إجاباتك.'
        : '✅ Thank you for completing the survey! Your answers have been saved.'
    );
    return;
  }

  const prompt = buildQuestionPrompt(qs[qIndex], qIndex, qs.length, language);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await sendWhatsAppText(phoneNumber, prompt);
}

function buildConsentMessage(surveyTitle: string, total: number, language: string): string {
  if (language === 'ar') {
    return `👋 مرحبًا! هل ترغب في إكمال استبيان "${surveyTitle}"؟ يحتوي على ${total} ${total === 1 ? 'سؤال' : 'أسئلة'}.\nردّ بـ "نعم" للبدء أو "لا" للتخطي.`;
  }
  return `👋 Hi! Would you like to take the "${surveyTitle}" survey? It has ${total} question${total === 1 ? '' : 's'}.\nReply "YES" to start or "NO" to skip.`;
}

function isYes(text: string, language: string): boolean {
  const t = text.trim().toLowerCase();
  if (language === 'ar') return ['نعم', 'اي', 'أجل', 'yes', 'y'].includes(t);
  return ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'start'].includes(t);
}

function isNo(text: string, language: string): boolean {
  const t = text.trim().toLowerCase();
  if (language === 'ar') return ['لا', 'كلا', 'no', 'n'].includes(t);
  return ['no', 'n', 'nope', 'skip', 'stop'].includes(t);
}

// Initiate consent + survey for a single recipient
router.post('/api/whatsapp/send-survey-sequential', async (req: Request, res: Response) => {
  try {
    const { surveyId, phoneNumber, language = 'en' } = req.body || {};
    if (!surveyId || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'surveyId and phoneNumber required' });
    }
    const { token, phoneNumberId } = metaCreds();
    if (!token || !phoneNumberId) {
      return res.status(500).json({ success: false, message: 'Meta WhatsApp credentials not configured on server' });
    }

    const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId));
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const qs = (survey.questions || []) as Array<any>;
    if (qs.length === 0) return res.status(400).json({ success: false, message: 'Survey has no questions' });

    const [inserted] = await db.insert(watiSessions).values({
      surveyId,
      phoneNumber,
      currentQuestionIndex: 0,
      status: 'awaiting_consent',
      answers: {},
      language,
    }).returning();

    await sendWhatsAppText(phoneNumber, buildConsentMessage(survey.title || 'Survey', qs.length, language));
    return res.json({ success: true, message: 'Consent prompt sent', sessionId: inserted.id });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Internal error', error: err?.message });
  }
});

// Bulk send
router.post('/api/whatsapp/send-survey-bulk', async (req: Request, res: Response) => {
  try {
    const { surveyId, phoneNumbers, language = 'en' } = req.body || {};
    if (!surveyId || !phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ success: false, message: 'surveyId and phoneNumbers array required' });
    }
    const { token, phoneNumberId } = metaCreds();
    if (!token || !phoneNumberId) {
      return res.status(500).json({ success: false, message: 'Meta WhatsApp credentials not configured on server' });
    }

    const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId));
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });

    const qs = (survey.questions || []) as Array<any>;
    if (qs.length === 0) return res.status(400).json({ success: false, message: 'Survey has no questions' });

    const consent = buildConsentMessage(survey.title || 'Survey', qs.length, language);
    const results: Array<{ phoneNumber: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = String(phoneNumbers[i]).trim();
      try {
        await db.insert(watiSessions).values({
          surveyId,
          phoneNumber,
          currentQuestionIndex: 0,
          status: 'awaiting_consent',
          answers: {},
          language,
        });
        await sendWhatsAppText(phoneNumber, consent);
        results.push({ phoneNumber, success: true });
        if (i < phoneNumbers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (err: any) {
        results.push({ phoneNumber, success: false, error: err?.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    if (successCount > 0) {
      await db.update(surveys).set({ sentCount: sql`COALESCE(sent_count, 0) + ${successCount}` }).where(eq(surveys.id, surveyId));
    }
    return res.json({
      success: true,
      message: `Consent sent to ${successCount} recipient(s). ${failCount} failed.`,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Internal error', error: err?.message });
  }
});

// Webhook verification (Meta GET)
router.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && verifyToken && verifyToken === process.env.META_WA_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge));
  }
  return res.sendStatus(403);
});

// Webhook receive (Meta POST)
router.post('/api/whatsapp/webhook', async (req: Request, res: Response) => {
  // Always 200 quickly so Meta doesn't retry
  res.status(200).json({ received: true });

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];
        for (const msg of messages) {
          if (msg.type !== 'text' && msg.type !== 'button' && msg.type !== 'interactive') continue;
          const fromRaw: string = msg.from || '';
          if (!fromRaw) continue;
          const phoneNumber = fromRaw.startsWith('+') ? fromRaw : `+${fromRaw}`;

          let body = '';
          if (msg.type === 'text') body = msg.text?.body || '';
          else if (msg.type === 'button') body = msg.button?.text || msg.button?.payload || '';
          else if (msg.type === 'interactive') {
            body =
              msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title ||
              '';
          }
          if (!body) continue;

          await handleIncomingMessage(phoneNumber, body.trim());
        }
      }
    }
  } catch (err) {
    // swallow — already responded 200
  }
});

async function handleIncomingMessage(phoneNumber: string, body: string) {
  // Pick most recent active or awaiting_consent session for this number
  const sessions = await db.select().from(watiSessions).where(eq(watiSessions.phoneNumber, phoneNumber));
  const session = sessions
    .filter((s) => s.status === 'active' || s.status === 'awaiting_consent')
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];

  if (!session) return;

  const language = session.language || 'en';
  const now = new Date();

  // Consent stage
  if (session.status === 'awaiting_consent') {
    if (isYes(body, language)) {
      await db
        .update(watiSessions)
        .set({ status: 'active', lastMessageAt: now, updatedAt: now })
        .where(eq(watiSessions.id, session.id));
      await sendNextQuestion(session.id, phoneNumber, session.surveyId || '', language);
    } else if (isNo(body, language)) {
      await db
        .update(watiSessions)
        .set({ status: 'abandoned', updatedAt: now })
        .where(eq(watiSessions.id, session.id));
      await sendWhatsAppText(
        phoneNumber,
        language === 'ar' ? 'حسنًا، شكرًا! يمكنك الرد لاحقًا للبدء.' : 'No problem — thanks! Reply YES anytime to start.'
      );
    } else {
      await sendWhatsAppText(
        phoneNumber,
        language === 'ar' ? 'يرجى الرد بـ "نعم" أو "لا".' : 'Please reply YES or NO to continue.'
      );
    }
    return;
  }

  // Active stage — store answer and advance
  const [survey] = await db.select().from(surveys).where(eq(surveys.id, session.surveyId || ''));
  if (!survey) return;

  const qs = (survey.questions || []) as Array<any>;
  const qIndex = session.currentQuestionIndex || 0;
  if (qIndex >= qs.length) return;

  const currentQuestion = qs[qIndex];
  const existingAnswers = (session.answers || {}) as Record<string, any>;
  existingAnswers[currentQuestion.id] = body;

  const nextQIndex = qIndex + 1;
  await db
    .update(watiSessions)
    .set({
      currentQuestionIndex: nextQIndex,
      answers: existingAnswers,
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(watiSessions.id, session.id));

  if (nextQIndex >= qs.length) {
    await db.update(watiSessions).set({ status: 'completed' }).where(eq(watiSessions.id, session.id));
    try {
      let analysis: Awaited<ReturnType<typeof analyzeSurveyResponse>> | null = null;
      try {
        analysis = await analyzeSurveyResponse({
          surveyId: survey.id,
          surveyTitle: survey.title,
          surveyDescription: survey.description || undefined,
          answers: existingAnswers,
          respondentPhone: phoneNumber,
        });
      } catch (e) {
        console.error('WhatsApp LLM analysis failed:', e);
      }

      const [storedResponse] = await db.insert(responses).values({
        surveyId: survey.id,
        respondentEmail: null,
        respondentPhone: phoneNumber,
        answers: existingAnswers,
        eviScore: analysis?.eviScore ?? null,
        npsScore: analysis?.npsScore ?? null,
        csatScore: analysis?.csatScore ?? null,
        cesScore: analysis?.cesScore ?? null,
        analysisSummary: analysis?.summary ?? null,
        overallSentiment: analysis?.sentiment ?? null,
        detailedResponses: analysis
          ? {
              keyInsights: analysis.keyInsights,
              recommendations: analysis.recommendations,
              actionItems: analysis.actionItems,
            }
          : null,
        surveyCompleted: true,
        totalQuestionsAsked: qs.length,
      }).returning();

      if (analysis && storedResponse) {
        try {
          await db.insert(feedbackAnalytics).values({
            surveyId: survey.id,
            responseId: storedResponse.id,
            feedbackText: JSON.stringify(existingAnswers),
            sentiment: analysis.sentiment,
            eviScore: analysis.eviScore,
            npsScore: analysis.npsScore,
            csatScore: analysis.csatScore,
            emotions: analysis.emotions,
            insights: analysis.keyInsights,
            recommendations: analysis.recommendations,
            aiAnalysis: analysis.summary,
            category: analysis.category,
            urgency: analysis.urgency,
            userType: 'guest',
            source: 'whatsapp',
          });
        } catch (e) {
          console.error('WhatsApp feedbackAnalytics insert failed:', e);
        }

        aggregateDepartmentNps({
          surveyId: survey.id,
          responseId: storedResponse.id,
          respondentPhone: phoneNumber,
          npsScore: analysis?.npsScore ?? null,
        });
      }

      try {
        await syncVAPICallToAnalytics(survey.id, phoneNumber, existingAnswers, `wa-${session.id}`);
      } catch {}
    } catch (e) {
      console.error('WhatsApp response store failed:', e);
    }

    await sendWhatsAppText(
      phoneNumber,
      language === 'ar' ? '✅ شكرًا على إكمالك الاستبيان!' : '✅ Thank you for completing the survey!'
    );
    return;
  }

  await sendNextQuestion(session.id, phoneNumber, survey.id, language);
}

export default router;
