// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();

// Tenant isolation for /:branchId and /:companyId path params
const { tenantParam } = require('../common/middleware/auth');
router.param('branchId', tenantParam);
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByBranch
} = require('../controllers/category.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// 🔒 Enforce global authentication for all category endpoints
router.use(authMiddleware);

// 📌 1. Static & Specialized Routes (Must come BEFORE dynamic /:id routes)
router.route('/branch/:branchId')
  .get(authorize('admin', 'super_admin', 'manager'), getCategoriesByBranch);

// 📌 2. Base Collection Routes
router.route('/')
  .get(getCategories)
  .post(authorize('admin', 'super_admin', 'manager'), createCategory);

// 📌 3. Dynamic Routes (Param-based routes go last to prevent path interception)
router.route('/:id')
  .get(getCategory)
  .put(authorize('admin', 'super_admin', 'manager'), updateCategory)
  .delete(authorize('admin', 'super_admin'), deleteCategory);

module.exports = router;