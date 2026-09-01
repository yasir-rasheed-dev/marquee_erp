// ═══════════════════════════════════════════════════════════
// routes/customer.routes.js
// CUSTOMERS ROUTES — Secure & Role-Authorized
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersByBranch,
} = require('../controllers/customer.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getCustomersByBranch);

// ── Then dynamic routes (with :id parameter) ──
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', authorize('admin', 'super_admin', 'manager'), createCustomer);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateCustomer);
router.delete('/:id', authorize('admin', 'super_admin'), deleteCustomer);

module.exports = router;