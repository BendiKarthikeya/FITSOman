import { Router, Request, Response } from "express";
import {
  ReportsService,
  ReportSchedulesService,
  ReportArchivesService,
  ExportJobsService,
  BenchmarksService,
  CreateReportDTO,
  CreateScheduleDTO,
  CreateExportJobDTO,
  CreateBenchmarkDTO,
} from "../services/analyticsDataService";
import { pool } from "../db";

const router = Router();

// ============ REPORTS ROUTES (AN-033) ============

/**
 * POST /api/analytics/reports
 * Create a new report
 */
router.post("/reports", async (req: Request, res: Response) => {
  try {
    const { organizationId, createdBy, name, description, chartConfigs, filterConfigs, layout, isTemplate, surveyId } = req.body;

    if (!organizationId || !createdBy || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const report = await ReportsService.createReport({
      organizationId,
      createdBy,
      name,
      description,
      chartConfigs: chartConfigs || [],
      filterConfigs: filterConfigs || [],
      layout,
      isTemplate,
      surveyId, // Link to analytics survey
    });

    res.json({ success: true, data: report });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to create report" });
  }
});

/**
 * GET /api/analytics/reports/available
 * Get all analytics surveys that have linked reports - MUST BE BEFORE :reportId route
 */
router.get("/reports/available", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT
        asv.survey_id as id,
        asv.survey_name as name,
        asv.description,
        asv.total_respondents as response_count
      FROM analytics_surveys asv
      INNER JOIN reports r ON r.survey_id = asv.survey_id
      ORDER BY asv.survey_name
    `;
    
    console.log('📊 Fetching available analytics surveys with linked reports');
    const result = await pool.query(query);
    console.log('✅ Found surveys:', result.rows.length, result.rows);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching available surveys:', error);
    res.status(500).json({ error: "Failed to fetch available surveys" });
  }
});

/**
 * GET /api/analytics/reports/linked-to-survey/:surveyId
 * Get reports linked to a specific analytics survey with their data
 */
router.get("/reports/linked-to-survey/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { fromDate, toDate } = req.query;
    
    console.log('📊 Fetching reports linked to survey:', surveyId);
    
    // Query to get reports linked to the survey with their archives and survey data
    let query = `
      SELECT
        r.id,
        r.name,
        r.description,
        r.survey_id,
        r.created_at,
        r.updated_at,
        ra.id as archive_id,
        ra.file_url,
        ra.file_format,
        ra.file_size_bytes,
        ra.generated_at,
        ra.expires_at,
        ra.download_count,
        asv.survey_name,
        asv.total_respondents,
        asv.description as survey_description
      FROM reports r
      LEFT JOIN report_archives ra ON r.id = ra.report_id
      LEFT JOIN analytics_surveys asv ON r.survey_id = asv.survey_id
      WHERE r.survey_id = $1
    `;
    
    const params: any[] = [surveyId];
    let paramIndex = 2;
    
    if (fromDate) {
      query += ` AND ra.generated_at >= $${paramIndex}`;
      params.push(new Date(fromDate as string));
      paramIndex++;
    }
    
    if (toDate) {
      query += ` AND ra.generated_at <= $${paramIndex}`;
      params.push(new Date(toDate as string));
      paramIndex++;
    }
    
    query += ` ORDER BY ra.generated_at DESC`;
    
    const result = await pool.query(query, params);
    console.log('✅ Found reports linked to survey:', result.rows.length);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Group archives by report
    const reportMap = new Map();
    result.rows.forEach((row: any) => {
      if (!reportMap.has(row.id)) {
        reportMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          surveyId: row.survey_id,
          surveyName: row.survey_name,
          surveyDescription: row.survey_description,
          totalRespondents: row.total_respondents,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          archives: []
        });
      }
      if (row.archive_id) {
        reportMap.get(row.id).archives.push({
          id: row.archive_id,
          fileUrl: row.file_url,
          fileFormat: row.file_format,
          fileSizeBytes: row.file_size_bytes,
          generatedAt: row.generated_at,
          expiresAt: row.expires_at,
          downloadCount: row.download_count
        });
      }
    });
    
    const reports = Array.from(reportMap.values());
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching reports linked to survey:', error);
    res.status(500).json({ error: "Failed to fetch reports linked to survey" });
  }
});

/**
 * GET /api/analytics/reports/by-survey/:surveyId/archives
 * Get report archives by survey ID with optional date filtering
 */
router.get("/reports/by-survey/:surveyId/archives", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { fromDate, toDate } = req.query;
    
    console.log('📊 Fetching archives for survey:', surveyId, 'fromDate:', fromDate, 'toDate:', toDate);
    
    // Build the query to fetch archives for a survey linked by survey_id
    let query = `
      SELECT
        ra.id,
        ra.report_id,
        ra.file_url,
        ra.file_format,
        ra.file_size_bytes,
        ra.generated_at,
        ra.expires_at,
        ra.download_count,
        r.name as report_name
      FROM report_archives ra
      JOIN reports r ON ra.report_id = r.id
      WHERE r.survey_id = $1::integer
    `;
    
    const params: any[] = [surveyId];
    let paramIndex = 2;
    
    if (fromDate) {
      query += ` AND ra.generated_at >= $${paramIndex}`;
      params.push(new Date(fromDate as string));
      paramIndex++;
    }
    
    if (toDate) {
      query += ` AND ra.generated_at <= $${paramIndex}`;
      params.push(new Date(toDate as string));
      paramIndex++;
    }
    
    query += ` ORDER BY ra.generated_at DESC`;
    
    const result = await pool.query(query, params);
    console.log('📊 Found archives:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching archives by survey:', error);
    res.status(500).json({ error: "Failed to fetch archives by survey" });
  }
});

/**
 * GET /api/analytics/reports/:reportId
 * Get report by ID
 */
router.get("/reports/:reportId", async (req: Request, res: Response) => {
  try {
    const report = await ReportsService.getReport(req.params.reportId);
    res.json(report);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(404).json({ error: "Report not found" });
  }
});

/**
 * GET /api/analytics/organizations/:orgId/reports
 * List reports for organization
 */
router.get("/organizations/:orgId/reports", async (req: Request, res: Response) => {
  try {
    const { archived } = req.query;
    const reports = await ReportsService.listReports(req.params.orgId, {
      archived: archived === "false" ? false : undefined,
    });
    res.json(reports);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to list reports" });
  }
});

/**
 * GET /api/analytics/reports/by-survey/:surveyName
 * Get report archives by survey name and optional date range
 */
router.get("/reports/by-survey/:surveyName", async (req: Request, res: Response) => {
  try {
    const { surveyName } = req.params;
    const { fromDate, toDate } = req.query;
    
    // Build the query dynamically based on parameters
    let query = `
      SELECT
        r.id,
        r.name,
        r.description,
        ra.id as archive_id,
        ra.file_url,
        ra.generated_at,
        ra.file_format,
        ra.file_size_bytes,
        ra.download_count,
        ra.expires_at
      FROM reports r
      LEFT JOIN report_archives ra ON r.id = ra.report_id
      WHERE r.name ILIKE $1
    `;
    
    const params: any[] = [`%${surveyName}%`];
    let paramIndex = 2;
    
    if (fromDate) {
      query += ` AND ra.generated_at >= $${paramIndex}`;
      params.push(new Date(fromDate as string));
      paramIndex++;
    }
    
    if (toDate) {
      query += ` AND ra.generated_at <= $${paramIndex}`;
      params.push(new Date(toDate as string));
      paramIndex++;
    }
    
    query += ` ORDER BY ra.generated_at DESC`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Group archives by report
    const reportMap = new Map();
    result.rows.forEach((row: any) => {
      if (!reportMap.has(row.id)) {
        reportMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          archives: []
        });
      }
      if (row.archive_id) {
        reportMap.get(row.id).archives.push({
          id: row.archive_id,
          fileUrl: row.file_url,
          generatedAt: row.generated_at,
          fileFormat: row.file_format,
          fileSizeBytes: row.file_size_bytes,
          downloadCount: row.download_count,
          expiresAt: row.expires_at
        });
      }
    });
    
    const reports = Array.from(reportMap.values());
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching reports by survey:', error);
    res.status(500).json({ error: "Failed to fetch reports by survey" });
  }
});

/**
 * PUT /api/analytics/reports/:reportId
 * Update report
 */
router.put("/reports/:reportId", async (req: Request, res: Response) => {
  try {
    const updated = await ReportsService.updateReport(req.params.reportId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to update report" });
  }
});

/**
 * DELETE /api/analytics/reports/:reportId
 * Delete report
 */
router.delete("/reports/:reportId", async (req: Request, res: Response) => {
  try {
    await ReportsService.deleteReport(req.params.reportId);
    res.json({ success: true });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to delete report" });
  }
});

/**
 * POST /api/analytics/reports/:reportId/archive
 * Archive report
 */
router.post("/reports/:reportId/archive", async (req: Request, res: Response) => {
  try {
    const archived = await ReportsService.archiveReport(req.params.reportId);
    res.json({ success: true, data: archived });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to archive report" });
  }
});

// ============ REPORT SCHEDULES ROUTES (AN-034, AN-035) ============

/**
 * POST /api/analytics/reports/:reportId/schedules
 * Create report schedule
 */
router.post("/reports/:reportId/schedules", async (req: Request, res: Response) => {
  try {
    const { frequency, dayOfWeek, dayOfMonth, timeOfDay, recipients } = req.body;

    if (!frequency || !recipients) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const schedule = await ReportSchedulesService.createSchedule({
      reportId: req.params.reportId,
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      recipients,
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to create schedule" });
  }
});

/**
 * GET /api/analytics/reports/:reportId/schedules
 * List schedules for report
 */
router.get("/reports/:reportId/schedules", async (req: Request, res: Response) => {
  try {
    const schedules = await ReportSchedulesService.listSchedules(req.params.reportId);
    res.json(schedules);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to list schedules" });
  }
});

/**
 * PUT /api/analytics/schedules/:scheduleId
 * Update schedule
 */
router.put("/schedules/:scheduleId", async (req: Request, res: Response) => {
  try {
    const updated = await ReportSchedulesService.updateSchedule(req.params.scheduleId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to update schedule" });
  }
});

/**
 * DELETE /api/analytics/schedules/:scheduleId
 * Delete schedule
 */
router.delete("/schedules/:scheduleId", async (req: Request, res: Response) => {
  try {
    await ReportSchedulesService.deleteSchedule(req.params.scheduleId);
    res.json({ success: true });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to delete schedule" });
  }
});

/**
 * PUT /api/analytics/schedules/:scheduleId/toggle
 * Toggle schedule enabled/disabled
 */
router.put("/schedules/:scheduleId/toggle", async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const updated = await ReportSchedulesService.toggleSchedule(req.params.scheduleId, enabled);
    res.json({ success: true, data: updated });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to toggle schedule" });
  }
});

// ============ REPORT ARCHIVES ROUTES (AN-036) ============

/**
 * POST /api/analytics/reports/:reportId/archives
 * Create archive entry
 */
router.post("/reports/:reportId/archives", async (req: Request, res: Response) => {
  try {
    const { scheduleId, generatedBy, fileUrl, fileFormat, fileSizeBytes } = req.body;

    if (!generatedBy || !fileUrl || !fileFormat) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const archive = await ReportArchivesService.createArchive({
      reportId: req.params.reportId,
      scheduleId,
      generatedBy,
      fileUrl,
      fileFormat,
      fileSizeBytes,
    });

    res.json({ success: true, data: archive });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to create archive" });
  }
});

/**
 * GET /api/analytics/reports/:reportId/archives
 * List archives for report with optional date filtering
 */
router.get("/reports/:reportId/archives", async (req: Request, res: Response) => {
  try {
    const { limit, offset, fromDate, toDate } = req.query;
    
    // Build query with optional date filtering
    let query = `
      SELECT
        ra.id,
        ra.report_id,
        ra.file_url,
        ra.file_format,
        ra.file_size_bytes,
        ra.generated_at,
        ra.expires_at,
        ra.download_count,
        r.name as report_name
      FROM report_archives ra
      JOIN reports r ON ra.report_id = r.id
      WHERE ra.report_id = $1
    `;
    
    const params: any[] = [req.params.reportId];
    let paramIndex = 2;
    
    if (fromDate) {
      query += ` AND ra.generated_at >= $${paramIndex}`;
      params.push(new Date(fromDate as string));
      paramIndex++;
    }
    
    if (toDate) {
      query += ` AND ra.generated_at <= $${paramIndex}`;
      params.push(new Date(toDate as string));
      paramIndex++;
    }
    
    query += ` ORDER BY ra.generated_at DESC`;
    
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string));
      paramIndex++;
    }
    
    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset as string));
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching archives:', error);
    res.status(500).json({ error: "Failed to list archives" });
  }
});

/**
 * POST /api/analytics/archives/:archiveId/download
 * Track archive download
 */
router.post("/archives/:archiveId/download", async (req: Request, res: Response) => {
  try {
    const archive = await ReportArchivesService.incrementDownloadCount(req.params.archiveId);
    res.json({ success: true, data: archive });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to track download" });
  }
});

/**
 * DELETE /api/analytics/archives/:archiveId
 * Delete archive
 */
router.delete("/archives/:archiveId", async (req: Request, res: Response) => {
  try {
    await ReportArchivesService.deleteArchive(req.params.archiveId);
    res.json({ success: true });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to delete archive" });
  }
});

// ============ EXPORT JOBS ROUTES (AN-040, AN-041) ============

/**
 * POST /api/analytics/exports
 * Start export job
 */
router.post("/exports", async (req: Request, res: Response) => {
  try {
    const { organizationId, createdBy, exportType, format, includeHeaders, filters } = req.body;

    if (!organizationId || !createdBy || !exportType || !format) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const job = await ExportJobsService.createJob({
      organizationId,
      createdBy,
      exportType,
      format,
      includeHeaders,
      filters,
    });

    res.json({ success: true, data: job });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to create export job" });
  }
});

/**
 * GET /api/analytics/exports/:jobId
 * Get export job status
 */
router.get("/exports/:jobId", async (req: Request, res: Response) => {
  try {
    const job = await ExportJobsService.getJob(req.params.jobId);
    res.json(job);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(404).json({ error: "Export job not found" });
  }
});

/**
 * GET /api/analytics/organizations/:orgId/exports
 * List export jobs
 */
router.get("/organizations/:orgId/exports", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const jobs = await ExportJobsService.listJobs(req.params.orgId, {
      status: status as string | undefined,
    });
    res.json(jobs);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to list exports" });
  }
});

/**
 * PUT /api/analytics/exports/:jobId/status
 * Update export job status (admin/background job)
 */
router.put("/exports/:jobId/status", async (req: Request, res: Response) => {
  try {
    const { status, fileUrl, fileSizeBytes, errorMessage, progressPercentage } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = await ExportJobsService.updateJobStatus(req.params.jobId, status, {
      fileUrl,
      fileSizeBytes,
      errorMessage,
      progressPercentage,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to update export status" });
  }
});

/**
 * POST /api/analytics/exports/:jobId/download
 * Track export download
 */
router.post("/exports/:jobId/download", async (req: Request, res: Response) => {
  try {
    const job = await ExportJobsService.incrementDownloadCount(req.params.jobId);
    res.json({ success: true, data: job });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to track download" });
  }
});

// ============ BENCHMARKS ROUTES (AN-042, AN-043) ============

/**
 * POST /api/analytics/benchmarks
 * Create benchmark
 */
router.post("/benchmarks", async (req: Request, res: Response) => {
  try {
    const benchmark = await BenchmarksService.createBenchmark(req.body);
    res.json({ success: true, data: benchmark });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to create benchmark" });
  }
});

/**
 * GET /api/analytics/benchmarks
 * List benchmarks with filters
 */
router.get("/benchmarks", async (req: Request, res: Response) => {
  try {
    const { type, segment, companySize } = req.query;
    const benchmarks = await BenchmarksService.listBenchmarks({
      type: type as string | undefined,
      segment: segment as string | undefined,
      companySize: companySize as string | undefined,
    });
    res.json(benchmarks);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to list benchmarks" });
  }
});

/**
 * GET /api/analytics/benchmarks/:benchmarkId
 * Get benchmark by ID
 */
router.get("/benchmarks/:benchmarkId", async (req: Request, res: Response) => {
  try {
    const benchmark = await BenchmarksService.getBenchmark(req.params.benchmarkId);
    res.json(benchmark);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(404).json({ error: "Benchmark not found" });
  }
});

/**
 * POST /api/analytics/organizations/:orgId/benchmark-comparisons
 * Create benchmark comparison
 */
router.post("/organizations/:orgId/benchmark-comparisons", async (req: Request, res: Response) => {
  try {
    const { benchmarkId, metricName, organizationValue } = req.body;

    if (!benchmarkId || !metricName || organizationValue === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const comparison = await BenchmarksService.createComparison(
      req.params.orgId,
      benchmarkId,
      metricName,
      organizationValue
    );

    res.json({ success: true, data: comparison });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to create comparison" });
  }
});

/**
 * GET /api/analytics/organizations/:orgId/benchmark-comparisons
 * List benchmark comparisons
 */
router.get("/organizations/:orgId/benchmark-comparisons", async (req: Request, res: Response) => {
  try {
    const comparisons = await BenchmarksService.listComparisons(req.params.orgId);
    res.json(comparisons);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to list comparisons" });
  }
});

export default router;
