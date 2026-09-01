// routes/inventory.routes.js
const express = require('express');
const router = express.Router();
const { 
  getInventoryItems, 
  getInventoryItem, 
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem, 
  stockTransaction,
  getItemHistory // 👈 Import item history function
} = require('../controllers/inventory.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

// ── Static / Special routes first (before /:id) ──
router.post('/transaction', authorize('admin', 'super_admin', 'manager'), stockTransaction);

router.get('/', getInventoryItems);
router.post('/', authorize('admin', 'super_admin', 'manager'), createInventoryItem);

// ── Item History / Janamkundli Route (Must be before /:id) ──
router.get('/:id/history', getItemHistory);

// ── Dynamic routes ──
router.get('/:id', getInventoryItem);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateInventoryItem);
router.delete('/:id', authorize('admin','super_admin'), deleteInventoryItem);

module.exports = router;