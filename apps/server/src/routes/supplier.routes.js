// routes/supplier.routes.js
const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliersByBranch,
  createSupplierPayment,
} = require('../controllers/supplier.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

// 1. Static & Specific Routes (Uper honay chahiyein)
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getSuppliersByBranch);
router.get('/', getSuppliers);
router.post('/', authorize('admin', 'super_admin', 'manager'), createSupplier);

// Payment route (Yeh bhi static route hai, isko /:id se uper rakhein)
router.post('/payments', authorize('admin', 'super_admin', 'manager'), createSupplierPayment);

// 2. Dynamic Routes (Hamesha end par honay chahiyein)
router.get('/:id', getSupplier);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateSupplier);
router.delete('/:id', authorize('admin', 'super_admin'), deleteSupplier);

module.exports = router;