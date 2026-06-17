import { Router } from "express";
import { db } from "../db";
import { surveySchedules, surveys, crmConfigs } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all schedules for a user
router.get("/schedules", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    const schedules = await db
      .select()
      .from(surveySchedules)
      .where(eq(surveySchedules.userId, userId))
      .orderBy(desc(surveySchedules.createdAt));

    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

// Get schedules for a specific survey
router.get("/surveys/:surveyId/schedules", async (req: AuthRequest, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    const schedules = await db
      .select()
      .from(surveySchedules)
      .where(
        and(
          eq(surveySchedules.surveyId, surveyId),
          eq(surveySchedules.userId, userId)
        )
      )
      .orderBy(desc(surveySchedules.scheduledAt));

    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error("Error fetching survey schedules:", error);
    res.status(500).json({ error: "Failed to fetch survey schedules" });
  }
});

// Create a new schedule
router.post("/schedules", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    const {
      surveyId,
      crmConfigId,
      crmTableName,
      crmColumnName,
      contactMethods,
      scheduleStartDate,
      scheduleEndDate,
      scheduledAt,
      timezone,
      // New fields for day-based scheduling
      scheduleType,
      referenceDateColumn,
      daysAfterReference,
      isRecurring,
      recurrencePattern,
    } = req.body;

    // Validation
    if (!surveyId || !scheduleStartDate || !scheduleEndDate || !timezone) {
      return res.status(400).json({
        error: "surveyId, scheduleStartDate, scheduleEndDate, and timezone are required",
      });
    }

    if (!contactMethods || !Array.isArray(contactMethods) || contactMethods.length === 0) {
      return res.status(400).json({
        error: "At least one contact method is required",
      });
    }

    // Verify survey exists
    const survey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId))
      .limit(1);

    if (!survey || survey.length === 0) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Verify CRM config if provided
    if (crmConfigId) {
      const crmConfig = await db
        .select()
        .from(crmConfigs)
        .where(eq(crmConfigs.id, crmConfigId))
        .limit(1);

      if (!crmConfig || crmConfig.length === 0) {
        return res.status(404).json({ error: "CRM configuration not found" });
      }
    }

    // Robust parsing of recurrencePattern
    let parsedRecurrencePattern = recurrencePattern;
    if (typeof recurrencePattern === 'string') {
      try {
        parsedRecurrencePattern = JSON.parse(recurrencePattern);
      } catch (e) {
        console.error("Failed to parse recurrencePattern:", e);
        parsedRecurrencePattern = [];
      }
    }

    // Create schedule
    const [newSchedule] = await db
      .insert(surveySchedules)
      .values({
        surveyId,
        userId,
        crmConfigId: crmConfigId || null,
        crmTableName: crmTableName || null,
        crmColumnName: crmColumnName || null,
        contactMethods: contactMethods,
        scheduleStartDate: new Date(scheduleStartDate),
        scheduleEndDate: new Date(scheduleEndDate),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(scheduleStartDate),
        timezone: timezone || "UTC",

        // New fields
        // Auto-detect schedule type based on recurrence pattern
        scheduleType: (parsedRecurrencePattern && Array.isArray(parsedRecurrencePattern) && parsedRecurrencePattern.length > 0)
          ? "days_after_event"
          : (scheduleType || "absolute_date"),
        referenceDateColumn: referenceDateColumn || null,
        daysAfterReference: daysAfterReference || null,
        isRecurring: (parsedRecurrencePattern && Array.isArray(parsedRecurrencePattern) && parsedRecurrencePattern.length > 0)
          ? true
          : (isRecurring || false),
        recurrencePattern: parsedRecurrencePattern || [],

        status: "pending",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newSchedule,
      message: "Schedule created successfully",
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// Update a schedule
router.put("/schedules/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    const {
      crmConfigId,
      crmTableName,
      crmColumnName,
      contactMethods,
      scheduledAt,
      timezone,
      status,
    } = req.body;

    // Verify schedule exists and belongs to user
    const existingSchedule = await db
      .select()
      .from(surveySchedules)
      .where(
        and(eq(surveySchedules.id, id), eq(surveySchedules.userId, userId))
      )
      .limit(1);

    if (!existingSchedule || existingSchedule.length === 0) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    // Don't allow updating completed or cancelled schedules
    if (
      existingSchedule[0].status === "completed" ||
      existingSchedule[0].status === "cancelled"
    ) {
      return res.status(400).json({
        error: "Cannot update completed or cancelled schedules",
      });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (crmConfigId !== undefined) updateData.crmConfigId = crmConfigId;
    if (crmTableName !== undefined) updateData.crmTableName = crmTableName;
    if (crmColumnName !== undefined) updateData.crmColumnName = crmColumnName;
    if (contactMethods !== undefined) updateData.contactMethods = contactMethods;
    if (scheduledAt !== undefined)
      updateData.scheduledAt = new Date(scheduledAt);
    if (timezone !== undefined) updateData.timezone = timezone;
    if (status !== undefined) updateData.status = status;

    const [updatedSchedule] = await db
      .update(surveySchedules)
      .set(updateData)
      .where(eq(surveySchedules.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedSchedule,
      message: "Schedule updated successfully",
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// Delete a schedule
router.delete("/schedules/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    // Verify schedule exists and belongs to user
    const existingSchedule = await db
      .select()
      .from(surveySchedules)
      .where(
        and(eq(surveySchedules.id, id), eq(surveySchedules.userId, userId))
      )
      .limit(1);

    if (!existingSchedule || existingSchedule.length === 0) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    // If already cancelled or completed, hard delete
    if (existingSchedule[0].status === "cancelled" || existingSchedule[0].status === "completed") {
      await db
        .delete(surveySchedules)
        .where(eq(surveySchedules.id, id));

      return res.json({
        success: true,
        message: "Schedule deleted permanently",
      });
    }

    // Otherwise marks as cancelled (soft delete)
    await db
      .update(surveySchedules)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(surveySchedules.id, id));

    res.json({
      success: true,
      message: "Schedule cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling schedule:", error);
    res.status(500).json({ error: "Failed to cancel schedule" });
  }
});

export default router;
