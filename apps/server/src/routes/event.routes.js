const express = require('express');
const router = express.Router();
const { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent 
} = require('../controllers/event.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

router.get('/', getEvents);
router.post('/', authorize('admin', 'super_admin', 'manager'), createEvent);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateEvent);
router.delete('/:id', authorize('admin', 'super_admin'), deleteEvent);

module.exports = router;