# Gmail Integration Guide

How InsightPulse connects a user's Gmail mailbox via OAuth2 and sends email (survey invites) from their own address through the Gmail API. Use this as a recipe to replicate the same integration in another project.

> No SMTP password, no app passwords, no nodemailer/Gmail SMTP — everything goes through the **Gmail REST API** (`gmail.googleapis.com/gmail/v1/users/me/messages/send`) using a per-user OAuth2 access token.

---

## 1. High-level architecture

```
Browser (Settings page)
   │  1. user clicks "Connect Gmail"
   ▼
Backend: GET /api/crm-oauth/authorize/gmail?client_id=…&redirect_uri=…
   │  returns Google consent URL
   ▼
Google consent screen
   │  2. user approves "Send email as you"
   ▼
Browser ← redirect to redirect_uri?code=…
   │
   ▼
Backend: POST /api/crm-oauth/callback
   │  3. exchange code → access_token + refresh_token
   │  4. fetch userinfo → email_address, display_name
   │  5. store in `crm_configs` table (crmType='gmail')
   ▼
Send time: sendViaMailbox(config, { to, subject, html })
   │  6. build RFC-2822 MIME → base64url
   │  7. POST gmail.googleapis.com/gmail/v1/users/me/messages/send
   │  8. on 401 → refresh access_token → retry once → persist new token
```

The same flow doubles for Outlook (Microsoft Graph) with different URLs — the code paths are unified.

---

## 2. Google Cloud Console one-time setup

1. Create / open a GCP project at <https://console.cloud.google.com/>.
2. **APIs & Services → Library**: enable **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: External (or Internal if Workspace-only).
   - Add scope: `https://www.googleapis.com/auth/gmail.send`
   - Add scope: `https://www.googleapis.com/auth/userinfo.email`
   - Add test users while in "Testing" mode, or submit for verification for prod.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs: e.g.
     - `http://localhost:5001/settings/crm-integrations/callback`
     - `https://yourdomain.com/settings/crm-integrations/callback`
5. Copy the **Client ID** and **Client secret** — the frontend will send these to the backend (or store server-side, see security note).

> Security note: in this project the client_id / client_secret are entered by each user in the Settings UI and forwarded to the OAuth endpoints, which is convenient for multi-tenant self-hosting. For a single-tenant app, put them in env vars (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`) and never expose the secret to the browser.

---

## 3. Database — where the connection is stored

A single polymorphic table holds connected mailboxes / CRMs (`shared/schema.ts:353`):

```ts
export const crmConfigs = pgTable("crm_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  crmType: varchar("crm_type", { length: 50 }).notNull(),  // "gmail" | "outlook" | "zoho" | …
  authType: varchar("auth_type", { length: 50 }).notNull(),// "OAuth2"
  credentials: jsonb("credentials").notNull(),             // see shape below
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestedStatus: varchar("last_tested_status", { length: 20 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});
```

`credentials` JSON shape for a Gmail row:

```json
{
  "client_id":     "…apps.googleusercontent.com",
  "client_secret": "GOCSPX-…",
  "access_token":  "ya29.…",
  "refresh_token": "1//0g…",
  "email_address": "user@gmail.com",
  "display_name":  "Jane Doe"
}
```

> In production, encrypt the `credentials` JSON at rest (e.g. AES-GCM with a server-side key) before writing it to the column. This repo currently stores it plain inside `jsonb` — fine for self-hosting but harden it for SaaS.

---

## 4. Backend — OAuth endpoints

Two Express routes power the dance (`server/routes/crmIntegrationRoutes.ts`).

### 4.1 OAuth config

```ts
const OAUTH_CONFIGS = {
  gmail: {
    authUrl:     "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl:    "https://oauth2.googleapis.com/token",
    scope:       "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
};
```

### 4.2 Step 1 — `GET /api/crm-oauth/authorize/gmail`

Builds the Google consent URL. **Important**: `access_type=offline` + `prompt=consent` are required to get a `refresh_token`, otherwise Google will only return an access token the first time.

```ts
const params = new URLSearchParams({
  client_id,
  response_type: "code",
  redirect_uri,
  scope: OAUTH_CONFIGS.gmail.scope,
  access_type: "offline",   // ← needed for refresh_token
  prompt: "consent",        // ← forces refresh_token on re-consent
  state,                    // base64 JSON { crmType, timestamp }
});
const authUrl = `${OAUTH_CONFIGS.gmail.authUrl}?${params.toString()}`;
res.json({ success: true, authUrl });
```

### 4.3 Step 2 — `POST /api/crm-oauth/callback`

Frontend posts back `{ code, client_id, client_secret, redirect_uri, crmType: "gmail" }`. Backend:

1. POSTs to `https://oauth2.googleapis.com/token` with:
   ```
   grant_type=authorization_code
   client_id=…
   client_secret=…
   code=…
   redirect_uri=…   (must match exactly what was used in step 1)
   ```
2. Extracts `access_token` + `refresh_token` from the response.
3. Calls `GET https://www.googleapis.com/oauth2/v2/userinfo` with `Authorization: Bearer <access_token>` to learn the user's email and display name.
4. Saves the row in `crm_configs` with `crmType='gmail'`, `authType='OAuth2'`, and the credentials JSON above.

---

## 5. Backend — sending email through Gmail

All sending logic lives in [server/integrations/emailProviders.ts](../server/integrations/emailProviders.ts). Three building blocks:

### 5.1 Build a MIME message

Gmail expects a complete RFC-2822 message, base64url-encoded, in the `raw` field. We build a `multipart/alternative` body so plain-text + HTML are both delivered:

```
From: "Sender" <sender@gmail.com>
To: recipient@example.com
Subject: =?UTF-8?B?…?=                  ← RFC-2047 for non-ASCII subjects
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="b_xxx"

--b_xxx
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: base64
<base64 text>

--b_xxx
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: base64
<base64 html>

--b_xxx--
```

Then base64url it:

```ts
function base64UrlEncode(s: string) {
  return Buffer.from(s, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
```

### 5.2 Send

```ts
await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ raw: base64UrlEncode(mime) }),
});
```

### 5.3 Auto-refresh on 401

Gmail access tokens expire in ~1 hour. The integration wraps every send with a "send → if 401, refresh, persist, retry once" loop:

```ts
async function refreshOAuthToken(tokenUrl, creds) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id:     creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
  });
  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return r.ok ? (await r.json()).access_token : null;
}

// after first 401:
const newAccess = await refreshOAuthToken("https://oauth2.googleapis.com/token", creds);
await db.update(crmConfigs)
  .set({ credentials: { ...creds, access_token: newAccess }, updatedAt: new Date() })
  .where(eq(crmConfigs.id, configId));
// retry the send with newAccess
```

> Why persist the new access token? So concurrent / subsequent sends within the next hour don't each waste a refresh round-trip.

### 5.4 Lookup helper

```ts
export async function getActiveMailboxConfig(userId): Promise<MailboxConfig | null> {
  const [row] = await db.select().from(crmConfigs)
    .where(and(
      eq(crmConfigs.userId, userId),
      eq(crmConfigs.isActive, true),
      inArray(crmConfigs.crmType, ["gmail", "outlook"]),
    ))
    .orderBy(desc(crmConfigs.createdAt))
    .limit(1);
  return row ? { id: row.id, crmType: row.crmType, credentials: row.credentials } : null;
}
```

---

## 6. Call site — sending a survey invite

[server/routes/emailSurveyRoutes.ts](../server/routes/emailSurveyRoutes.ts) (around line 153) shows the typical "prefer connected mailbox, fall back to SMTP" pattern:

```ts
const mailbox = await getActiveMailboxConfig(userId);

if (mailbox) {
  const fromName = mailbox.credentials.display_name || "InsightPulse";
  const results = await Promise.allSettled(
    recipients.map((to) =>
      sendViaMailbox(mailbox, { to, subject, html, text, fromName })
    )
  );
  // …
} else {
  // SMTP fallback via nodemailer
}
```

Recipients see the email from the connected user's real Gmail address (e.g. `jane@gmail.com`), not a generic no-reply box, which dramatically improves deliverability.

---

## 7. Replicating in another project — checklist

- [ ] Create OAuth client in GCP, enable Gmail API, add scopes `gmail.send` + `userinfo.email`, register redirect URI.
- [ ] Create a table (or reuse one) with `userId`, `provider`, `credentials JSONB`, `isActive`, timestamps.
- [ ] Backend route `GET /oauth/gmail/authorize` → returns Google consent URL with `access_type=offline`, `prompt=consent`.
- [ ] Backend route `POST /oauth/gmail/callback`:
  - exchange `code` → tokens at `https://oauth2.googleapis.com/token`
  - GET `/oauth2/v2/userinfo` to record the user's email
  - persist `{ client_id, client_secret, access_token, refresh_token, email_address, display_name }`
- [ ] Helper `sendViaGmail(creds, { to, subject, html, text })`:
  - build RFC-2822 MIME (multipart/alternative)
  - base64url-encode
  - POST `gmail.googleapis.com/gmail/v1/users/me/messages/send`
  - on 401 → refresh via `refresh_token` → persist new `access_token` → retry once
- [ ] Frontend "Connect Gmail" button → opens the consent URL in a popup → on `?code=` redirect → POST callback → show connected mailbox.
- [ ] (Optional) Encrypt the `credentials` JSON at rest.
- [ ] (Optional) Wire a "Disconnect" route that flips `isActive=false` (or DELETEs the row) and ideally calls `https://oauth2.googleapis.com/revoke?token=<refresh_token>` to revoke on Google's side.

---

## 8. Gotchas worth knowing up front

- **No refresh_token on the second consent.** Google only returns a refresh_token the *first* time the user consents, unless you also pass `prompt=consent`. Always include it during dev or you'll be debugging "refresh failed" errors.
- **Redirect URI must match exactly.** Including trailing slashes and protocol. A mismatch yields `redirect_uri_mismatch` from Google with no detail.
- **Scope `gmail.send` is send-only.** It cannot read mailboxes — good for least privilege. If you need to read sent items or threads, add `gmail.readonly` / `gmail.modify` and re-consent.
- **Quotas.** Free Gmail accounts: ~500 sends/day; Workspace: 2,000/day. The Gmail API also has per-second quotas (250 quota units/user/sec, send = 100 units → ~2.5 sends/sec/user). Batch carefully for bulk dispatch.
- **From address is fixed** to the authenticated mailbox. You cannot send "as" another address unless that address is configured as a Gmail send-as alias for the same account.
- **Verification.** Until your OAuth app is verified, it's limited to test users (max 100). Submit for verification before public launch; verification with restricted scopes like `gmail.send` requires a security assessment.

---

## 9. File map (for cross-reference)

| Concern | File |
|---|---|
| OAuth provider config + endpoints | [server/routes/crmIntegrationRoutes.ts](../server/routes/crmIntegrationRoutes.ts) |
| MIME build, send, refresh, lookup | [server/integrations/emailProviders.ts](../server/integrations/emailProviders.ts) |
| Caller (survey invites) | [server/routes/emailSurveyRoutes.ts](../server/routes/emailSurveyRoutes.ts) |
| DB schema for connected mailboxes | [shared/schema.ts:353](../shared/schema.ts#L353) |
| UI "Connect Gmail" page | [client/ui/pages/SettingsCrmIntegrationsPage.tsx](../client/ui/pages/SettingsCrmIntegrationsPage.tsx) |
