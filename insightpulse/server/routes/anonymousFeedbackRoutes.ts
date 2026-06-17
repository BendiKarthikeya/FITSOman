import { Router, Request, Response } from "express";
import { db } from "../db";
import { anonymousFeedback, crmContactTags, crmTags, surveys } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { fetchCRMContactsByTags, fetchCRMFilteredContacts } from "../integrations/crmIntegrationService";

function getEnv(name: string): string | null {
    const v = process.env[name];
    return v && v.trim().length > 0 ? v : null;
}

function buildSurveyLink(surveyId: string): string {
    const base = getEnv("PUBLIC_APP_URL") || getEnv("BASE_URL") || "http://localhost:5001";
    return `${base.replace(/\/$/, "")}/survey/${surveyId}`;
}

function createEmailTransporter() {
    const host = getEnv("SMTP_HOST");
    const portRaw = getEnv("SMTP_PORT");
    const user = getEnv("SMTP_USER");
    const pass = getEnv("SMTP_PASS");
    if (!host || !portRaw || !user || !pass) return null;
    const port = Number(portRaw);
    if (!Number.isFinite(port)) return null;
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const router = Router();

// ─── Submit anonymous feedback (PUBLIC — no auth, no identity stored) ───────
router.post("/api/feedback/anonymous/submit", async (req: Request, res: Response) => {
    const { surveyId, tagId, tagName, answers, channel } = req.body as {
        surveyId?: string;
        tagId?: string;
        tagName?: string;
        answers?: Record<string, any>;
        channel?: string;
    };

    if (!surveyId || !answers || typeof answers !== "object") {
        return res.status(400).json({ success: false, message: "surveyId and answers are required" });
    }

    // Verify survey exists
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (!survey) return res.status(404).json({ success: false, message: "Survey not found" });

    await db.insert(anonymousFeedback).values({
        surveyId,
        tagId: tagId || null,
        tagName: tagName || null,
        answers,
        channel: channel || "link",
    });

    return res.json({ success: true, message: "Feedback submitted anonymously" });
});

// ─── Send survey to all contacts in a CRM tag (authenticated) ───────────────
router.post("/api/feedback/anonymous/send-by-tag", async (req: Request, res: Response) => {
    const { surveyId, configId, tableName, tagIds, recipientColumn, channel } = req.body as {
        surveyId?: string;
        configId?: string;
        tableName?: string;
        tagIds?: string[];
        recipientColumn?: string;
        channel?: "email" | "whatsapp" | "voice";
    };

    if (!surveyId || !configId || !tableName || !tagIds || !Array.isArray(tagIds) || !recipientColumn || !channel) {
        return res.status(400).json({ success: false, message: "Missing required parameters (surveyId, configId, tableName, tagIds, recipientColumn, channel)" });
    }

    // Fetch contacts using the tag-based filtering
    const result = await fetchCRMContactsByTags(configId, tableName, tagIds, recipientColumn);
    if (!result.success || !result.contacts) {
        return res.status(400).json({ success: false, message: result.error || "Failed to fetch contacts" });
    }

    const contactList = result.contacts;
    if (!contactList.length) {
        return res.status(200).json({ success: true, sent: 0, message: "No contacts found for the selected tags" });
    }

    const surveyLink = buildSurveyLink(surveyId);
    let sent = 0;
    let failed = 0;

    if (channel === "email") {
        const transporter = createEmailTransporter();
        if (!transporter) {
            return res.status(500).json({ success: false, message: "SMTP not configured" });
        }
        const fromName = getEnv("SMTP_FROM_NAME") || "InsightPulse";
        const fromEmail = getEnv("SMTP_FROM_EMAIL") || getEnv("SMTP_USER") || "no-reply@insightpulse.local";

        const results = await Promise.allSettled(
            contactList.map((to) =>
                transporter.sendMail({
                    from: `${fromName} <${fromEmail}>`,
                    to,
                    subject: "You're invited to share feedback",
                    text: `This is an anonymous feedback request. Your responses will not be linked to your identity.\n\nOpen the survey: ${surveyLink}`,
                    html: `
            <p>Hello,</p>
            <p>You have been invited to share your anonymous feedback.</p>
            <p><strong>Your identity will not be stored or associated with your responses.</strong></p>
            <p><a href="${surveyLink}" style="background:#6366f1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Open Survey</a></p>
            <p style="color:#888;font-size:12px;margin-top:16px;">This link will take you to an anonymous survey. No login is required.</p>
          `,
                })
            )
        );

        sent = results.filter((r) => r.status === "fulfilled").length;
        failed = results.length - sent;
    } else if (channel === "whatsapp") {
        const watiBase = getEnv("WATI_API_BASE");
        const watiKey = getEnv("WATI_API_KEY") || getEnv("WATI_KEY");

        if (!watiBase || !watiKey) {
            return res.status(500).json({ success: false, message: "WATI not configured" });
        }

        const results = await Promise.allSettled(
            contactList.map((phone) =>
                fetch(`${watiBase}/sendSessionMessage/${phone}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${watiKey}` },
                    body: JSON.stringify({
                        messageText: `You are invited to share anonymous feedback. Your identity will NOT be stored.\n\nOpen the survey here: ${surveyLink}`,
                    }),
                })
            )
        );

        sent = results.filter((r) => r.status === "fulfilled").length;
        failed = results.length - sent;
    } else if (channel === "voice") {
        const vapiBase = getEnv("VAPI_URL_BASE") || "https://api.vapi.ai";
        const vapiKey = getEnv("VAPI_KEY");
        const agentId = getEnv("AGENT_ID");
        const phoneNumberId = getEnv("PHONE_NUMBER_ID");

        if (!vapiKey || !agentId || !phoneNumberId) {
            return res.status(500).json({ success: false, message: "VAPI not configured" });
        }

        const results = await Promise.allSettled(
            contactList.map((phone) =>
                fetch(`${vapiBase}/call`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${vapiKey}` },
                    body: JSON.stringify({
                        phoneNumberId,
                        assistantId: agentId,
                        customer: { number: phone },
                        assistantOverrides: {
                            variableValues: { surveyLink },
                        },
                    }),
                })
            )
        );

        sent = results.filter((r) => r.status === "fulfilled").length;
        failed = results.length - sent;
    }

    return res.json({
        success: true,
        sent,
        failed,
        tag: `Tags: ${tagIds.length}`,
        message: `Sent to ${sent} contacts${failed ? `, ${failed} failed` : ""}`,
    });
});

// ─── List submissions (admin use) ─────────────────────────────────────────────
router.get("/api/feedback/anonymous/submissions", async (req: Request, res: Response) => {
    const submissions = await db
        .select()
        .from(anonymousFeedback)
        .orderBy(anonymousFeedback.submittedAt);

    return res.json({ success: true, data: submissions });
});

export default router;
