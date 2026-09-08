// routes/eventExecution.routes.js
const express = require('express');
const router = express.Router();
const {
  getEventExecutions,
  getEventExecution,
  createEventExecution,
  finalizeEventExecution,
  previewInventoryDeduction,
  rollbackEventInventory,
  createDishUsage,
  getDishUsages,
  createInventoryConsumption,
  getInventoryConsumptions,
  createEventDamage,
  getEventDamages,
  deleteEventDamage,
  getEventReport
} = require('../controllers/eventExecutionController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Specific static & report routes first ──
router.get('/report/:bookingId', getEventReport);

// ── Sub-module tracking routes (Dish usages, Inventory consumptions, Damages) ──
router.get('/dish-usages', getDishUsages);
router.post('/dish-usages', authorize('admin', 'super_admin', 'manager', 'cashier'), createDishUsage);

router.get('/inventory-consumptions', getInventoryConsumptions);
router.post('/inventory-consumptions', authorize('admin', 'super_admin', 'manager', 'cashier'), createInventoryConsumption);

router.get('/damages', getEventDamages);
router.post('/damages', authorize('admin', 'super_admin', 'manager', 'cashier'), createEventDamage);
router.delete('/damages/:id', authorize('admin', 'super_admin', 'manager'), deleteEventDamage);

// ── Main Event Execution CRUD & Finalization ──
router.get('/', getEventExecutions);
router.post('/', authorize('admin', 'super_admin', 'manager'), createEventExecution);
router.get('/:id', getEventExecution);

// ── Inventory Auto-Deduct Routes ──
router.get('/preview/:bookingId', previewInventoryDeduction);
router.post('/rollback/:bookingId', authorize('admin', 'super_admin', 'manager'), rollbackEventInventory);

router.put('/:id/finalize', authorize('admin', 'super_admin', 'manager'), finalizeEventExecution);

module.exports = router;