const prisma = require('../config/database');

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) {
    return parseInt(req.query.branchId);
  }
  if (req.branchId) {
    return parseInt(req.branchId);
  }
  return null;
};

// @desc    Get all stock transfers (STRICT Branch-Wise: Sent or Received)
// @route   GET /api/stock-transfers
const getStockTransfers = async (req, res) => {
  try {
    const { status, inventoryId } = req.query;
    
    // ✅ STRICT branch filter
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = {
      OR: [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ]
    };

    if (status) where.status = status;
    if (inventoryId) where.inventoryId = parseInt(inventoryId);

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        inventory: { 
          select: { id: true, name: true, code: true, unit: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ 
      success: true, 
      count: transfers.length, 
      data: transfers,
      branch: branchId
    });
  } catch (error) {
    console.error('getStockTransfers error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single stock transfer by ID
// @route   GET /api/stock-transfers/:id
const getStockTransfer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transfer ID' });
    }

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        inventory: { 
          select: { id: true, name: true, code: true, unit: true } 
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Stock transfer not found' });
    }

    // ✅ STRICT branch check (User ki branch ya toh sender ho ya receiver)
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (transfer.fromBranchId !== branchId && transfer.toBranchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This transfer does not belong to your branch.' 
      });
    }

    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    console.error('getStockTransfer error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Purge/Delete old stock transfers older than X years (Super Admin / Admin only)
// @route   DELETE /api/stock-transfers/purge
const purgeOldTransfers = async (req, res) => {
  try {
    if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super Admin or Admin required to purge data.' 
      });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.' 
      });
    }

    const yearsToKeep = parseInt(req.query.years) || 3;
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToKeep);

    const deleteResult = await prisma.stockTransfer.deleteMany({
      where: {
        OR: [
          { fromBranchId: branchId },
          { toBranchId: branchId }
        ],
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `Successfully purged ${deleteResult.count} old transfers older than ${yearsToKeep} years.`,
      deletedCount: deleteResult.count 
    });
  } catch (error) {
    console.error('purgeOldTransfers error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { 
  getStockTransfers, 
  getStockTransfer, 
  purgeOldTransfers 
};