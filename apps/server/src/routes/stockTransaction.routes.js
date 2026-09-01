// routes/stockTransaction.routes.js
const express = require('express');
const router = express.Router();
const { 
  getStockTransactions, 
  getStockTransaction, 
  purgeOldTransactions 
} = require('../controllers/stockTransaction.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── 1. Static routes first (no :id parameter) ──
router.get('/', getStockTransactions);
router.delete('/purge', authorize('super_admin', 'admin'), purgeOldTransactions);

// ── 2. Dynamic routes last (with :id parameter) ──
router.get('/:id', getStockTransaction);

module.exports = router;