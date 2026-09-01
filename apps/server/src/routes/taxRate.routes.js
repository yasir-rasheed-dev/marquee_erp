const express = require('express');
const router = express.Router();
const {
  getTaxRates,
  getTaxRate,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
} = require('../controllers/taxRate.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

// Routes
router.get('/', getTaxRates);
router.post('/', authorize('admin', 'super_admin', 'manager'), createTaxRate);
router.get('/:id', getTaxRate);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateTaxRate);
router.delete('/:id', authorize('admin', 'super_admin'), deleteTaxRate);

module.exports = router;