/**
 * Employee Turnover Risk API Routes
 */

import { Router, type Request, type Response } from 'express';
import { getEmployeeTurnoverRisks, getDepartmentTurnoverRisks, exportTurnoverRiskData } from '../services/employeeTurnoverRiskService';
import { requireAuth, requireRole } from '../middleware/auth';
import { fetchCRMTableRows } from '../integrations/crmIntegrationService';
import { db } from '../db';
import { crmConfigs } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/turnover-risks/health/check
 * Check CRM connection status (diagnostic endpoint)
 */
router.get('/health/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const crmTypes = ['hubspot', 'salesforce', 'zoho'];
    const status: any = {};

    for (const crmType of crmTypes) {
      try {
        const configs = await db
          .select()
          .from(crmConfigs)
          .where(eq(crmConfigs.crmType, crmType as any));

        status[crmType] = {
          configured: configs && configs.length > 0,
          count: configs?.length || 0,
          active: configs && configs.length > 0 ? configs[0].isActive : false,
        };
      } catch (e) {
        status[crmType] = { error: String(e) };
      }
    }

    res.json({
      healthy: true,
      crmStatus: status,
      message: 'CRM health check complete',
    });
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: String(error),
    });
  }
});

/**
 * GET /api/turnover-risks
 * Get overall employee turnover risk analysis
 * Query params: crm (hubspot, salesforce, zoho)
 * Accessible to all authenticated users (not just admin)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const crmType = (req.query.crm as string) || 'hubspot';
    const organizationId = (req as any).user?.organizationId;
    const userId = (req as any).user?.id;

    console.log(`[TurnoverRisk API] Fetching turnover risks`);
    console.log(`  - CRM Type: ${crmType}`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Organization ID: ${organizationId}`);

    // Try to get CRM data first
    let crmData: any = null;
    let crmError: string | null = null;

    try {
      // Query CRM configs - try multiple approaches
      let config: any = null;

      // First try: Match by crmType only
      let configs = await db
        .select()
        .from(crmConfigs)
        .where(eq(crmConfigs.crmType, crmType as any));

      console.log(`[TurnoverRisk API] Found ${configs?.length || 0} total ${crmType} configs`);

      if (configs && configs.length > 0) {
        config = configs[0];
        console.log(`[TurnoverRisk API] Using first available config for ${crmType}`);
      }

      if (!config) {
        console.log(`[TurnoverRisk API] No ${crmType} CRM config found`);
        crmError = `No ${crmType} CRM configured. Please set up your CRM integration in Settings first.`;
      } else {
        console.log(`[TurnoverRisk API] Found CRM config:`, {
          id: config.id,
          crmType: config.crmType,
          isActive: config.isActive,
          hasCredentials: !!config.credentials,
        });

        // Verify the config is active
        if (!config.isActive) {
          crmError = `${crmType} CRM is configured but not active. Please enable it in Settings.`;
          console.log(`[TurnoverRisk API] CRM config is inactive`);
        } else {
          try {
            // Fetch customers from CRM
            const tableName = crmType === 'hubspot' ? 'contacts' : crmType === 'salesforce' ? 'Contact' : 'Contacts';
            // Include 'hs_analytics_num_page_views' for engagement, 'lifecyclestage' for customer status, and additional fields
            const fields = crmType === 'hubspot'
              ? ['id', 'firstname', 'lastname', 'email', 'lifecyclestage', 'hs_lead_status', 'hs_analytics_num_page_views', 'hs_email', 'name', 'num_contacted_notes', 'num_contacted_subscriptionitems', 'hs_analytics_num_visits']
              : crmType === 'salesforce'
                ? ['id', 'Name', 'Email', 'IsDeleted', 'Status', 'Phone', 'Industry']
                : ['id', 'First_Name', 'Last_Name', 'Email', 'Stage', 'Status'];

            console.log(`[TurnoverRisk API] Fetching from table: ${tableName}`);

            const crmResult = await fetchCRMTableRows(
              config.id,
              tableName,
              fields,
              100 // limit to 100 records
            );

            console.log(`[TurnoverRisk API] Fetch result:`, {
              success: crmResult.success,
              rowCount: crmResult.rows?.length || 0,
              error: crmResult.error,
            });

            if (crmResult.success && crmResult.rows && crmResult.rows.length > 0) {
              console.log(`[TurnoverRisk API] ✅ Fetched ${crmResult.rows.length} contacts from ${crmType}`);
              crmData = crmResult.rows;
            } else if (crmResult.rows && crmResult.rows.length === 0) {
              console.log(`[TurnoverRisk API] ⚠️ ${crmType} returned 0 records`);
              crmError = `Your ${crmType} account has no customer records. Please add contacts/accounts in ${crmType} first.`;
            } else {
              console.log(`[TurnoverRisk API] ❌ Error fetching: ${crmResult.error}`);
              crmError = `Failed to fetch from ${crmType}: ${crmResult.error}`;
            }
          } catch (fetchError: any) {
            console.error(`[TurnoverRisk API] Exception during fetch:`, {
              message: fetchError.message,
              code: fetchError.code,
              stack: fetchError.stack?.split('\n')[0],
            });
            crmError = `Error connecting to ${crmType}: ${fetchError.message}`;
          }
        }
      }
    } catch (configError: any) {
      console.error(`[TurnoverRisk API] Exception during config lookup:`, {
        message: configError.message,
        code: configError.code,
      });
      crmError = `Failed to access CRM configuration: ${configError.message}`;
    }

    // If CRM data available, use it
    if (crmData && crmData.length > 0) {
      console.log(`[TurnoverRisk API] Processing ${crmData.length} CRM records for risk analysis`);
      // Map CRM data to turnover risk format
      const risks = await mapCRMDataToTurnoverRisks(crmData, crmType);
      console.log(`[TurnoverRisk API] ✅ Returning risk analysis with ${risks.topRisks.length} at-risk items`);
      res.json(risks);
    } else {
      // Try internal database as fallback
      console.log(`[TurnoverRisk API] No CRM data, trying internal fallback`);
      try {
        const risks = await getEmployeeTurnoverRisks(organizationId);
        if (risks.topRisks && risks.topRisks.length > 0) {
          console.log(`[TurnoverRisk API] ✅ Returning fallback data with ${risks.topRisks.length} employees`);
          res.json(risks);
        } else {
          // No data anywhere - return helpful response
          console.log(`[TurnoverRisk API] No data found (CRM error: ${crmError})`);
          res.status(200).json({
            totalEmployees: 0,
            atRiskCount: 0,
            criticalCount: 0,
            highRiskCount: 0,
            previouslyActive: 0,
            alreadyInactive: 0,
            riskTrend: 'stable',
            topRisks: [],
            message: crmError || `No data available. Please ensure your ${crmType} CRM is connected and has customer records.`,
            status: 'no-data',
            crmConnected: false,
          });
        }
      } catch (fallbackError: any) {
        console.error(`[TurnoverRisk API] Fallback failed:`, fallbackError.message);
        res.status(200).json({
          totalEmployees: 0,
          atRiskCount: 0,
          criticalCount: 0,
          highRiskCount: 0,
          previouslyActive: 0,
          alreadyInactive: 0,
          riskTrend: 'stable',
          topRisks: [],
          message: crmError || 'Unable to fetch employee data. Please try again.',
          status: 'error',
          crmConnected: false,
        });
      }
    }
  } catch (error) {
    console.error('[TurnoverRisk API] Unexpected error:', {
      message: String(error),
      stack: String(error).split('\n')[0],
    });
    res.status(500).json({
      error: 'Failed to fetch turnover risks',
      message: String(error),
      status: 'error',
      crmConnected: false,
    });
  }
});

/**
 * Helper function to map CRM customer data to turnover risk format
 */
async function mapCRMDataToTurnoverRisks(crmData: any[], crmType: string) {
  const topRisks = crmData.map((customer, idx) => {
    // Determine if contact is Active based on HubSpot status
    // Active = NOT marked as Inactive AND NOT deactivated AND NOT unqualified
    const isActive = customer.hs_lead_status !== 'Inactive' &&
      customer.lifecyclestage !== 'customer_deactivated' &&
      customer.hs_lead_status !== 'Unqualified';

    return {
      userId: customer.id || `crm-${idx}`,
      username: customer.firstname ? `${customer.firstname} ${customer.lastname || ''}`.trim() : customer.name || `Customer ${idx}`,
      email: customer.email || customer.hs_email || '',
      isActive, // YES if active, NO if inactive/deactivated
      turnoverRiskScore: calculateCRMRiskScore(customer),
      riskLevel: getRiskLevel(calculateCRMRiskScore(customer)),
      churnIndicators: detectChurnIndicators(customer),
      recentResponses: customer.hs_analytics_num_page_views || customer.hs_analytics_num_visits || 0,
      lastRiskResponse: null,
      recommendations: generateRecommendations(customer),
    };
  });

  const atRisk = topRisks.filter(r => ['critical', 'high', 'medium'].includes(r.riskLevel));
  const inactiveAtRisk = topRisks.filter(r => !r.isActive && r.churnIndicators.length > 0);

  return {
    totalEmployees: topRisks.length,
    atRiskCount: atRisk.length,
    criticalCount: topRisks.filter(r => r.riskLevel === 'critical').length,
    highRiskCount: topRisks.filter(r => r.riskLevel === 'high').length,
    previouslyActive: atRisk.filter(r => r.isActive).length,
    alreadyInactive: inactiveAtRisk.length,
    riskTrend: 'stable' as const,
    topRisks: topRisks.slice(0, 10),
  };
}

function calculateCRMRiskScore(customer: any): number {
  let score = 0;

  // **MOST IMPORTANT**: Check if contact is marked as INACTIVE in HubSpot
  // HubSpot uses "Inactive" status to indicate dormant/churned contacts
  const isInactiveStatus = customer.hs_lead_status === 'Inactive' ||
    customer.lifecyclestage === 'customer_deactivated' ||
    customer.hs_lead_status === 'Unqualified';

  if (isInactiveStatus) {
    score += 50; // Very high risk if marked inactive/unqualified
  }

  // Check lifecycle stage
  if (customer.lifecyclestage === 'lead') score += 10;
  if (customer.lifecyclestage === 'opportunity') score += 15;
  if (customer.lifecyclestage === 'customer') score += 0; // Active customers = lower base risk

  // Check engagement (lower page views = higher risk) - ONLY if not already inactive
  if (!isInactiveStatus) {
    const pageViews = customer.hs_analytics_num_page_views || customer.hs_analytics_num_visits || 0;
    if (pageViews === 0) score += 25; // Less aggressive than 40
    else if (pageViews < 5) score += 15;
    else if (pageViews < 10) score += 10;
    else if (pageViews < 20) score += 5;
  }

  // Contact with no notes or interactions (potential churned contact)
  const numNotes = customer.num_contacted_notes || 0;
  if (numNotes === 0) score += 15;

  return Math.min(Math.max(score, 0), 100);
}

function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' | 'none' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'none';
}

function detectChurnIndicators(customer: any): string[] {
  const indicators: string[] = [];

  if (customer.lifecyclestage === 'customer_deactivated') {
    indicators.push('deactivated');
  }
  if (customer.hs_lead_status === 'Inactive') {
    indicators.push('inactive-status');
  }
  if (customer.hs_analytics_num_page_views === 0 || !customer.hs_analytics_num_page_views) {
    indicators.push('no-engagement');
  }
  if (customer.hs_lead_status === 'Bad Fit') {
    indicators.push('bad-fit');
  }

  return indicators;
}

function generateRecommendations(customer: any): string[] {
  const recs: string[] = [];

  if (customer.lifecyclestage === 'customer_deactivated') {
    recs.push('Review deactivation reason and contact for win-back');
  }
  if (customer.hs_lead_status === 'Inactive') {
    recs.push('Initiate re-engagement campaign');
    recs.push('Check for service or product issues');
  }
  if (!customer.hs_analytics_num_page_views || customer.hs_analytics_num_page_views < 5) {
    recs.push('Increase engagement with personalized outreach');
  }

  return recs.length > 0 ? recs : ['Monitor account for changes in status'];
}

/**
 * GET /api/turnover-risks/department/:departmentId
 * Get turnover risks for specific department
 */
router.get('/department/:departmentId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    console.log(`[TurnoverRisk API] Fetching risks for department: ${departmentId}`);

    const risks = await getDepartmentTurnoverRisks(departmentId);
    res.json(risks);
  } catch (error) {
    console.error('[TurnoverRisk API] Error:', error);
    res.status(500).json({ error: 'Failed to fetch department turnover risks' });
  }
});

/**
 * GET /api/turnover-risks/export
 * Export turnover risk data
 */
router.get('/export', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    console.log('[TurnoverRisk API] Exporting turnover risk data');

    const data = await exportTurnoverRiskData();

    res.json(data);
  } catch (error) {
    console.error('[TurnoverRisk API] Error:', error);
    res.status(500).json({ error: 'Failed to export turnover risks' });
  }
});

export default router;
