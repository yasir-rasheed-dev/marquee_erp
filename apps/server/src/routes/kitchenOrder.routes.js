// ═══════════════════════════════════════════════════════════
// routes/kitchenOrder.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getKitchenOrders,
  getKitchenOrder,
  createKitchenOrder,
  updateKitchenOrder,
  deleteKitchenOrder,
  getKitchenOrderItems,
  addKitchenOrderItem,
  updateKitchenOrderItem,
  deleteKitchenOrderItem,
  executeKitchenOrder,
  getKitchenOrderStockHistory
} = require('../controllers/kitchenOrderController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static & Action routes first (prevent :id collision) ──
router.get('/:id/history', getKitchenOrderStockHistory);
router.get('/:id/items', getKitchenOrderItems);
router.post('/:id/items', authorize('admin', 'super_admin', 'manager'), addKitchenOrderItem);
router.post('/:id/execute', authorize('admin', 'super_admin', 'manager'), executeKitchenOrder);

// ── Standard CRUD routes ──
router.get('/', getKitchenOrders);
router.get('/:id', getKitchenOrder);
router.post('/', authorize('admin', 'super_admin', 'manager'), createKitchenOrder);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateKitchenOrder);
router.delete('/:id', authorize('admin', 'super_admin'), deleteKitchenOrder);

// ── Order item sub-routes ──
router.put('/items/:itemId', authorize('admin', 'super_admin', 'manager'), updateKitchenOrderItem);
router.delete('/items/:itemId', authorize('admin', 'super_admin', 'manager'), deleteKitchenOrderItem);

module.exports = router;