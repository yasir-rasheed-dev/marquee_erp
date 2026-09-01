// ═══════════════════════════════════════════════════════════
// routes/booking.routes.js
// BOOKING ROUTES — Secure & Role-Based
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingsByBranch,
  addPayment        // ← YEH ADD KIYA
} = require('../controllers/bookingController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getBookingsByBranch);

// ── Payment route (STATIC route — :id se pehle hona chahiye) ──
router.post('/:id/payments', authorize('admin', 'super_admin', 'manager'), addPayment);  // ← YEH ADD KIYA

// ── Main Booking CRUD Routes ──
router.get('/', getBookings);
router.get('/:id', getBooking);
router.post('/', authorize('admin', 'super_admin', 'manager'), createBooking);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateBooking);
router.delete('/:id', authorize('admin', 'super_admin'), deleteBooking);

module.exports = router;