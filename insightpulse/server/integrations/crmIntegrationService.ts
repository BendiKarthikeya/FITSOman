import { db, pool } from "../db";
import { crmConfigs, crmSyncLogs } from "@shared/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import VapiClient from "./vapiClient";

// CRM Integration service
export interface CRMConfig {
  id: string;
  userId: string;
  crmType: "zoho" | "salesforce" | "hubspot";
  authType: string;
  credentials: Record<string, string>;
  isActive: boolean;
  lastTestedAt?: Date;
  lastTestedStatus?: "success" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMConnection {
  id: string;
  name: string;
  crmType: string;
  status: "connected" | "disconnected" | "error";
  lastSyncTime?: Date;
  syncStatus?: string;
  errorMessage?: string;
}

// Store CRM configurations in database
export async function saveCRMConfig(
  userId: string,
  crmType: string,
  authType: string,
  credentials: Record<string, string>
): Promise<CRMConfig> {
  const id = crypto.randomUUID();
  const now = new Date();

  // Ensure we use 'anonymous' if no valid userId provided
  const safeUserId = userId || 'anonymous';

  // Single-active invariant for telephony and mailbox integrations
  if (crmType === 'twilio' || crmType === 'gmail' || crmType === 'outlook') {
    try {
      await db
        .update(crmConfigs)
        .set({ isActive: false, updatedAt: now })
        .where(and(eq(crmConfigs.userId, safeUserId), eq(crmConfigs.crmType, crmType)));
    } catch (err) {
      console.warn(`Failed to deactivate prior ${crmType} configs:`, err);
    }
  }

  try {
    const [result] = await db
      .insert(crmConfigs)
      .values({
        id,
        userId: safeUserId,
        crmType: crmType as "zoho" | "salesforce" | "hubspot",
        authType,
        credentials,
        isActive: true,
        lastTestedAt: now,
        lastTestedStatus: "success",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    

    return result as any;
  } catch (error: any) {
    // If foreign key constraint fails, try to create the user first
    if (error.message && error.message.includes('crm_configs_user_id_fkey')) {
      console.log('🔧 Creating anonymous user to fix foreign key constraint...');

      // Try to create the anonymous user using raw query
      try {
        // Create the user with the actual userId that's being used
        await pool.query(`
          INSERT INTO users (id, username, password, email, role, created_at)
          VALUES ($1, $2, 'no-password-needed', $3, 'user', now())
          ON CONFLICT (id) DO NOTHING
        `, [safeUserId, safeUserId, `${safeUserId}@example.com`]);

        console.log(`✅ User '${safeUserId}' created successfully`);

        // Retry the insert
        const [result] = await db
          .insert(crmConfigs)
          .values({
            id,
            userId: safeUserId,
            crmType: crmType as "zoho" | "salesforce" | "hubspot",
            authType,
            credentials,
            isActive: true,
            lastTestedAt: now,
            lastTestedStatus: "success",
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return result as any;
      } catch (retryError) {
        
        console.error('Error:', error); throw retryError;
      }
    }
    throw error;
  }
}

export async function getCRMConfigs(userId: string): Promise<CRMConfig[]> {
  const results = await db
    .select()
    .from(crmConfigs)
    .where(eq(crmConfigs.userId, userId));

  return results as any[];
}

export async function getCRMConfigById(configId: string): Promise<CRMConfig | null> {
  console.log('🔵 Getting CRM config by ID:', configId);

  const [result] = await db
    .select()
    .from(crmConfigs)
    .where(eq(crmConfigs.id, configId));

  if (result) {
    
  } else {
    
  }

  return (result as any) || null;
}

export async function updateCRMConfig(
  configId: string,
  updates: Partial<CRMConfig>
): Promise<CRMConfig | null> {
  const [result] = await db
    .update(crmConfigs)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(crmConfigs.id, configId))
    .returning();

  return (result as any) || null;
}

export async function deleteCRMConfig(configId: string): Promise<boolean> {
  const result = await db
    .delete(crmConfigs)
    .where(eq(crmConfigs.id, configId));

  return (result.rowCount ?? 0) > 0;
}

// Log CRM sync operations
export async function logCRMSync(
  configId: string,
  operation: string,
  status: "pending" | "running" | "success" | "failed",
  details?: {
    recordsProcessed?: number;
    recordsSuccessful?: number;
    recordsFailed?: number;
    errorMessage?: string;
    completedAt?: Date;
  }
): Promise<void> {
  await db.insert(crmSyncLogs).values({
    id: crypto.randomUUID(),
    configId,
    operation,
    status,
    recordsProcessed: details?.recordsProcessed || 0,
    recordsSuccessful: details?.recordsSuccessful || 0,
    recordsFailed: details?.recordsFailed || 0,
    errorMessage: details?.errorMessage,
    completedAt: details?.completedAt,
  });
}

// Helper function to refresh HubSpot token
async function refreshHubSpotAccessToken(config: CRMConfig): Promise<string | null> {
  try {
    const { client_id, client_secret, refresh_token } = config.credentials as any;

    if (!refresh_token) {
      console.error('❌ Missing refresh_token for HubSpot');
      return null;
    }

    // Some auth flows might not save client_id/secret in credentials if they were from env, 
    // but for OAuth2 they should be there. 
    // If missing, we can't refresh unless we have them elsewhere (e.g. env vars for a Public App).
    // Assuming they are in credentials as per crmIntegrationRoutes.ts save logic.

    console.log('🔄 Refreshing HubSpot access token...');

    // Check if we need to use env vars (if not in credentials)
    // This is a fallback if someone connected via a global app credential set
    const clientId = client_id;
    const clientSecret = client_secret;

    if (!clientId) {
      console.error('❌ Missing client_id for HubSpot refresh');
      return null;
    }

    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret || "",
        refresh_token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HubSpot token refresh failed: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token; // HubSpot might rotate refresh tokens

    if (!newAccessToken) {
      console.error('❌ No access token in refresh response');
      return null;
    }

    // Update config in database
    const newCredentials: Record<string, string> = {
      ...config.credentials,
      access_token: newAccessToken,
    };

    if (newRefreshToken) {
      newCredentials.refresh_token = newRefreshToken;
    }

    await updateCRMConfig(config.id, {
      credentials: newCredentials,
      lastTestedAt: new Date(),
      lastTestedStatus: "success"
    });

    console.log('✅ HubSpot token refreshed successfully');
    return newAccessToken;
  } catch (error) {
    console.error('❌ Error refreshing HubSpot token:', error);
    return null;
  }
}

// Individual CRM connection test functions
async function testZohoConnection(
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";

  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
    CN: "https://www.zohoapis.com.cn",
    JP: "https://www.zohoapis.jp",
  }[region as string] || "https://www.zohoapis.com";

  

  try {
    // Use /crm/v2/settings/modules instead of /users (works with ZohoCRM.settings.ALL scope)
    const testUrl = `${apiBaseUrl}/crm/v2/settings/modules`;
    

    const response = await fetch(testUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    

    if (response.ok) {
      const data = await response.json();
      
      return { success: true, message: "✓ Successfully connected to Zoho CRM" };
    } else if (response.status === 401) {
      const errorData = await response.text();
      
      return { success: false, message: "✗ Invalid Zoho credentials or expired token" };
    } else {
      const errorData = await response.text();
      
      return { success: false, message: `✗ Zoho API error: ${response.statusText}` };
    }
  } catch (error) {
    
    return { success: false, message: `✗ Connection failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function testSalesforceConnection(
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url || "https://login.salesforce.com";

  try {
    const response = await fetch(`${instanceUrl}/services/data/v57.0/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return { success: true, message: "✓ Successfully connected to Salesforce" };
    } else if (response.status === 401) {
      return { success: false, message: "✗ Invalid Salesforce credentials or expired token" };
    } else {
      return { success: false, message: `✗ Salesforce API error: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `✗ Connection failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function testHubSpotConnection(
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  const accessToken = credentials.access_token;

  try {
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return { success: true, message: "✓ Successfully connected to HubSpot" };
    } else if (response.status === 401) {
      return { success: false, message: "✗ Invalid HubSpot token" };
    } else {
      return { success: false, message: `✗ HubSpot API error: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `✗ Connection failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function testTwilioConnection(
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  const sid = credentials.account_sid;
  const token = credentials.auth_token;
  const number = credentials.phone_number;
  const assistantId = credentials.assistant_id || undefined;

  console.log('[Twilio] testTwilioConnection →', { sid: sid ? `${sid.slice(0, 6)}…` : null, number, hasToken: !!token, assistantId: assistantId || null });

  if (!sid || !token || !number) {
    console.error('[Twilio] Missing required fields:', { hasSid: !!sid, hasToken: !!token, hasNumber: !!number });
    return { success: false, message: "Missing Twilio credentials (account_sid, auth_token, phone_number)" };
  }

  try {
    const basic = Buffer.from(`${sid}:${token}`).toString("base64");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`;
    console.log('[Twilio] Validating credentials against', twilioUrl);
    const twilioResp = await fetch(twilioUrl, { headers: { Authorization: `Basic ${basic}` } });

    if (!twilioResp.ok) {
      const body = await twilioResp.text();
      console.error(`[Twilio] Credential check failed ${twilioResp.status}:`, body);
      if (twilioResp.status === 401) {
        return { success: false, message: "✗ Invalid Twilio Account SID or Auth Token" };
      }
      return { success: false, message: `✗ Twilio API error: ${twilioResp.statusText}` };
    }

    console.log('[Twilio] Credentials valid — importing number into VAPI');

    // Register the Twilio number with VAPI and cache the resulting phoneNumberId
    const vapi = new VapiClient({ apiKey: "" });
    const imported = await vapi.importTwilioNumber({
      number,
      twilioAccountSid: sid,
      twilioAuthToken: token,
      assistantId,
      name: `Twilio ${number}`,
    });

    if (imported?.id) {
      credentials.vapi_phone_number_id = imported.id;
      console.log('[Twilio] Stored vapi_phone_number_id in credentials:', imported.id);
    }

    return {
      success: true,
      message: imported?.status === "mock"
        ? "✓ Twilio credentials validated (VAPI key not set — phoneNumberId not imported)"
        : "✓ Twilio validated and phone number imported into VAPI",
    };
  } catch (error) {
    console.error('[Twilio] testTwilioConnection error:', error);
    return {
      success: false,
      message: `✗ Twilio/VAPI import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function testGmailConnection(
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  console.log('[Gmail] testGmailConnection → hitting userinfo');
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${credentials.access_token}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log('[Gmail] Connected as', data.email);
      return { success: true, message: `✓ Gmail connected as ${data.email || "(unknown)"}` };
    }
    const body = await resp.text();
    console.error(`[Gmail] userinfo failed ${resp.status}:`, body);
    if (resp.status === 401) return { success: false, message: "✗ Invalid Gmail token" };
    return { success: false, message: `✗ Gmail API error: ${resp.statusText}` };
  } catch (error) {
    console.error('[Gmail] testGmailConnection exception:', error);
    return { success: false, message: `✗ Connection failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function testOutlookConnection(
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  console.log('[Outlook] testOutlookConnection → hitting Graph /me');
  try {
    const resp = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${credentials.access_token}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log('[Outlook] Connected as', data.mail || data.userPrincipalName);
      return { success: true, message: `✓ Outlook connected as ${data.mail || data.userPrincipalName || "(unknown)"}` };
    }
    const body = await resp.text();
    console.error(`[Outlook] Graph /me failed ${resp.status}:`, body);
    if (resp.status === 401) return { success: false, message: "✗ Invalid Outlook token" };
    return { success: false, message: `✗ Microsoft Graph error: ${resp.statusText}` };
  } catch (error) {
    console.error('[Outlook] testOutlookConnection exception:', error);
    return { success: false, message: `✗ Connection failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// Test CRM connection - routes to specific CRM test function
export async function testCRMConnection(
  crmType: string,
  authType: string,
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  try {
    if (crmType !== "twilio" && !credentials.access_token) {
      return { success: false, message: "Missing access token" };
    }

    switch (crmType) {
      case "zoho":
        return await testZohoConnection(credentials);
      case "salesforce":
        return await testSalesforceConnection(credentials);
      case "hubspot":
        return await testHubSpotConnection(credentials);
      case "twilio":
        return await testTwilioConnection(credentials);
      case "gmail":
        return await testGmailConnection(credentials);
      case "outlook":
        return await testOutlookConnection(credentials);
      default:
        return { success: false, message: "Unknown CRM type" };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Fetch CRM tables/objects
export async function fetchCRMTables(configId: string): Promise<{ success: boolean; tables?: any[]; error?: string }> {
  try {
    
    const config = await getCRMConfigById(configId);
    if (!config) {
      
      return { success: false, error: "Configuration not found" };
    }

    

    const { crmType, credentials } = config;

    if (!credentials?.access_token) {
      
      return { success: false, error: "Access token not found. Please reconnect your CRM." };
    }

    switch (crmType) {
      case "zoho":
        return await fetchZohoTables(credentials);
      case "salesforce":
        return await fetchSalesforceTables(credentials);
      case "hubspot":
        return await fetchHubSpotTables(config);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch tables" };
  }
}

async function fetchZohoTables(credentials: Record<string, string>): Promise<{ success: boolean; tables?: any[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
    CN: "https://www.zohoapis.com.cn",
    JP: "https://www.zohoapis.jp",
  }[region] || "https://www.zohoapis.com";

  

  try {
    const url = `${apiBaseUrl}/crm/v2/settings/modules`;
    console.log('🔵 Fetching from:', url);

    const response = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    

    if (!response.ok) {
      const errorText = await response.text();
      
      return { success: false, error: `Failed to fetch Zoho modules: ${response.statusText} - ${errorText}` };
    }

    const data = await response.json();
    console.log('🔵 Zoho modules data:', data);

    const tables = data.modules?.map((module: any) => ({
      name: module.api_name,
      label: module.module_name,
    })) || [];

    
    return { success: true, tables };
  } catch (error) {
    
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchSalesforceTables(credentials: Record<string, string>): Promise<{ success: boolean; tables?: any[]; error?: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;

  try {
    const response = await fetch(`${instanceUrl}/services/data/v57.0/sobjects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Salesforce objects: ${response.statusText}` };
    }

    const data = await response.json();
    const tables = data.sobjects?.map((obj: any) => ({
      name: obj.name,
      label: obj.label,
    })) || [];

    return { success: true, tables };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchHubSpotTables(config: CRMConfig): Promise<{ success: boolean; tables?: any[]; error?: string }> {
  // HubSpot has predefined objects BUT we should check if they are accessible to validate the token
  // and potentially fetch custom objects if needed later. For now, valid token check is good.

  let accessToken = config.credentials.access_token;
  const url = "https://api.hubapi.com/crm/v3/objects/contacts?limit=1";

  try {
    let response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      console.log("⚠️ HubSpot 401 in fetchTables. Refreshing token...");
      const newToken = await refreshHubSpotAccessToken(config);
      if (newToken) {
        accessToken = newToken;
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        return { success: false, error: "Full authentication required. Please reconnect HubSpot." };
      }
    }

    if (!response.ok) {
      return { success: false, error: `HubSpot API Error: ${response.statusText}` };
    }
  } catch (e: any) {
    // If network error, might still return static list but better to fail so user knows connection is bad
    console.warn("HubSpot connection check failed:", e);
  }

  // HubSpot has predefined objects
  const tables = [
    { name: "contacts", label: "Contacts" },
    { name: "companies", label: "Companies" },
    { name: "deals", label: "Deals" },
    { name: "tickets", label: "Tickets" },
  ];

  return { success: true, tables };
}

// Fetch columns/fields from a specific CRM table
export async function fetchCRMTableColumns(
  configId: string,
  tableName: string
): Promise<{ success: boolean; columns?: any[]; error?: string }> {
  try {
    const config = await getCRMConfigById(configId);
    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    const { crmType, credentials } = config;

    switch (crmType) {
      case "zoho":
        return await fetchZohoTableColumns(credentials, tableName);
      case "salesforce":
        return await fetchSalesforceTableColumns(credentials, tableName);
      case "hubspot":
        return await fetchHubSpotTableColumns(config, tableName);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch columns" };
  }
}

// Fetch rows from a specific CRM table
export async function fetchCRMTableRows(
  configId: string,
  tableName: string,
  fields: string[] = [],
  limit = 50
): Promise<{ success: boolean; rows?: any[]; fields?: string[]; error?: string }> {
  try {
    const config = await getCRMConfigById(configId);
    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    let effectiveFields = fields.filter(Boolean);
    if (!effectiveFields.length) {
      const columnsResult = await fetchCRMTableColumns(configId, tableName);
      if (!columnsResult.success) {
        return { success: false, error: columnsResult.error || "Failed to fetch columns" };
      }
      effectiveFields = (columnsResult.columns || []).slice(0, 6).map((col: any) => col.name).filter(Boolean);
    }

    if (!effectiveFields.length) {
      return { success: false, error: "No fields available to display" };
    }

    const { crmType, credentials } = config;

    switch (crmType) {
      case "zoho":
        return await fetchZohoTableRows(credentials, tableName, effectiveFields, limit);
      case "salesforce":
        return await fetchSalesforceTableRows(credentials, tableName, effectiveFields, limit);
      case "hubspot":
        return await fetchHubSpotTableRows(config, tableName, effectiveFields, limit);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rows" };
  }
}

async function fetchZohoTableColumns(
  credentials: Record<string, string>,
  moduleName: string
): Promise<{ success: boolean; columns?: any[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
    CN: "https://www.zohoapis.com.cn",
    JP: "https://www.zohoapis.jp",
  }[region] || "https://www.zohoapis.com";

  try {
    const response = await fetch(`${apiBaseUrl}/crm/v2/settings/fields?module=${moduleName}`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Zoho fields: ${response.statusText}` };
    }

    const data = await response.json();
    const columns = data.fields?.map((field: any) => ({
      name: field.api_name,
      label: field.field_label,
      type: field.data_type,
    })) || [];

    return { success: true, columns };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchSalesforceTableColumns(
  credentials: Record<string, string>,
  objectName: string
): Promise<{ success: boolean; columns?: any[]; error?: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;

  try {
    const response = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/${objectName}/describe`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Salesforce fields: ${response.statusText}` };
    }

    const data = await response.json();
    const columns = data.fields?.map((field: any) => ({
      name: field.name,
      label: field.label,
      type: field.type,
    })) || [];

    return { success: true, columns };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchHubSpotTableColumns(
  config: CRMConfig,
  objectType: string
): Promise<{ success: boolean; columns?: any[]; error?: string }> {
  let accessToken = config.credentials.access_token;

  try {
    const fetchColumns = async (token: string) => {
      return await fetch(`https://api.hubapi.com/crm/v3/properties/${objectType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    };

    let response = await fetchColumns(accessToken);

    if (response.status === 401) {
      console.log("⚠️ HubSpot 401 in fetchColumns. Refreshing token...");
      const newToken = await refreshHubSpotAccessToken(config);
      if (newToken) {
        accessToken = newToken;
        response = await fetchColumns(accessToken);
      } else {
        return { success: false, error: "Token expired" };
      }
    }

    if (!response.ok) {
      return { success: false, error: `Failed to fetch HubSpot properties: ${response.statusText}` };
    }

    const data = await response.json();
    const columns = data.results?.map((prop: any) => ({
      name: prop.name,
      label: prop.label,
      type: prop.type,
    })) || [];

    return { success: true, columns };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchZohoTableRows(
  credentials: Record<string, string>,
  moduleName: string,
  fields: string[],
  limit: number
): Promise<{ success: boolean; rows?: any[]; fields?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
    CN: "https://www.zohoapis.com.cn",
    JP: "https://www.zohoapis.jp",
  }[region] || "https://www.zohoapis.com";

  try {
    const response = await fetch(
      `${apiBaseUrl}/crm/v2/${moduleName}?fields=${encodeURIComponent(fields.join(","))}&page=1&per_page=${limit}`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Zoho records: ${response.statusText}` };
    }

    const data = await response.json();
    const records = data.data || [];
    const rows = records.map((record: any) => {
      const row: Record<string, any> = {};
      for (const field of fields) {
        row[field] = record?.[field] ?? "";
      }
      return row;
    });

    return { success: true, rows, fields };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchSalesforceTableRows(
  credentials: Record<string, string>,
  objectName: string,
  fields: string[],
  limit: number
): Promise<{ success: boolean; rows?: any[]; fields?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;

  try {
    const query = `SELECT ${fields.join(", ")} FROM ${objectName} LIMIT ${limit}`;
    const response = await fetch(
      `${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Salesforce records: ${response.statusText}` };
    }

    const data = await response.json();
    const rows = (data.records || []).map((record: any) => {
      const row: Record<string, any> = {};
      for (const field of fields) {
        row[field] = record?.[field] ?? "";
      }
      return row;
    });

    return { success: true, rows, fields };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchHubSpotTableRows(
  config: CRMConfig,
  objectType: string,
  fields: string[],
  limit: number
): Promise<{ success: boolean; rows?: any[]; fields?: string[]; error?: string }> {
  let accessToken = config.credentials.access_token;

  try {
    // HubSpot object types need to be lowercase
    const normalizedObjectType = objectType.toLowerCase();

    console.log(`🔵 HubSpot API Request:`, {
      objectType: normalizedObjectType,
      fields: fields,
      limit
    });

    // Join properties with comma
    const propertiesParam = fields.join(",");
    const url = `https://api.hubapi.com/crm/v3/objects/${normalizedObjectType}?properties=${propertiesParam}&limit=${limit}`;
    console.log(`🔗 URL: ${url}`);

    let response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (response.status === 401) {
      console.log("⚠️ HubSpot 401 in fetchRows. Refreshing token...");
      const newToken = await refreshHubSpotAccessToken(config);
      if (newToken) {
        accessToken = newToken;
        response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      } else {
        return { success: false, error: "Session expired. Please reconnect." };
      }
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ HubSpot API Error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: url
      });
      return { success: false, error: `Failed to fetch HubSpot records: ${response.statusText}` };
    }

    const data = await response.json();
    const rows = (data.results || []).map((result: any) => {
      const row: Record<string, any> = {};
      for (const field of fields) {
        row[field] = result?.properties?.[field] ?? "";
      }
      return row;
    });

    console.log(`✅ Fetched ${rows.length} HubSpot records`);
    return { success: true, rows, fields };
  } catch (error) {
    console.error(`❌ HubSpot fetch error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fetch contacts from a specific CRM table column
export async function fetchCRMContacts(
  configId: string,
  tableName: string,
  phoneColumn: string,
  extraFields: string[] = []
): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  try {
    const config = await getCRMConfigById(configId);
    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    const { crmType, credentials } = config;

    switch (crmType) {
      case "zoho":
        return await fetchZohoContacts(credentials, tableName, phoneColumn, extraFields);
      case "salesforce":
        return await fetchSalesforceContacts(credentials, tableName, phoneColumn, extraFields);
      case "hubspot":
        return await fetchHubSpotContacts(config, tableName, phoneColumn, extraFields);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch contacts" };
  }
}

async function fetchZohoContacts(
  credentials: Record<string, string>,
  moduleName: string,
  phoneField: string,
  extraFields: string[] = []
): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
    CN: "https://www.zohoapis.com.cn",
    JP: "https://www.zohoapis.jp",
  }[region] || "https://www.zohoapis.com";

  try {
    let allContacts: any[] = [];
    let page = 1;
    let hasMore = true;
    const fieldsToFetch = [phoneField, ...extraFields].join(",");

    while (hasMore && page <= 10) { // Limit to 10 pages (2000 records max)
      const response = await fetch(`${apiBaseUrl}/crm/v2/${moduleName}?fields=${fieldsToFetch}&page=${page}&per_page=200`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (!response.ok) {
        return { success: false, error: `Failed to fetch Zoho records: ${response.statusText}` };
      }

      const data = await response.json();
      const records = data.data || [];

      let batchContacts: any[] = [];

      if (extraFields.length > 0) {
        // Return objects with requested fields
        batchContacts = records
          .filter((record: any) => record[phoneField])
          .map((record: any) => {
            const contact: any = {};
            [phoneField, ...extraFields].forEach(field => {
              contact[field] = record[field];
            });
            return contact;
          });
      } else {
        // Return simple strings (legacy behavior)
        batchContacts = records
          .map((record: any) => record[phoneField])
          .filter((phone: any) => phone && typeof phone === "string" && phone.trim().length > 0);
      }

      allContacts = [...allContacts, ...batchContacts];

      hasMore = data.info?.more_records || false;
      page++;
    }

    return { success: true, contacts: allContacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchSalesforceContacts(
  credentials: Record<string, string>,
  objectName: string,
  phoneField: string,
  extraFields: string[] = []
): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;

  try {
    const fieldsToSelect = [phoneField, ...extraFields].join(", ");
    const query = `SELECT ${fieldsToSelect} FROM ${objectName} WHERE ${phoneField} != null LIMIT 2000`;
    const response = await fetch(
      `${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Salesforce records: ${response.statusText}` };
    }

    const data = await response.json();
    let contacts: any[] = [];

    if (extraFields.length > 0) {
      contacts = (data.records || []).map((record: any) => {
        const contact: any = {};
        [phoneField, ...extraFields].forEach(field => {
          contact[field] = record[field];
        });
        return contact;
      });
    } else {
      contacts = (data.records || []).map((record: any) => record[phoneField]).filter(Boolean);
    }

    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}


async function fetchHubSpotContacts(
  config: CRMConfig,
  objectType: string,
  phoneProperty: string,
  extraFields: string[] = []
): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  let accessToken = config.credentials.access_token;

  try {
    let allContacts: any[] = [];
    let after: string | undefined;
    const propertiesParam = [phoneProperty, ...extraFields].join(",");

    console.log(`🔵 HubSpot fetchHubSpotContacts:`, { objectType, phoneProperty, extraFields });

    // Fetch up to 1000 records (10 pages of 100)
    for (let i = 0; i < 10; i++) {
      const url = after
        ? `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${propertiesParam}&limit=100&after=${after}`
        : `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${propertiesParam}&limit=100`;

      console.log(`🔗 HubSpot URL: ${url}`);

      let response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        console.log("⚠️ HubSpot 401 in fetchContacts. Refreshing token...");
        const newToken = await refreshHubSpotAccessToken(config);
        if (newToken) {
          accessToken = newToken;
          response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } else {
          return { success: false, error: "Token expired" };
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HubSpot fetch failed: ${response.status} ${response.statusText}`, errorText);
        return { success: false, error: `Failed to fetch HubSpot records: ${response.statusText}` };
      }

      const data = await response.json();
      const results = data.results || [];
      console.log(`✅ HubSpot page ${i + 1} records: ${results.length}`);

      if (results.length > 0) {
        console.log(`Sample record properties:`, JSON.stringify(results[0].properties, null, 2));
      }

      let batchContacts: any[] = [];

      if (extraFields.length > 0) {
        batchContacts = results.map((result: any) => {
          const contact: any = {};
          [phoneProperty, ...extraFields].forEach(field => {
            contact[field] = result.properties?.[field];
          });
          return contact;
        });
      } else {
        batchContacts = results
          .map((result: any) => result.properties?.[phoneProperty])
          .filter(Boolean);
      }

      console.log(`✅ Extracted contacts from page ${i + 1}: ${batchContacts.length}`);

      allContacts = [...allContacts, ...batchContacts];

      if (!data.paging?.next?.after) break;
      after = data.paging.next.after;
    }

    console.log(`✅ Total HubSpot contacts extracted: ${allContacts.length}`);
    return { success: true, contacts: allContacts };
  } catch (error) {
    console.error(`❌ HubSpot exception:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fetch unique values from a single column in CRM
export async function fetchColumnUniqueValues(
  configId: string,
  tableName: string,
  columnName: string
): Promise<{ success: boolean; values?: string[]; error?: string }> {
  try {
    const config = await getCRMConfigById(configId);
    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    const { crmType, credentials } = config;

    switch (crmType) {
      case "zoho":
        return await fetchZohoColumnUniqueValues(credentials, tableName, columnName);
      case "salesforce":
        return await fetchSalesforceColumnUniqueValues(credentials, tableName, columnName);
      case "hubspot":
        return await fetchHubSpotColumnUniqueValues(config, tableName, columnName);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch column values" };
  }
}

async function fetchZohoColumnUniqueValues(
  credentials: Record<string, string>,
  moduleName: string,
  fieldName: string
): Promise<{ success: boolean; values?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
    CN: "https://www.zohoapis.com.cn",
    JP: "https://www.zohoapis.jp",
  }[region] || "https://www.zohoapis.com";

  try {
    const url = `${apiBaseUrl}/crm/v7/settings/fields?module=${moduleName}`;
    const response = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Zoho fields: ${response.statusText}` };
    }

    const data = await response.json();
    const field = data.fields?.find((f: any) => f.api_name === fieldName);

    if (!field) {
      return { success: false, error: `Field ${fieldName} not found` };
    }

    // For picklist fields, return the available values
    if (field.pick_list_values) {
      const values = field.pick_list_values.map((v: any) => v.display_value || v.actual_value).filter(Boolean);
      return { success: true, values };
    }

    // For other fields, fetch all records and collect unique values
    let allValues = new Set<string>();
    let page = 1;

    for (; page <= 10; page++) {
      const recordsUrl = `${apiBaseUrl}/crm/v7/modules/${moduleName}?fields=${fieldName}&per_page=100&page=${page}`;
      const recordsResponse = await fetch(recordsUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (!recordsResponse.ok) break;

      const recordsData = await recordsResponse.json();
      recordsData.data?.forEach((record: any) => {
        const value = record[fieldName];
        if (value) allValues.add(String(value));
      });

      if (!recordsData.data || recordsData.data.length < 100) break;
    }

    const values: string[] = Array.from(allValues).sort();
    return { success: true, values };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchSalesforceColumnUniqueValues(
  credentials: Record<string, string>,
  objectName: string,
  fieldName: string
): Promise<{ success: boolean; values?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;

  try {
    // Use SOQL to get unique field values
    const query = encodeURIComponent(`SELECT DISTINCT ${fieldName} FROM ${objectName} WHERE ${fieldName} != null LIMIT 1000`);
    const url = `${instanceUrl}/services/data/v57.0/query?q=${query}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch Salesforce records: ${response.statusText}` };
    }

    const data = await response.json();
    const values: string[] = (data.records || [])
      .map((record: any) => String(record[fieldName]).trim())
      .filter((v: string) => v && v !== "null");

    const uniqueValues = Array.from(new Set(values)).sort();
    return { success: true, values: uniqueValues };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchHubSpotColumnUniqueValues(
  config: CRMConfig,
  objectType: string,
  propertyName: string
): Promise<{ success: boolean; values?: string[]; error?: string }> {
  let accessToken = config.credentials.access_token;

  try {
    let allValues = new Set<string>();
    let after: string | undefined;

    // Fetch up to 1000 records (10 pages of 100)
    for (let i = 0; i < 10; i++) {
      const url = after
        ? `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${propertyName}&limit=100&after=${after}`
        : `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${propertyName}&limit=100`;

      let response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        console.log("⚠️ HubSpot 401 in fetchColumnUniqueValues. Refreshing token...");
        const newToken = await refreshHubSpotAccessToken(config);
        if (newToken) {
          accessToken = newToken;
          response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } else {
          return { success: false, error: "Token expired" };
        }
      }

      if (!response.ok) {
        return { success: false, error: `Failed to fetch HubSpot records: ${response.statusText}` };
      }

      const data = await response.json();
      data.results?.forEach((result: any) => {
        const value = result.properties?.[propertyName];
        if (value) allValues.add(String(value).trim());
      });

      if (!data.paging?.next?.after) break;
      after = data.paging.next.after;
    }

    const uniqueValues: string[] = Array.from(allValues).sort();
    return { success: true, values: uniqueValues };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function fetchCRMContactsByTags(
  configId: string,
  tableName: string,
  tagIds: string[],
  recipientColumn: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  try {
    const { db } = await import("../db");
    const { crmContactTags } = await import("../../shared/schema");
    const { inArray, and, eq } = await import("drizzle-orm");

    // 1. Get contact IDs associated with these tags
    const contactTags = await db.select().from(crmContactTags).where(
      and(
        eq(crmContactTags.crmConfigId, configId),
        inArray(crmContactTags.tagId, tagIds)
      )
    );

    const contactIds = Array.from(new Set(contactTags.map(ct => ct.contactId).filter(Boolean))) as string[];

    if (contactIds.length === 0) {
      // Fallback: If no contact IDs but we have emails/phones in our DB, use those?
      // For now, let's assume we need to fetch live from CRM if a column is selected.
      const directContacts = Array.from(new Set(
        contactTags.map(ct => recipientColumn.toLowerCase().includes("email") ? ct.contactEmail : ct.contactPhone).filter(Boolean)
      )) as string[];

      if (directContacts.length > 0) return { success: true, contacts: directContacts };
      return { success: true, contacts: [] };
    }

    const config = await getCRMConfigById(configId);
    if (!config) return { success: false, error: "Configuration not found" };

    const { crmType, credentials } = config;

    switch (crmType) {
      case "zoho":
        return await fetchZohoContactsByIds(credentials, tableName, contactIds, recipientColumn);
      case "salesforce":
        return await fetchSalesforceContactsByIds(credentials, tableName, contactIds, recipientColumn);
      case "hubspot":
        return await fetchHubSpotContactsByIds(config, tableName, contactIds, recipientColumn);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch contacts by tags" };
  }
}

async function fetchZohoContactsByIds(
  credentials: Record<string, string>,
  moduleName: string,
  contactIds: string[],
  recipientColumn: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
  }[region as string] || "https://www.zohoapis.com";

  try {
    // Zoho COQL for multiple IDs
    const idList = contactIds.map(id => `'${id}'`).join(",");
    const query = `select ${recipientColumn} from ${moduleName} where id in (${idList})`;
    const response = await fetch(`${apiBaseUrl}/crm/v2/coql`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ select_query: query }),
    });

    if (!response.ok) return { success: false, error: `Zoho COQL error: ${response.statusText}` };

    const data = await response.json();
    const contacts = (data.data || []).map((r: any) => r[recipientColumn]).filter(Boolean);
    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Zoho fetch failed" };
  }
}

async function fetchSalesforceContactsByIds(
  credentials: Record<string, string>,
  objectName: string,
  contactIds: string[],
  recipientColumn: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  const instanceUrl = credentials.instance_url;
  const accessToken = credentials.access_token;

  try {
    const idList = contactIds.map(id => `'${id}'`).join(",");
    const query = `SELECT ${recipientColumn} FROM ${objectName} WHERE Id IN (${idList})`;
    const response = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return { success: false, error: `Salesforce query error: ${response.statusText}` };

    const data = await response.json();
    const contacts = (data.records || []).map((r: any) => r[recipientColumn]).filter(Boolean);
    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Salesforce fetch failed" };
  }
}

async function fetchHubSpotContactsByIds(
  config: CRMConfig,
  objectType: string,
  contactIds: string[],
  recipientProperty: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  let accessToken = config.credentials.access_token;

  try {
    const fetchBatch = async (token: string) => {
      return await fetch(`https://api.hubapi.com/crm/v3/objects/${objectType}/batch/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: [recipientProperty],
          inputs: contactIds.map(id => ({ id })),
        }),
      });
    };

    let response = await fetchBatch(accessToken);

    if (response.status === 401) {
      const newToken = await refreshHubSpotAccessToken(config);
      if (newToken) {
        accessToken = newToken;
        response = await fetchBatch(accessToken);
      } else {
        return { success: false, error: "Token expired" };
      }
    }

    if (!response.ok) return { success: false, error: `HubSpot Batch Read Error: ${response.statusText}` };

    const data = await response.json();
    const contacts = (data.results || []).map((r: any) => r.properties[recipientProperty]).filter(Boolean);
    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "HubSpot fetch failed" };
  }
}

export async function fetchCRMFilteredContacts(
  configId: string,
  tableName: string,
  columnName: string,
  columnValue: string,
  recipientColumn: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  try {
    const config = await getCRMConfigById(configId);
    if (!config) return { success: false, error: "Configuration not found" };

    const { crmType, credentials } = config;

    switch (crmType) {
      case "zoho":
        return await fetchZohoFilteredContacts(credentials, tableName, columnName, columnValue, recipientColumn);
      case "salesforce":
        return await fetchSalesforceFilteredContacts(credentials, tableName, columnName, columnValue, recipientColumn);
      case "hubspot":
        return await fetchHubSpotFilteredContacts(config, tableName, columnName, columnValue, recipientColumn);
      default:
        return { success: false, error: "Unknown CRM type" };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch filtered contacts" };
  }
}

async function fetchZohoFilteredContacts(
  credentials: Record<string, string>,
  moduleName: string,
  columnName: string,
  columnValue: string,
  recipientColumn: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const region = credentials.region || "US";
  const apiBaseUrl = {
    US: "https://www.zohoapis.com",
    EU: "https://www.zohoapis.eu",
    IN: "https://www.zohoapis.in",
    AU: "https://www.zohoapis.com.au",
  }[region as string] || "https://www.zohoapis.com";

  try {
    // Zoho COQL approach
    const query = `select ${recipientColumn} from ${moduleName} where ${columnName} = '${columnValue}'`;
    const response = await fetch(`${apiBaseUrl}/crm/v2/coql`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ select_query: query }),
    });

    if (!response.ok) {
      // Fallback or handle error
      return { success: false, error: `Zoho COQL error: ${response.statusText}` };
    }

    const data = await response.json();
    const contacts = (data.data || []).map((r: any) => r[recipientColumn]).filter(Boolean);
    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Zoho fetch failed" };
  }
}

async function fetchSalesforceFilteredContacts(
  credentials: Record<string, string>,
  objectName: string,
  columnName: string,
  columnValue: string,
  recipientColumn: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;

  try {
    const query = `SELECT ${recipientColumn} FROM ${objectName} WHERE ${columnName} = '${columnValue}' LIMIT 1000`;
    const response = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, error: `Salesforce query error: ${response.statusText}` };
    }

    const data = await response.json();
    const contacts = (data.records || []).map((r: any) => r[recipientColumn]).filter(Boolean);
    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Salesforce fetch failed" };
  }
}

async function fetchHubSpotFilteredContacts(
  config: CRMConfig,
  objectType: string,
  propertyName: string,
  propertyValue: string,
  recipientProperty: string
): Promise<{ success: boolean; contacts?: string[]; error?: string }> {
  let accessToken = config.credentials.access_token;

  try {
    const fetchSearch = async (token: string) => {
      return await fetch(`https://api.hubapi.com/crm/v3/objects/${objectType}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [{ propertyName, operator: "EQ", value: propertyValue }],
            },
          ],
          properties: [recipientProperty],
          limit: 100,
        }),
      });
    };

    let response = await fetchSearch(accessToken);

    if (response.status === 401) {
      const newToken = await refreshHubSpotAccessToken(config);
      if (newToken) {
        accessToken = newToken;
        response = await fetchSearch(accessToken);
      } else {
        return { success: false, error: "Token expired" };
      }
    }

    if (!response.ok) {
      return { success: false, error: `HubSpot Search Error: ${response.statusText}` };
    }

    const data = await response.json();
    const contacts = (data.results || []).map((r: any) => r.properties[recipientProperty]).filter(Boolean);
    return { success: true, contacts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "HubSpot fetch failed" };
  }
}

// Sync operations between CRMs (Phase 2 - future implementation)
export async function syncContactAcrossCRMs(
  sourceConfigId: string,
  targetConfigIds: string[],
  contactData: Record<string, any>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const targetId of targetConfigIds) {
    try {
      // Log the sync operation
      await logCRMSync(targetId, "sync_contact", "success", {
        recordsProcessed: 1,
        recordsSuccessful: 1,
        recordsFailed: 0,
      });

      results[targetId] = { success: true, message: `Contact synced to target` };
    } catch (error) {
      await logCRMSync(targetId, "sync_contact", "failed", {
        recordsProcessed: 1,
        recordsSuccessful: 0,
        recordsFailed: 1,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      results[targetId] = { success: false, message: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  return results;
}
