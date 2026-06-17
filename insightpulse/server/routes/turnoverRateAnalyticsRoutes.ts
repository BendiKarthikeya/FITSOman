/**
 * Turnover Rate Analytics Routes
 * Calculates: Turnover Rate = (Number of employees who left / Average number of employees) × 100
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { fetchCRMTableRows } from '../integrations/crmIntegrationService';
import { db } from '../db';
import { crmConfigs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/turnover-analytics/rate-by-period
 * Calculate turnover rate for each time period (weekly/monthly)
 * 
 * Formula: (Employees Left / Average Employees) × 100
 */
router.get('/rate-by-period', requireAuth, async (req: Request, res: Response) => {
  try {
    const crmType = (req.query.crm as string) || 'hubspot';
    const period = (req.query.period as string) || 'monthly';
    const months = parseInt((req.query.months as string) || '6');
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log(`[TurnoverAnalytics] Request from User: ${userId} (${userRole}) for CRM: ${crmType}`);

    // Get CRM configuration
    // 1. Try personal config first
    let configs = await db.select().from(crmConfigs).where(
      and(
        eq(crmConfigs.userId, userId),
        eq(crmConfigs.crmType, crmType),
        eq(crmConfigs.isActive, true)
      )
    );

    // 2. Fallback: If no personal config, check if user is admin/superuser and allow any active config
    // OR if we are in demo mode, maybe allow sharing configs?
    if (configs.length === 0) {
      console.log(`[TurnoverAnalytics] No personal config found. Checking for any active ${crmType} config...`);
      const allConfigs = await db.select().from(crmConfigs).where(
        and(
          eq(crmConfigs.crmType, crmType),
          eq(crmConfigs.isActive, true)
        )
      );

      if (allConfigs.length > 0) {
        // Use the first available config as fallback
        console.log(`[TurnoverAnalytics] Using fallback config: ${allConfigs[0].id} (Owner: ${allConfigs[0].userId})`);
        configs = [allConfigs[0]];
      }
    }

    if (configs.length === 0) {
      console.warn(`[TurnoverAnalytics] No active ${crmType} configuration found for user ${userId} or globally.`);
      return res.status(200).json({
        success: true,
        data: [],
        metadata: {
          period,
          months,
          totalContacts: 0,
          crmType,
          message: "No active CRM configuration found"
        }
      });
    }

    const config = configs[0];

    // Fetch contacts with required fields
    const tableName = crmType === 'hubspot' ? 'contacts' : crmType === 'salesforce' ? 'Contact' : 'Contacts';
    const fields = crmType === 'hubspot'
      ? ['id', 'firstname', 'lastname', 'email', 'lifecyclestage', 'hs_lead_status', 'createdate', 'lastmodifieddate']
      : crmType === 'salesforce'
        ? ['Id', 'FirstName', 'LastName', 'Email', 'CreatedDate', 'Status', 'IsActive']
        : ['id', 'First_Name', 'Last_Name', 'Email', 'Created_Time', 'Status'];

    console.log(`[TurnoverAnalytics] Fetching rows from table: ${tableName}`);

    const result = await fetchCRMTableRows(config.id, tableName, fields, 100);

    if (!result.success || !result.rows) {
      console.error(`[TurnoverAnalytics] Failed to fetch contacts: ${result.error}`);
      return res.status(200).json({
        success: true,
        data: [],
        metadata: {
          error: result.error
        }
      });
    }

    const contacts = result.rows;
    console.log(`[TurnoverAnalytics] Fetched ${contacts.length} contacts for analysis.`);

    // Generate periods and calculate rates
    const periods = generatePeriods(months, period);
    const rateData = calculateTurnoverRates(contacts, periods);

    if (rateData.length > 0) {
      const latest = rateData[rateData.length - 1];
      console.log(`[TurnoverAnalytics] Latest Period (${latest.period}): Rate=${latest.turnoverRate}%, Left=${latest.employeesLeft}`);
    }

    res.json({
      success: true,
      data: rateData,
      metadata: {
        period,
        months,
        totalContacts: contacts.length,
        crmType,
        debug: {
          firstContacts: contacts.slice(0, 3).map(c => ({
            email: c.email,
            hs_lead_status: c.hs_lead_status,
            lifecyclestage: c.lifecyclestage,
            createdate: c.createdate,
            lastmodifieddate: c.lastmodifieddate
          })),
          ratesSummary: rateData.map(r => ({ p: r.period, rate: r.turnoverRate, left: r.employeesLeft }))
        }
      },
    });

  } catch (error) {
    console.error('[TurnoverAnalytics] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: [],
    });
  }
});

/**
 * Generate time periods (weekly or monthly)
 */
function generatePeriods(months: number, periodType: string) {
  const periods = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    if (periodType === 'monthly') {
      const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      // Set end date to end of day
      const endDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      periods.push({
        startDate,
        endDate,
        label: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        type: 'monthly',
      });
    } else if (periodType === 'weekly') {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (today.getDay() + 7 * (months - 1 - i)));

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const weekNum = Math.ceil((startDate.getDate() + new Date(startDate.getFullYear(), startDate.getMonth(), 1).getDay()) / 7);
      periods.push({
        startDate,
        endDate,
        label: `Week ${weekNum}`,
        type: 'weekly',
      });
    }
  }

  return periods;
}

/**
 * Calculate turnover rate for each period
 * Formula: (Employees who left / Average number of employees) × 100
 */
function calculateTurnoverRates(
  contacts: any[],
  periods: any[]
): Array<{
  period: string;
  startDate: string;
  endDate: string;
  turnoverRate: number;
  employeesLeft: number;
  averageEmployees: number;
  beginningCount: number;
  endingCount: number;
}> {
  // Debug: Log first 3 contacts to see structure
  if (contacts.length > 0) {
    console.log('[Turnover Analytics] Inspecting first 3 contacts:');
    contacts.slice(0, 3).forEach((c, idx) => {
      console.log(`  [${idx}] Email: ${c.email}, LeadStatus: "${c.hs_lead_status}", Lifecycle: "${c.lifecyclestage}", Created: ${c.createdate}`);
    });
  }

  return periods.map((period) => {
    // Helper to check if contact is inactive
    const isContactInactive = (contact: any) => {
      const hsLeadStatus = String(contact.hs_lead_status || '').toUpperCase();
      const lifecycleStage = String(contact.lifecyclestage || '').toLowerCase();

      return hsLeadStatus === 'INACTIVE' ||
        lifecycleStage === 'customer_deactivated' ||
        hsLeadStatus === 'UNQUALIFIED' ||
        contact.hs_lead_status === 'Inactive' ||
        contact.hs_lead_status === 'Unqualified';
    };

    // Helper to get left date or fallback to create date
    const getLeftDate = (contact: any) => {
      const createDate = contact.createdate ? new Date(contact.createdate) : new Date();
      if (isContactInactive(contact)) {
        return contact.lastmodifieddate ? new Date(contact.lastmodifieddate) : new Date(createDate);
      }
      return null;
    };

    // Count contacts active at beginning of period
    const beginningActive = contacts.filter((contact) => {
      const createDate = contact.createdate ? new Date(contact.createdate) : new Date();
      const leftDate = getLeftDate(contact);
      const isInactive = isContactInactive(contact);

      // Active at start if created before start AND (still active OR left AFTER start)
      return createDate <= period.startDate && (!isInactive || (leftDate && leftDate > period.startDate));
    }).length;

    // Count contacts active at end of period
    const endingActive = contacts.filter((contact) => {
      const createDate = contact.createdate ? new Date(contact.createdate) : new Date();
      const leftDate = getLeftDate(contact);
      const isInactive = isContactInactive(contact);

      // Active at end if created before end AND (still active OR left AFTER end)
      return createDate <= period.endDate && (!isInactive || (leftDate && leftDate > period.endDate));
    }).length;

    // Employees left = Inactive users whose leftDate is within this period
    const employeesLeft = contacts.filter((contact) => {
      if (!isContactInactive(contact)) return false;

      const leftDate = getLeftDate(contact);
      if (!leftDate) return false;

      // Left during this period
      const isMatch = leftDate >= period.startDate && leftDate <= period.endDate;
      // Debug churn calculation for recent period
      if (period.label.includes(new Date().toLocaleDateString('en-US', { month: 'short' }))) {
        console.log(`[Turnover Debug] Contact ${contact.email} Left: ${leftDate.toISOString()} Period: ${period.startDate.toISOString()} - ${period.endDate.toISOString()} Match: ${isMatch}`);
      }

      return isMatch;
    }).length;

    // Average = (beginning + ending) / 2
    const averageEmployees = (beginningActive + endingActive) / 2 || 1;

    // Turnover Rate = (Left / Average) × 100
    const turnoverRate = averageEmployees > 0 ? (employeesLeft / averageEmployees) * 100 : 0;

    return {
      period: period.label,
      startDate: period.startDate.toISOString().split('T')[0],
      endDate: period.endDate.toISOString().split('T')[0],
      turnoverRate: Math.round(turnoverRate * 100) / 100, // Round to 2 decimals
      employeesLeft,
      averageEmployees: Math.round(averageEmployees),
      beginningCount: beginningActive,
      endingCount: endingActive,
    };
  });
}

export default router;
