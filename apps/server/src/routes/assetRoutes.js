const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetsByBranch,
  createAssetTransaction, 
  getAssetTransactions// 👈 Import new transaction/adjustment function
} = require('../controllers/assetController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) to avoid routing conflict ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getAssetsByBranch);

// ── Transaction / Adjustment route (Must be before /:id routes) ──
router.post('/transaction', authorize('admin', 'super_admin', 'manager'), createAssetTransaction);
router.get('/transactions', authorize('admin', 'super_admin', 'manager'), getAssetTransactions);

// ── Then dynamic routes (with :id parameter) and standard endpoints ──
router.get('/', getAssets);
router.get('/:id', getAsset);
router.post('/', authorize('admin', 'super_admin', 'manager'), createAsset);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateAsset);
router.delete('/:id', authorize('super_admin'), deleteAsset);

module.exports = router;