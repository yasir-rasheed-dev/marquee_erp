const express = require('express');
const router = express.Router();
const { 
  getStockTransfers, 
  getStockTransfer, 
  purgeOldTransfers 
} = require('../controllers/stocktransfer.contoller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

router.use(authMiddleware);

// Static routes first
router.get('/', getStockTransfers);
router.delete('/purge', authorize('super_admin', 'admin'), purgeOldTransfers);

// Dynamic routes last
router.get('/:id', getStockTransfer);

module.exports = router;