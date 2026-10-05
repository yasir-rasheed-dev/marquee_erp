// ═══════════════════════════════════════════════════════════
// routes/customer.routes.js
// CUSTOMERS ROUTES — Secure & Role-Authorized
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersByBranch,
} = require('../controllers/customer.controller');
const { authMiddleware, permissionGuard } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/branch/:branchId', permissionGuard('customers', 'view'), getCustomersByBranch);

// ── Then dynamic routes (with :id parameter) ──
router.get('/', permissionGuard('customers', 'view'), getCustomers);
router.get('/:id', permissionGuard('customers', 'view'), getCustomer);
router.post('/', permissionGuard('customers', 'create'), createCustomer);
router.put('/:id', permissionGuard('customers', 'edit'), updateCustomer);
router.delete('/:id', permissionGuard('customers', 'delete'), deleteCustomer);

module.exports = router;