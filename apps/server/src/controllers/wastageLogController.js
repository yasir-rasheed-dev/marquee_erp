// ═══════════════════════════════════════════════════════════
// controllers/wastageLog.controller.js
// Wastage Logs | Stock Deduct | Reason Tracking | Cost Analysis
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_WASTAGE_REASONS = [
  'expired',
  'spoiled',
  'damaged',
  'overproduction',
  'burned',
  'dropped',
  'theft',
  'other'
];

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// ── Helper: Get Company ID from Branch ──
const getCompanyIdByBranch = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true }
  });
  return branch?.companyId || null;
};

// ═══════════════════════════════════════════════════════════
// WASTAGE LOGS
// ═══════════════════════════════════════════════════════════

// ── GET ALL WASTAGE LOGS (STRICT Branch-Wise + Filters) ──
const getWastageLogs = async (req, res) => {
  try {
    const { search, reason, inventoryId, bookingId, startDate, endDate } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId };

    if (reason) where.reason = reason;
    if (inventoryId) where.inventoryId = parseInt(inventoryId);
    if (bookingId) where.bookingId = parseInt(bookingId);

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search && search.trim() !== '') {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { description: { contains: search.trim()} },
          { inventory: { name: { contains: search.trim()} } },
          { inventory: { code: { contains: search.trim()} } }
        ]
      });
    }

    const logs = await prisma.wastageLog.findMany({
      where,
      include: {
        inventory: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            avgCostPrice: true
          }
        },
        booking: {
          select: {
            id: true,
            bookingNo: true,
            title: true,
            guestName: true
          }
        },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true, symbol: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich with live cost
    const enriched = logs.map(log => {
      const costPerUnit = log.inventory
        ? parseFloat(log.inventory.avgCostPrice) || 0
        : 0;
      const qty = parseFloat(log.quantity) || 0;
      return {
        ...log,
        liveCostPerUnit: parseFloat(costPerUnit.toFixed(2)),
        liveTotalCost: parseFloat((costPerUnit * qty).toFixed(2))
      };
    });

    // Summary
    const totalWastageCost = enriched.reduce((sum, log) => sum + (log.liveTotalCost || 0), 0);
    const totalQuantity = enriched.reduce((sum, log) => sum + (parseFloat(log.quantity) || 0), 0);

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
      summary: {
        totalWastageCost: parseFloat(totalWastageCost.toFixed(2)),
        totalQuantity: parseFloat(totalQuantity.toFixed(3))
      },
      branch: branchId
    });
  } catch (error) {
    console.error('getWastageLogs error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET SINGLE WASTAGE LOG ──
const getWastageLog = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid wastage log ID' });
    }

    const log = await prisma.wastageLog.findUnique({
      where: { id },
      include: {
        inventory: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            avgCostPrice: true,
            currentStock: true
          }
        },
        booking: {
          select: {
            id: true,
            bookingNo: true,
            title: true,
            guestName: true,
            eventDate: true
          }
        },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true, symbol: true } }
      }
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Wastage log not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (log.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This log belongs to another branch.' });
    }

    const costPerUnit = log.inventory
      ? parseFloat(log.inventory.avgCostPrice) || 0
      : 0;
    const qty = parseFloat(log.quantity) || 0;

    res.status(200).json({
      success: true,
      data: {
        ...log,
        liveCostPerUnit: parseFloat(costPerUnit.toFixed(2)),
        liveTotalCost: parseFloat((costPerUnit * qty).toFixed(2))
      }
    });
  } catch (error) {
    console.error('getWastageLog error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── CREATE WASTAGE LOG (Auto Deduct Stock + Transaction History) ──
const createWastageLog = async (req, res) => {
  try {
    const {
      inventoryId,
      quantity,
      unit,
      unitId,
      reason,
      description,
      bookingId
    } = req.body;

    if (!inventoryId || quantity === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Inventory ID, quantity, and reason are required.'
      });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }

    const targetCompanyId = req.companyId || await getCompanyIdByBranch(branchId);
    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Validate reason
    const r = reason.toLowerCase();
    if (!VALID_WASTAGE_REASONS.includes(r)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason. Allowed: ${VALID_WASTAGE_REASONS.join(', ')}`
      });
    }

    // Verify inventory item belongs to branch
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: parseInt(inventoryId) },
      select: {
        id: true,
        name: true,
        branchId: true,
        companyId: true,
        currentStock: true,
        avgCostPrice: true,
        manageStock: true,
        unit: true
      }
    });

    if (!inventoryItem) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    if (inventoryItem.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Inventory item belongs to another branch.' });
    }

    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than 0.' });
    }

    // Stock check
    if (inventoryItem.manageStock) {
      const available = parseFloat(inventoryItem.currentStock) || 0;
      if (available < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Available: ${available} ${inventoryItem.unit}, Requested: ${qty}`
        });
      }
    }

    const userId = req.user?.id || 1;

    const result = await prisma.$transaction(async (tx) => {
      // Create wastage log
      const log = await tx.wastageLog.create({
        data: {
          inventoryId: parseInt(inventoryId),
          quantity: qty,
          unit: unit?.trim() || inventoryItem.unit,
          unitId: unitId ? parseInt(unitId) : null,
          reason: r,
          description: description || null,
          bookingId: bookingId ? parseInt(bookingId) : null,
          branchId,
          companyId: parseInt(targetCompanyId),
          createdById: userId
        },
        include: {
          inventory: { select: { id: true, name: true, code: true, unit: true } },
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } }
        }
      });

      // Deduct stock if managed
      if (inventoryItem.manageStock) {
        const currentStock = parseFloat(inventoryItem.currentStock) || 0;
        const newStock = parseFloat((currentStock - qty).toFixed(3));
        const costPrice = parseFloat(inventoryItem.avgCostPrice) || 0;

        await tx.inventoryItem.update({
          where: { id: parseInt(inventoryId) },
          data: { currentStock: newStock }
        });

        // Create stock transaction for audit trail
        await tx.stockTransaction.create({
          data: {
            inventoryId: parseInt(inventoryId),
            type: 'WASTAGE',
            quantity: qty,
            costPrice: costPrice,
            notes: `Wastage: ${r}${description ? ' — ' + description : ''}`,
            referenceType: 'WASTAGE_LOG',
            referenceId: log.id,
            bookingId: bookingId ? parseInt(bookingId) : null,
            userId: userId,
            branchId: branchId,
            companyId: parseInt(targetCompanyId)
          }
        });
      }

      return log;
    });

    res.status(201).json({
      success: true,
      message: 'Wastage log created and stock deducted successfully.',
      data: result
    });
  } catch (error) {
    console.error('createWastageLog error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── UPDATE WASTAGE LOG (Only description/reason — stock already deducted) ──
const updateWastageLog = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid wastage log ID' });
    }

    const existing = await prisma.wastageLog.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Wastage log not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This log belongs to another branch.' });
    }

    const { reason, description } = req.body;
    const data = {};

    if (reason !== undefined) {
      const r = reason.toLowerCase();
      if (!VALID_WASTAGE_REASONS.includes(r)) {
        return res.status(400).json({
          success: false,
          message: `Invalid reason. Allowed: ${VALID_WASTAGE_REASONS.join(', ')}`
        });
      }
      data.reason = r;
    }
    if (description !== undefined) data.description = description;

    const updated = await prisma.wastageLog.update({
      where: { id },
      data,
      include: {
        inventory: { select: { id: true, name: true, code: true, unit: true, avgCostPrice: true } },
        booking: { select: { id: true, bookingNo: true, title: true } },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      }
    });

    const costPerUnit = updated.inventory
      ? parseFloat(updated.inventory.avgCostPrice) || 0
      : 0;
    const qty = parseFloat(updated.quantity) || 0;

    res.status(200).json({
      success: true,
      message: 'Wastage log updated successfully',
      data: {
        ...updated,
        liveCostPerUnit: parseFloat(costPerUnit.toFixed(2)),
        liveTotalCost: parseFloat((costPerUnit * qty).toFixed(2))
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Wastage log not found' });
    }
    console.error('updateWastageLog error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── DELETE WASTAGE LOG (Hard Delete — schema has no deletedAt) ──
const deleteWastageLog = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid wastage log ID' });
    }

    const existing = await prisma.wastageLog.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Wastage log not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This log belongs to another branch.' });
    }

    await prisma.wastageLog.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Wastage log deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Wastage log not found' });
    }
    console.error('deleteWastageLog error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET WASTAGE SUMMARY / REPORT (Group by reason, inventory, date) ──
const getWastageReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'reason' } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });
    }

    const where = { branchId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.wastageLog.findMany({
      where,
      include: {
        inventory: { select: { id: true, name: true, avgCostPrice: true } }
      }
    });

    let report = [];

    if (groupBy === 'reason') {
      const grouped = {};
      for (const log of logs) {
        const key = log.reason;
        const cost = (parseFloat(log.inventory?.avgCostPrice) || 0) * (parseFloat(log.quantity) || 0);
        if (!grouped[key]) {
          grouped[key] = { reason: key, count: 0, totalQuantity: 0, totalCost: 0 };
        }
        grouped[key].count += 1;
        grouped[key].totalQuantity += parseFloat(log.quantity) || 0;
        grouped[key].totalCost += cost;
      }
      report = Object.values(grouped).map(r => ({
        ...r,
        totalQuantity: parseFloat(r.totalQuantity.toFixed(3)),
        totalCost: parseFloat(r.totalCost.toFixed(2))
      }));
    } else if (groupBy === 'inventory') {
      const grouped = {};
      for (const log of logs) {
        const key = log.inventoryId;
        const cost = (parseFloat(log.inventory?.avgCostPrice) || 0) * (parseFloat(log.quantity) || 0);
        if (!grouped[key]) {
          grouped[key] = {
            inventoryId: key,
            inventoryName: log.inventory?.name || 'Unknown',
            count: 0,
            totalQuantity: 0,
            totalCost: 0
          };
        }
        grouped[key].count += 1;
        grouped[key].totalQuantity += parseFloat(log.quantity) || 0;
        grouped[key].totalCost += cost;
      }
      report = Object.values(grouped).map(r => ({
        ...r,
        totalQuantity: parseFloat(r.totalQuantity.toFixed(3)),
        totalCost: parseFloat(r.totalCost.toFixed(2))
      }));
    } else if (groupBy === 'date') {
      const grouped = {};
      for (const log of logs) {
        const key = log.createdAt.toISOString().split('T')[0];
        const cost = (parseFloat(log.inventory?.avgCostPrice) || 0) * (parseFloat(log.quantity) || 0);
        if (!grouped[key]) {
          grouped[key] = { date: key, count: 0, totalQuantity: 0, totalCost: 0 };
        }
        grouped[key].count += 1;
        grouped[key].totalQuantity += parseFloat(log.quantity) || 0;
        grouped[key].totalCost += cost;
      }
      report = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).map(r => ({
        ...r,
        totalQuantity: parseFloat(r.totalQuantity.toFixed(3)),
        totalCost: parseFloat(r.totalCost.toFixed(2))
      }));
    }

    const grandTotal = report.reduce((sum, r) => sum + r.totalCost, 0);

    res.status(200).json({
      success: true,
      groupBy,
      data: report,
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      totalLogs: logs.length
    });
  } catch (error) {
    console.error('getWastageReport error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getWastageLogs,
  getWastageLog,
  createWastageLog,
  updateWastageLog,
  deleteWastageLog,
  getWastageReport
};

