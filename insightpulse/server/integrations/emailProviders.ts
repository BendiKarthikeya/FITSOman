import { db } from "../db";
import { crmConfigs } from "@shared/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

export interface MailboxConfig {
  id: string;
  crmType: "gmail" | "outlook";
  credentials: Record<string, string>;
}

// RFC 2047 encoded-word for any header value containing non-ASCII bytes.
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  const b64 = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function encodeAddress(name: string | undefined, email: string): string {
  if (!name) return email;
  return `${encodeHeader(name)} <${email}>`;
}

// Wrap base64 to 76-char lines per RFC 2045.
function base64Body(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
}

function buildRawRfc2822({ to, subject, html, text, fromName, fromEmail }: EmailMessage & { fromEmail: string }): string {
  const from = encodeAddress(fromName, fromEmail);
  const boundary = `b_${Date.now().toString(36)}`;
  const plain = text ?? html.replace(/<[^>]+>/g, "");
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(plain),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(html),
    "",
    `--${boundary}--`,
    "",
  ];
  return lines.join("\r\n");
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function refreshOAuthToken(
  tokenUrl: string,
  creds: Record<string, string>,
  extra: Record<string, string> = {}
): Promise<string | null> {
  const { client_id, client_secret, refresh_token } = creds;
  if (!client_id || !refresh_token) {
    console.error('[oauth-refresh] Cannot refresh — missing client_id or refresh_token', {
      hasClientId: !!client_id,
      hasRefreshToken: !!refresh_token,
    });
    return null;
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id,
    refresh_token,
    ...(client_secret ? { client_secret } : {}),
    ...extra,
  });
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`[oauth-refresh] ${tokenUrl} failed ${resp.status}:`, errBody);
    return null;
  }
  const data = await resp.json();
  return data.access_token || null;
}

async function persistAccessToken(configId: string, creds: Record<string, string>, newAccessToken: string) {
  const next = { ...creds, access_token: newAccessToken };
  await db
    .update(crmConfigs)
    .set({ credentials: next, updatedAt: new Date() })
    .where(eq(crmConfigs.id, configId));
}

async function sendViaGmailOnce(accessToken: string, msg: EmailMessage, fromEmail: string): Promise<Response> {
  const raw = base64UrlEncode(buildRawRfc2822({ ...msg, fromEmail }));
  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
}

async function sendViaOutlookOnce(accessToken: string, msg: EmailMessage): Promise<Response> {
  return fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: msg.subject,
        body: { contentType: "HTML", content: msg.html },
        toRecipients: [{ emailAddress: { address: msg.to } }],
      },
      saveToSentItems: true,
    }),
  });
}

export async function sendViaMailbox(config: MailboxConfig, msg: EmailMessage): Promise<void> {
  const creds = config.credentials;
  const accessToken = creds.access_token;
  const fromEmail = creds.email_address || creds.user || "";
  const tag = `[${config.crmType}]`;

  console.log(`${tag} sendViaMailbox →`, { to: msg.to, from: fromEmail, subject: msg.subject });

  if (!accessToken) {
    console.error(`${tag} No access_token on config ${config.id}`);
    throw new Error("Connected mailbox has no access token — please reconnect");
  }

  const isGmail = config.crmType === "gmail";
  const tokenUrl = isGmail
    ? "https://oauth2.googleapis.com/token"
    : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const refreshExtra: Record<string, string> = isGmail ? {} : { scope: "Mail.Send User.Read offline_access" };

  let resp = isGmail
    ? await sendViaGmailOnce(accessToken, msg, fromEmail)
    : await sendViaOutlookOnce(accessToken, msg);

  if (resp.status === 401) {
    console.warn(`${tag} 401 on send → attempting refresh_token flow`);
    const refreshed = await refreshOAuthToken(tokenUrl, creds, refreshExtra);
    if (!refreshed) {
      console.error(`${tag} Refresh failed for config ${config.id}`);
      throw new Error(`${config.crmType} token expired and refresh failed — please reconnect`);
    }
    await persistAccessToken(config.id, creds, refreshed);
    console.log(`${tag} Refreshed access_token persisted — retrying send`);
    resp = isGmail
      ? await sendViaGmailOnce(refreshed, msg, fromEmail)
      : await sendViaOutlookOnce(refreshed, msg);
  }

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`${tag} send failed ${resp.status} to=${msg.to}:`, body);
    throw new Error(`${config.crmType} send failed ${resp.status}: ${body}`);
  }

  console.log(`${tag} send ok → ${msg.to}`);
}

/**
 * Load the most recently saved active Gmail or Outlook mailbox for the user.
 * Returns null if none connected.
 */
export async function getActiveMailboxConfig(userId: string): Promise<MailboxConfig | null> {
  try {
    const rows = await db
      .select()
      .from(crmConfigs)
      .where(and(
        eq(crmConfigs.userId, userId),
        eq(crmConfigs.isActive, true),
        inArray(crmConfigs.crmType, ["gmail", "outlook"]),
      ))
      .orderBy(desc(crmConfigs.createdAt))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      crmType: row.crmType as "gmail" | "outlook",
      credentials: (row.credentials as Record<string, string>) || {},
    };
  } catch (err) {
    console.warn("getActiveMailboxConfig failed:", (err as any)?.message || err);
    return null;
  }
}
