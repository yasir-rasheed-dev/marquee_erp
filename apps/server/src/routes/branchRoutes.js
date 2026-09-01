const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { authMiddleware, authorize, validateBranchOwnership } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Public (Authenticated) routes ──
// GET all branches (filtered by company/branch)
router.get('/', branchController.getBranches);

// GET my company branches (for admin)
router.get('/my-company', authorize('admin'), branchController.getMyBranches);

// GET branches by company (Super Admin only)
router.get('/company/:companyId', authorize('super_admin'), branchController.getBranchesByCompany);

// GET single branch
router.get('/:id', branchController.getBranch);

// GET branch users
router.get('/:id/users', authorize('admin', 'manager', 'super_admin'), branchController.getBranchUsers);

// GET branch stats
router.get('/:id/stats', authorize('admin', 'manager', 'super_admin'), branchController.getBranchStats);

// ── Admin/Super Admin routes ──
// CREATE branch
router.post('/', authorize('admin', 'super_admin'), branchController.createBranch);

// UPDATE branch
router.put('/:id', authorize('admin', 'super_admin'), branchController.updateBranch);

// DELETE branch
router.delete('/:id', authorize('super_admin'), branchController.deleteBranch);

module.exports = router;