// ═══════════════════════════════════════════════════════════
// routes/attendance.routes.js
// ATTENDANCE ROUTES — Attendance | Leaves | Leave Balances
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();


// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  // ── Attendance ──
  getAllAttendance,
  createAttendance,
  deleteAttendance,
  getAttendanceSummary,

  // ── Leaves ──
  getAllLeaves,
  createLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,

  // ── Leave Balance ──
  getLeaveBalance,
} = require('../controllers/attendance.controller');

const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// BRANCH-BASED ROUTES (Static — params se pehle hone chahiye)
// ═══════════════════════════════════════════════════════════

const setBranchFromParams = (req, res, next) => {
  if (req.params.branchId) {
    req.branchId = parseInt(req.params.branchId);
  }
  next();
};

// Branch-specific listings
router.get('/branch/:branchId/attendance', setBranchFromParams, getAllAttendance);
router.get('/branch/:branchId/leaves', setBranchFromParams, getAllLeaves);

// ═══════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════

// Static routes (no :id parameter)
router.get('/attendance', getAllAttendance);
router.post('/attendance', authorize('admin', 'super_admin', 'manager'), createAttendance);
router.get('/attendance/summary', getAttendanceSummary);

// Parameterized routes
router.delete('/attendance/:id', authorize('admin', 'super_admin'), deleteAttendance);

// ═══════════════════════════════════════════════════════════
// LEAVES
// ═══════════════════════════════════════════════════════════

// Static routes (no :id parameter)
router.get('/leaves', getAllLeaves);
router.post('/leaves', authorize('admin', 'super_admin', 'manager'), createLeave);

// Parameterized routes
router.put('/leaves/:id/approve', authorize('admin', 'super_admin', 'manager'), approveLeave);
router.put('/leaves/:id/reject', authorize('admin', 'super_admin', 'manager'), rejectLeave);
router.delete('/leaves/:id', authorize('admin', 'super_admin'), deleteLeave);

// ═══════════════════════════════════════════════════════════
// LEAVE BALANCE
// ═══════════════════════════════════════════════════════════

router.get('/leaves/employee/:employeeId/balance', getLeaveBalance);

module.exports = router;