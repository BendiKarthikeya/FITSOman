import { db } from "../db";
import { surveySchedules, surveys, crmConfigs } from "../../shared/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { fetchCRMContacts } from "../integrations/crmIntegrationService";
import { runDailyInsightsForAllUsers } from "./dailyInsightsService";

/**
 * Survey Scheduler Service
 * Checks for pending schedules and executes them at the scheduled time
 */

export class SurveySchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastDailyInsightsDate = "";

  /**
   * Start the scheduler - runs every minute
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️ Scheduler is already running");
      return;
    }

    console.log("🚀 Survey Scheduler Service started");
    this.isRunning = true;

    // Run immediately
    this.checkAndExecuteSchedules();

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.checkAndExecuteSchedules();
      this.checkAndRunDailyInsights();
    }, 60 * 1000); // 60 seconds
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("🛑 Survey Scheduler Service stopped");
  }

  /**
   * Fire daily insights job once per calendar day (at any minute after midnight).
   */
  private checkAndRunDailyInsights() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastDailyInsightsDate === today) return;
    this.lastDailyInsightsDate = today;
    runDailyInsightsForAllUsers().catch((err) =>
      console.error("[SurveyScheduler] dailyInsights error:", err),
    );
  }

  /**
   * Check for pending schedules and execute them
   */
  async checkAndExecuteSchedules() {
    try {
      const now = new Date();
      console.log(`🔍 Checking for pending schedules at ${now.toISOString()}`);

      // Find absolute date schedules that should be executed
      const absoluteDateSchedules = await db
        .select()
        .from(surveySchedules)
        .where(
          and(
            eq(surveySchedules.status, "pending"),
            eq(surveySchedules.scheduleType, "absolute_date"),
            lte(surveySchedules.scheduleStartDate, now), // Start date has passed
            gte(surveySchedules.scheduleEndDate, now), // End date hasn't passed yet
            lte(surveySchedules.scheduledAt, now) // Scheduled time has arrived
          )
        );

      // Find day-based schedules that need to be checked
      const dayBasedSchedules = await db
        .select()
        .from(surveySchedules)
        .where(
          and(
            eq(surveySchedules.status, "pending"),
            eq(surveySchedules.scheduleType, "days_after_event"),
            lte(surveySchedules.scheduleStartDate, now), // Start date has passed
            gte(surveySchedules.scheduleEndDate, now),  // End date hasn't passed yet
            lte(surveySchedules.scheduledAt, now) // Check if valid to run today
          )
        );

      const totalSchedules = absoluteDateSchedules.length + dayBasedSchedules.length;

      if (totalSchedules === 0) {
        console.log("✅ No pending schedules to execute");
        return;
      }

      console.log(`📋 Found ${absoluteDateSchedules.length} absolute date schedules and ${dayBasedSchedules.length} day-based schedules to check`);

      // Execute absolute date schedules
      for (const schedule of absoluteDateSchedules) {
        await this.executeSchedule(schedule);
      }

      // Execute day-based schedules
      for (const schedule of dayBasedSchedules) {
        await this.executeDayBasedSchedule(schedule);
      }
    } catch (error) {
      console.error("❌ Error checking schedules:", error);
    }
  }

  /**
   * Execute a single schedule
   */
  private async executeSchedule(schedule: any) {
    try {
      console.log(`⚡ Executing schedule ${schedule.id} for survey ${schedule.surveyId}`);

      // Update status to processing
      await db
        .update(surveySchedules)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(surveySchedules.id, schedule.id));

      // Get survey details
      const [survey] = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, schedule.surveyId))
        .limit(1);

      if (!survey) {
        throw new Error(`Survey ${schedule.surveyId} not found`);
      }

      // Get CRM config
      if (!schedule.crmConfigId) {
        throw new Error("CRM configuration is required");
      }

      const [crmConfig] = await db
        .select()
        .from(crmConfigs)
        .where(eq(crmConfigs.id, schedule.crmConfigId))
        .limit(1);

      if (!crmConfig) {
        throw new Error(`CRM configuration ${schedule.crmConfigId} not found`);
      }

      if (!schedule.crmColumnName) {
        throw new Error("CRM column name is required");
      }

      // Fetch contacts from CRM
      console.log(`📞 Fetching contacts from ${crmConfig.crmType}...`);
      const contactsResponse = await fetchCRMContacts(
        schedule.crmConfigId,
        schedule.crmTableName,
        schedule.crmColumnName,
        [schedule.crmColumnName] // Force object return with the contact column
      );

      if (!contactsResponse.success || !contactsResponse.contacts || contactsResponse.contacts.length === 0) {
        throw new Error(contactsResponse.error || "No contacts found in CRM");
      }

      const contacts = contactsResponse.contacts;
      console.log(`✅ Found ${contacts.length} contacts`);

      // Send surveys via selected contact methods
      const contactMethods = schedule.contactMethods as string[];
      let successCount = 0;
      let failureCount = 0;

      for (const contact of contacts) {
        try {
          // Normalize contact data for sending
          const contactValue = contact[schedule.crmColumnName];
          const normalizedContact = {
            ...contact,
            phone: contactValue,
            phoneNumber: contactValue,
            email: contactValue
          };

          // Send via each selected contact method
          for (const method of contactMethods) {
            await this.sendSurvey(survey, normalizedContact, method, schedule.timezone);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to send survey to contact:`, error);
          failureCount++;
        }
      }

      // Update schedule with results
      await db
        .update(surveySchedules)
        .set({
          status: "completed",
          executedAt: new Date(),
          recipientCount: contacts.length,
          successCount,
          failureCount,
          updatedAt: new Date(),
        })
        .where(eq(surveySchedules.id, schedule.id));

      console.log(`✅ Schedule ${schedule.id} completed: ${successCount} succeeded, ${failureCount} failed`);
    } catch (error) {
      console.error(`❌ Error executing schedule ${schedule.id}:`, error);

      // Update schedule with error
      await db
        .update(surveySchedules)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(surveySchedules.id, schedule.id));
    }
  }

  /**
   * Execute a day-based schedule
   * This checks CRM contacts and sends surveys to those who match the day criteria
   */
  private async executeDayBasedSchedule(schedule: any) {
    try {
      console.log(`⚡ Checking day-based schedule ${schedule.id} for survey ${schedule.surveyId}`);

      // Validate required fields
      if (!schedule.referenceDateColumn) {
        throw new Error("Reference date column is required for day-based scheduling");
      }

      if (!schedule.daysAfterReference && !schedule.recurrencePattern) {
        throw new Error("Either daysAfterReference or recurrencePattern is required");
      }

      // Get survey details
      const [survey] = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, schedule.surveyId))
        .limit(1);

      if (!survey) {
        throw new Error(`Survey ${schedule.surveyId} not found`);
      }

      // Get CRM config
      if (!schedule.crmConfigId) {
        throw new Error("CRM configuration is required");
      }

      const [crmConfig] = await db
        .select()
        .from(crmConfigs)
        .where(eq(crmConfigs.id, schedule.crmConfigId))
        .limit(1);

      if (!crmConfig) {
        throw new Error(`CRM configuration ${schedule.crmConfigId} not found`);
      }

      // Fetch contacts from CRM
      console.log(`📞 Fetching contacts from ${crmConfig.crmType}...`);
      const contactsResponse = await fetchCRMContacts(
        schedule.crmConfigId,
        schedule.crmTableName,
        schedule.crmColumnName,
        [schedule.referenceDateColumn] // Fetch reference date column
      );

      if (!contactsResponse.success || !contactsResponse.contacts || contactsResponse.contacts.length === 0) {
        console.log(`⚠️ No contacts found for day-based schedule ${schedule.id}`);
        return;
      }

      const allContacts = contactsResponse.contacts;
      console.log(`✅ Found ${allContacts.length} total contacts`);

      // Filter contacts based on reference date and days elapsed
      const now = new Date();
      const eligibleContacts = [];

      // Determine which day intervals to check
      const dayIntervals = schedule.isRecurring && schedule.recurrencePattern && Array.isArray(schedule.recurrencePattern)
        ? (schedule.recurrencePattern as number[])
        : (schedule.daysAfterReference ? [schedule.daysAfterReference] : []);

      for (const contact of allContacts) {
        const referenceDateValue = contact[schedule.referenceDateColumn];

        if (!referenceDateValue) {
          continue; // Skip contacts without reference date
        }

        const referenceDate = new Date(referenceDateValue);

        if (isNaN(referenceDate.getTime())) {
          console.warn(`⚠️ Invalid reference date for contact ${contact[schedule.crmColumnName] || 'unknown'}: ${referenceDateValue}`);
          continue;
        }

        // Normalize to midnight UTC to ensure consistent day calculation regardless of execution time
        const nowMidnight = new Date(now);
        nowMidnight.setUTCHours(0, 0, 0, 0);

        const refMidnight = new Date(referenceDate);
        refMidnight.setUTCHours(0, 0, 0, 0);

        // Calculate days elapsed based on calendar days
        const daysElapsed = Math.floor((nowMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24));

        // Check if contact matches any of the day intervals
        for (const targetDays of dayIntervals) {
          // Allow 1-day tolerance for execution timing, or exact match depending on requirement.
          // Since this runs daily/regularly, we should check if daysElapsed === targetDays. 
          // However, to be safe with timezones/execution timing, let's say "is today the day?"
          // A safer check might be: is daysElapsed equal to targetDays?
          if (daysElapsed === targetDays) {
            eligibleContacts.push({
              ...(contact as any),
              _daysElapsed: daysElapsed,
              _targetDays: targetDays
            });
            break; // Only need to match one interval
          }
        }
      }

      if (eligibleContacts.length === 0) {
        console.log(`✅ No contacts eligible for day-based schedule ${schedule.id} at this time`);
        return;
      }

      console.log(`📤 Found ${eligibleContacts.length} eligible contacts for day-based schedule`);

      // Update status to processing (temporarily, or just log it as running)
      // Since day-based schedules are perpetual until end date, we don't mark as "completed" in a way that stops future execution.
      // But we might want to log this specific run. For now, let's just log and update 'executedAt'.

      await db
        .update(surveySchedules)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(surveySchedules.id, schedule.id));

      // Send surveys via selected contact methods
      const contactMethods = schedule.contactMethods as string[];
      let successCount = 0;
      let failureCount = 0;

      for (const contact of eligibleContacts) {
        try {
          console.log(`📧 Sending to contact (${contact._daysElapsed} days after ${schedule.referenceDateColumn})`);

          // Normalize contact data for sending
          const contactValue = contact[schedule.crmColumnName];
          const normalizedContact = {
            ...contact,
            phone: contactValue,
            phoneNumber: contactValue,
            email: contactValue
          };

          // Send via each selected contact method
          for (const method of contactMethods) {
            await this.sendSurvey(survey, normalizedContact, method, schedule.timezone);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to send survey to contact:`, error);
          failureCount++;
        }
      }

      // Update schedule with results
      // For recurring/day-based, we might want to accumulate counts or just show last run.
      // Since the schedule stays "pending" (or active) for the next day check, we should revert status to 'pending' 
      // if it's still within the valid date range, or keep it 'pending'.
      // If we mark it 'completed', it won't run again. 
      // So status should remain 'pending' for day-based schedules unless end date passed.

      await db
        .update(surveySchedules)
        .set({
          updatedAt: new Date(),
          status: "pending", // Keep it pending
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule next check for 24 hours from now
          recipientCount: (schedule.recipientCount || 0) + eligibleContacts.length,
          successCount: (schedule.successCount || 0) + successCount,
          failureCount: (schedule.failureCount || 0) + failureCount,
        })
        .where(eq(surveySchedules.id, schedule.id));

      console.log(`✅ Day-based schedule ${schedule.id} execution finished: ${successCount} sent`);
    } catch (error) {
      console.error(`❌ Error executing day-based schedule ${schedule.id}:`, error);

      // Don't fail the whole schedule, just log error, maybe update error message but keep pending?
      // Or if it's a configuration error, mark failed.
      await db
        .update(surveySchedules)
        .set({
          // status: "failed", // Maybe don't kill it completely?
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(surveySchedules.id, schedule.id));
    }
  }

  /**
   * Send survey to a contact via specified method
   */
  private async sendSurvey(
    survey: any,
    contact: any,
    method: string,
    timezone: string
  ) {
    // TODO: Implement actual sending logic based on contact method
    console.log(`📤 Sending survey "${survey.title}" via ${method} to contact:`, contact);

    // The actual implementation would depend on:
    // - For WhatsApp: Use WATI API or WhatsApp Business API
    // - For Voice Agent: Use voice calling service
    // - For Email: Use email service (SMTP, SendGrid, etc.)

    switch (method) {
      case "whatsapp":
        await this.sendViaWhatsApp(survey, contact);
        break;
      case "voiceagent":
        await this.sendViaVoiceAgent(survey, contact);
        break;
      case "email":
        await this.sendViaEmail(survey, contact);
        break;
      default:
        console.warn(`⚠️ Unknown contact method: ${method}`);
    }
  }

  /**
   * Send survey via WhatsApp
   */
  /**
   * Send survey via WhatsApp
   */
  private async sendViaWhatsApp(survey: any, contact: any) {
    // Mock implementation for development/testing
    console.log(`📱 WhatsApp: Sending survey "${survey.title}" to ${contact.phoneNumber || contact.phone || 'unknown'}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real implementation:
    // 1. Get WATI/WhatsApp credentials from crmConfigs
    // 2. Call WATI API to send template message
    // 3. Log success/failure

    // For now, assume success if phone number exists
    if (!contact.phoneNumber && !contact.phone) {
      throw new Error("Missing phone number for WhatsApp");
    }

    console.log(`✅ WhatsApp sent successfully to ${contact.phoneNumber || contact.phone}`);
  }

  /**
   * Send survey via Voice Agent
   */
  private async sendViaVoiceAgent(survey: any, contact: any) {
    // Mock implementation for development/testing
    console.log(`☎️ Voice: Initiating call for survey "${survey.title}" to ${contact.phoneNumber || contact.phone || 'unknown'}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // In a real implementation:
    // 1. Get Vapi credentials
    // 2. Initiate call via Vapi API

    if (!contact.phoneNumber && !contact.phone) {
      throw new Error("Missing phone number for Voice Agent");
    }

    console.log(`✅ Voice call initiated successfully to ${contact.phoneNumber || contact.phone}`);
  }

  /**
   * Send survey via Email
   */
  private async sendViaEmail(survey: any, contact: any) {
    // Mock implementation for development/testing
    console.log(`📧 Email: Sending survey "${survey.title}" to ${contact.email || 'unknown'}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // In a real implementation:
    // 1. Get SMTP/Email provider credentials
    // 2. Send email via transporter/API

    if (!contact.email) {
      throw new Error("Missing email address");
    }

    console.log(`✅ Email sent successfully to ${contact.email}`);
  }

  /**
   * Check and cancel expired schedules (past end date)
   */
  async cancelExpiredSchedules() {
    try {
      const now = new Date();

      const result = await db
        .update(surveySchedules)
        .set({
          status: "cancelled",
          errorMessage: "Schedule expired (past end date)",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(surveySchedules.status, "pending"),
            lte(surveySchedules.scheduleEndDate, now) // End date has passed
          )
        );

      console.log(`🗑️ Cancelled expired schedules`);
    } catch (error) {
      console.error("❌ Error cancelling expired schedules:", error);
    }
  }
}

// Export singleton instance
export const surveyScheduler = new SurveySchedulerService();
