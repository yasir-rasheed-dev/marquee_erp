// ═══════════════════════════════════════════════════════════
// routes/employee.routes.js
// EMPLOYEE ROUTES — Departments | Designations | Employees
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

const {
  // ── Departments ──
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // ── Designations ──
  getAllDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,

  // ── Employees ──
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employee.controller');

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
router.get('/branch/:branchId/departments', setBranchFromParams, getAllDepartments);
router.get('/branch/:branchId/designations', setBranchFromParams, getAllDesignations);
router.get('/branch/:branchId/employees', setBranchFromParams, getAllEmployees);

// ═══════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════

// Static routes (no :id parameter)
router.get('/departments', getAllDepartments);
router.post('/departments', authorize('admin', 'super_admin', 'manager'), createDepartment);

// Parameterized routes
router.put('/departments/:id', authorize('admin', 'super_admin', 'manager'), updateDepartment);
router.delete('/departments/:id', authorize('admin', 'super_admin'), deleteDepartment);

// ═══════════════════════════════════════════════════════════
// DESIGNATIONS
// ═══════════════════════════════════════════════════════════

// Static routes (no :id parameter)
router.get('/designations', getAllDesignations);
router.post('/designations', authorize('admin', 'super_admin', 'manager'), createDesignation);

// Parameterized routes
router.put('/designations/:id', authorize('admin', 'super_admin', 'manager'), updateDesignation);
router.delete('/designations/:id', authorize('admin', 'super_admin'), deleteDesignation);

// ═══════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════

// Static routes (no :id parameter)
router.get('/employees', getAllEmployees);
router.post('/employees', authorize('admin', 'super_admin', 'manager'), createEmployee);

// Parameterized routes
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', authorize('admin', 'super_admin', 'manager'), updateEmployee);
router.delete('/employees/:id', authorize('admin', 'super_admin'), deleteEmployee);

module.exports = router;