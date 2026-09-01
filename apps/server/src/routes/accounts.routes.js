// ═══════════════════════════════════════════════════════════
// routes/accounts.routes.js
// ACCOUNTS ROUTES — Secure & Role-Authorized with Transactions
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountHistory,
  getTodaySummary,
  addTransaction,
  transferBetweenAccounts,
  getAllTransactions,
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
} = require('../controllers/accounts.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// STATIC ROUTES FIRST (no :id parameter)
// ═══════════════════════════════════════════════════════════

// ── List all accounts (with search/filter) ──
router.get('/', getAllAccounts);

// ── Create new account ──
router.post('/', authorize('admin', 'super_admin', 'manager'), createAccount);

// ── Transfer between accounts ──
router.post('/transfer', authorize('admin', 'super_admin', 'manager'), transferBetweenAccounts);

// ── Get all transactions / payment vouchers (Global for branch) ──
router.get('/transactions', getAllTransactions);

// ── Custom Categories (CRUD) ──
router.get('/custom-categories', getCustomCategories);
router.post('/custom-categories', authorize('admin', 'super_admin', 'manager'), createCustomCategory);
router.delete('/custom-categories/:id', authorize('admin', 'super_admin'), deleteCustomCategory);

// ═══════════════════════════════════════════════════════════
// DYNAMIC ROUTES (with :id parameter)
// ═══════════════════════════════════════════════════════════

// ── Get single account ──
router.get('/:id', getAccountById);

// ── Update account ──
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateAccount);

// ── Delete account ──
router.delete('/:id', authorize('admin', 'super_admin'), deleteAccount);

// ── Get account history / ledger ──
router.get('/:id/history', getAccountHistory);

// ── Get today's summary (start balance vs current) ──
router.get('/:id/today-summary', getTodaySummary);

// ── Add transaction (credit/debit) ──
router.post('/:id/transaction', authorize('admin', 'super_admin', 'manager', 'cashier'), addTransaction);

module.exports = router;