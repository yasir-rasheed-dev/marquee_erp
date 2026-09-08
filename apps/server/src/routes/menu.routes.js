const express = require('express');
const router = express.Router();
const { authMiddleware, permissionGuard } = require('../common/middleware/auth');
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
router.get('/branch/:branchId', permissionGuard('menus', 'view'), getMenusByBranch);

// ── General routes ──
router.get('/', permissionGuard('menus', 'view'), getMenus);

// ── Dynamic routes (with :id parameter) ──
router.get('/:id', permissionGuard('menus', 'view'), getMenu);
router.post('/', permissionGuard('menus', 'create'), createMenu);
router.put('/:id', permissionGuard('menus', 'edit'), updateMenu);
router.delete('/:id', permissionGuard('menus', 'delete'), deleteMenu);

module.exports = router;