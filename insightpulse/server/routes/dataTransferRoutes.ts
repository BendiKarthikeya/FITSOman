import { Router } from 'express';
import { db } from '../db';
import { dataTransferJobs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requirePermission, type AuthRequest } from '../middleware/auth';

const router = Router();
const requireDataTransferAdmin = requirePermission('admin', 'data_transfer.manage');

// Get data transfer imports
router.get('/api/data-transfer/imports', requireAuth, requireDataTransferAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = (req as any).user?.organizationId;

    const imports = await db
      .select()
      .from(dataTransferJobs)
      .where(and(eq(dataTransferJobs.organizationId, orgId), eq(dataTransferJobs.type, 'import')))
      .orderBy(dataTransferJobs.createdAt);

    res.json(imports);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch imports' });
  }
});

// Upload and import file
router.post('/api/data-transfer/import', requireAuth, requireDataTransferAdmin, async (req: AuthRequest, res) => {
  try {
    const { filename } = req.body;
    const orgId = (req as any).user?.organizationId;
    const userId = (req as any).user?.id;

    const [job] = await db
      .insert(dataTransferJobs)
      .values({
        organizationId: orgId,
        createdBy: userId,
        type: 'import',
        filename: filename || 'uploaded_file.csv',
        status: 'processing',
        totalRows: 0,
        processedRows: 0,
        failedRows: 0,
      })
      .returning();

    res.json({
      ...job,
      message: 'Import job created. Processing your file...'
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Get data transfer exports
router.get('/api/data-transfer/exports', requireAuth, requireDataTransferAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = (req as any).user?.organizationId;

    const exports = await db
      .select()
      .from(dataTransferJobs)
      .where(and(eq(dataTransferJobs.organizationId, orgId), eq(dataTransferJobs.type, 'export')))
      .orderBy(dataTransferJobs.createdAt);

    res.json(exports);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch exports' });
  }
});

// Create export job
router.post('/api/data-transfer/export', requireAuth, requireDataTransferAdmin, async (req: AuthRequest, res) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const orgId = (req as any).user?.organizationId;
    const userId = (req as any).user?.id;

    const [job] = await db
      .insert(dataTransferJobs)
      .values({
        organizationId: orgId,
        createdBy: userId,
        type: 'export',
        filename: `export_${Date.now()}.${format}`,
        format,
        status: 'processing',
        totalRows: 0,
        processedRows: 0,
        failedRows: 0,
      })
      .returning();

    res.json({
      ...job,
      message: `Export job created. Your ${format.toUpperCase()} file is being generated.`
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to create export' });
  }
});

export default router;
