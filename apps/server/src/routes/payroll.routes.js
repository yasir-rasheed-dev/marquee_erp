// ═══════════════════════════════════════════════════════════
// routes/payroll.routes.js (FIXED)
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

const {
  getAllPayrolls,
  getPayrollById,
  generatePayroll,
  processPayroll,
  payPayrollItem,
  getAllLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  addLoanInstallment,
  getAllEventAssignments,
  getEventAssignmentById,
  createEventAssignment,
  updateEventAssignment,
  deleteEventAssignment,
  markEventAttendance,
  payEventAssignment,
  getStaffLedger,
  getEmployeeBalance,
  getAllStaffPayments,
  getStaffPaymentById,
  createStaffPayment,
  deleteStaffPayment,
} = require('../controllers/payroll.controller');

const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// BRANCH-BASED ROUTES
// ═══════════════════════════════════════════════════════════
const setBranchFromParams = (req, res, next) => {
  if (req.params.branchId) {
    req.branchId = parseInt(req.params.branchId);
  }
  next();
};

router.get('/branch/:branchId/payrolls', setBranchFromParams, getAllPayrolls);
router.get('/branch/:branchId/loans', setBranchFromParams, getAllLoans);
router.get('/branch/:branchId/event-assignments', setBranchFromParams, getAllEventAssignments);
router.get('/branch/:branchId/ledger', setBranchFromParams, getStaffLedger);
router.get('/branch/:branchId/staff-payments', setBranchFromParams, getAllStaffPayments);

// ═══════════════════════════════════════════════════════════
// PAYROLL - Static routes first (NO :id params)
// ═══════════════════════════════════════════════════════════
router.get('/payrolls', getAllPayrolls);
router.post('/payrolls/generate', authorize('admin', 'super_admin', 'manager'), generatePayroll);

// ✅ FIXED: Static route for paying item (no :id conflict)
router.post('/payrolls/items/:itemId/pay', authorize('admin', 'super_admin', 'manager'), payPayrollItem);

// Parameterized routes (with :id) - AFTER static routes
router.get('/payrolls/:id', getPayrollById);
router.put('/payrolls/:id/process', authorize('admin', 'super_admin', 'manager'), processPayroll);

// ═══════════════════════════════════════════════════════════
// EMPLOYEE LOANS - Static routes first
// ═══════════════════════════════════════════════════════════
router.get('/loans', getAllLoans);
router.post('/loans', authorize('admin', 'super_admin', 'manager'), createLoan);

// Parameterized routes
router.get('/loans/:id', getLoanById);
router.put('/loans/:id', authorize('admin', 'super_admin', 'manager'), updateLoan);
router.delete('/loans/:id', authorize('admin', 'super_admin'), deleteLoan);
router.post('/loans/:loanId/installments', authorize('admin', 'super_admin', 'manager'), addLoanInstallment);

// ═══════════════════════════════════════════════════════════
// EVENT STAFF ASSIGNMENT - Static routes first
// ═══════════════════════════════════════════════════════════
// ✅ FIXED: Static routes (no :id) - MUST come before dynamic routes
router.get('/event-assignments', getAllEventAssignments);
router.post('/event-assignments', authorize('admin', 'super_admin', 'manager'), createEventAssignment);

// ✅ FIXED: Specific action routes - BEFORE dynamic :id routes
router.put('/event-assignments/:id/attendance', authorize('admin', 'super_admin', 'manager'), markEventAttendance);
router.post('/event-assignments/:id/pay', authorize('admin', 'super_admin', 'manager'), payEventAssignment);

// ✅ FIXED: Dynamic :id routes - LAST
router.get('/event-assignments/:id', getEventAssignmentById);
router.put('/event-assignments/:id', authorize('admin', 'super_admin', 'manager'), updateEventAssignment);
router.delete('/event-assignments/:id', authorize('admin', 'super_admin'), deleteEventAssignment);

// ═══════════════════════════════════════════════════════════
// STAFF LEDGER
// ═══════════════════════════════════════════════════════════
router.get('/ledger', getStaffLedger);
router.get('/ledger/employee/:employeeId/balance', getEmployeeBalance);

// ═══════════════════════════════════════════════════════════
// STAFF PAYMENT
// ═══════════════════════════════════════════════════════════
router.get('/staff-payments', getAllStaffPayments);
router.post('/staff-payments', authorize('admin', 'super_admin', 'manager'), createStaffPayment);
router.get('/staff-payments/:id', getStaffPaymentById);
router.delete('/staff-payments/:id', authorize('admin', 'super_admin'), deleteStaffPayment);

module.exports = router;