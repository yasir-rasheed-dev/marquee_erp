// ═══════════════════════════════════════════════════════════
// routes/wastageLog.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getWastageLogs,
  getWastageLog,
  createWastageLog,
  updateWastageLog,
  deleteWastageLog,
  getWastageReport
} = require('../controllers/wastageLogController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static & Report routes first (no :id parameter collision) ──
router.get('/report', getWastageReport);

// ── Standard CRUD routes ──
router.get('/', getWastageLogs);
router.get('/:id', getWastageLog);
router.post('/', authorize('admin', 'super_admin', 'manager'), createWastageLog);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateWastageLog);
router.delete('/:id', authorize('admin', 'super_admin'), deleteWastageLog);

module.exports = router;