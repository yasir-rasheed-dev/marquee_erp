// ═══════════════════════════════════════════════════════════
// controllers/backup.controller.js
// BACKUP LOG — Local + Google Drive + Auto Cleanup
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs').promises;
const backupService = require('../services/backup.service');
const googleDriveOAuthService = require('../services/googleDriveOAuth.service');

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.body?.branchId) return parseInt(req.body.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// ── Helper: Get Company ID from Branch ──
const getCompanyIdByBranch = async (branchId) => {
  if (!branchId) return null;
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true }
  });
  return branch?.companyId || null;
};

// ───────────────────────────────────────────────────────────
// @desc    Get all Backups (STRICT Branch-Wise + Filters)
// @route   GET /api/backups
// ───────────────────────────────────────────────────────────
const getBackups = async (req, res) => {
  try {
    const { search, status, location, dateFrom, dateTo } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId, deletedAt: null };

    if (status && status.trim() !== '') where.status = status.trim();
    if (location && location.trim() !== '') where.location = location.trim();

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      where.OR = [
        { backupNo: { contains: s, mode: 'insensitive' } },
        { fileName: { contains: s, mode: 'insensitive' } },
        { dbName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const backups = await prisma.backupLog.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: backups.length,
      data: backups,
      branch: branchId
    });
  } catch (error) {
    console.error('getBackups error 500 details:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get single Backup with full details
// @route   GET /api/backups/:id
// ───────────────────────────────────────────────────────────
const getBackup = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID' });
    }

    const backup = await prisma.backupLog.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!backup || backup.deletedAt) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    if (backup.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This backup belongs to another branch.'
      });
    }

    res.status(200).json({ success: true, data: backup });
  } catch (error) {
    console.error('getBackup error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Create Backup Log Entry (manual log)
// @route   POST /api/backups
// ───────────────────────────────────────────────────────────
const createBackup = async (req, res) => {
  try {
    const {
      backupNo,
      fileName,
      filePath,
      fileSize,
      driveFileId,
      driveLink,
      location,
      dbName,
      tablesCount,
      branchId,
      companyId
    } = req.body;

    if (!backupNo?.trim()) {
      return res.status(400).json({ success: false, message: 'Backup number is required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Duplicate backupNo check
    const existing = await prisma.backupLog.findFirst({
      where: { backupNo: backupNo.trim(), companyId: parseInt(targetCompanyId) }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Backup with this number already exists'
      });
    }

    const backup = await prisma.backupLog.create({
      data: {
        backupNo: backupNo.trim(),
        fileName: fileName?.trim() || backupNo.trim(),
        filePath: filePath?.trim() || null,
        fileSize: fileSize ? parseInt(fileSize) : null,
        driveFileId: driveFileId?.trim() || null,
        driveLink: driveLink?.trim() || null,
        location: location || 'local',
        dbName: dbName?.trim() || 'raath_db',
        tablesCount: tablesCount ? parseInt(tablesCount) : 0,
        status: 'completed',
        companyId: parseInt(targetCompanyId),
        branchId: targetBranchId,
        createdById: req.userId || 1,
      },
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      }
    });

    res.status(201).json({
      success: true,
      data: backup,
      message: `Backup "${backup.backupNo}" logged successfully`
    });
  } catch (error) {
    console.error('createBackup error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Update Backup metadata
// @route   PUT /api/backups/:id
// ───────────────────────────────────────────────────────────
const updateBackup = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID' });
    }

    const existing = await prisma.backupLog.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, backupNo: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const {
      fileName, filePath, fileSize, driveFileId, driveLink,
      status, location, dbName, tablesCount, isAutoDeleted, deletedReason
    } = req.body;

    const backup = await prisma.backupLog.update({
      where: { id },
      data: {
        ...(fileName !== undefined && { fileName: fileName?.trim() || null }),
        ...(filePath !== undefined && { filePath: filePath?.trim() || null }),
        ...(fileSize !== undefined && { fileSize: fileSize ? parseInt(fileSize) : null }),
        ...(driveFileId !== undefined && { driveFileId: driveFileId?.trim() || null }),
        ...(driveLink !== undefined && { driveLink: driveLink?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(location !== undefined && { location }),
        ...(dbName !== undefined && { dbName: dbName?.trim() || null }),
        ...(tablesCount !== undefined && { tablesCount: parseInt(tablesCount) }),
        ...(isAutoDeleted !== undefined && { isAutoDeleted }),
        ...(deletedReason !== undefined && { deletedReason: deletedReason?.trim() || null }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      }
    });

    res.status(200).json({ success: true, data: backup, message: 'Backup updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    console.error('updateBackup error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Delete Backup (Soft Delete + file cleanup)
// @route   DELETE /api/backups/:id
// ───────────────────────────────────────────────────────────
const deleteBackup = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID' });
    }

    const existing = await prisma.backupLog.findUnique({
      where: { id },
      select: { id: true, branchId: true, backupNo: true, filePath: true, driveFileId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Delete local file if exists
    if (existing.filePath) {
      try {
        await fs.unlink(existing.filePath);
      } catch (fsErr) {
        console.warn('Local file delete warning:', fsErr.message);
      }
    }

    // Delete from Google Drive if exists (using user's connected account)
    if (existing.driveFileId) {
      try {
        await googleDriveOAuthService.deleteFile(req.userId, existing.driveFileId);
      } catch (driveErr) {
        console.warn('Drive file delete warning:', driveErr.message);
      }
    }

    await prisma.backupLog.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isAutoDeleted: false,
        deletedReason: 'Manually deleted by user',
        status: 'deleted'
      }
    });

    res.status(200).json({
      success: true,
      message: `Backup "${existing.backupNo}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    console.error('deleteBackup error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get backups by branch (Admin only)
// @route   GET /api/backups/branch/:branchId
// ───────────────────────────────────────────────────────────
const getBackupsByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin' && req.userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, Super Admin or Manager required.'
      });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const backups = await prisma.backupLog.findMany({
      where: { branchId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: backups.length,
      data: backups
    });
  } catch (error) {
    console.error('getBackupsByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Download Backup file (Local or Google Drive redirect)
// @route   GET /api/backups/:id/download
// ───────────────────────────────────────────────────────────
const downloadBackup = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID' });
    }

    const backup = await prisma.backupLog.findUnique({
      where: { id },
      select: { id: true, branchId: true, filePath: true, fileName: true, driveLink: true, status: true }
    });

    if (!backup || backup.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Backup not found or deleted' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (backup.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Priority 1: Local file download
    if (backup.filePath) {
      try {
        await fs.access(backup.filePath);
        return res.download(backup.filePath, backup.fileName || 'backup.sql.gz');
      } catch (fsErr) {
        console.warn('Local file not found, trying Drive link:', fsErr.message);
      }
    }

    // Priority 2: Google Drive redirect
    if (backup.driveLink) {
      return res.redirect(backup.driveLink);
    }

    return res.status(404).json({ success: false, message: 'Backup file not available in any location' });
  } catch (error) {
    console.error('downloadBackup error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Trigger new backup (creates log + runs service)
// @route   POST /api/backups/trigger
// ───────────────────────────────────────────────────────────
const triggerBackup = async (req, res) => {
  try {
    const { location = 'both', dbName = 'raath_db', backupNo: customBackupNo, fileName: customFileName, localPath } = req.body;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = req.companyId || await getCompanyIdByBranch(branchId);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Check Google Drive connection if needed
    if ((location === 'google_drive' || location === 'both')) {
      const driveStatus = await googleDriveOAuthService.isConnected(req.userId);
      if (!driveStatus.connected) {
        return res.status(400).json({
          success: false,
          message: 'Google Drive not connected. Please connect your Gmail account first.',
          needsGoogleAuth: true
        });
      }
    }

    // Use custom or auto-generate
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupNo = customBackupNo?.trim() || `BKP-${timestamp}`;
    const fileName = customFileName?.trim() || `raath_backup_${backupNo}.sql.gz`;

    // Check duplicate
    const existing = await prisma.backupLog.findFirst({
      where: { backupNo, companyId: parseInt(companyId) }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Backup number already exists' });
    }

    const backup = await prisma.backupLog.create({
      data: {
        backupNo,
        fileName,
        status: 'pending',
        location: location === 'both' ? 'both' : location === 'google_drive' ? 'google_drive' : 'local',
        dbName,
        companyId: parseInt(companyId),
        branchId,
        createdById: req.userId || 1,
      },
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      }
    });

    // Fire backup with custom path
    backupService.createBackup(
      parseInt(companyId),
      branchId,
      req.userId || 1,
      backup.id,
      localPath || null
    ).catch(err => {
      console.error('Background backup failed:', err);
    });

    res.status(202).json({
      success: true,
      data: backup,
      message: `Backup "${backupNo}" triggered. Processing in background — refresh to check status.`
    });
  } catch (error) {
    console.error('triggerBackup error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get Google OAuth URL
// @route   GET /api/backups/google/auth
// ───────────────────────────────────────────────────────────
const getGoogleAuthUrl = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
    }
    const url = googleDriveOAuthService.getAuthUrl(req.userId);
    if (!url) {
      return res.status(500).json({ success: false, message: 'Failed to generate Google auth URL' });
    }
    res.status(200).json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Handle Google OAuth callback
// @route   GET /api/backups/google/callback
// ───────────────────────────────────────────────────────────
const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings/backup?error=access_denied`);
    }
    
    const result = await googleDriveOAuthService.handleCallback(code, state);
    
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings/backup?google_connected=true&email=${encodeURIComponent(result.email)}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings/backup?error=oauth_failed`);
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Check Google Drive connection status
// @route   GET /api/backups/google/status
// ───────────────────────────────────────────────────────────
const getGoogleDriveStatus = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
    }
    const status = await googleDriveOAuthService.isConnected(req.userId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Disconnect Google Drive
// @route   DELETE /api/backups/google/disconnect
// ───────────────────────────────────────────────────────────
const disconnectGoogleDrive = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
    }
    await googleDriveOAuthService.disconnect(req.userId);
    res.status(200).json({ success: true, message: 'Google Drive disconnected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Mark backup as auto-deleted (for cleanup jobs)
// @route   PUT /api/backups/:id/auto-delete
// ───────────────────────────────────────────────────────────
const markAutoDeleted = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID' });
    }

    const backup = await prisma.backupLog.update({
      where: { id },
      data: {
        isAutoDeleted: true,
        deletedAt: new Date(),
        deletedReason: 'Auto-cleanup: retention policy exceeded',
        status: 'deleted'
      }
    });

    res.status(200).json({
      success: true,
      data: backup,
      message: 'Backup marked as auto-deleted'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    console.error('markAutoDeleted error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getBackups,
  getBackup,
  createBackup,
  updateBackup,
  deleteBackup,
  getBackupsByBranch,
  downloadBackup,
  triggerBackup,
  markAutoDeleted,
  getGoogleDriveStatus,
  disconnectGoogleDrive,
  getGoogleAuthUrl,
  handleGoogleCallback
};