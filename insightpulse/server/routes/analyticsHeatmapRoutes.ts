import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getCRMConfigs } from "../integrations/crmIntegrationService";
import { db } from "../db";
import { responses } from "@shared/schema";
import { sql } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

// Interface for HubSpot contact
interface HubSpotContact {
  email: string;
  department?: string;
  location?: string;
  city?: string;
  state?: string;
}

// Interface for heatmap data point
interface HeatmapDataPoint {
  department: string;
  location: string;
  eviScore: number;
  npsScore: number;
  csatScore: number;
  responseCount: number;
}

/**
 * GET /api/analytics/heatmap/configs
 * Returns available CRM configurations for the user
 * MUST BE DEFINED BEFORE /heatmap route
 */
router.get("/heatmap/configs", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const crmConfigs = await getCRMConfigs(userId);
    
    // Return simplified config list
    const configs = crmConfigs.map(config => ({
      id: config.id,
      name: `${config.crmType.charAt(0).toUpperCase() + config.crmType.slice(1)} - ${config.authType}`,
      crmType: config.crmType,
      isActive: config.isActive,
    }));

    res.json(configs);
  } catch (error) {
    console.error("Error fetching CRM configs:", error);
    res.status(500).json({ 
      error: "Failed to fetch CRM configurations",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/analytics/heatmap/test-contacts
 * Test endpoint to see what data is in HubSpot contacts
 */
router.get("/heatmap/test-contacts", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const configId = req.query.configId as string | undefined;
    const tableName = (req.query.table as string) || 'contacts';

    const crmConfigs = await getCRMConfigs(userId);
    if (crmConfigs.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No CRM configuration found." 
      });
    }

    let selectedConfig = configId 
      ? crmConfigs.find(c => c.id === configId && c.isActive)
      : crmConfigs.find(c => c.isActive);

    if (!selectedConfig) {
      return res.status(404).json({ 
        success: false,
        message: "No active CRM configuration found." 
      });
    }

    // Fetch contacts and return raw data for inspection
    const contacts = await fetchCRMContactsWithDeptLocation(selectedConfig, tableName);
    
    // Also get survey responses count
    const surveyResponses = await db
      .select({
        respondentEmail: responses.respondentEmail,
      })
      .from(responses)
      .where(sql`${responses.respondentEmail} IS NOT NULL`);

    res.json({
      crmType: selectedConfig.crmType,
      tableName,
      contactsCount: contacts.length,
      sampleContacts: contacts.slice(0, 5), // First 5 contacts
      contactsWithDept: contacts.filter(c => c.department).length,
      contactsWithLocation: contacts.filter(c => c.location || c.city || c.state).length,
      surveyResponsesCount: surveyResponses.length,
      uniqueEmails: new Set(surveyResponses.map(r => r.respondentEmail?.toLowerCase())).size,
    });
  } catch (error) {
    console.error("Error testing contacts:", error);
    res.status(500).json({ 
      error: "Failed to test contacts",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/analytics/heatmap
 * Fetches heatmap data from CRM contacts and survey responses
 * Groups metrics by department and location
 * Query params:
 *   - configId (optional): CRM configuration ID to use. If not provided, uses first active CRM config
 *   - table (optional): Table/object name to query (default: 'contacts')
 */
router.get("/heatmap", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // TODO: CRM Integration - commented out for now, using dummy data
    /*
    const configId = req.query.configId as string | undefined;
    const tableName = (req.query.table as string) || 'contacts';
    const crmConfigs = await getCRMConfigs(userId);
    // ... CRM logic here ...
    */

    // Generate dummy data for heatmap
    const departments = ['Sales', 'Marketing', 'Engineering', 'Customer Support', 'HR', 'Finance'];
    const locations = ['New York', 'San Francisco', 'London', 'Tokyo', 'Singapore', 'Austin'];
    
    const heatmapData: HeatmapDataPoint[] = [];
    
    departments.forEach(dept => {
      // Each department appears in 3-4 random locations
      const numLocations = 3 + Math.floor(Math.random() * 2);
      const selectedLocations = locations
        .sort(() => Math.random() - 0.5)
        .slice(0, numLocations);
      
      selectedLocations.forEach(loc => {
        heatmapData.push({
          department: dept,
          location: loc,
          eviScore: Math.round((60 + Math.random() * 35) * 10) / 10, // 60-95
          npsScore: Math.round((-10 + Math.random() * 80) * 10) / 10, // -10 to 70
          csatScore: Math.round((65 + Math.random() * 30) * 10) / 10, // 65-95
          responseCount: Math.floor(Math.random() * 50) + 10, // 10-60 responses
        });
      });
    });

    res.json(heatmapData);
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    res.status(500).json({ 
      error: "Failed to fetch heatmap data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Fetch CRM contacts with department and location properties
 * Supports HubSpot, Salesforce, and Zoho
 */
async function fetchCRMContactsWithDeptLocation(
  crmConfig: any,
  tableName: string
): Promise<HubSpotContact[]> {
  const { crmType, credentials } = crmConfig;

  switch (crmType) {
    case 'hubspot':
      return fetchHubSpotContactsWithDeptLocation(credentials, tableName);
    case 'salesforce':
      return fetchSalesforceContactsWithDeptLocation(credentials, tableName);
    case 'zoho':
      return fetchZohoContactsWithDeptLocation(credentials, tableName);
    default:
      throw new Error(`Unsupported CRM type: ${crmType}`);
  }
}

/**
 * Fetch HubSpot contacts with department and location properties
 */
async function fetchHubSpotContactsWithDeptLocation(
  credentials: Record<string, string>,
  objectType: string = 'contacts'
): Promise<HubSpotContact[]> {
  const accessToken = credentials.access_token;
  
  if (!accessToken) {
    throw new Error("HubSpot access token not found");
  }

  try {
    let allContacts: HubSpotContact[] = [];
    let after: string | undefined;

    // Properties to fetch: email, department, location-related fields
    const properties = [
      'email',
      'firstname',
      'lastname',
      'department', // Standard HubSpot property (often empty)
      'jobtitle',   // Use as fallback for department
      'company',    // Another fallback for department grouping
      'address',
      'city',
      'state',
      'country',
      'hs_additional_emails',
    ].join(',');

    // Fetch contacts with pagination (up to 1000 contacts = 10 pages)
    for (let i = 0; i < 10; i++) {
      const url = after
        ? `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${properties}&limit=100&after=${after}`
        : `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${properties}&limit=100`;

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HubSpot API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch HubSpot ${objectType}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log first contact for debugging
      if (i === 0 && data.results?.[0]) {
        console.log('📋 Sample HubSpot contact properties:', JSON.stringify(data.results[0].properties, null, 2));
      }
      
      // Extract contacts with email, department, and location
      const contacts = data.results
        ?.map((contact: any) => {
          const props = contact.properties;
          return {
            email: props.email,
            // Use department, or fallback to jobtitle or company
            department: props.department || props.jobtitle || props.company || undefined,
            location: props.address || undefined,
            city: props.city || undefined,
            state: props.state || undefined,
          };
        })
        .filter((c: HubSpotContact) => c.email) || []; // Only include contacts with email
      
      allContacts = [...allContacts, ...contacts];

      // Check if there are more pages
      if (!data.paging?.next?.after) break;
      after = data.paging.next.after;
    }

    console.log(`✅ Fetched ${allContacts.length} HubSpot ${objectType} with department/location data`);
    console.log(`📊 Stats - With department: ${allContacts.filter(c => c.department).length}, With location: ${allContacts.filter(c => c.location || c.city || c.state).length}`);
    return allContacts;
  } catch (error) {
    console.error("Error fetching HubSpot contacts:", error);
    throw error;
  }
}

/**
 * Fetch Salesforce contacts with department and location properties
 */
async function fetchSalesforceContactsWithDeptLocation(
  credentials: Record<string, string>,
  objectType: string = 'Contact'
): Promise<HubSpotContact[]> {
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.instance_url;
  
  if (!accessToken || !instanceUrl) {
    throw new Error("Salesforce credentials not found");
  }

  try {
    // Query Salesforce for contacts with email, department, and location
    // Adjust fields based on object type
    let query = '';
    if (objectType === 'Contact') {
      query = `SELECT Email, Department, MailingCity, MailingState, MailingStreet FROM Contact WHERE Email != null LIMIT 1000`;
    } else if (objectType === 'Lead') {
      query = `SELECT Email, Department__c, City, State, Street FROM Lead WHERE Email != null LIMIT 1000`;
    } else if (objectType === 'Account') {
      query = `SELECT Website AS Email, Industry AS Department, BillingCity, BillingState, BillingStreet FROM Account WHERE Website != null LIMIT 1000`;
    } else {
      query = `SELECT Email, Department, MailingCity, MailingState, MailingStreet FROM ${objectType} WHERE Email != null LIMIT 1000`;
    }

    const url = `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Salesforce API error (${response.status}):`, errorText);
      throw new Error(`Failed to fetch Salesforce ${objectType}: ${response.statusText}`);
    }

    const data = await response.json();
    
    const contacts = data.records?.map((record: any) => ({
      email: record.Email || record.Website,
      department: record.Department || record.Department__c || record.Industry || undefined,
      location: record.MailingStreet || record.Street || record.BillingStreet || undefined,
      city: record.MailingCity || record.City || record.BillingCity || undefined,
      state: record.MailingState || record.State || record.BillingState || undefined,
    })).filter((c: HubSpotContact) => c.email) || [];

    console.log(`✅ Fetched ${contacts.length} Salesforce ${objectType} with department/location data`);
    return contacts;
  } catch (error) {
    console.error("Error fetching Salesforce contacts:", error);
    throw error;
  }
}

/**
 * Fetch Zoho contacts with department and location properties
 */
async function fetchZohoContactsWithDeptLocation(
  credentials: Record<string, string>,
  moduleName: string = 'Contacts'
): Promise<HubSpotContact[]> {
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
  
  if (!accessToken) {
    throw new Error("Zoho access token not found");
  }

  try {
    let allContacts: HubSpotContact[] = [];
    let page = 1;

    // Fetch up to 1000 contacts (10 pages of 100)
    for (let i = 0; i < 10; i++) {
      const url = `${apiBaseUrl}/crm/v7/${moduleName}?fields=Email,Department,Mailing_City,Mailing_State,Mailing_Street&per_page=100&page=${page}`;

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Zoho API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch Zoho ${moduleName}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) break;

      const contacts = data.data
        ?.map((contact: any) => ({
          email: contact.Email,
          department: contact.Department || undefined,
          location: contact.Mailing_Street || undefined,
          city: contact.Mailing_City || undefined,
          state: contact.Mailing_State || undefined,
        }))
        .filter((c: HubSpotContact) => c.email) || [];
      
      allContacts = [...allContacts, ...contacts];

      if (data.data.length < 100) break;
      page++;
    }

    console.log(`✅ Fetched ${allContacts.length} Zoho ${moduleName} with department/location data`);
    return allContacts;
  } catch (error) {
    console.error("Error fetching Zoho contacts:", error);
    throw error;
  }
}

export default router;
