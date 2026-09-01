const express = require('express');
const router = express.Router();
const {
  getRoles,
  createRoleWithPermissions,
  getRolePermissions,
  getRolePermission,
  createRolePermission,
  updateRolePermission,
  deleteRolePermission,
  checkPermission,
  getMyPermissions,
  getUserRoleAssignments,
  assignUserRole,
  removeUserRole
} = require('../controllers/rolePermission.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── Sab routes pe authentication zaroori hai ──
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// 1. ROLES ENDPOINTS (Create & Fetch Custom Roles)
// ═══════════════════════════════════════════════════════════
router.get('/roles-list', authorize('admin', 'super_admin'), getRoles);
router.post('/roles/with-permissions', authorize('admin', 'super_admin'), createRoleWithPermissions);

// ═══════════════════════════════════════════════════════════
// 2. STATIC & SPECIFIC ROUTES
// ═══════════════════════════════════════════════════════════
router.get('/assignments', authorize('admin', 'super_admin'), getUserRoleAssignments);
router.get('/my-permissions', getMyPermissions);
router.get('/', authorize('admin', 'super_admin'), getRolePermissions);
router.post('/', authorize('admin', 'super_admin'), createRolePermission);
router.post('/assign', authorize('admin', 'super_admin'), assignUserRole);
router.post('/check', checkPermission);

// ═══════════════════════════════════════════════════════════
// 3. PARAMETRIC ROUTES (Ooper rakhe hain taake conflict na ho)
// ═══════════════════════════════════════════════════════════
router.delete('/assign/:id', authorize('admin', 'super_admin'), removeUserRole);

// ═══════════════════════════════════════════════════════════
// 4. GENERAL DYNAMIC ROUTES (WITH :id)
// ═══════════════════════════════════════════════════════════
router.get('/:id', authorize('admin', 'super_admin'), getRolePermission);
router.put('/:id', authorize('admin', 'super_admin'), updateRolePermission);
router.delete('/:id', authorize('super_admin'), deleteRolePermission);

module.exports = router;