// routes/item.routes.js
const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getItemsByBranch,
  bulkCreateItems
} = require('../controllers/item.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getItemsByBranch);

// ── Bulk operations ──
router.post('/bulk', authorize('admin', 'super_admin', 'manager'), bulkCreateItems);

// ── General routes (All authenticated users) ──
router.get('/', getItems);

// ── Then dynamic routes (with :id parameter) ──
router.get('/:id', getItem);
router.post('/', authorize('admin', 'super_admin', 'manager'), createItem);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateItem);
router.delete('/:id', authorize('admin', 'super_admin', 'manager'), deleteItem);

module.exports = router;