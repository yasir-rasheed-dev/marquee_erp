// ═══════════════════════════════════════════════════════════
// routes/service.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  getServicesByBranch
} = require('../controllers/service.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter to prevent routing collisions) ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getServicesByBranch);

// ── Then dynamic and CRUD routes ──
router.get('/', getServices);
router.get('/:id', getService);
router.post('/', authorize('admin', 'super_admin', 'manager'), createService);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateService);
router.delete('/:id', authorize('admin', 'super_admin'), deleteService);

module.exports = router;