const express = require('express');
const router = express.Router();
const {
  getReceiptSettings,
  getReceiptSetting,
  getReceiptSettingsByBranch,
  createReceiptSetting,
  updateReceiptSetting,
  deleteReceiptSetting
} = require('../controllers/receiptSettingsController');
const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

router.get('/branch/:branchId', authorize('admin', 'super_admin', 'manager'), getReceiptSettingsByBranch);
router.get('/', getReceiptSettings);
router.get('/:id', getReceiptSetting);
router.post('/', authorize('admin', 'super_admin', 'manager'), createReceiptSetting);
router.put('/:id', authorize('admin', 'super_admin', 'manager'), updateReceiptSetting);
router.delete('/:id', authorize('super_admin'), deleteReceiptSetting);

module.exports = router;