// routes/company.routes.js
const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats,
  getCompanyBranches,
  getCompanyUsers,
  toggleCompanyStatus,
  getMyCompany
} = require('../controllers/company.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/', getCompanies);
router.get('/my-company', getMyCompany);

// ── Then routes with :id parameter ──
router.get('/:id', getCompany);
router.get('/:id/stats', getCompanyStats);
router.get('/:id/branches', getCompanyBranches);
router.get('/:id/users', getCompanyUsers);

// ── Super Admin only routes ──
router.post('/', authorize('super_admin'), createCompany);
router.put('/:id', authorize('super_admin'), updateCompany);
router.delete('/:id', authorize('super_admin'), deleteCompany);
router.patch('/:id/toggle', authorize('super_admin'), toggleCompanyStatus);

module.exports = router;