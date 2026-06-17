import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import { getActiveMailboxConfig, sendViaMailbox } from "../integrations/emailProviders";
import { db } from "../db";
import { surveys } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

async function incrementSentCount(surveyId: string, count: number) {
  if (count <= 0) return;
  await db.update(surveys).set({ sentCount: sql`COALESCE(sent_count, 0) + ${count}` }).where(eq(surveys.id, surveyId));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSurveyEmailHtml(opts: { surveyTitle: string; surveyDescription: string | null; surveyLink: string; senderName: string; }): string {
  const { surveyTitle, surveyDescription, surveyLink, senderName } = opts;
  const title = escapeHtml(surveyTitle || "Quick Survey");
  const description = surveyDescription ? escapeHtml(surveyDescription) : "We'd love to hear your thoughts. It only takes a minute.";
  const sender = escapeHtml(senderName || "InsightPulse");
  const link = escapeHtml(surveyLink);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:#0f172a;padding:24px 32px;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <span style="display:inline-block;width:32px;height:32px;background:#38bdf8;color:#0f172a;border-radius:8px;text-align:center;line-height:32px;font-weight:700;font-size:14px;letter-spacing:0.5px;vertical-align:middle;">IP</span>
                      <span style="margin-left:10px;font-size:16px;font-weight:600;letter-spacing:0.2px;vertical-align:middle;">InsightPulse</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 12px;font-size:14px;color:#64748b;letter-spacing:0.3px;text-transform:uppercase;">Survey invitation</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#0f172a;font-weight:600;">${title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">${description}</p>
                <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#334155;">${sender} has invited you to share quick feedback. Your responses are anonymous and take less than a minute.</p>
                <!-- Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 32px;">
                  <tr>
                    <td align="center" style="border-radius:10px;background:#0f172a;">
                      <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Take the survey →</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#0ea5e9;text-decoration:none;">${link}</a></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">You're receiving this because ${sender} invited you to a survey on InsightPulse. If this wasn't intended for you, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  if (!value || value.trim().length === 0) return null;
  return value;
}

function buildSurveyLink(surveyId: string): string {
  const baseUrl = getRequiredEnv("PUBLIC_APP_URL") || getRequiredEnv("BASE_URL") || "http://localhost:5001";
  return `${baseUrl.replace(/\/$/, "")}/s/${surveyId}`;
}

function createTransporter() {
  const host = getRequiredEnv("SMTP_HOST");
  const portRaw = getRequiredEnv("SMTP_PORT");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");

  if (!host || !portRaw || !user || !pass) {
    return { transporter: null, error: "SMTP configuration missing" } as const;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    return { transporter: null, error: "SMTP_PORT must be a number" } as const;
  }

  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return { transporter, error: null } as const;
}

const router = Router();

router.post("/api/email/send-survey-bulk", async (req: Request, res: Response) => {
  const { surveyId, emails } = req.body as { surveyId?: string; emails?: string[] };
  const userId = (req as any).user?.id || (req.headers["user-id"] as string) || "anonymous";
  console.log('[email/send-survey-bulk] →', { userId, surveyId, recipientCount: Array.isArray(emails) ? emails.length : 0 });

  if (!surveyId || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: surveyId, emails",
    });
  }

  const invalid = emails.filter((email) => typeof email !== "string" || !email.includes("@"));
  if (invalid.length) {
    return res.status(400).json({
      success: false,
      message: "One or more emails are invalid",
    });
  }

  const surveyLink = buildSurveyLink(surveyId);

  // Fetch survey for a real subject + body
  const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  const surveyTitle = survey?.title || "Quick Survey";
  const subject = `${surveyTitle} — your feedback, please`;
  const text = `${surveyTitle}\n\nYou've been invited to complete a short survey. Open: ${surveyLink}`;

  // Prefer a connected Gmail/Outlook mailbox saved via /settingsCrmIntegrations
  const mailbox = await getActiveMailboxConfig(userId);
  console.log('[email/send-survey-bulk] mailbox resolution →', mailbox
    ? { via: mailbox.crmType, from: mailbox.credentials.email_address }
    : 'no connected mailbox, falling back to SMTP');

  if (mailbox) {
    const fromName = getRequiredEnv("SMTP_FROM_NAME") || mailbox.credentials.display_name || "InsightPulse";
    const html = renderSurveyEmailHtml({
      surveyTitle,
      surveyDescription: survey?.description ?? null,
      surveyLink,
      senderName: fromName,
    });
    const results = await Promise.allSettled(
      emails.map((to) =>
        sendViaMailbox(mailbox, { to, subject, html, text, fromName })
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;
    const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;

    if (failed > 0) {
      return res.status(207).json({
        success: false,
        sent,
        failed,
        via: mailbox.crmType,
        fromEmail: mailbox.credentials.email_address || null,
        message: firstError?.reason?.message || "Some emails failed to send",
      });
    }

    await incrementSentCount(surveyId, sent);
    return res.json({
      success: true,
      count: sent,
      via: mailbox.crmType,
      fromEmail: mailbox.credentials.email_address || null,
      message: `Email dispatch completed via ${mailbox.crmType}.`,
    });
  }

  // Fallback: SMTP env configuration
  const { transporter, error } = createTransporter();
  if (!transporter) {
    return res.status(500).json({
      success: false,
      message: error || "No mailbox connected and SMTP is not configured",
    });
  }

  const fromName = getRequiredEnv("SMTP_FROM_NAME") || "InsightPulse";
  const fromEmail = getRequiredEnv("SMTP_FROM_EMAIL") || getRequiredEnv("SMTP_USER") || "no-reply@insightpulse.local";
  const html = renderSurveyEmailHtml({
    surveyTitle,
    surveyDescription: survey?.description ?? null,
    surveyLink,
    senderName: fromName,
  });

  const results = await Promise.allSettled(
    emails.map((to) =>
      transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  if (failed > 0) {
    return res.status(207).json({
      success: false,
      sent,
      failed,
      via: "smtp",
      message: "Some emails failed to send",
    });
  }

  await incrementSentCount(surveyId, sent);
  return res.json({
    success: true,
    count: sent,
    via: "smtp",
    message: "Email dispatch completed.",
  });
});

export default router;
