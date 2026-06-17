import { db } from '../db';
import { surveys, crmConfigs } from '../../shared/schema';
import { and, desc, eq } from 'drizzle-orm';
import VapiClient from '../integrations/vapiClient';
import type { Express } from 'express';
import { storeSurveyResponse } from './responseService';
import { storeStructuredOutput, parseVAPIStructuredOutputs } from '../services/structuredOutputService';
import { syncVAPICallToAnalytics } from '../integrations/vapiToAnalyticsBridge';
import { analyzeTranscriptWithOpenRouter } from '../integrations/openRouterService';
import { storeDashboardAnalysis } from '../services/dashboardAnalysisService';

/**
 * Voice Survey Routes using VAPI
 * 
 * Handles:
 * - Starting voice surveys via VAPI
 * - Receiving webhook callbacks with responses
 */

interface StartSurveyRequest {
  surveyId: string; // UUID
  phoneNumber: string;
  language?: 'en' | 'ar';
}

/**
 * Register voice survey routes on Express app
 */
export function registerVoiceRoutes(app: Express) {
  const vapiKey = process.env.VAPI_KEY || '';
  const vapiClient = new VapiClient({ apiKey: vapiKey });

  /**
   * Helper function to format phone number to E.164 format
   * Adds +968 (Oman) prefix if no country code is present
   */
  function formatPhoneNumberE164(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it already starts with +, return as is (assuming it's already E.164)
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If it starts with 00, replace with +
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.slice(2);
    }
    
    // If it's 8 digits starting with 9, it's likely an Omani number
    // Oman numbers are typically 8 digits starting with 9
    if (cleaned.length === 8 && cleaned.startsWith('9')) {
      return '+968' + cleaned;
    }
    
    // If it's 11 digits starting with 968, add + prefix
    if (cleaned.length === 11 && cleaned.startsWith('968')) {
      return '+' + cleaned;
    }
    
    // Default: assume it needs +968 (Oman) country code
    return '+968' + cleaned;
  }

  /**
   * Resolve the active VAPI agent + phone number for a request.
   * Prefers the most recent active Twilio integration saved by the user
   * via /settingsCrmIntegrations; falls back to env vars.
   */
  async function resolveVapiConfig(req: any): Promise<{ agentId: string; phoneNumberId: string }> {
    const envAgentId = process.env.AGENT_ID || process.env.VAPI_AGENT_ID || '';
    const envPhoneNumberId = process.env.PHONE_NUMBER_ID || process.env.VAPI_PHONE_NUMBER_ID || '';

    try {
      const userId = req?.user?.id || req?.headers?.['user-id'] || 'anonymous';
      const rows = await db
        .select()
        .from(crmConfigs)
        .where(and(eq(crmConfigs.crmType, 'twilio'), eq(crmConfigs.isActive, true), eq(crmConfigs.userId, userId as string)))
        .orderBy(desc(crmConfigs.createdAt))
        .limit(1);

      const twilio = rows[0];
      const creds = (twilio?.credentials as any) || {};
      const resolved = {
        agentId: creds.assistant_id || envAgentId,
        phoneNumberId: creds.vapi_phone_number_id || envPhoneNumberId,
      };
      console.log('[voice] resolveVapiConfig →', {
        userId,
        source: twilio ? 'twilio-crm-config' : 'env',
        agentId: resolved.agentId ? `${String(resolved.agentId).slice(0, 8)}…` : null,
        phoneNumberId: resolved.phoneNumberId ? `${String(resolved.phoneNumberId).slice(0, 8)}…` : null,
      });
      return resolved;
    } catch (err) {
      console.error('[voice] resolveVapiConfig fallback to env (db error):', (err as any)?.message || err);
      return { agentId: envAgentId, phoneNumberId: envPhoneNumberId };
    }
  }

  // Lightweight health check without exposing technical details
  app.get('/api/voice/health', async (req, res) => {
    const apiKey = process.env.VAPI_KEY || process.env.VAPI_PRIVATE_API_KEY || '';
    const { agentId, phoneNumberId } = await resolveVapiConfig(req);
    const webhookPath = process.env.VOICE_WEBHOOK_PATH || '/api/voice/webhook';
    const baseFromEnv = process.env.VOICE_WEBHOOK_URL
      ? ''
      : (process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, '') : '');
    const webhookUrl = process.env.VOICE_WEBHOOK_URL || (baseFromEnv ? `${baseFromEnv}${webhookPath}` : '');

    const ok = Boolean(apiKey && agentId && phoneNumberId && webhookUrl);
    return res.status(ok ? 200 : 500).json({
      ok,
      message: ok ? 'Voice calling is configured.' : 'Voice calling is not configured.'
    });
  });

  /**
   * POST /api/start-survey
   * Initiates a VAPI voice call for a survey
   * 
   * Request body:
   *   - surveyId: number - The survey to conduct
   *   - phoneNumber: string - Phone number to call (E.164 format, e.g., +1234567890)
   */
  app.post('/api/start-survey', async (req, res) => {
    try {
      const { surveyId, phoneNumber, language } = req.body as StartSurveyRequest;
      const lang: 'en' | 'ar' = (language === 'ar' ? 'ar' : 'en');

      // Validate input
      if (!surveyId || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: surveyId and phoneNumber'
        });
      }

      // Format phone number to E.164
      const formattedPhoneNumber = formatPhoneNumberE164(phoneNumber);
      console.log(`Voice survey call requested for ${formattedPhoneNumber}`);

      // Get survey details
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

      if (!survey) {
        return res.status(404).json({
          success: false,
          message: 'Survey not found'
        });
      }

      // Extract questions from JSONB column
      const surveyQuestions = Array.isArray(survey.questions) ? survey.questions : [];

      if (surveyQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Survey has no questions'
        });
      }

      // Minimal logging: avoid exposing survey details

      // Build VAPI agent instructions from survey and questions
      const instructions = buildVapiInstructions(survey, surveyQuestions, lang);

      // Resolve VAPI configuration: prefer user's active Twilio integration, fall back to env
      const { agentId, phoneNumberId } = await resolveVapiConfig(req);

      if (!agentId || !phoneNumberId) {

        return res.status(500).json({ success: false, message: 'Voice calling is not configured.' });
      }

      // Prepare webhook URL
      // Priority: explicit VOICE_WEBHOOK_URL, then BASE_URL + VOICE_WEBHOOK_PATH, else infer from request
      const webhookPath = process.env.VOICE_WEBHOOK_PATH || '/api/voice/webhook';
      const baseFromEnv = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, '') : '';
      const webhookUrl =
        process.env.VOICE_WEBHOOK_URL ||
        (baseFromEnv ? `${baseFromEnv}${webhookPath}` : `${req.protocol}://${req.get('host')}${webhookPath}`);

      // Format questions for VAPI
      // Frontend uses: title, type, id
      // Demo seed uses: text, type, id
      const formattedQuestions = surveyQuestions.map((q: any, index: number) => ({
        questionNumber: index + 1,
        questionId: q.id,
        questionText: q.title || q.text || q.questionText || 'No question text provided',
        questionType: q.type || q.questionType || 'text',
        options: q.options || null
      }));

      // Do not log formatted questions or payload contents

      // Build comprehensive system message with survey questions
      const systemPrompt = lang === 'ar'
        ? `# وكيل جمع الملاحظات عبر المكالمات

## الهوية والهدف

أنت أحمد، مساعد صوتي لجمع الملاحظات لــ بنك التنمية، سلطنة عمان. هدفك إجراء استبيانات فعّالة وجمع تعليقات العملاء وبيانات أبحاث السوق مع ضمان معدلات إكمال عالية وجودة الاستجابات.

عنوان الاستبيان: ${survey.title}
وصف الاستبيان: ${survey.description || 'استبيان ملاحظات العملاء'}
عدد الأسئلة: ${formattedQuestions.length}

## نبرة الصوت والشخصية
- أسلوب ودود ومحايد ومهذب
- لغة واضحة ومختصرة وبطيئة بشكل مريح

## سير المحادثة

### المقدمة
"مرحباً، معك أحمد من بنك التنمية بسلطنة عمان. نجري استبياناً قصيراً حول "${survey.title}". سيستغرق حوالي ${Math.ceil(formattedQuestions.length * 0.5)} دقائق. هل ترغب بالمشاركة الآن؟"

### توضيح السياق
"هدف هذا الاستبيان هو جمع ملاحظاتك. سأطرح ${formattedQuestions.length} سؤالاً. معظمها يستغرق ثوانٍ قليلة. إجاباتك سرّية وستساعدنا على تحسين خدماتنا."

### الأسئلة (بالترتيب التالي):

${formattedQuestions.map((q: any) => {
          const typeInstructions: Record<string, string> = {
            'nps': 'مقياس من 0 إلى 10. اطلب التأكيد على الرقم.',
            'rating': 'مقياس تقييمي. تأكد أن الإجابة رقم ضمن النطاق.',
            'text': 'سؤال مفتوح. امنح وقتاً كافياً للإجابة.',
            'evi-slider': 'قيمة عاطفية من 0 إلى 100. اطلب التأكيد.',
            'multiple-choice': 'اعرض الخيارات بوضوح. اقبل النص أو رقم الخيار.',
            'yes-no': 'نعم/لا. اقبل المرادفات الشائعة.',
            'csat': 'رضا من 1 إلى 5. وضّح المقياس إذا لزم.'
          };
          return `
السؤال ${q.questionNumber} (المعرف: ${q.questionId}):
النوع: ${q.questionType}
الصياغة: "${q.questionText}"
${q.options ? `الخيارات: ${q.options.join(', ')}` : ''}
التعامل: ${typeInstructions[q.questionType as keyof typeof typeInstructions] || 'اطرح السؤال وسجّل الإجابة بدقة.'}
احفظ القيمة في المتغير: q_${q.questionId}
`;
        }).join('\n')}

## قواعد التنفيذ
1. **اسأل جميع ${formattedQuestions.length} الأسئلة** - يجب عليك طرح كل سؤال مدرج أعلاه بالترتيب
2. اسأل الأسئلة بالترتيب المحدد بدقة
3. خزّن الإجابات في متغيرات q_{questionId}
4. كن موجزاً ومحايداً
5. أعد الطلب حتى مرتين عند إجابة غير صالحة
6. **بعد كل سؤال، انتقل إلى السؤال التالي** - لا تتخطى أي أسئلة
7. بعد الإجابة على جميع ${formattedQuestions.length} الأسئلة، اشكر وأنهِ المكالمة
8. حافظ على اتساق اللغة طوال الوقت
9. تذكر: يجب عليك إكمال الاستبيان بأكمله بطرح جميع ${formattedQuestions.length} الأسئلة
`
        : `# Surveys & Feedback Collection Agent Prompt

## Identity & Purpose

You are Ahmed, a feedback collection voice assistant for Development Bank, Oman. Your primary purpose is to conduct engaging surveys, gather meaningful customer feedback, and collect market research data while ensuring high completion rates and quality responses.

Survey Title: ${survey.title}
Survey Description: ${survey.description || 'Customer feedback survey'}
Total Questions: ${formattedQuestions.length}

## Language Protocol

### Selected Language: ENGLISH
- **Conduct the ENTIRE survey in ENGLISH**
- The customer has selected English as their preferred language
- Do NOT switch to Arabic unless the customer specifically requests it
- If customer asks to switch to Arabic (e.g., "Arabic please", "بالعربي"), acknowledge and switch immediately

### Language Switching (if requested)
- Listen for phrases like: "Arabic", "بالعربي", "Can we speak in Arabic?"
- Acknowledge the switch: "Of course, I'll continue in Arabic" or "بالتأكيد، سأستمر بالعربية"
- Seamlessly transition without repeating previous questions

## Voice & Persona

### Personality
- Sound friendly, neutral, and attentive
- Project an interested and engaged demeanor without being overly enthusiastic
- Maintain a professional but conversational tone throughout
- Convey objectivity without biasing responses

### Speech Characteristics
- Use clear, concise language when asking questions
- Speak at a measured, comfortable pace
- Include occasional acknowledgments like "شكراً لك على مشاركة رأيك" (Arabic) or "Thank you for sharing that perspective" (English)
- Avoid language that might influence or lead responses in a particular direction

## Conversation Flow

### Introduction (ENGLISH)
"Hello, this is Ahmed calling on behalf of Development Bank, Oman. We're conducting a brief survey about ${survey.title}. This will take approximately ${Math.ceil(formattedQuestions.length * 0.5)} minutes. Would you be willing to participate today?"

### Setting Context (ENGLISH)
"The purpose of this survey is to gather your feedback. I'll ask ${formattedQuestions.length} questions. Most take just a few seconds to answer. Your responses are confidential and will help improve our services."

### SURVEY QUESTIONS TO ASK (in exact order):

${formattedQuestions.map((q: any) => {
          const typeInstructions = {
            'nps': 'Rating scale 0-10. Ask clearly and confirm the number.',
            'rating': 'Rating scale. Ensure numeric response within range.',
            'text': 'Open-ended. Allow time for thoughtful response.',
            'evi-slider': 'Emotional value 0-100. Ask and confirm score.',
            'multiple-choice': 'Present options clearly. Accept option text or number.',
            'yes-no': 'Binary choice. Accept yes/no and common variants.',
            'csat': 'Satisfaction rating 1-5. Clarify scale if needed.'
          };

          return `
Question ${q.questionNumber} (ID: ${q.questionId}):
Type: ${q.questionType}
Prompt (English): "${q.questionText}"
${q.options ? `Options: ${q.options.join(', ')}` : ''}
Handling: ${typeInstructions[q.questionType as keyof typeof typeInstructions] || 'Ask question and record response accurately.'}
Variable to set: q_${q.questionId}

**IMPORTANT**: Ask this question in ENGLISH (the customer's selected language).
`;
        }).join('\n')}

## Response Handling Guidelines

### CRITICAL: Language Consistency
- **Conduct the ENTIRE survey in ENGLISH** (customer's selected language)
- Ask ALL questions in English, give acknowledgments in English
- Do NOT use Arabic unless the customer specifically requests to switch

### For Rating Scale Questions (NPS, Rating, EVI)
1. Ask the question clearly with the scale range
2. Confirm unusual ratings: "You rated {{value}}. Could you briefly share what led to that rating?"
3. Acknowledge: "Thank you. I've recorded your rating of [number]."
4. Store numeric value in variable

### For Open-Ended Questions (Text)
1. Ask the question, allow 2-3 seconds of silence
2. If very brief answer, probe once: "Could you tell me a bit more about that?"
3. Acknowledge: "Thank you for sharing that."

### For Multiple Choice Questions
1. Present options: "Would you say: {{options}}?"
2. Accept option text or number index
3. If unclear, repeat options once

### For Yes/No Questions
1. Accept: yes, no, yeah, yep, nope, sure
2. Normalize to "yes"/"no"
3. If unclear: "Just to confirm, is that a yes or no?"

## Scenario Handling

### For Brief Answers
- "Could you tell me a bit more about that?"
- "Could you share a specific example?"

### For Detailed Answers
- "Thank you for that detailed perspective."
- "To stay on track, let's move to the next question."

### For Negative Feedback
- "Thank you for being candid about your experience."
- Never defend - just acknowledge and continue

### For Confusion
- Restate the question more clearly
- Provide brief clarification
- After 2 attempts, mark as "skipped" if not required

### If Customer Requests Language Switch to Arabic
- Acknowledge immediately: "بالتأكيد، سأستمر بالعربية" (Of course, I'll continue in Arabic)
- Repeat the current question in Arabic
- Continue rest of survey in Arabic

## Closing (ENGLISH)
"Those are all the questions. Is there anything else you'd like to add?"
"Thank you for taking the time to share your feedback. Your responses will help us improve our services."
"Thanks again, and have a great day."

## Execution Rules
1. **CONDUCT SURVEY IN ENGLISH** - Customer selected English as preferred language
2. **DO NOT start in Arabic** - Only switch to Arabic if customer requests it
3. **ASK ALL ${formattedQuestions.length} QUESTIONS** - You MUST ask every single question listed above in order
4. Ask questions in the EXACT order listed above
5. Set variable q_{{questionId}} for each response
6. Keep acknowledgments brief and neutral
7. Re-prompt up to 2 times for invalid answers
8. **AFTER EACH QUESTION, MOVE TO THE NEXT ONE** - Do not skip any questions
9. After ALL ${formattedQuestions.length} questions are answered, thank and end call
10. Maintain language consistency throughout
11. Maintain professional, friendly tone throughout

Remember: Your goal is to collect accurate, unbiased feedback while ensuring a positive experience for the participant. You MUST complete the entire survey by asking all ${formattedQuestions.length} questions.`;

      // Build VAPI call payload with questions
      const callPayload = {
        assistantId: agentId,
        phoneNumberId: phoneNumberId,
        customer: {
          number: formattedPhoneNumber
        },
        assistantOverrides: {
          variableValues: {
            survey_id: surveyId.toString(),
            survey_title: survey.title,
            total_questions: surveyQuestions.length.toString(),
            questions: JSON.stringify(formattedQuestions)
          },
          firstMessage: lang === 'ar'
            ? `مرحباً، معك أحمد من بنك التنمية بسلطنة عمان. نجري استبياناً قصيراً حول "${survey.title}". سيستغرق حوالي ${Math.ceil(formattedQuestions.length * 0.5)} دقائق. هل ترغب بالمشاركة الآن؟`
            : `Hello, this is Ahmed calling on behalf of Development Bank, Oman. We're conducting a brief survey about "${survey.title}". This will take approximately ${Math.ceil(formattedQuestions.length * 0.5)} minutes. Would you be willing to participate today?`,
          endOfCallMessage: lang === 'ar'
            ? 'شكراً لمشاركتك. تم حفظ إجاباتك بنجاح.'
            : 'Thank you for your participation. Your responses have been recorded.',
          recordingEnabled: true,
          model: {
            provider: 'openai',
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              }
            ]
          }
        },
        metadata: {
          survey_id: surveyId,
          survey_title: survey.title,
          total_questions: surveyQuestions.length
        }
      };

      // Remove fields not supported by current Vapi API
      // - serverUrl is no longer a valid top-level property
      // - assistantOverrides.endOfCallMessage is not allowed
      try {
        delete (callPayload as any).serverUrl;
        if ((callPayload as any).assistantOverrides) {
          delete (callPayload as any).assistantOverrides.endOfCallMessage;
        }
      } catch { }

      // Avoid detailed payload/question logging

      // Start VAPI call
      const vapiResponse = await vapiClient.startCall(callPayload);

      

      res.status(200).json({
        success: true,
        message: 'Voice survey call initiated',
        callId: vapiResponse.id,
        status: vapiResponse.status
      });

    } catch (error: any) {
      console.error('Voice survey call failed:', error.message || error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ success: false, message: 'Unable to start the voice survey call. Please try again.' });
    }
  });

  /**
   * POST /api/start-survey-bulk
   * Initiates multiple VAPI voice calls for a survey from a list of phone numbers
   *
   * Request body:
   *   - surveyId: string
   *   - phoneNumbers: string[] (E.164 format)
   *   - language?: 'en' | 'ar'
   */
  app.post('/api/start-survey-bulk', async (req, res) => {
    try {
      const { surveyId, phoneNumbers, language } = req.body as {
        surveyId: string;
        phoneNumbers: string[];
        language?: 'en' | 'ar';
      };
      const lang: 'en' | 'ar' = (language === 'ar' ? 'ar' : 'en');

      if (!surveyId || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: surveyId and phoneNumbers[]'
        });
      }

      // Get survey details once
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
      }

      const surveyQuestions = Array.isArray(survey.questions) ? survey.questions : [];
      if (surveyQuestions.length === 0) {
        return res.status(400).json({ success: false, message: 'Survey has no questions' });
      }

      const { agentId, phoneNumberId } = await resolveVapiConfig(req);
      if (!agentId || !phoneNumberId) {
        return res.status(500).json({ success: false, message: 'Voice calling is not configured.' });
      }

      const formattedQuestions = surveyQuestions.map((q: any, index: number) => ({
        questionNumber: index + 1,
        questionId: q.id,
        questionText: q.title || q.text || q.questionText || 'No question text provided',
        questionType: q.type || q.questionType || 'text',
        options: q.options || null
      }));

      const systemPrompt = buildVapiBulkSystemPrompt(survey, formattedQuestions, lang);

      // Prepare webhook URL for all bulk calls (same precedence as single)
      const bulkWebhookPath = process.env.VOICE_WEBHOOK_PATH || '/api/voice/webhook';
      const bulkBaseFromEnv = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, '') : '';
      const webhookUrl =
        process.env.VOICE_WEBHOOK_URL ||
        (bulkBaseFromEnv ? `${bulkBaseFromEnv}${bulkWebhookPath}` : `${req.protocol}://${req.get('host')}${bulkWebhookPath}`);

      const results: Array<{ number: string; ok: boolean; id?: string; status?: string; error?: string }> = [];

      for (const number of phoneNumbers) {
        try {
          // Format phone number to E.164
          const formattedPhoneNumber = formatPhoneNumberE164(number);
          
          const callPayload = {
            assistantId: agentId,
            phoneNumberId: phoneNumberId,
            customer: { number: formattedPhoneNumber },
            assistantOverrides: {
              variableValues: {
                survey_id: surveyId.toString(),
                survey_title: survey.title,
                total_questions: surveyQuestions.length.toString(),
                questions: JSON.stringify(formattedQuestions)
              },
              firstMessage: lang === 'ar'
                ? `مرحباً، معك أحمد من بنك التنمية بسلطنة عمان. نجري استبياناً قصيراً حول "${survey.title}". سيستغرق حوالي ${Math.ceil(formattedQuestions.length * 0.5)} دقائق. هل ترغب بالمشاركة الآن؟`
                : `Hello, this is Ahmed calling on behalf of Development Bank, Oman. We're conducting a brief survey about "${survey.title}". This will take approximately ${Math.ceil(formattedQuestions.length * 0.5)} minutes. Would you be willing to participate today?`,
              endOfCallMessage: lang === 'ar'
                ? 'شكراً لمشاركتك. تم حفظ إجاباتك بنجاح.'
                : 'Thank you for your participation. Your responses have been recorded.',
              recordingEnabled: true,
              model: {
                provider: 'openai',
                model: 'gpt-4o',
                messages: [
                  { role: 'system', content: systemPrompt }
                ]
              }
            },
            metadata: {
              survey_id: surveyId,
              survey_title: survey.title,
              total_questions: surveyQuestions.length
            }
          };

          // Remove fields not supported by current Vapi API
          try {
            delete (callPayload as any).serverUrl;
            if ((callPayload as any).assistantOverrides) {
              delete (callPayload as any).assistantOverrides.endOfCallMessage;
            }
          } catch { }

          const vapiResponse = await vapiClient.startCall(callPayload);
          results.push({ number: formattedPhoneNumber, ok: true, id: vapiResponse.id, status: vapiResponse.status });
        } catch (err: any) {
          results.push({ number, ok: false, error: err?.message || String(err) });
        }
      }

      const successCount = results.filter(r => r.ok).length;
      return res.status(200).json({
        success: true,
        message: `Bulk initiated: ${successCount}/${results.length} calls started`,
        results,
      });
    } catch (error: any) {
      console.error('Bulk voice survey start failed:', error.message || error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ success: false, message: 'Unable to start some calls. Please try again.' });
    }
  });

  /**
   * POST /api/voice/webhook
   * VAPI webhook endpoint - receives survey responses
   * 
   * VAPI will POST here when call completes with captured responses
   */
  app.post(process.env.VOICE_WEBHOOK_PATH || '/api/voice/webhook', async (req, res) => {
    try {
      

      // Verify webhook signature if secret is configured
      const secret = process.env.VOICE_WEBHOOK_SECRET;
      if (secret) {
        const signature = req.headers['x-vapi-signature'];
        // Signature present (not printed to logs)
      }

      const body = req.body || {};
      const metadata = body.metadata || body.call?.metadata || {};
      const surveyId = metadata.survey_id;

      if (!surveyId) {
        
        return res.status(400).json({
          success: false,
          message: 'Missing survey_id in metadata'
        });
      }

      // Log analysis data if present
      if (body.analysis) {
        
        
        
        
        
      }

      // Extract responses from VAPI payload
      // VAPI sends responses in different formats depending on configuration
      const vapiResponses = body.variables || body.transcript || body.messages || {};
      const customerPhone = body.customer?.number || body.call?.customer?.number;

      

      // Get survey to validate
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

      if (!survey) {
        
        return res.status(404).json({
          success: false,
          message: 'Survey not found'
        });
      }

      // Extract questions from JSONB column
      const surveyQuestions = Array.isArray(survey.questions) ? survey.questions : [];

      // Minimal logs only; skip variables dump

      // Parse and store responses as JSONB
      const answersObject: Record<string, any> = {};

      // Handle different VAPI response formats
      if (vapiResponses && typeof vapiResponses === 'object') {
        for (const [key, value] of Object.entries(vapiResponses)) {
          // Processing variable

          // Look for question responses in format: q_{questionId} (UUID)
          // Example: q_abc123-def4-5678-90ab-cdef12345678
          const questionMatch = key.match(/^q_([a-f0-9\-]+)$/i);

          if (questionMatch) {
            const questionId = questionMatch[1];

            // Find the question in survey by ID
            const question = surveyQuestions.find((q: any) => q.id === questionId);

            if (question) {
              answersObject[questionId] = String(value);
              
            } else {
              
            }
          } else if (key.startsWith('q_') || key.startsWith('question_')) {
            // Also try to match by index for backward compatibility
            const indexMatch = key.match(/q(?:uestion)?_?(\d+)/i);
            if (indexMatch) {
              const questionIndex = parseInt(indexMatch[1]) - 1;
              const question = surveyQuestions[questionIndex];

              if (question && question.id) {
                answersObject[question.id] = String(value);
                
              }
            }
          }
        }
      }

      // If no structured responses found, try to extract from transcript
      if (Object.keys(answersObject).length === 0 && body.transcript) {
        

        surveyQuestions.forEach((question: any) => {
          if (question.id) {
            answersObject[question.id] = body.transcript;
          }
        });
      }

      // Skip printing answers to logs

      // Parse structured outputs early for CSAT, NPS, EVI, CES and other signals
      const structuredOutputsData = parseVAPIStructuredOutputs(body);
      const vapiCsatScore = structuredOutputsData?.csatScore ?? null;
      const vapiNpsScore = structuredOutputsData?.npsScore ?? null;
      const vapiEviScore = structuredOutputsData?.eviScore ?? null;
      const vapiCesScore = structuredOutputsData?.cesScore ?? null;

      const durationCandidate =
        body.call?.duration ??
        body.call?.durationSeconds ??
        body.call?.durationMs ??
        body.duration ??
        body.analysis?.duration ??
        null;

      let responseTimeMinutes: number | undefined;
      if (durationCandidate !== null && durationCandidate !== undefined) {
        const durationNum = typeof durationCandidate === 'string' ? Number(durationCandidate) : Number(durationCandidate);
        if (!Number.isNaN(durationNum)) {
          // If value looks like ms, convert to minutes
          const durationSeconds = durationNum > 1000 ? durationNum / 1000 : durationNum;
          responseTimeMinutes = durationSeconds / 60;
        }
      }

      // Store response with JSONB answers via storage service
      if (Object.keys(answersObject).length > 0) {
        const analysisSummary = body.analysis?.summary || null;
        const structuredData = body.analysis?.structuredData || {};

        const response = await storeSurveyResponse({
          surveyId,
          answers: answersObject,
          respondentPhone: customerPhone ?? null,
          eviScore: vapiEviScore,
          npsScore: vapiNpsScore,
          csatScore: vapiCsatScore,
          cesScore: vapiCesScore,
          // Add analysis data
          analysisSummary,
          surveyCompleted: structuredData.survey_completed ?? null,
          totalQuestionsAsked: structuredData.total_questions_asked ?? null,
          overallSentiment: structuredData.overall_sentiment ?? null,
          detailedResponses: structuredData.responses ?? null,
        });

        
        
        
        
        // Respondent phone not logged

        // 🔥 NEW: Sync to analytics tables for real-time dashboard updates
        try {
          
          
          const callId = body.call?.id || body.id || null;

          await syncVAPICallToAnalytics(
            surveyId,
            customerPhone || `anonymous_${Date.now()}`,
            answersObject,
            callId,
            responseTimeMinutes,
            vapiCsatScore,
            vapiNpsScore,
            vapiEviScore,
            vapiCesScore
          );

          
          
          
        } catch (analyticsError) {
          
          // Don't fail the webhook - response is already stored
        }

        // 🚀 NEW: AI Analysis with OpenRouter - Analyze transcript for all dashboard tabs
        try {
          const transcript = body.transcript || body.analysis?.summary || JSON.stringify(answersObject);

          if (transcript && survey) {
            
            

            // Analyze transcript with OpenRouter
            const analysisResult = await analyzeTranscriptWithOpenRouter({
              transcript,
              surveyTitle: survey.title,
              surveyDescription: survey.description || undefined,
              respondentPhone: customerPhone,
              surveyId: surveyId,
            });

            // Store all analyzed data in dashboard tables
            await storeDashboardAnalysis({
              surveyId,
              responseId: response.id,
              analysis: analysisResult,
            });

            
            
            
            
            
            
            
            
            
          }
        } catch (analysisError: any) {
          
          // Don't fail the webhook - response is already stored
        }

        // Extract and store structured outputs (if available)
        
        
        if (structuredOutputsData) {
          try {
            const callId = body.call?.id || body.id || null;
            const structuredOutput = await storeStructuredOutput({
              responseId: response.id,
              callId,
              outputs: structuredOutputsData,
            });

            
            
            
            
            
            
            

            res.status(200).json({
              success: true,
              message: 'Response and structured outputs stored successfully',
              responseId: response.id,
              structuredOutputId: structuredOutput.id,
              surveyId: surveyId,
              answers_count: Object.keys(answersObject).length,
              structured_outputs: {
                supervisor_review_needed: structuredOutput.supervisorReviewNeeded,
                customer_frustrated: structuredOutput.customerFrustrated,
                customer_sentiment: structuredOutput.customerSentiment,
                csat_score: structuredOutput.csatScore,
              }
            });
          } catch (error: any) {
            
            // Still return success for the main response
            res.status(200).json({
              success: true,
              message: 'Response stored successfully (structured outputs failed)',
              responseId: response.id,
              surveyId: surveyId,
              answers_count: Object.keys(answersObject).length,
              structured_outputs_error: error.message,
            });
          }
        } else {
          
          
          res.status(200).json({
            success: true,
            message: 'Response stored successfully',
            responseId: response.id,
            surveyId: surveyId,
            answers_count: Object.keys(answersObject).length,
          });
        }
      } else {
        
        
        
        res.status(200).json({
          success: true,
          message: 'Webhook received but no answers extracted',
          answers_count: 0
        });
      }

    } catch (error: any) {
      
      console.error('Server error:', res.status); res.status(500).json({ success: false, message: 'Failed to process webhook' });
    }
  });
}

/**
 * Build instructions for VAPI agent based on survey and questions
 */
function buildVapiInstructions(survey: any, questions: any[], lang: 'en' | 'ar' = 'en'): string {
  const lines: string[] = [];
  if (lang === 'ar') {
    lines.push(`أنت تجري استبياناً هاتفياً بعنوان "${survey.title}".`);
    if (survey.description) lines.push(survey.description);
    lines.push('');
    lines.push('اطرح الأسئلة التالية بالترتيب:');
    lines.push('');
  } else {
    lines.push(`You are conducting a phone survey titled "${survey.title}".`);
    if (survey.description) lines.push(survey.description);
    lines.push('');
    lines.push('Ask the following questions in order:');
    lines.push('');
  }

  questions.forEach((q, index) => {
    const questionNum = index + 1;
    if (lang === 'ar') {
      lines.push(`السؤال ${questionNum}: ${q.text || q.question}`);
      if (q.type) {
        if (q.type === 'rating') {
          lines.push(`   الإجابة المتوقعة: تقييم من 1 إلى ${q.maxRating || 10}`);
        } else if (q.type === 'choice') {
          lines.push(`   الإجابة المتوقعة: أحد الخيارات التالية: ${(q.options || []).join(', ')}`);
        } else if (q.type === 'text') {
          lines.push(`   الإجابة المتوقعة: إجابة نصية مفتوحة`);
        }
      }
      lines.push(`   خزّن الإجابة في المتغير: q_${questionNum}`);
    } else {
      lines.push(`Question ${questionNum}: ${q.text || q.question}`);
      if (q.type) {
        if (q.type === 'rating') {
          lines.push(`   Expected answer: A rating from 1 to ${q.maxRating || 10}`);
        } else if (q.type === 'choice') {
          lines.push(`   Expected answer: One of the following options: ${(q.options || []).join(', ')}`);
        } else if (q.type === 'text') {
          lines.push(`   Expected answer: Open text response`);
        }
      }
      lines.push(`   Store the response in variable: q_${questionNum}`);
    }
    lines.push('');
  });
  if (lang === 'ar') {
    lines.push('بعد الإجابة على جميع الأسئلة:');
    lines.push('- اشكر المشارك على وقته');
    lines.push('- أكد حفظ الإجابات');
    lines.push('- أنهِ المكالمة بلطف');
  } else {
    lines.push('After all questions are answered:');
    lines.push('- Thank the participant for their time');
    lines.push('- Confirm their responses have been recorded');
    lines.push('- End the call politely');
  }

  return lines.join('\n');
}

/**
 * Build a comprehensive system prompt for bulk flow reusing the same logic as single call
 */
function buildVapiBulkSystemPrompt(survey: any, formattedQuestions: any[], lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    const qBlock = formattedQuestions.map((q: any) => {
      const typeMap: Record<string, string> = {
        'nps': 'مقياس 0-10',
        'rating': 'مقياس تقييمي',
        'text': 'نصي مفتوح',
        'evi-slider': 'قيمة عاطفية 0-100',
        'multiple-choice': 'اختيار من متعدد',
        'yes-no': 'نعم/لا',
        'csat': 'رضا 1-5',
      };
      return `السؤال ${q.questionNumber} [${typeMap[q.questionType] || q.questionType}]: "${q.questionText}" ${q.options ? `(خيارات: ${q.options.join(', ')})` : ''}\nخزّن في q_${q.questionId}`;
    }).join('\n');

    return `أنت أحمد، مساعد صوتي لجمع الملاحظات لــ بنك التنمية، سلطنة عمان.
العنوان: ${survey.title}
الوصف: ${survey.description || 'استبيان ملاحظات العملاء'}
الأسئلة:
${qBlock}
الارشادات: اسأل بالترتيب، كن محايداً ومختصراً، وأكّد الإجابات الرقمية.`;
  }

  const qBlockEn = formattedQuestions.map((q: any) => `Q${q.questionNumber} [${q.questionType}]: "${q.questionText}" ${q.options ? `(options: ${q.options.join(', ')})` : ''}\nStore in q_${q.questionId}`).join('\n');
  return `You are Ahmed, a voice assistant for Development Bank, Oman.
Title: ${survey.title}
Description: ${survey.description || 'Customer feedback survey'}
Questions:
${qBlockEn}
Guidelines: Ask in order, be neutral and concise, confirm numeric answers.`;
}
