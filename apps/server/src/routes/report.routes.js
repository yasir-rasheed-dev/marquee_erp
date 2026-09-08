// ═══════════════════════════════════════════════════════════
// routes/report.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../common/middleware/auth');
const {
  getProfitLossReport,
  getBookingReportsSummary,
  getFinanceReportsSummary,
  getInventoryReportsSummary,
  getKitchenReportsSummary,
} = require('../controllers/reportController');

// All report routes require authentication
router.use(authMiddleware);

router.get('/profit-loss', getProfitLossReport);
router.get('/bookings-summary', getBookingReportsSummary);
router.get('/finance-summary', getFinanceReportsSummary);
router.get('/inventory-summary', getInventoryReportsSummary);
router.get('/kitchen-summary', getKitchenReportsSummary);

module.exports = router;
