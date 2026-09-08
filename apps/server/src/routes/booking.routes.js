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
  addPayment,        // ← YEH ADD KIYA
  getBookingDamages,
  addBookingDamage,
  removeBookingDamage,
  completeAndSettleBooking,
  logWhatsAppMessage,
  getWhatsAppMessages,
  getUpcomingReminders
} = require('../controllers/bookingController');
const { authMiddleware, permissionGuard } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Static routes first (no :id parameter) ──
router.get('/upcoming-reminders', permissionGuard('bookings', 'view'), getUpcomingReminders);
router.get('/branch/:branchId', permissionGuard('bookings', 'view'), getBookingsByBranch);

// ── Sub-resource routes (:id/payments, :id/damages, :id/complete-settle, :id/whatsapp) ──
router.post('/:id/payments', permissionGuard('bookings', 'edit'), addPayment);
router.get('/:id/damages', permissionGuard('bookings', 'view'), getBookingDamages);
router.post('/:id/damages', permissionGuard('bookings', 'edit'), addBookingDamage);
router.delete('/:id/damages/:damageId', permissionGuard('bookings', 'edit'), removeBookingDamage);
router.post('/:id/complete-settle', permissionGuard('bookings', 'edit'), completeAndSettleBooking);
router.post('/:id/whatsapp', permissionGuard('bookings', 'view'), logWhatsAppMessage);
router.get('/:id/whatsapp', permissionGuard('bookings', 'view'), getWhatsAppMessages);

// ── Main Booking CRUD Routes ──
router.get('/', permissionGuard('bookings', 'view'), getBookings);
router.get('/:id', permissionGuard('bookings', 'view'), getBooking);
router.post('/', permissionGuard('bookings', 'create'), createBooking);
router.put('/:id', permissionGuard('bookings', 'edit'), updateBooking);
router.delete('/:id', permissionGuard('bookings', 'delete'), deleteBooking);

module.exports = router;