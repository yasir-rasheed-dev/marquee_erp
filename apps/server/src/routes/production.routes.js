// ═══════════════════════════════════════════════════════════
// routes/production.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getProductionPlans,
  getProductionPlan,
  createProductionPlan,
  updateProductionPlan,
  deleteProductionPlan,
  getProductionPlanItems,
  addProductionPlanItem,
  updateProductionPlanItem,
  deleteProductionPlanItem,
  executeProductionPlan,
  previewProductionPlan,
  getProductionPlanStockHistory
} = require('../controllers/productionController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Production Plans Main Routes ──
router.route('/')
  .get(getProductionPlans)
  .post(authorize('admin', 'super_admin', 'manager'), createProductionPlan);

router.route('/:id')
  .get(getProductionPlan)
  .put(authorize('admin', 'super_admin', 'manager'), updateProductionPlan)
  .delete(authorize('admin', 'super_admin'), deleteProductionPlan);

// ── Plan Items Routes ──
router.route('/:id/items')
  .get(getProductionPlanItems)
  .post(authorize('admin', 'super_admin', 'manager'), addProductionPlanItem);

router.route('/items/:itemId')
  .put(authorize('admin', 'super_admin', 'manager'), updateProductionPlanItem)
  .delete(authorize('admin', 'super_admin', 'manager'), deleteProductionPlanItem);

// ── Execution & Stock Transactions Routes ──
router.get('/:id/preview', previewProductionPlan);
router.post('/:id/execute', authorize('admin', 'super_admin', 'manager'), executeProductionPlan);
router.get('/:id/stock-history', getProductionPlanStockHistory);

module.exports = router;