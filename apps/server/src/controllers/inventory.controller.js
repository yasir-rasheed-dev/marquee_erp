const prisma = require('../config/database');

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

// @desc    Get all inventory items (STRICT Branch-Wise)
// @route   GET /api/inventory
const getInventoryItems = async (req, res) => {
  try {
    const { search, category, isActive } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = { branchId, deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} }
      ];
    }
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ 
      success: true, 
      count: items.length, 
      data: items,
      branch: branchId
    });
  } catch (error) {
    console.error('getInventoryItems error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
const getInventoryItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } }
    });

    if (!item || item.deletedAt) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (item.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This item belongs to another branch.' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('getInventoryItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create inventory item (Supports Boxes conversion, Stock Toggles)
// @route   POST /api/inventory
const createInventoryItem = async (req, res) => {
  try {
    const { 
      name, code, category, subCategory, unit, 
      minStock, maxStock, avgCostPrice, salePrice, 
      branchId, companyId,
      isBoxEnabled, unitsPerBox, openingStock,
      manageStock, isPosVisible
    } = req.body;

    if (!name?.trim() || !category?.trim() || !unit?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, category, and unit are required.' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    if (code?.trim()) {
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          code: code.trim(),
          companyId: parseInt(targetCompanyId),
          deletedAt: null
        }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Item with this code already exists in the company.' });
      }
    }

    // 📦 Handle Box to Units Auto-Conversion
    const boxEnabled = Boolean(isBoxEnabled);
    const boxUnits = boxEnabled ? parseInt(unitsPerBox) || 1 : 1;
    let finalStock = 0;

    if (manageStock !== false) {
      const rawStock = parseFloat(openingStock || req.body.currentStock) || 0;
      // Agar box enabled hai aur user ne boxes diye hain, toh total units = boxes * unitsPerBox
      finalStock = boxEnabled ? rawStock * boxUnits : rawStock;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        category: category.trim(),
        subCategory: subCategory?.trim() || null,
        unit: unit.trim(),
        currentStock: finalStock,
        minStock: minStock ? parseFloat(minStock) : 0,
        maxStock: maxStock ? parseFloat(maxStock) : 0,
        avgCostPrice: avgCostPrice ? parseFloat(avgCostPrice) : 0,
        lastCostPrice: avgCostPrice ? parseFloat(avgCostPrice) : 0,
        salePrice: salePrice ? parseFloat(salePrice) : 0,
        isBoxEnabled: boxEnabled,
        unitsPerBox: boxUnits,
        manageStock: manageStock !== false,
        isPosVisible: isPosVisible !== false,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId),
        createdById: req.user?.id || null
      },
      include: { branch: { select: { id: true, name: true } } }
    });

    // 📝 Log initial opening stock purchase transaction if stock > 0
    if (finalStock > 0 && manageStock !== false) {
      try {
        await prisma.stockTransaction.create({
          data: {
            inventoryId: item.id,
            type: 'PURCHASE',
            quantity: finalStock,
            costPrice: parseFloat(avgCostPrice) || 0,
            notes: boxEnabled ? `Initial Opening Stock (${openingStock} boxes)` : 'Initial Opening Stock',
            userId: req.user?.id || 1,
            branchId: targetBranchId,
            companyId: parseInt(targetCompanyId)
          }
        });
      } catch (txErr) {
        console.warn('Initial stock transaction logging warning:', txErr.message);
      }
    }

    res.status(201).json({ success: true, message: 'Inventory item created successfully', data: item });
  } catch (error) {
    console.error('createInventoryItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
const updateInventoryItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, branchId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This item belongs to another branch.' });
    }

    const { 
      name, code, category, subCategory, unit, 
      minStock, maxStock, avgCostPrice, salePrice, isActive,
      isBoxEnabled, unitsPerBox, manageStock, isPosVisible
    } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(category && { category: category.trim() }),
        ...(subCategory !== undefined && { subCategory: subCategory?.trim() || null }),
        ...(unit && { unit: unit.trim() }),
        ...(minStock !== undefined && { minStock: parseFloat(minStock) }),
        ...(maxStock !== undefined && { maxStock: parseFloat(maxStock) }),
        ...(avgCostPrice !== undefined && { avgCostPrice: parseFloat(avgCostPrice) }),
        ...(salePrice !== undefined && { salePrice: parseFloat(salePrice) }),
        ...(isActive !== undefined && { isActive }),
        ...(isBoxEnabled !== undefined && { isBoxEnabled: Boolean(isBoxEnabled) }),
        ...(unitsPerBox !== undefined && { unitsPerBox: parseInt(unitsPerBox) || 1 }),
        ...(manageStock !== undefined && { manageStock: Boolean(manageStock) }),
        ...(isPosVisible !== undefined && { isPosVisible: Boolean(isPosVisible) }),
        updatedById: req.user?.id || null
      },
      include: { branch: { select: { id: true, name: true } } }
    });

    res.status(200).json({ success: true, message: 'Item updated successfully', data: item });
  } catch (error) {
    console.error('updateInventoryItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Soft Delete inventory item
// @route   DELETE /api/inventory/:id
const deleteInventoryItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, branchId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This item belongs to another branch.' });
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('deleteInventoryItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Stock Transactions (Adjustment, Purchase, Wastage, Transfer, Sale)
// @route   POST /api/inventory/transaction
const stockTransaction = async (req, res) => {
  try {
    const { inventoryId, type, quantity, costPrice, notes, toBranchId } = req.body;
    const branchId = getBranchId(req);
    const userId = req.user?.id || 1;

    if (!inventoryId || !type || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Inventory ID, type, and quantity are required.' });
    }

    const qty = parseFloat(quantity);
    const item = await prisma.inventoryItem.findUnique({ where: { id: parseInt(inventoryId) } });
    if (!item || item.deletedAt) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (item.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Item belongs to another branch.' });
    }

    let stockChange = 0;
    if (['PURCHASE', 'ADJUSTMENT', 'TRANSFER_IN'].includes(type)) {
      stockChange = qty;
    } else if (['SALE', 'TRANSFER_OUT', 'WASTAGE'].includes(type)) {
      stockChange = -qty;
    }

    const updatedStock = item.manageStock ? parseFloat(item.currentStock) + stockChange : 0;

    const result = await prisma.$transaction(async (tx) => {
      const txLog = await tx.stockTransaction.create({
        data: {
          inventoryId: item.id,
          type,
          quantity: qty,
          costPrice: parseFloat(costPrice || item.avgCostPrice),
          notes,
          userId,
          branchId,
          companyId: item.companyId
        }
      });

      if (item.manageStock) {
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { currentStock: updatedStock }
        });
      }

      if (['TRANSFER_OUT', 'TRANSFER_IN'].includes(type) && toBranchId) {
        await tx.stockTransfer.create({
          data: {
            inventoryId: item.id,
            fromBranchId: branchId,
            toBranchId: parseInt(toBranchId),
            quantity: qty,
            notes,
            companyId: item.companyId,
            createdById: userId
          }
        });
      }

      return txLog;
    });

    res.status(200).json({ success: true, message: 'Stock transaction recorded successfully', data: result });
  } catch (error) {
    console.error('stockTransaction error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get Item Complete Janamkundli / Transaction History
// @route   GET /api/inventory/items/:id/history
const getItemHistory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, branchId: true }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && item.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const transactions = await prisma.stockTransaction.findMany({
      where: { inventoryId: id },
      include: {
        branch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('getItemHistory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  stockTransaction,
  getItemHistory
};