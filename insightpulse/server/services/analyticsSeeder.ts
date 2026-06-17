import { db } from "../db";
import {
  reports,
  reportSchedules,
  benchmarks,
  organizations,
  users,
  analyticsSurveys,
  surveyMetrics,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

export async function seedAnalyticsData() {
  try {
    

    // Get or create default organization
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, "Default Organization"))
      .limit(1);

    if (!defaultOrg) {
      
      return;
    }

    const orgId = defaultOrg.id;

    // Get first admin user
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.organizationId, orgId))
      .limit(1);

    if (!adminUser) {
      
      return;
    }

    // Seed Reports
    
    const reportsCount = await db
      .select()
      .from(reports)
      .where(eq(reports.organizationId, orgId));

    if (reportsCount.length === 0) {
      const [report1] = await db
        .insert(reports)
        .values({
          organizationId: orgId,
          createdBy: adminUser.id,
          name: "Weekly Performance Report",
          description: "Weekly overview of key metrics and KPIs",
          chartConfigs: JSON.stringify([
            { chartId: "trend-chart", type: "line", config: { timeRange: "7d" } },
            { chartId: "nps-chart", type: "donut", config: {} },
            { chartId: "csat-chart", type: "donut", config: {} },
          ]),
          filterConfigs: JSON.stringify([
            { filterId: "date-range", type: "date", value: "last-7-days" },
          ]),
          layout: "grid",
          isTemplate: true,
        })
        .returning();

      const [report2] = await db
        .insert(reports)
        .values({
          organizationId: orgId,
          createdBy: adminUser.id,
          name: "Executive Summary",
          description: "High-level metrics for executives",
          chartConfigs: JSON.stringify([
            { chartId: "response-time-chart", type: "line", config: {} },
            { chartId: "funnel-chart", type: "funnel", config: {} },
            { chartId: "sentiment-chart", type: "area", config: {} },
            { chartId: "benchmark-chart", type: "comparison", config: {} },
          ]),
          filterConfigs: JSON.stringify([
            { filterId: "date-range", type: "date", value: "last-30-days" },
          ]),
          layout: "grid",
          isTemplate: true,
        })
        .returning();

      // Add schedules to report
      await db
        .insert(reportSchedules)
        .values({
          reportId: report1.id,
          frequency: "weekly",
          dayOfWeek: 1, // Monday
          timeOfDay: "09:00:00",
          recipients: JSON.stringify(["manager@company.com", "ceo@company.com"]),
          isEnabled: true,
          nextSendAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

      await db
        .insert(reportSchedules)
        .values({
          reportId: report2.id,
          frequency: "monthly",
          dayOfMonth: 1,
          timeOfDay: "08:00:00",
          recipients: JSON.stringify(["executive@company.com"]),
          isEnabled: true,
          nextSendAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

      
    }

    // Seed Benchmarks
    
    const benchmarksCount = await db.select().from(benchmarks).limit(1);

    if (benchmarksCount.length === 0) {
      const benchmarkMetrics = [
        {
          benchmarkType: "industry",
          metricName: "Average NPS Score",
          industrySegment: "SaaS",
          companySize: "medium",
          percentile25: 35,
          percentile50: 45,
          percentile75: 55,
          percentile90: 65,
          meanValue: 47,
          stdDeviation: 12,
          minValue: 20,
          maxValue: 75,
          sampleSize: 500,
          dataSource: "Industry Report 2024",
        },
        {
          benchmarkType: "industry",
          metricName: "Average CSAT Score",
          industrySegment: "SaaS",
          companySize: "medium",
          percentile25: 75,
          percentile50: 82,
          percentile75: 88,
          percentile90: 92,
          meanValue: 82,
          stdDeviation: 8,
          minValue: 60,
          maxValue: 95,
          sampleSize: 500,
          dataSource: "Industry Report 2024",
        },
        {
          benchmarkType: "industry",
          metricName: "Customer Response Rate",
          industrySegment: "SaaS",
          companySize: "medium",
          percentile25: 25,
          percentile50: 38,
          percentile75: 48,
          percentile90: 60,
          meanValue: 39,
          stdDeviation: 15,
          minValue: 10,
          maxValue: 80,
          sampleSize: 500,
          dataSource: "Industry Report 2024",
        },
        {
          benchmarkType: "industry",
          metricName: "Average EVI Score",
          industrySegment: "SaaS",
          companySize: "medium",
          percentile25: 65,
          percentile50: 73,
          percentile75: 80,
          percentile90: 87,
          meanValue: 74,
          stdDeviation: 10,
          minValue: 45,
          maxValue: 95,
          sampleSize: 500,
          dataSource: "Industry Report 2024",
        },
      ];

      for (const metric of benchmarkMetrics) {
        await db.insert(benchmarks).values({
          benchmarkType: metric.benchmarkType,
          metricName: metric.metricName,
          industrySegment: metric.industrySegment || null,
          companySize: metric.companySize || null,
          percentile25: String(metric.percentile25),
          percentile50: String(metric.percentile50),
          percentile75: String(metric.percentile75),
          percentile90: String(metric.percentile90),
          meanValue: String(metric.meanValue),
          stdDeviation: String(metric.stdDeviation),
          minValue: String(metric.minValue),
          maxValue: String(metric.maxValue),
          sampleSize: metric.sampleSize,
          dataSource: metric.dataSource,
          lastUpdatedAt: new Date(),
        });
      }

      
    }

    
  } catch (error) {
    console.error('Analytics seeding error:', error);
    throw error;
  }
}

export async function seedSampleAnalytics() {
  try {
    

    const [survey] = await db
      .select()
      .from(analyticsSurveys)
      .where(eq(analyticsSurveys.isActive, true))
      .limit(1);

    if (!survey) {
      
      return;
    }

    const metricsCount = await db
      .select()
      .from(surveyMetrics)
      .where(eq(surveyMetrics.surveyId, survey.surveyId))
      .limit(1);

    if (metricsCount.length === 0) {
      // Seed sample metrics
      await db.insert(surveyMetrics).values({
        surveyId: survey.surveyId,
        questionId: null, // Overall metrics
        csatScore: "82",
        satisfiedCount: 164,
        totalResponses: 200,
        csatPerformance: "GOOD",
        npsScore: "45",
        promotersCount: 120,
        passivesCount: 50,
        detractorsCount: 30,
        score5Count: 82,
        score4Count: 82,
        score3Count: 20,
        score2Count: 10,
        score1Count: 5,
        score0Count: 1,
        npsPerformance: "GOOD",
        calculationDate: new Date(),
        dateRangeStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateRangeEnd: new Date(),
      });

      
    }
  } catch (error) {
    
  }
}
