const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// @desc    Get all stock transactions (STRICT Branch-Wise & Excludes Deleted Items)
// @route   GET /api/stock-transactions
const getStockTransactions = async (req, res) => {
  try {
    const { inventoryId, type, startDate, endDate, search } = req.query;
    const where = {};
    
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }
    
    where.branchId = branchId;

    if (inventoryId) where.inventoryId = parseInt(inventoryId);
    if (type) where.type = type;

    // ✅ Exclude transactions whose inventory item is soft-deleted
    where.inventory = {
      deletedAt: null
    };

    // Optional text search filter support
    if (search) {
      where.inventory.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        inventory: { select: { id: true, name: true, code: true, unit: true, deletedAt: true } },
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ 
      success: true, 
      count: transactions.length, 
      data: transactions,
      branch: branchId
    });
  } catch (error) {
    console.error('getStockTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single stock transaction by ID
// @route   GET /api/stock-transactions/:id
const getStockTransaction = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    }

    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        inventory: { select: { id: true, name: true, code: true, unit: true } },
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Stock transaction not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }
    
    if (transaction.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This transaction belongs to another branch.' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error('getStockTransaction error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Purge/Delete old stock transactions older than X years (Super Admin / Admin only)
// @route   DELETE /api/stock-transactions/purge
const purgeOldTransactions = async (req, res) => {
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

    const deleteResult = await prisma.stockTransaction.deleteMany({
      where: {
        branchId: branchId,
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `Successfully purged ${deleteResult.count} old transactions older than ${yearsToKeep} years.`,
      deletedCount: deleteResult.count 
    });
  } catch (error) {
    console.error('purgeOldTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { 
  getStockTransactions, 
  getStockTransaction,
  purgeOldTransactions 
};