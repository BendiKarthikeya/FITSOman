/**
 * Employee Turnover Risk Service
 * Analyzes survey responses for churn indicators and correlates with CRM user active status
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { responses, users } from '@shared/schema';

export interface TurnoverRiskEmployee {
  userId: string;
  username: string;
  email: string;
  isActive: boolean;
  turnoverRiskScore: number; // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  churnIndicators: string[]; // e.g., ["leaving", "competitor", "dissatisfied"]
  recentResponses: number; // count of recent high-risk responses
  lastRiskResponse: string | null; // date of last risky response
  recommendations: string[];
}

export interface TurnoverRiskSummary {
  totalEmployees: number;
  atRiskCount: number; // critical + high
  criticalCount: number;
  highRiskCount: number;
  previouslyActive: number; // Was active, now showing churn signals
  alreadyInactive: number; // Marked inactive, showing churn signals
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  topRisks: TurnoverRiskEmployee[];
  status?: 'error' | 'success' | 'no-data'; // CRM fetch status
  message?: string; // Error or info message
  crmConnected?: boolean; // Whether CRM is accessible
}

/**
 * Get employee turnover risk analysis
 */
export async function getEmployeeTurnoverRisks(
  organizationId?: string
): Promise<TurnoverRiskSummary> {
  try {
    // Fetch all active employees with their recent responses
    let query = db
      .select({
        user: users,
        responseData: responses
      })
      .from(users)
      .leftJoin(
        responses,
        and(
          eq(responses.respondentEmail, users.email),
          // Only last 30 days of responses
          sql`${responses.submittedAt} > NOW() - INTERVAL '30 days'`
        )
      );

    if (organizationId) {
      query = query.where(eq(users.organizationId, organizationId));
    }

    const results = await query.execute();

    // Group by employee
    const employeeMap = new Map<string, {
      user: typeof users.$inferSelect;
      responses: typeof responses.$inferSelect[];
    }>();

    results.forEach(row => {
      if (!employeeMap.has(row.user.id)) {
        employeeMap.set(row.user.id, {
          user: row.user,
          responses: []
        });
      }
      if (row.responseData) {
        employeeMap.get(row.user.id)!.responses.push(row.responseData);
      }
    });

    // Calculate risk for each employee
    const employeeRisks: TurnoverRiskEmployee[] = [];
    
    employeeMap.forEach(({ user, responses: userResponses }) => {
      const risk = calculateEmployeeTurnoverRisk(user, userResponses);
      employeeRisks.push(risk);
    });

    // Sort by risk score
    employeeRisks.sort((a, b) => b.turnoverRiskScore - a.turnoverRiskScore);

    // Calculate summary
    const criticalCount = employeeRisks.filter(e => e.riskLevel === 'critical').length;
    const highRiskCount = employeeRisks.filter(e => e.riskLevel === 'high').length;
    const previouslyActive = employeeRisks.filter(
      e => e.isActive && (e.riskLevel === 'critical' || e.riskLevel === 'high')
    ).length;
    const alreadyInactive = employeeRisks.filter(
      e => !e.isActive && (e.riskLevel === 'critical' || e.riskLevel === 'high')
    ).length;

    return {
      totalEmployees: employeeRisks.length,
      atRiskCount: criticalCount + highRiskCount,
      criticalCount,
      highRiskCount,
      previouslyActive,
      alreadyInactive,
      riskTrend: 'stable', // TODO: Calculate trend from historical data
      topRisks: employeeRisks.slice(0, 10) // Top 10 at-risk employees
    };
  } catch (error) {
    console.error('[TurnoverRisk] Error calculating turnover risks:', error);
    throw error;
  }
}

/**
 * Calculate turnover risk for a single employee
 */
function calculateEmployeeTurnoverRisk(
  user: typeof users.$inferSelect,
  responses: typeof responses.$inferSelect[]
): TurnoverRiskEmployee {
  if (responses.length === 0) {
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive || false,
      turnoverRiskScore: 0,
      riskLevel: 'none',
      churnIndicators: [],
      recentResponses: 0,
      lastRiskResponse: null,
      recommendations: []
    };
  }

  // Calculate risk from churn indicators
  let churnIndicators: string[] = [];
  let riskScore = 0;
  let highRiskResponseCount = 0;
  let lastRiskDate: Date | null = null;

  // Check each response for churn indicators
  responses.forEach(response => {
    // Check if response has risk flags
    if (response.hasRisks && response.riskLevel === 'high') {
      highRiskResponseCount++;
      if (!lastRiskDate || new Date(response.submittedAt || '') > lastRiskDate) {
        lastRiskDate = new Date(response.submittedAt || '');
      }
    }

    // Check for churn-specific indicators
    if (response.riskCategories && Array.isArray(response.riskCategories)) {
      if (response.riskCategories.includes('churn')) {
        riskScore += 30;
        if (!churnIndicators.includes('churn')) {
          churnIndicators.push('churn');
        }
      }
    }

    // Check for "leaving" keywords in answers
    if (response.answers && typeof response.answers === 'object') {
      const answerText = Object.values(response.answers).join(' ').toLowerCase();
      if (
        answerText.includes('leaving') || 
        answerText.includes('quitting') ||
        answerText.includes('resign') ||
        answerText.includes('exit')
      ) {
        riskScore += 25;
        if (!churnIndicators.includes('leaving')) {
          churnIndicators.push('leaving');
        }
      }

      if (
        answerText.includes('competitor') ||
        answerText.includes('switch') ||
        answerText.includes('looking elsewhere')
      ) {
        riskScore += 20;
        if (!churnIndicators.includes('competitor-seeking')) {
          churnIndicators.push('competitor-seeking');
        }
      }

      if (
        answerText.includes('dissatisfied') ||
        answerText.includes('disappointed') ||
        answerText.includes('frustrated')
      ) {
        riskScore += 15;
        if (!churnIndicators.includes('dissatisfaction')) {
          churnIndicators.push('dissatisfaction');
        }
      }
    }

    // Multiple high-risk responses increase score
    if (highRiskResponseCount > 1) {
      riskScore += highRiskResponseCount * 10;
    }
  });

  // Check if user is inactive (already left?)
  const isInactiveNow = !user.isActive;
  if (isInactiveNow && churnIndicators.length > 0) {
    riskScore += 15; // They already left, confirm with survey data
  }

  // Cap risk score at 100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // Determine risk level
  let riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  if (riskScore >= 80) {
    riskLevel = 'critical';
  } else if (riskScore >= 60) {
    riskLevel = 'high';
  } else if (riskScore >= 40) {
    riskLevel = 'medium';
  } else if (riskScore >= 20) {
    riskLevel = 'low';
  } else {
    riskLevel = 'none';
  }

  // Generate recommendations
  const recommendations = generateTurnoverRecommendations(
    user,
    riskLevel,
    churnIndicators,
    isInactiveNow
  );

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive || false,
    turnoverRiskScore: riskScore,
    riskLevel,
    churnIndicators,
    recentResponses: highRiskResponseCount,
    lastRiskResponse: lastRiskDate?.toISOString() || null,
    recommendations
  };
}

/**
 * Generate actionable recommendations based on turnover risk
 */
function generateTurnoverRecommendations(
  user: typeof users.$inferSelect,
  riskLevel: string,
  churnIndicators: string[],
  isInactive: boolean
): string[] {
  const recommendations: string[] = [];

  if (isInactive) {
    recommendations.push('⚠️ Employee is already marked as inactive');
  }

  if (riskLevel === 'critical') {
    recommendations.push('🚨 URGENT: Schedule retention conversation immediately');
    recommendations.push('Contact manager to understand current situation');
    recommendations.push('Prepare counter-offer or improvement proposal if needed');
    recommendations.push('Review recent performance feedback and projects');
  } else if (riskLevel === 'high') {
    recommendations.push('Schedule 1:1 with employee this week');
    recommendations.push('Understand career growth and satisfaction concerns');
    recommendations.push('Consider role adjustment or project reassignment');
    recommendations.push('Review compensation and benefits alignment');
  } else if (riskLevel === 'medium') {
    recommendations.push('Add to manager\'s regular check-in list');
    recommendations.push('Monitor responses in next survey cycle');
    recommendations.push('Proactively discuss career development');
  }

  if (churnIndicators.includes('leaving')) {
    recommendations.push('Explore immediate departure intentions');
  }

  if (churnIndicators.includes('competitor-seeking')) {
    recommendations.push('Review competitive compensation and benefits');
    recommendations.push('Highlight unique value propositions of current role');
  }

  if (churnIndicators.includes('dissatisfaction')) {
    recommendations.push('Conduct thorough satisfaction assessment');
    recommendations.push('Address specific pain points identified in surveys');
  }

  return recommendations;
}

/**
 * Get turnover risk for specific department
 */
export async function getDepartmentTurnoverRisks(departmentId: string) {
  const risks = await getEmployeeTurnoverRisks();
  
  // Filter by department
  const deptUsers = await db
    .select()
    .from(users)
    .where(eq(users.departmentId, departmentId));

  const deptUserIds = new Set(deptUsers.map(u => u.id));
  
  return {
    ...risks,
    topRisks: risks.topRisks.filter(r => deptUserIds.has(r.userId))
  };
}

/**
 * Export turnover risk data for HR analysis
 */
export async function exportTurnoverRiskData() {
  const risks = await getEmployeeTurnoverRisks();
  
  return {
    summary: risks,
    employees: risks.topRisks.map(emp => ({
      Username: emp.username,
      Email: emp.email,
      "Risk Level": emp.riskLevel.toUpperCase(),
      "Risk Score": `${emp.riskScore}/100`,
      Status: emp.isActive ? 'Active' : 'Inactive',
      "Churn Indicators": emp.churnIndicators.join(', '),
      "Recent High-Risk Responses": emp.recentResponses,
      "Last Risk Response": emp.lastRiskResponse
    })),
    exportedAt: new Date().toISOString()
  };
}

import { sql } from 'drizzle-orm';
