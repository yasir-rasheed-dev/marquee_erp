const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const { authMiddleware, authorize } = require('../common/middleware/auth');// 🔥 YAHA APNI AUTH MIDDLEWARE PATH SET KARO
const {
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
  handleGoogleCallback,
} = require('../controllers/backup.controller');

// ── Public OAuth callback (no auth needed) ──
router.get('/google/callback', handleGoogleCallback);

// ── Protected routes (auth required) ──
router.use(authMiddleware); // 🔥 YEH LINE ADD KARO — sab routes neeche protected ho jayenge
// A backup is a dump of the WHOLE database (every company's data and all password hashes),
// so only the platform super admin may create, list or download them.
router.use(authorize('super_admin'));

router.get('/', getBackups);
router.get('/branch/:branchId', getBackupsByBranch);
router.post('/', createBackup);
router.get('/google/auth', getGoogleAuthUrl);
router.get('/google/status', getGoogleDriveStatus);
router.delete('/google/disconnect', disconnectGoogleDrive);
router.get('/:id', getBackup);
router.get('/:id/download', downloadBackup);
router.put('/:id', updateBackup);
router.delete('/:id', deleteBackup);
router.post('/trigger', triggerBackup);
router.put('/:id/auto-delete', markAutoDeleted);

module.exports = router;