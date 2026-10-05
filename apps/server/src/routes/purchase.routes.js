const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrdersByBranch,
  getPurchaseBills,
  getPurchaseBill,
  createPurchaseBill,
  updatePurchaseBill,
  getPurchaseBillsByBranch,
  payPurchaseBill,           // <-- ADD
  getPurchaseReturns,
  createPurchaseReturn,
  getPurchaseReturnsByBranch,
} = require('../controllers/purchase.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ==========================================
// 1. PURCHASE ORDERS ROUTES
// ==========================================
// Static routes first (no :id parameter)
router.get('/orders/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getPurchaseOrdersByBranch);
router.get('/orders', getPurchaseOrders);
router.post('/orders', authorize('admin', 'super_admin', 'manager'), createPurchaseOrder);

// Dynamic routes (with :id parameter) — ALWAYS keep at end
router.get('/orders/:id', getPurchaseOrder);
router.put('/orders/:id', authorize('admin', 'super_admin', 'manager'), updatePurchaseOrder);


// ==========================================
// 2. PURCHASE BILLS ROUTES (GRN & Stock In)
// ==========================================
// Static routes first
router.get('/bills/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getPurchaseBillsByBranch);
router.get('/bills', getPurchaseBills);
router.post('/bills', authorize('admin', 'super_admin', 'manager'), createPurchaseBill);

// Bill Payment route (specific action — before generic :id)
router.post('/bills/:id/pay', authorize('admin', 'super_admin', 'manager'), payPurchaseBill);

// Dynamic routes — ALWAYS keep at end
router.get('/bills/:id', getPurchaseBill);
router.put('/bills/:id', authorize('admin', 'super_admin', 'manager'), updatePurchaseBill);


// ==========================================
// 3. PURCHASE RETURNS ROUTES (Debit Note)
// ==========================================
// Static routes first
router.get('/returns/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getPurchaseReturnsByBranch);
router.get('/returns', getPurchaseReturns);
router.post('/returns', authorize('admin', 'super_admin', 'manager'), createPurchaseReturn);

module.exports = router;