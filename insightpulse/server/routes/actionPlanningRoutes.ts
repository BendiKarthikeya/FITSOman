import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { actionPlannings, users, organizations, employees, actionPlanComments, actionPlanAttachments } from "@shared/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Apply auth middleware only to action-plan routes (router is mounted at /api,
// so an unscoped router.use would 401 every other /api/* request).
router.use("/action-plans", (req: any, res: Response, next: NextFunction) => {
  requireAuth(req, res, next);
});

// Validation schemas
const createActionPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["todo", "in_progress", "completed", "review"]).default("todo"),
  dueDate: z.string().optional(),
});

const updateActionPlanSchema = createActionPlanSchema.partial();

// GET all action plans for organization
router.get("/action-plans", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "No organization found" });
    }

    const plans = await db
      .select({
        id: actionPlannings.id,
        name: actionPlannings.name,
        description: actionPlannings.description,
        imageUrl: actionPlannings.imageUrl,
        status: actionPlannings.status,
        priority: actionPlannings.priority,
        dueDate: actionPlannings.dueDate,
        createdAt: actionPlannings.createdAt,
        assignedTo: actionPlannings.assignedTo,
        assignedUser: {
          id: employees.id,
          username: employees.fullName,
          email: employees.email,
        },
        commentsCount: actionPlannings.commentsCount,
        attachmentsCount: actionPlannings.attachmentsCount,
      })
      .from(actionPlannings)
      .leftJoin(employees, eq(actionPlannings.assignedTo, employees.id))
      .where(eq(actionPlannings.organizationId, orgId))
      .orderBy(desc(actionPlannings.createdAt));

    // Fetch comments and attachments for each plan
    const plansWithDetails = await Promise.all(
      plans.map(async (plan) => {
        const comments = await db
          .select({
            id: actionPlanComments.id,
            actionPlanId: actionPlanComments.actionPlanId,
            userId: actionPlanComments.userId,
            comment: actionPlanComments.comment,
            createdAt: actionPlanComments.createdAt,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            },
          })
          .from(actionPlanComments)
          .leftJoin(users, eq(actionPlanComments.userId, users.id))
          .where(eq(actionPlanComments.actionPlanId, plan.id))
          .orderBy(desc(actionPlanComments.createdAt));

        const attachments = await db
          .select({
            id: actionPlanAttachments.id,
            actionPlanId: actionPlanAttachments.actionPlanId,
            fileName: actionPlanAttachments.fileName,
            filePath: actionPlanAttachments.filePath,
            fileSize: actionPlanAttachments.fileSize,
            fileType: actionPlanAttachments.fileType,
            displayName: actionPlanAttachments.displayName,
            createdAt: actionPlanAttachments.createdAt,
            createdBy: actionPlanAttachments.createdBy,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            },
          })
          .from(actionPlanAttachments)
          .leftJoin(users, eq(actionPlanAttachments.createdBy, users.id))
          .where(eq(actionPlanAttachments.actionPlanId, plan.id))
          .orderBy(desc(actionPlanAttachments.createdAt));

        return {
          ...plan,
          comments: comments.length > 0 ? comments : [],
          attachments: attachments.length > 0 ? attachments : [],
        };
      })
    );

    res.json(plansWithDetails);
  } catch (error) {
    console.error("Error fetching action plans:", error);
    res.status(500).json({ error: "Failed to fetch action plans" });
  }
});

// GET action plans by status
router.get("/action-plans/status/:status", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "No organization found" });
    }

    const plans = await db
      .select()
      .from(actionPlannings)
      .where(and(eq(actionPlannings.organizationId, orgId), eq(actionPlannings.status, status)))
      .orderBy(desc(actionPlannings.createdAt));

    res.json(plans);
  } catch (error) {
    console.error("Error fetching action plans by status:", error);
    res.status(500).json({ error: "Failed to fetch action plans" });
  }
});

// GET single action plan
router.get("/action-plans/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "No organization found" });
    }

    const plan = await db
      .select()
      .from(actionPlannings)
      .where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId)))
      .limit(1);

    if (!plan.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    // Fetch comments
    const comments = await db
      .select({
        id: actionPlanComments.id,
        actionPlanId: actionPlanComments.actionPlanId,
        userId: actionPlanComments.userId,
        comment: actionPlanComments.comment,
        createdAt: actionPlanComments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(actionPlanComments)
      .leftJoin(users, eq(actionPlanComments.userId, users.id))
      .where(eq(actionPlanComments.actionPlanId, id))
      .orderBy(desc(actionPlanComments.createdAt));

    // Fetch attachments
    const attachments = await db
      .select({
        id: actionPlanAttachments.id,
        actionPlanId: actionPlanAttachments.actionPlanId,
        fileName: actionPlanAttachments.fileName,
        filePath: actionPlanAttachments.filePath,
        fileSize: actionPlanAttachments.fileSize,
        fileType: actionPlanAttachments.fileType,
        displayName: actionPlanAttachments.displayName,
        createdAt: actionPlanAttachments.createdAt,
        createdBy: actionPlanAttachments.createdBy,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(actionPlanAttachments)
      .leftJoin(users, eq(actionPlanAttachments.createdBy, users.id))
      .where(eq(actionPlanAttachments.actionPlanId, id))
      .orderBy(desc(actionPlanAttachments.createdAt));

    res.json({
      ...plan[0],
      comments: comments.length > 0 ? comments : [],
      attachments: attachments.length > 0 ? attachments : [],
    });
  } catch (error) {
    console.error("Error fetching action plan:", error);
    res.status(500).json({ error: "Failed to fetch action plan" });
  }
});

// CREATE action plan
router.post("/action-plans", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = createActionPlanSchema.parse(req.body);
    
    // Validate assignedTo employee exists in the same organization
    let finalAssignedTo = validatedData.assignedTo;
    if (validatedData.assignedTo) {
      const assignedEmployee = await db.select().from(employees).where(eq(employees.id, validatedData.assignedTo)).limit(1);
      if (!assignedEmployee.length) {
        console.error(`Employee not found: ${validatedData.assignedTo}`);
        return res.status(400).json({ error: `Invalid assignee - employee '${validatedData.assignedTo}' not found` });
      }
      // Check if employee is in same org
      if (assignedEmployee[0].organizationId !== orgId) {
        console.error(`Employee org mismatch: ${assignedEmployee[0].organizationId} !== ${orgId}`);
        return res.status(400).json({ error: "Assignee must be in the same organization" });
      }
    }
    
    const dueDate = validatedData.dueDate ? new Date(validatedData.dueDate).toISOString().split('T')[0] : null;

    const newPlan = await db
      .insert(actionPlannings)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        imageUrl: validatedData.imageUrl,
        assignedTo: finalAssignedTo || null,
        priority: validatedData.priority,
        status: validatedData.status,
        dueDate: dueDate as any,
        organizationId: orgId,
        createdBy: userId,
      })
      .returning();

    console.log("Action plan created successfully:", newPlan[0].id);
    res.status(201).json(newPlan[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating action plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to create action plan", details: errorMessage });
  }
});

// UPDATE action plan
router.put("/action-plans/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = updateActionPlanSchema.parse(req.body);
    
    // Validate assignedTo employee exists in the same organization
    let finalAssignedTo = validatedData.assignedTo;
    if (validatedData.assignedTo) {
      const assignedEmployee = await db.select().from(employees).where(eq(employees.id, validatedData.assignedTo)).limit(1);
      if (!assignedEmployee.length) {
        return res.status(400).json({ error: "Invalid assignee - employee not found" });
      }
      // Check if employee is in same org
      if (assignedEmployee[0].organizationId !== orgId) {
        return res.status(400).json({ error: "Assignee must be in the same organization" });
      }
    }
    
    const dueDate = validatedData.dueDate ? new Date(validatedData.dueDate).toISOString().split('T')[0] : null;

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.imageUrl !== undefined) updateData.imageUrl = validatedData.imageUrl;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (dueDate !== undefined) updateData.dueDate = dueDate as any;
    if (finalAssignedTo !== undefined) updateData.assignedTo = finalAssignedTo;
    updateData.updatedAt = new Date();

    const updated = await db
      .update(actionPlannings)
      .set(updateData)
      .where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId)))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    // Fetch the updated plan with joined employee data
    const updatedPlan = await db
      .select({
        id: actionPlannings.id,
        name: actionPlannings.name,
        description: actionPlannings.description,
        imageUrl: actionPlannings.imageUrl,
        status: actionPlannings.status,
        priority: actionPlannings.priority,
        dueDate: actionPlannings.dueDate,
        createdAt: actionPlannings.createdAt,
        assignedTo: actionPlannings.assignedTo,
        assignedUser: {
          id: employees.id,
          username: employees.fullName,
          email: employees.email,
        },
        commentsCount: actionPlannings.commentsCount,
        attachmentsCount: actionPlannings.attachmentsCount,
      })
      .from(actionPlannings)
      .leftJoin(employees, eq(actionPlannings.assignedTo, employees.id))
      .where(eq(actionPlannings.id, id))
      .limit(1);

    res.json(updatedPlan[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating action plan:", error);
    res.status(500).json({ error: "Failed to update action plan" });
  }
});

// PATCH action plan (partial update)
router.patch("/action-plans/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = updateActionPlanSchema.parse(req.body);
    
    // Validate assignedTo employee exists in the same organization
    let finalAssignedTo = validatedData.assignedTo;
    if (validatedData.assignedTo) {
      const assignedEmployee = await db.select().from(employees).where(eq(employees.id, validatedData.assignedTo)).limit(1);
      if (!assignedEmployee.length) {
        return res.status(400).json({ error: "Invalid assignee - employee not found" });
      }
      // Check if employee is in same org
      if (assignedEmployee[0].organizationId !== orgId) {
        return res.status(400).json({ error: "Assignee must be in the same organization" });
      }
    }
    
    const dueDate = validatedData.dueDate ? new Date(validatedData.dueDate).toISOString().split('T')[0] : null;

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.imageUrl !== undefined) updateData.imageUrl = validatedData.imageUrl;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (dueDate !== undefined) updateData.dueDate = dueDate as any;
    if (finalAssignedTo !== undefined) updateData.assignedTo = finalAssignedTo;
    updateData.updatedAt = new Date();

    const updated = await db
      .update(actionPlannings)
      .set(updateData)
      .where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId)))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    // Fetch the updated plan with joined employee data
    const updatedPlan = await db
      .select({
        id: actionPlannings.id,
        name: actionPlannings.name,
        description: actionPlannings.description,
        imageUrl: actionPlannings.imageUrl,
        status: actionPlannings.status,
        priority: actionPlannings.priority,
        dueDate: actionPlannings.dueDate,
        createdAt: actionPlannings.createdAt,
        assignedTo: actionPlannings.assignedTo,
        assignedUser: {
          id: employees.id,
          username: employees.fullName,
          email: employees.email,
        },
        commentsCount: actionPlannings.commentsCount,
        attachmentsCount: actionPlannings.attachmentsCount,
      })
      .from(actionPlannings)
      .leftJoin(employees, eq(actionPlannings.assignedTo, employees.id))
      .where(eq(actionPlannings.id, id))
      .limit(1);

    res.json(updatedPlan[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating action plan:", error);
    res.status(500).json({ error: "Failed to update action plan" });
  }
});

// UPDATE action plan status
router.patch("/action-plans/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!["todo", "in_progress", "completed", "review"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await db
      .update(actionPlannings)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId)))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating action plan status:", error);
    res.status(500).json({ error: "Failed to update action plan status" });
  }
});

// DELETE action plan
router.delete("/action-plans/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deleted = await db
      .delete(actionPlannings)
      .where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting action plan:", error);
    res.status(500).json({ error: "Failed to delete action plan" });
  }
});

// ==========================================
// COMMENTS ENDPOINTS
// ==========================================

// GET comments for action plan
router.get("/action-plans/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify action plan belongs to user's org
    const plan = await db.select().from(actionPlannings).where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId))).limit(1);
    if (!plan.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    const comments = await db
      .select({
        id: actionPlanComments.id,
        actionPlanId: actionPlanComments.actionPlanId,
        userId: actionPlanComments.userId,
        comment: actionPlanComments.comment,
        createdAt: actionPlanComments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(actionPlanComments)
      .leftJoin(users, eq(actionPlanComments.userId, users.id))
      .where(eq(actionPlanComments.actionPlanId, id))
      .orderBy(desc(actionPlanComments.createdAt));

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST new comment
router.post("/action-plans/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user?.id;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Comment is required" });
    }

    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify action plan belongs to user's org
    const plan = await db.select().from(actionPlannings).where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId))).limit(1);
    if (!plan.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    // Create comment
    const newComment = await db
      .insert(actionPlanComments)
      .values({
        actionPlanId: id,
        userId: userId!,
        comment: comment.trim(),
      })
      .returning();

    // Update comments count
    await db
      .update(actionPlannings)
      .set({
        commentsCount: (plan[0].commentsCount || 0) + 1,
      })
      .where(eq(actionPlannings.id, id));

    res.status(201).json(newComment[0]);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// ==========================================
// ATTACHMENTS ENDPOINTS
// ==========================================

// GET attachments for action plan
router.get("/action-plans/:id/attachments", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify action plan belongs to user's org
    const plan = await db.select().from(actionPlannings).where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId))).limit(1);
    if (!plan.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    const attachments = await db
      .select({
        id: actionPlanAttachments.id,
        actionPlanId: actionPlanAttachments.actionPlanId,
        fileName: actionPlanAttachments.fileName,
        filePath: actionPlanAttachments.filePath,
        fileSize: actionPlanAttachments.fileSize,
        fileType: actionPlanAttachments.fileType,
        displayName: actionPlanAttachments.displayName,
        createdAt: actionPlanAttachments.createdAt,
        createdBy: actionPlanAttachments.createdBy,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(actionPlanAttachments)
      .leftJoin(users, eq(actionPlanAttachments.createdBy, users.id))
      .where(eq(actionPlanAttachments.actionPlanId, id))
      .orderBy(desc(actionPlanAttachments.createdAt));

    res.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// POST new attachment
router.post("/action-plans/:id/attachments", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fileName, filePath, fileSize, fileType, displayName } = req.body;
    const userId = req.user?.id;

    if (!fileName || !filePath) {
      return res.status(400).json({ error: "fileName and filePath are required" });
    }

    const user = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : null;
    const orgId = user?.[0]?.organizationId;

    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify action plan belongs to user's org
    const plan = await db.select().from(actionPlannings).where(and(eq(actionPlannings.id, id), eq(actionPlannings.organizationId, orgId))).limit(1);
    if (!plan.length) {
      return res.status(404).json({ error: "Action plan not found" });
    }

    // Create attachment
    const newAttachment = await db
      .insert(actionPlanAttachments)
      .values({
        actionPlanId: id,
        fileName,
        filePath,
        fileSize: fileSize || 0,
        fileType,
        displayName: displayName || fileName,
        createdBy: userId,
      })
      .returning();

    // Update attachments count
    await db
      .update(actionPlannings)
      .set({
        attachmentsCount: (plan[0].attachmentsCount || 0) + 1,
      })
      .where(eq(actionPlannings.id, id));

    res.status(201).json(newAttachment[0]);
  } catch (error) {
    console.error("Error creating attachment:", error);
    res.status(500).json({ error: "Failed to create attachment" });
  }
});

export default router;
