import { Router, Request, Response } from "express";
import {
  testCRMConnection,
  saveCRMConfig,
  getCRMConfigs,
  deleteCRMConfig,
  updateCRMConfig,
  fetchCRMTables,
  fetchCRMTableColumns,
  fetchCRMContacts,
  fetchCRMTableRows,
  fetchColumnUniqueValues
} from "../integrations/crmIntegrationService";
import { requireAuth } from "../middleware/auth";
import { VapiClient } from "../integrations/vapiClient";

const router = Router();

// OAuth2 configuration for each CRM
const OAUTH_CONFIGS = {
  zoho: {
    US: {
      authUrl: "https://accounts.zoho.com/oauth/v2/auth",
      tokenUrl: "https://accounts.zoho.com/oauth/v2/token",
    },
    EU: {
      authUrl: "https://accounts.zoho.eu/oauth/v2/auth",
      tokenUrl: "https://accounts.zoho.eu/oauth/v2/token",
    },
    IN: {
      authUrl: "https://accounts.zoho.in/oauth/v2/auth",
      tokenUrl: "https://accounts.zoho.in/oauth/v2/token",
    },
    AU: {
      authUrl: "https://accounts.zoho.com.au/oauth/v2/auth",
      tokenUrl: "https://accounts.zoho.com.au/oauth/v2/token",
    },
  },
  salesforce: {
    authUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
  },
  hubspot: {
    authUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
  },
  gmail: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "Mail.Send User.Read offline_access",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
  },
};

// Initiate OAuth2 flow
router.get("/crm-oauth/authorize/:crmType", async (req: Request, res: Response) => {
  try {
    const { crmType } = req.params;
    const { region, client_id, redirect_uri, code_challenge } = req.query;

    if (!client_id || !redirect_uri) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: client_id, redirect_uri",
      });
    }

    let authUrl = "";
    const state = Buffer.from(JSON.stringify({ crmType, region, timestamp: Date.now() })).toString("base64");

    switch (crmType) {
      case "zoho": {
        const regionConfig = OAUTH_CONFIGS.zoho[region as keyof typeof OAUTH_CONFIGS.zoho] || OAUTH_CONFIGS.zoho.US;
        authUrl = `${regionConfig.authUrl}?client_id=${client_id}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(redirect_uri as string)}&scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&state=${state}`;
        break;
      }
      case "salesforce": {
        // Build Salesforce auth URL with PKCE support
        const params = new URLSearchParams({
          client_id: client_id as string,
          response_type: 'code',
          redirect_uri: redirect_uri as string,
          scope: 'api refresh_token offline_access',
          state: state,
        });

        // Add PKCE code_challenge if provided
        if (code_challenge) {
          params.append('code_challenge', code_challenge as string);
          params.append('code_challenge_method', 'S256');
        }

        authUrl = `${OAUTH_CONFIGS.salesforce.authUrl}?${params.toString()}`;
        break;
      }
      case "hubspot":
        authUrl = `${OAUTH_CONFIGS.hubspot.authUrl}?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri as string)}&scope=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read&state=${state}`;
        break;
      case "gmail": {
        const params = new URLSearchParams({
          client_id: client_id as string,
          response_type: "code",
          redirect_uri: redirect_uri as string,
          scope: OAUTH_CONFIGS.gmail.scope,
          access_type: "offline",
          prompt: "consent",
          state,
        });
        authUrl = `${OAUTH_CONFIGS.gmail.authUrl}?${params.toString()}`;
        console.log(`[crm-oauth/authorize/gmail] client_id=${client_id} redirect_uri=${redirect_uri}`);
        break;
      }
      case "outlook": {
        const params = new URLSearchParams({
          client_id: client_id as string,
          response_type: "code",
          redirect_uri: redirect_uri as string,
          scope: OAUTH_CONFIGS.outlook.scope,
          response_mode: "query",
          prompt: "consent",
          state,
        });
        authUrl = `${OAUTH_CONFIGS.outlook.authUrl}?${params.toString()}`;
        break;
      }
      default:
        return res.status(400).json({ success: false, error: "Unknown CRM type" });
    }

    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate OAuth",
    });
  }
});

// OAuth2 callback handler
router.post("/crm-oauth/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, client_id, client_secret, redirect_uri, crmType, region, code_verifier } = req.body;
    const userId = (req as any).user?.id || req.headers["user-id"] as string || "anonymous";

    

    // Validate required parameters
    const missing = [];
    if (!code) missing.push('code');
    if (!client_id) missing.push('client_id');
    if (!client_secret) missing.push('client_secret');
    if (!crmType) missing.push('crmType');
    if (!redirect_uri) missing.push('redirect_uri');

    if (missing.length > 0) {
      
      return res.status(400).json({
        success: false,
        error: `Missing required parameters: ${missing.join(', ')}`,
      });
    }

    // Exchange code for tokens
    let tokenUrl = "";
    let tokenBody: Record<string, string> = {
      grant_type: "authorization_code",
      client_id,
      client_secret,
      code,
      redirect_uri,
    };

    // Add code_verifier for PKCE (Salesforce)
    if (code_verifier) {
      tokenBody.code_verifier = code_verifier;
      
    }

    switch (crmType) {
      case "zoho": {
        const regionConfig = OAUTH_CONFIGS.zoho[region as keyof typeof OAUTH_CONFIGS.zoho] || OAUTH_CONFIGS.zoho.US;
        tokenUrl = regionConfig.tokenUrl;
        break;
      }
      case "salesforce":
        tokenUrl = OAUTH_CONFIGS.salesforce.tokenUrl;
        break;
      case "hubspot":
        tokenUrl = OAUTH_CONFIGS.hubspot.tokenUrl;
        break;
      case "gmail":
        tokenUrl = OAUTH_CONFIGS.gmail.tokenUrl;
        break;
      case "outlook":
        tokenUrl = OAUTH_CONFIGS.outlook.tokenUrl;
        // Microsoft requires scope on the token request
        tokenBody.scope = OAUTH_CONFIGS.outlook.scope;
        break;
      default:
        return res.status(400).json({ success: false, error: "Unknown CRM type" });
    }

    // Make token exchange request
    
    

    console.log(`[${crmType}] OAuth token exchange → POST ${tokenUrl}`);
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenBody),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[${crmType}] Token exchange failed ${tokenResponse.status}:`, errorText);
      return res.status(400).json({
        success: false,
        error: `Token exchange failed: ${errorText}`,
      });
    }

    const tokenData = await tokenResponse.json();
    
    

    // Validate token data
    if (!tokenData.access_token) {
      
      return res.status(400).json({
        success: false,
        error: "Token exchange failed: No access token received",
        details: JSON.stringify(tokenData),
      });
    }

    // Save the configuration
    const credentials: Record<string, string> = {
      client_id,
      client_secret,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    };

    if (crmType === "zoho" && region) {
      credentials.region = region as string;
    }

    if (crmType === "salesforce" && tokenData.instance_url) {
      credentials.instance_url = tokenData.instance_url;
    }

    // Fetch the mailbox email address so we know which address outbound mail will come from
    if (crmType === "gmail" || crmType === "outlook") {
      console.log(`[${crmType}] OAuth callback → token exchange OK, fetching user info`);
      try {
        const userInfoUrl = crmType === "gmail"
          ? OAUTH_CONFIGS.gmail.userInfoUrl
          : OAUTH_CONFIGS.outlook.userInfoUrl;
        const uiResp = await fetch(userInfoUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (uiResp.ok) {
          const ui = await uiResp.json();
          const email = ui.email || ui.mail || ui.userPrincipalName || "";
          const name = ui.name || ui.displayName || "";
          if (email) credentials.email_address = email;
          if (name) credentials.display_name = name;
          console.log(`[${crmType}] Mailbox identified →`, { email, name, hasRefreshToken: !!tokenData.refresh_token });
        } else {
          const body = await uiResp.text();
          console.error(`[${crmType}] userinfo failed ${uiResp.status}:`, body);
        }
      } catch (err) {
        console.error(`[${crmType}] Failed to fetch mailbox user info:`, err);
      }
    }

    // Test connection before saving
    

    const testResult = await testCRMConnection(crmType, "OAuth2", credentials);
    console.log('🔵 Connection test result:', testResult);

    if (!testResult.success) {
      console.error('❌ Connection test failed:', testResult.message);

      // Add helpful hint for Zoho region issues
      let hint = "";
      if (crmType === "zoho" && region && (testResult.message.includes("Invalid") || testResult.message.includes("401"))) {
        hint = `\n\n💡 Hint: Your OAuth client may not be enabled for the ${region} region. Check Multi-DC settings in Zoho API Console or try the US region.`;
      }

      return res.status(400).json({
        success: false,
        error: "Connection test failed after OAuth",
        details: testResult.message + hint,
      });
    }

    

    const config = await saveCRMConfig(userId, crmType, "OAuth2", credentials);

    res.json({
      success: true,
      data: config,
      message: "✓ CRM connected successfully via OAuth2!",
    });
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "OAuth callback failed",
    });
  }
});

// Get all CRM configurations for the user
router.get("/crm-configs", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.headers["user-id"] as string || "anonymous";

    const configs = await getCRMConfigs(userId);

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch CRM configs",
    });
  }
});

// Save CRM configuration
router.post("/crm-configs", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.headers["user-id"] as string || "anonymous";
    const orgId = (req as any).user?.organizationId;
    const { crmType, authType, credentials } = req.body;

    if (!crmType || !authType || !credentials) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: crmType, authType, credentials",
      });
    }

    // Validate required credential fields based on CRM type
    const requiredFields: Record<string, Record<string, string[]>> = {
      zoho: {
        "OAuth2": ["client_id", "client_secret", "access_token", "region"],
        "Self Client": ["client_id", "client_secret", "access_token", "region"],
      },
      salesforce: {
        "OAuth2 Web Flow": ["client_id", "client_secret", "access_token", "instance_url"],
        "JWT Bearer Flow": ["client_id", "username", "private_key", "instance_url"],
      },
      hubspot: {
        "OAuth2 Private App": ["access_token"],
        "OAuth2 Public App": ["client_id", "client_secret", "access_token"],
      },
      twilio: {
        "Account Credentials": ["account_sid", "auth_token", "phone_number"],
      },
    };

    const required = requiredFields[crmType]?.[authType];
    if (required) {
      const missing = required.filter((field: string) => !credentials[field]);
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required credentials: ${missing.join(", ")}`,
        });
      }
    }

    // Test connection before saving
    const testResult = await testCRMConnection(crmType, authType, credentials);

    if (!testResult.success) {
      // Log failed attempt
      try {
        const { logActivity, getRequestInfo } = require('../utils/activityLogger');
        const { ipAddress, userAgent } = getRequestInfo(req);
        await logActivity(
          userId,
          orgId,
          'crm.config.failed',
          'create',
          'crm_config',
          undefined,
          crmType,
          { authType, error: testResult.message },
          ipAddress,
          userAgent,
          'failed',
          testResult.message
        );
      } catch (err) {
        
      }

      return res.status(400).json({
        success: false,
        error: "Connection test failed",
        details: testResult.message,
      });
    }

    const config = await saveCRMConfig(userId, crmType, authType, credentials);

    // For Twilio: also import the number into Vapi and attach it to the current assistant
    let vapiImport: { phoneNumberId?: string; assistantId?: string; error?: string } | undefined;
    if (crmType === "twilio") {
      try {
        const assistantId = process.env.AGENT_ID || process.env.VAPI_AGENT_ID || undefined;
        const vapi = new VapiClient({ apiKey: process.env.VAPI_KEY || "" });
        const result = await vapi.importTwilioNumber({
          number: credentials.phone_number,
          twilioAccountSid: credentials.account_sid,
          twilioAuthToken: credentials.auth_token,
          assistantId,
          name: `InsightPulse ${credentials.phone_number}`,
        });
        vapiImport = { phoneNumberId: result?.id, assistantId };
        console.log('[CRM/Twilio] Vapi import succeeded', vapiImport);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[CRM/Twilio] Vapi import failed:', message);
        vapiImport = { error: message };
      }
    }

    // Log successful CRM configuration
    try {
      const { logActivity, getRequestInfo } = require('../utils/activityLogger');
      const { ipAddress, userAgent } = getRequestInfo(req);
      await logActivity(
        userId,
        orgId,
        'crm.config.created',
        'create',
        'crm_config',
        config.id,
        `${crmType} - ${authType}`,
        { crmType, authType },
        ipAddress,
        userAgent
      );
    } catch (err) {
      
    }

    res.json({
      success: true,
      data: config,
      vapiImport,
      message: vapiImport?.error
        ? `Saved, but Vapi import failed: ${vapiImport.error}`
        : vapiImport?.phoneNumberId
        ? "✓ Saved and number imported into Vapi"
        : "✓ CRM configuration saved successfully and connection verified!",
    });
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save CRM config",
    });
  }
});

// Test CRM connection
router.post("/crm-test", async (req: Request, res: Response) => {
  try {
    const { crmType, authType, credentials } = req.body;

    if (!crmType || !credentials) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: crmType, credentials",
      });
    }

    const result = await testCRMConnection(crmType, authType || "OAuth2", credentials);

    res.json({
      success: result.success,
      message: result.message,
      testTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Connection test error",
    });
  }
});

// Delete CRM configuration
router.delete("/crm-configs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || req.headers["user-id"] as string || "anonymous";

    // Verify ownership before deleting
    const config = await getCRMConfigs(userId);
    if (!config.some((c: any) => c.id === id)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this configuration",
      });
    }

    const success = await deleteCRMConfig(id);

    if (success) {
      res.json({
        success: true,
        message: "✓ CRM configuration deleted successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Configuration not found",
      });
    }
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete CRM config",
    });
  }
});

// Get single CRM configuration
router.get("/crm-configs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || req.headers["user-id"] as string || "anonymous";

    const configs = await getCRMConfigs(userId);
    const config = configs.find((c: any) => c.id === id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found",
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch CRM config",
    });
  }
});

// Fetch CRM tables/objects
router.get("/crm-configs/:id/tables", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await fetchCRMTables(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.tables,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch CRM tables",
    });
  }
});

// Fetch CRM table columns/fields
router.get("/crm-configs/:id/tables/:tableName/columns", async (req: Request, res: Response) => {
  try {
    const { id, tableName } = req.params;
    const result = await fetchCRMTableColumns(id, tableName);

    if (result.success) {
      res.json({
        success: true,
        data: result.columns,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch CRM columns",
    });
  }
});

// Fetch unique values from a CRM column
router.get("/crm-configs/:id/tables/:tableName/columns/:columnName/values", async (req: Request, res: Response) => {
  try {
    const { id, tableName, columnName } = req.params;
    const result = await fetchColumnUniqueValues(id, tableName, columnName);

    if (result.success) {
      res.json({
        success: true,
        data: result.values || [],
        count: (result.values || []).length,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch column values",
    });
  }
});

// Fetch CRM table rows
router.get("/crm-configs/:id/tables/:tableName/rows", async (req: Request, res: Response) => {
  try {
    const { id, tableName } = req.params;
    const fieldsParam = typeof req.query.fields === "string" ? req.query.fields : "";
    const fields = fieldsParam.split(",").map((f) => f.trim()).filter(Boolean);
    const limit = Number.parseInt(String(req.query.limit || "50"), 10) || 50;

    const result = await fetchCRMTableRows(id, tableName, fields, limit);

    if (result.success) {
      res.json({
        success: true,
        data: result.rows || [],
        fields: result.fields || [],
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch CRM rows",
    });
  }
});

// Fetch contacts from CRM
router.post("/crm-configs/:id/contacts", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tableName, phoneColumn } = req.body;

    if (!tableName || !phoneColumn) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tableName, phoneColumn",
      });
    }

    const result = await fetchCRMContacts(id, tableName, phoneColumn);

    if (result.success) {
      res.json({
        success: true,
        data: result.contacts,
        count: result.contacts?.length || 0,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Server error:', res.status); res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch contacts",
    });
  }
});

// ============================================================================
// CRM TAGS MANAGEMENT ENDPOINTS
// ============================================================================

// Get all tags for a CRM config
router.get("/crm-configs/:configId/tags", async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { category } = req.query; // Optional filter by category

    const { db } = await import("../db");
    const { crmTags } = await import("../../shared/schema");
    const { eq, and } = await import("drizzle-orm");

    let query = db.select().from(crmTags).where(eq(crmTags.crmConfigId, configId));

    if (category) {
      query = db.select().from(crmTags).where(
        and(
          eq(crmTags.crmConfigId, configId),
          eq(crmTags.category, category as string)
        )
      );
    }

    const tags = await query;

    res.json({
      success: true,
      data: tags,
      count: tags.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tags",
    });
  }
});

// Get all tags across all CRM configs for a user
router.get("/crm-tags/all", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.headers["user-id"] as string;

    const { db } = await import("../db");
    const { crmTags, crmConfigs } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    // Get all CRM configs for the user
    const userConfigs = await db.select().from(crmConfigs).where(eq(crmConfigs.userId, userId));
    const configIds = userConfigs.map(c => c.id);

    if (configIds.length === 0) {
      return res.json({ success: true, data: [], count: 0 });
    }

    // Get all tags for those configs
    const { inArray } = await import("drizzle-orm");
    const tags = await db.select().from(crmTags).where(inArray(crmTags.crmConfigId, configIds));

    res.json({
      success: true,
      data: tags,
      count: tags.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tags",
    });
  }
});

// Create a new tag
router.post("/crm-configs/:configId/tags", async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const userId = (req as any).user?.id || req.headers["user-id"] as string;
    const { name, color, category, categoryValue, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Tag name is required",
      });
    }

    const { db } = await import("../db");
    const { crmTags } = await import("../../shared/schema");

    const [newTag] = await db.insert(crmTags).values({
      crmConfigId: configId,
      name,
      color: color || "#3b82f6",
      category: category || "general",
      categoryValue: categoryValue || null,
      description: description || null,
      createdBy: userId,
    }).returning();

    res.json({
      success: true,
      data: newTag,
      message: "Tag created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create tag",
    });
  }
});

// Create tags from column values and sync contacts to those tags
router.post("/crm-configs/:configId/tags/from-column", async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const userId = (req as any).user?.id || req.headers["user-id"] as string;
    const { tableName, columnName, selectedValues, phoneColumn, tagName } = req.body;

    if (!tableName || !columnName || !selectedValues || selectedValues.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tableName, columnName, selectedValues",
      });
    }

    if (!tagName || !tagName.trim()) {
      return res.status(400).json({
        success: false,
        error: "tagName is required",
      });
    }

    if (!phoneColumn) {
      return res.status(400).json({
        success: false,
        error: "phoneColumn is required to fetch contact data",
      });
    }

    const { db } = await import("../db");
    const { crmTags, crmContactTags } = await import("../../shared/schema");
    const { eq, inArray, and, or } = await import("drizzle-orm");
    const { getCRMConfigById, fetchCRMTableRows } = await import("../integrations/crmIntegrationService");

    // Get CRM config
    const config = await getCRMConfigById(configId);
    if (!config) {
      return res.status(400).json({
        success: false,
        error: "CRM configuration not found",
      });
    }

    // Create tags for each selected value
    const createdTags: any[] = [];
    const tagMap = new Map<string, string>(); // value -> tagId

    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
    let colorIndex = 0;

    for (const value of selectedValues) {
      const [newTag] = await db.insert(crmTags).values({
        crmConfigId: configId,
        name: `${tagName}: ${value}`,
        color: colors[colorIndex % colors.length],
        category: "general",
        categoryValue: value,
        description: `Auto-created from ${columnName} column`,
        createdBy: userId,
      }).returning();

      createdTags.push(newTag);
      tagMap.set(value, newTag.id);
      colorIndex++;
    }

    // Fetch all contacts and their column values
    console.log(`🔍 Fetching rows from table: ${tableName}, columns: [${columnName}, ${phoneColumn}]`);
    const rowsResult = await fetchCRMTableRows(configId, tableName, [columnName, phoneColumn], 100);

    if (!rowsResult.success || !rowsResult.rows) {
      console.error("❌ Failed to fetch rows:", rowsResult.error);
      return res.status(400).json({
        success: false,
        error: "Failed to fetch contacts from CRM: " + (rowsResult.error || "Unknown error"),
      });
    }

    console.log(`📊 Fetched ${rowsResult.rows.length} rows from CRM`);
    console.log(`📝 Column names: [${columnName}, ${phoneColumn}]`);
    console.log(`🏷️  Selected values to match: [${selectedValues.join(", ")}]`);

    // Log sample of fetched data
    if (rowsResult.rows.length > 0) {
      console.log(`📋 Sample row:`, JSON.stringify(rowsResult.rows[0], null, 2));
    }

    // Associate contacts with tags based on column values
    const contactTagRecords: any[] = [];
    let matchedContacts = 0;
    let emptyPhoneCount = 0;
    let noColumnValueCount = 0;

    for (const row of rowsResult.rows) {
      const columnValue = String(row[columnName] || "").trim();
      const phoneNumber = String(row[phoneColumn] || "").trim();

      if (!columnValue) {
        noColumnValueCount++;
        continue;
      }

      if (!phoneNumber) {
        emptyPhoneCount++;
        console.log(`  ⚠️ No phone for ${columnName}=${columnValue}`);
        continue;
      }

      const tagId = tagMap.get(columnValue);
      if (!tagId) {
        // Column value doesn't match any selected value
        console.log(`  ℹ️ Value "${columnValue}" not in selected values: [${selectedValues.join(", ")}]`);
        continue;
      }

      matchedContacts++;
      contactTagRecords.push({
        tagId,
        contactEmail: null,
        contactPhone: phoneNumber,
        metadata: { source: "column_sync", columnName, columnValue, tableName },
      });
    }

    console.log(`✅ Matched contacts: ${matchedContacts}`);
    console.log(`❌ Contacts without phone: ${emptyPhoneCount}`);
    console.log(`⚠️  Contacts without column value: ${noColumnValueCount}`);

    // Insert contact-tag associations
    if (contactTagRecords.length > 0) {
      await db.insert(crmContactTags).values(contactTagRecords).onConflictDoNothing();
      console.log(`📌 Inserted ${contactTagRecords.length} contact-tag associations`);
    } else {
      console.warn("⚠️ No contact-tag associations to insert!");
    }

    res.json({
      success: true,
      data: {
        tagsCreated: createdTags.length,
        contactsLinked: contactTagRecords.length,
        tags: createdTags,
        debug: {
          totalRowsFetched: rowsResult.rows.length,
          matchedContacts,
          emptyPhoneCount,
          noColumnValueCount,
        },
      },
      message: `Created ${createdTags.length} tags and linked ${contactTagRecords.length} contacts`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create tags from column",
    });
  }
});

// Update a tag
router.put("/crm-tags/:tagId", async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const { name, color, category, categoryValue, description, isActive } = req.body;

    const { db } = await import("../db");
    const { crmTags } = await import("../../shared/schema");
    const { eq, sql } = await import("drizzle-orm");

    const updateData: any = {
      updatedAt: sql`now()`,
    };

    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (category !== undefined) updateData.category = category;
    if (categoryValue !== undefined) updateData.categoryValue = categoryValue;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedTag] = await db.update(crmTags)
      .set(updateData)
      .where(eq(crmTags.id, tagId))
      .returning();

    if (!updatedTag) {
      return res.status(404).json({
        success: false,
        error: "Tag not found",
      });
    }

    res.json({
      success: true,
      data: updatedTag,
      message: "Tag updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tag",
    });
  }
});

// Delete a tag
router.delete("/crm-tags/:tagId", async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;

    const { db } = await import("../db");
    const { crmTags } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    await db.delete(crmTags).where(eq(crmTags.id, tagId));

    res.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tag",
    });
  }
});

// Assign tags to contacts
router.post("/crm-configs/:configId/contacts/tags", async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { tagIds, contactIds } = req.body; // Arrays of tag IDs and contact IDs

    if (!Array.isArray(tagIds) || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: "tagIds and contactIds must be arrays",
      });
    }

    const { db } = await import("../db");
    const { crmContactTags } = await import("../../shared/schema");

    // Create all combinations of tags and contacts
    const values = [];
    for (const tagId of tagIds) {
      for (const contactId of contactIds) {
        values.push({
          crmConfigId: configId,
          tagId,
          contactId,
        });
      }
    }

    if (values.length > 0) {
      await db.insert(crmContactTags).values(values).onConflictDoNothing();
    }

    res.json({
      success: true,
      message: `Tags assigned to ${contactIds.length} contacts`,
      count: values.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign tags",
    });
  }
});

// Remove tags from contacts
router.delete("/crm-configs/:configId/contacts/tags", async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { tagIds, contactIds } = req.body;

    if (!Array.isArray(tagIds) || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: "tagIds and contactIds must be arrays",
      });
    }

    const { db } = await import("../db");
    const { crmContactTags } = await import("../../shared/schema");
    const { eq, and, inArray } = await import("drizzle-orm");

    await db.delete(crmContactTags).where(
      and(
        eq(crmContactTags.crmConfigId, configId),
        inArray(crmContactTags.tagId, tagIds),
        inArray(crmContactTags.contactId, contactIds)
      )
    );

    res.json({
      success: true,
      message: "Tags removed from contacts",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove tags",
    });
  }
});

// Get contacts by tags (filter contacts by tag IDs)
router.post("/crm-configs/:configId/contacts/filter-by-tags", async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { tagIds } = req.body; // Array of tag IDs to filter by

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "tagIds must be a non-empty array",
      });
    }

    const { db } = await import("../db");
    const { crmContactTags } = await import("../../shared/schema");
    const { inArray } = await import("drizzle-orm");

    console.log(`🔍 Filtering contacts by ${tagIds.length} tags for config ${configId}`);

    const contactTags = await db.select().from(crmContactTags).where(
      inArray(crmContactTags.tagId, tagIds)
    );

    console.log(`📊 Found ${contactTags.length} contact-tag associations`);

    // Extract unique contact IDs and phones
    const uniqueContactIds = Array.from(
      new Set(contactTags.filter(ct => ct.contactId).map(ct => ct.contactId))
    );

    const uniquePhones = Array.from(
      new Set(contactTags.filter(ct => ct.contactPhone).map(ct => ct.contactPhone))
    );

    console.log(`✅ Found ${uniqueContactIds.length} unique contact IDs and ${uniquePhones.length} unique phone numbers`);

    res.json({
      success: true,
      data: contactTags,
      contactIds: uniqueContactIds,
      phones: uniquePhones,
      count: uniqueContactIds.length + uniquePhones.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to filter contacts by tags",
    });
  }
});

// Preview anonymous contacts before sending
router.post("/crm-configs/contacts/preview-anonymous", async (req: Request, res: Response) => {
  try {
    const { configId, tableName, tagIds, recipientColumn } = req.body;

    if (!configId || !tableName || !tagIds || !Array.isArray(tagIds) || !recipientColumn) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: configId, tableName, tagIds, recipientColumn",
      });
    }

    const { fetchCRMContactsByTags } = await import("../integrations/crmIntegrationService");
    const result = await fetchCRMContactsByTags(configId, tableName, tagIds, recipientColumn);

    if (result.success) {
      res.json({
        success: true,
        contacts: result.contacts || [],
        count: result.contacts?.length || 0,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to preview contacts",
    });
  }
});

export default router;
