const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../common/middleware/auth');
const {
  getMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenusByBranch,
} = require('../controllers/menu.controller');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getMenusByBranch);

// ── General routes (All authenticated users) ──
router.get('/', getMenus);

// ── Then dynamic routes (with :id parameter) ──
router.get('/:id', getMenu);
router.post('/', authorize('admin', 'super_admin', 'manager'), createMenu);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateMenu);
router.delete('/:id', authorize('admin', 'super_admin'), deleteMenu);

module.exports = router;