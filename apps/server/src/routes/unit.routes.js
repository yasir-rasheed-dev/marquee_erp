// routes/unit.routes.js
const express = require('express');
const router = express.Router();
const { 
  getUnits, 
  createUnit, 
  updateUnit, 
  deleteUnit 
} = require('../controllers/unit.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Routes with Role Authorization ──
router.get('/', getUnits);
router.post('/', authorize('admin', 'super_admin', 'manager'), createUnit);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateUnit);
router.delete('/:id', authorize('admin', 'super_admin'), deleteUnit);

module.exports = router;