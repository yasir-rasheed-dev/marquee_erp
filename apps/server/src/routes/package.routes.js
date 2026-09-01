// ═══════════════════════════════════════════════════════════
// routes/package.routes.js
// BANQUET PACKAGES ROUTES — Secure & Role-Authorized
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  getPackagesByBranch,
} = require('../controllers/package.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getPackagesByBranch);

// ── Then dynamic routes (with :id parameter) ──
router.get('/', getPackages);
router.get('/:id', getPackage);
router.post('/', authorize('admin', 'super_admin', 'manager'), createPackage);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updatePackage);
router.delete('/:id', authorize('admin', 'super_admin'), deletePackage);

module.exports = router;