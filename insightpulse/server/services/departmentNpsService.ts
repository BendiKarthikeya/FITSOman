/**
 * Department NPS aggregation service.
 *
 * Called after every survey response is stored (web/link, WhatsApp, VAPI).
 * Finds which department the respondent belongs to via their email or phone,
 * then upserts the department_nps row for the current month/year.
 *
 * Lookup chain:
 *   respondentEmail → employees.email → employees.departmentId
 *   respondentPhone → employees.phoneNumber → employees.departmentId
 *   fallback: surveys.createdBy → users.organizationId → first dept in org
 */

import { db } from "../db";
import {
  employees,
  departments,
  departmentNps,
  surveys,
  users,
  responses,
} from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface AggregateOptions {
  surveyId: string;
  responseId: string;
  respondentEmail?: string | null;
  respondentPhone?: string | null;
  npsScore: number | null;
}

/**
 * Resolve which department this respondent belongs to.
 * Returns { departmentId, organizationId } or null if unresolvable.
 */
async function resolveDepartment(
  surveyId: string,
  respondentEmail?: string | null,
  respondentPhone?: string | null
): Promise<{ departmentId: string; organizationId: string } | null> {
  // 1. Try email match in employees
  if (respondentEmail) {
    const [emp] = await db
      .select({ departmentId: employees.departmentId, organizationId: employees.organizationId })
      .from(employees)
      .where(eq(employees.email, respondentEmail))
      .limit(1);
    if (emp?.departmentId && emp?.organizationId) {
      return { departmentId: emp.departmentId, organizationId: emp.organizationId };
    }
  }

  // 2. Try phone match in employees
  if (respondentPhone) {
    const normalised = respondentPhone.replace(/\D/g, '');
    const [emp] = await db
      .select({ departmentId: employees.departmentId, organizationId: employees.organizationId })
      .from(employees)
      .where(sql`REGEXP_REPLACE(${employees.phoneNumber}, '[^0-9]', '', 'g') = ${normalised}`)
      .limit(1);
    if (emp?.departmentId && emp?.organizationId) {
      return { departmentId: emp.departmentId, organizationId: emp.organizationId };
    }
  }

  // 3. Fallback: use the survey creator's org, first department
  const [survey] = await db
    .select({ createdBy: surveys.createdBy })
    .from(surveys)
    .where(eq(surveys.id, surveyId))
    .limit(1);

  if (!survey?.createdBy) return null;

  const [creator] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, survey.createdBy))
    .limit(1);

  if (!creator?.organizationId) return null;

  const [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.organizationId, creator.organizationId))
    .limit(1);

  if (!dept) return null;

  return { departmentId: dept.id, organizationId: creator.organizationId };
}

/**
 * Update (or create) the department_nps row for the current month/year
 * given one new NPS score.
 *
 * npsScore here is the raw individual score (0–10), NOT the aggregate.
 * We re-aggregate from all responses so the row stays accurate even if
 * scores are updated later.
 */
async function upsertDepartmentNps(
  departmentId: string,
  organizationId: string
): Promise<void> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Pull all response npsScores for this department in this period
  // by joining responses → employees via respondentEmail
  const rows = await db
    .select({ npsScore: responses.npsScore })
    .from(responses)
    .innerJoin(employees, eq(responses.respondentEmail, employees.email))
    .where(
      and(
        eq(employees.departmentId, departmentId),
        sql`EXTRACT(MONTH FROM ${responses.submittedAt}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${responses.submittedAt}) = ${year}`,
        sql`${responses.npsScore} IS NOT NULL`
      )
    );

  if (rows.length === 0) return;

  const scores = rows.map((r) => Number(r.npsScore)).filter((n) => !isNaN(n));
  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const total = scores.length;
  const nps = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

  // Upsert: one row per (departmentId, month, year)
  const existing = await db
    .select({ id: departmentNps.id })
    .from(departmentNps)
    .where(
      and(
        eq(departmentNps.departmentId, departmentId),
        eq(departmentNps.periodMonth, month),
        eq(departmentNps.periodYear, year)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(departmentNps)
      .set({
        npsScore: String(Math.round(nps * 100) / 100),
        promoters,
        passives,
        detractors,
        totalResponses: total,
        updatedAt: new Date(),
      })
      .where(eq(departmentNps.id, existing[0].id));
  } else {
    await db.insert(departmentNps).values({
      departmentId,
      organizationId,
      npsScore: String(Math.round(nps * 100) / 100),
      promoters,
      passives,
      detractors,
      totalResponses: total,
      periodMonth: month,
      periodYear: year,
    });
  }
}

/**
 * Main entry point — call this after every response is written to DB.
 * Silently no-ops if the respondent can't be mapped to a department.
 */
export async function aggregateDepartmentNps(opts: AggregateOptions): Promise<void> {
  try {
    if (opts.npsScore === null || opts.npsScore === undefined) return;

    const dept = await resolveDepartment(
      opts.surveyId,
      opts.respondentEmail,
      opts.respondentPhone
    );
    if (!dept) return;

    await upsertDepartmentNps(dept.departmentId, dept.organizationId);
  } catch (err) {
    console.error("[departmentNpsService] aggregation failed:", err);
  }
}
