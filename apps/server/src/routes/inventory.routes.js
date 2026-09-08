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
const { authMiddleware, permissionGuard } = require('../common/middleware/auth');

router.use(authMiddleware);

// ── Static / Special routes first (before /:id) ──
router.post('/transaction', permissionGuard('inventory', 'edit'), stockTransaction);

router.get('/', permissionGuard('inventory', 'view'), getInventoryItems);
router.post('/', permissionGuard('inventory', 'create'), createInventoryItem);

// ── Item History Route (Must be before /:id) ──
router.get('/:id/history', permissionGuard('inventory', 'view'), getItemHistory);

// ── Dynamic routes ──
router.get('/:id', permissionGuard('inventory', 'view'), getInventoryItem);
router.put('/:id', permissionGuard('inventory', 'edit'), updateInventoryItem);
router.delete('/:id', permissionGuard('inventory', 'delete'), deleteInventoryItem);

module.exports = router;