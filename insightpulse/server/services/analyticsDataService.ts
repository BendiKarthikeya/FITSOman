import { db } from "../db";
import {
  reports,
  reportSchedules,
  reportArchives,
  exportJobs,
  benchmarks,
  benchmarkComparisons,
} from "../../shared/schema";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ============ REPORTS SERVICE ============

export interface CreateReportDTO {
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  chartConfigs: Array<{ chartId: string; type: string; config: any }>;
  filterConfigs: Array<{ filterId: string; type: string; value: any }>;
  layout?: string;
  isTemplate?: boolean;
  surveyId?: number; // Link to analytics survey
}

export interface UpdateReportDTO {
  name?: string;
  description?: string;
  chartConfigs?: Array<any>;
  filterConfigs?: Array<any>;
  layout?: string;
}

export class ReportsService {
  static async createReport(data: CreateReportDTO) {
    const [report] = await db
      .insert(reports)
      .values({
        organizationId: data.organizationId,
        createdBy: data.createdBy,
        surveyId: data.surveyId || null, // Link to analytics survey
        name: data.name,
        description: data.description || null,
        chartConfigs: JSON.stringify(data.chartConfigs),
        filterConfigs: JSON.stringify(data.filterConfigs),
        layout: data.layout || "grid",
        isTemplate: data.isTemplate || false,
      })
      .returning();

    return report;
  }

  static async getReport(reportId: string) {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId));

    if (!report) {
      throw new Error("Report not found");
    }

    return {
      ...report,
      chartConfigs: typeof report.chartConfigs === 'string' 
        ? JSON.parse(report.chartConfigs) 
        : report.chartConfigs,
      filterConfigs: typeof report.filterConfigs === 'string'
        ? JSON.parse(report.filterConfigs)
        : report.filterConfigs,
    };
  }

  static async listReports(organizationId: string, options?: { archived?: boolean }) {
    let query = db
      .select()
      .from(reports)
      .where(eq(reports.organizationId, organizationId));

    if (options?.archived === false) {
      query = query.where(eq(reports.archivedAt, null));
    }

    const result = await query.orderBy(desc(reports.createdAt));
    
    return result.map(r => ({
      ...r,
      chartConfigs: typeof r.chartConfigs === 'string' 
        ? JSON.parse(r.chartConfigs) 
        : r.chartConfigs,
      filterConfigs: typeof r.filterConfigs === 'string'
        ? JSON.parse(r.filterConfigs)
        : r.filterConfigs,
    }));
  }

  static async updateReport(reportId: string, data: UpdateReportDTO) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.chartConfigs) updateData.chartConfigs = JSON.stringify(data.chartConfigs);
    if (data.filterConfigs) updateData.filterConfigs = JSON.stringify(data.filterConfigs);
    if (data.layout) updateData.layout = data.layout;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, reportId))
      .returning();

    return updated;
  }

  static async deleteReport(reportId: string) {
    await db.delete(reports).where(eq(reports.id, reportId));
    return { success: true };
  }

  static async archiveReport(reportId: string) {
    const [archived] = await db
      .update(reports)
      .set({ archivedAt: new Date() })
      .where(eq(reports.id, reportId))
      .returning();

    return archived;
  }
}

// ============ REPORT SCHEDULES SERVICE ============

export interface CreateScheduleDTO {
  reportId: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay?: string;
  recipients: string[];
}

export class ReportSchedulesService {
  static async createSchedule(data: CreateScheduleDTO) {
    const nextSendAt = this.calculateNextSendDate(
      data.frequency,
      data.dayOfWeek,
      data.dayOfMonth,
      data.timeOfDay
    );

    const [schedule] = await db
      .insert(reportSchedules)
      .values({
        reportId: data.reportId,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek || null,
        dayOfMonth: data.dayOfMonth || null,
        timeOfDay: data.timeOfDay || "09:00:00",
        recipients: JSON.stringify(data.recipients),
        nextSendAt,
      })
      .returning();

    return schedule;
  }

  static async getSchedule(scheduleId: string) {
    const [schedule] = await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.id, scheduleId));

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    return {
      ...schedule,
      recipients: typeof schedule.recipients === 'string'
        ? JSON.parse(schedule.recipients)
        : schedule.recipients,
    };
  }

  static async listSchedules(reportId: string) {
    const result = await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.reportId, reportId));

    return result.map(s => ({
      ...s,
      recipients: typeof s.recipients === 'string'
        ? JSON.parse(s.recipients)
        : s.recipients,
    }));
  }

  static async updateSchedule(scheduleId: string, data: Partial<CreateScheduleDTO>) {
    const updateData: any = {};
    if (data.frequency) updateData.frequency = data.frequency;
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.timeOfDay) updateData.timeOfDay = data.timeOfDay;
    if (data.recipients) updateData.recipients = JSON.stringify(data.recipients);
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(reportSchedules)
      .set(updateData)
      .where(eq(reportSchedules.id, scheduleId))
      .returning();

    return updated;
  }

  static async deleteSchedule(scheduleId: string) {
    await db.delete(reportSchedules).where(eq(reportSchedules.id, scheduleId));
    return { success: true };
  }

  static async toggleSchedule(scheduleId: string, enabled: boolean) {
    const [updated] = await db
      .update(reportSchedules)
      .set({ isEnabled: enabled })
      .where(eq(reportSchedules.id, scheduleId))
      .returning();

    return updated;
  }

  private static calculateNextSendDate(
    frequency: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
    timeOfDay: string = "09:00:00"
  ): Date {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(":").map(Number);

    let nextDate = new Date(now);
    nextDate.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case "daily":
        if (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;
      case "weekly":
        const targetDay = dayOfWeek || now.getDay();
        const daysAhead = (targetDay + 7 - now.getDay()) % 7;
        if (daysAhead === 0 && nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (daysAhead > 0) {
          nextDate.setDate(nextDate.getDate() + daysAhead);
        }
        break;
      case "monthly":
        const targetDate = dayOfMonth || now.getDate();
        nextDate.setDate(targetDate);
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
    }

    return nextDate;
  }
}

// ============ REPORT ARCHIVES SERVICE ============

export interface CreateArchiveDTO {
  reportId: string;
  scheduleId?: string;
  generatedBy: string;
  fileUrl: string;
  fileFormat: string;
  fileSizeBytes: number;
}

export class ReportArchivesService {
  static async createArchive(data: CreateArchiveDTO) {
    const [archive] = await db
      .insert(reportArchives)
      .values({
        reportId: data.reportId,
        scheduleId: data.scheduleId || null,
        generatedBy: data.generatedBy,
        fileUrl: data.fileUrl,
        fileFormat: data.fileFormat,
        fileSizeBytes: data.fileSizeBytes,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
      })
      .returning();

    return archive;
  }

  static async listArchives(reportId: string, options?: { limit?: number; offset?: number }) {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    return await db
      .select()
      .from(reportArchives)
      .where(
        and(
          eq(reportArchives.reportId, reportId),
          gte(reportArchives.expiresAt, new Date())
        )
      )
      .orderBy(desc(reportArchives.generatedAt))
      .limit(limit)
      .offset(offset);
  }

  static async incrementDownloadCount(archiveId: string) {
    const [archive] = await db
      .update(reportArchives)
      .set({
        downloadCount: (prev) => (typeof prev === 'number' ? prev + 1 : 1),
        lastDownloadedAt: new Date(),
      })
      .where(eq(reportArchives.id, archiveId))
      .returning();

    return archive;
  }

  static async deleteArchive(archiveId: string) {
    await db.delete(reportArchives).where(eq(reportArchives.id, archiveId));
    return { success: true };
  }

  static async cleanupExpiredArchives() {
    const result = await db
      .delete(reportArchives)
      .where(lte(reportArchives.expiresAt, new Date()));

    return { deletedCount: result.rowsAffected };
  }
}

// ============ EXPORT JOBS SERVICE ============

export interface CreateExportJobDTO {
  organizationId: string;
  createdBy: string;
  exportType: string;
  format: string;
  includeHeaders?: boolean;
  filters?: any;
}

export class ExportJobsService {
  static async createJob(data: CreateExportJobDTO) {
    const [job] = await db
      .insert(exportJobs)
      .values({
        organizationId: data.organizationId,
        createdBy: data.createdBy,
        exportType: data.exportType,
        format: data.format,
        includeHeaders: data.includeHeaders ?? true,
        filters: data.filters ? JSON.stringify(data.filters) : null,
        status: "pending",
      })
      .returning();

    return job;
  }

  static async getJob(jobId: string) {
    const [job] = await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.id, jobId));

    if (!job) {
      throw new Error("Export job not found");
    }

    return {
      ...job,
      filters: job.filters ? JSON.parse(job.filters) : null,
    };
  }

  static async listJobs(organizationId: string, options?: { status?: string }) {
    let query = db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.organizationId, organizationId));

    if (options?.status) {
      query = query.where(eq(exportJobs.status, options.status));
    }

    return await query.orderBy(desc(exportJobs.createdAt));
  }

  static async updateJobStatus(
    jobId: string,
    status: string,
    options?: { fileUrl?: string; fileSizeBytes?: number; errorMessage?: string; progressPercentage?: number }
  ) {
    const updateData: any = { status };
    if (options?.fileUrl) updateData.fileUrl = options.fileUrl;
    if (options?.fileSizeBytes) updateData.fileSizeBytes = options.fileSizeBytes;
    if (options?.errorMessage) updateData.errorMessage = options.errorMessage;
    if (options?.progressPercentage) updateData.progressPercentage = options.progressPercentage;
    if (status === "completed") updateData.completedAt = new Date();

    const [updated] = await db
      .update(exportJobs)
      .set(updateData)
      .where(eq(exportJobs.id, jobId))
      .returning();

    return updated;
  }

  static async incrementDownloadCount(jobId: string) {
    const [job] = await db
      .update(exportJobs)
      .set({
        downloadCount: (prev) => (typeof prev === 'number' ? prev + 1 : 1),
        lastDownloadedAt: new Date(),
      })
      .where(eq(exportJobs.id, jobId))
      .returning();

    return job;
  }

  static async cleanupExpiredJobs() {
    const result = await db
      .delete(exportJobs)
      .where(lte(exportJobs.expiresAt, new Date()));

    return { deletedCount: result.rowsAffected };
  }
}

// ============ BENCHMARKS SERVICE ============

export interface CreateBenchmarkDTO {
  benchmarkType: string;
  metricName: string;
  industrySegment?: string;
  companySize?: string;
  percentile25?: number;
  percentile50?: number;
  percentile75?: number;
  percentile90?: number;
  meanValue?: number;
  stdDeviation?: number;
  minValue?: number;
  maxValue?: number;
  sampleSize?: number;
  dataSource?: string;
}

export class BenchmarksService {
  static async createBenchmark(data: CreateBenchmarkDTO) {
    const [benchmark] = await db
      .insert(benchmarks)
      .values({
        benchmarkType: data.benchmarkType,
        metricName: data.metricName,
        industrySegment: data.industrySegment || null,
        companySize: data.companySize || null,
        percentile25: data.percentile25 ? String(data.percentile25) : null,
        percentile50: data.percentile50 ? String(data.percentile50) : null,
        percentile75: data.percentile75 ? String(data.percentile75) : null,
        percentile90: data.percentile90 ? String(data.percentile90) : null,
        meanValue: data.meanValue ? String(data.meanValue) : null,
        stdDeviation: data.stdDeviation ? String(data.stdDeviation) : null,
        minValue: data.minValue ? String(data.minValue) : null,
        maxValue: data.maxValue ? String(data.maxValue) : null,
        sampleSize: data.sampleSize || null,
        dataSource: data.dataSource || null,
        lastUpdatedAt: new Date(),
      })
      .returning();

    return benchmark;
  }

  static async getBenchmark(benchmarkId: string) {
    const [benchmark] = await db
      .select()
      .from(benchmarks)
      .where(eq(benchmarks.id, benchmarkId));

    if (!benchmark) {
      throw new Error("Benchmark not found");
    }

    return benchmark;
  }

  static async listBenchmarks(options?: { type?: string; segment?: string; companySize?: string }) {
    let query = db.select().from(benchmarks);

    if (options?.type) {
      query = query.where(eq(benchmarks.benchmarkType, options.type));
    }
    if (options?.segment) {
      query = query.where(eq(benchmarks.industrySegment, options.segment));
    }
    if (options?.companySize) {
      query = query.where(eq(benchmarks.companySize, options.companySize));
    }

    return await query;
  }

  static async createComparison(
    organizationId: string,
    benchmarkId: string,
    metricName: string,
    organizationValue: number
  ) {
    // Get benchmark details
    const benchmark = await this.getBenchmark(benchmarkId);

    // Calculate percentile rank
    const p25 = parseFloat(benchmark.percentile25 as any);
    const p50 = parseFloat(benchmark.percentile50 as any);
    const p75 = parseFloat(benchmark.percentile75 as any);
    const p90 = parseFloat(benchmark.percentile90 as any);

    let percentileRank = 0;
    if (organizationValue >= p90) percentileRank = 90;
    else if (organizationValue >= p75) percentileRank = 75;
    else if (organizationValue >= p50) percentileRank = 50;
    else if (organizationValue >= p25) percentileRank = 25;

    const [comparison] = await db
      .insert(benchmarkComparisons)
      .values({
        organizationId,
        benchmarkId,
        metricName,
        organizationValue: String(organizationValue),
        benchmarkValue: String(p50), // Use median as benchmark
        percentileRank,
        trendDirection: "stable",
        improvementPotential: String(Math.max(0, p75 - organizationValue)),
      })
      .returning();

    return comparison;
  }

  static async listComparisons(organizationId: string) {
    return await db
      .select()
      .from(benchmarkComparisons)
      .where(eq(benchmarkComparisons.organizationId, organizationId))
      .orderBy(desc(benchmarkComparisons.comparisonDate));
  }
}
