// routes/hall.routes.js
const express = require('express');
const router = express.Router();
const {
  getHalls,
  getHall, // Optional: agar single hall fetch karna ho
  createHall,
  updateHall,
  deleteHall,
} = require('../controllers/hall.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Routes ──
router.get('/', getHalls);
router.post('/', authorize('admin', 'super_admin', 'manager'), createHall);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateHall);
router.delete('/:id', authorize('admin', 'super_admin'), deleteHall);

module.exports = router;