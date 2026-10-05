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
  if (req.user?.branchId) {
    return parseInt(req.user.branchId);
  }
  return null;
};

// @desc    Get all assets (STRICT Branch-Wise & Company Secured)
// @route   GET /api/assets
const getAssets = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const { search, condition } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = { 
      companyId: Number(companyId), 
      branchId: Number(branchId),
      deletedAt: null 
    };

    if (condition && condition !== 'ALL') {
      where.condition = condition;
    }

    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} },
        { category: { contains: search} }
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: { 
        branch: {
          select: { id: true, name: true }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ 
      success: true, 
      count: assets.length, 
      data: assets,
      branch: branchId
    });
  } catch (err) {
    console.error('getAssets error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Get all asset transactions / adjustment history
// @route   GET /api/assets/transactions
const getAssetTransactions = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const branchId = getBranchId(req);
    const { type } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = { 
      companyId: Number(companyId),
      branchId: Number(branchId)
    };

    if (type && type !== 'ALL') {
      where.type = type;
    }

    let transactions = [];
    try {
      transactions = await prisma.assetTransaction.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true, code: true, category: true } },
          branch: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (dbErr) {
      console.warn('⚠️ AssetTransaction table query warning:', dbErr.message);
    }

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    console.error('getAssetTransactions error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Get single asset by ID
// @route   GET /api/assets/:id
const getAsset = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } }
    });

    if (!asset || asset.deletedAt) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (asset.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This asset belongs to another branch.' });
    }

    res.status(200).json({ success: true, data: asset });
  } catch (err) {
    console.error('getAsset error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Get assets by specific branch (Admin/Super Admin only)
// @route   GET /api/assets/branch/:branchId
const getAssetsByBranch = async (req, res) => {
  try {
    const userRole = req.userRole || req.user?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const assets = await prisma.asset.findMany({
      where: { branchId, deletedAt: null },
      include: { branch: { select: { id: true, name: true } } }
    });

    res.status(200).json({ success: true, count: assets.length, data: assets });
  } catch (err) {
    console.error('getAssetsByBranch error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Create asset (Branch-Wise with Duplicate Code Check)
// @route   POST /api/assets
const createAsset = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const { name, code, category, condition, quantity, costPrice, branchId, notes } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Asset name is required.' });
    }

    let targetBranchId = branchId || getBranchId(req);
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }
    targetBranchId = parseInt(targetBranchId);

    if (code?.trim()) {
      const existing = await prisma.asset.findFirst({
        where: {
          code: code.trim(),
          companyId: Number(companyId),
          deletedAt: null
        }
      });

      if (existing) {
        return res.status(409).json({ 
          success: false, 
          message: 'An asset with this code/tag already exists in the company.' 
        });
      }
    }

    const qty = parseInt(quantity) || 1;
    const cost = parseFloat(costPrice) || 0;
    const totalValuation = qty * cost;

    const asset = await prisma.asset.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        category: category?.trim() || 'General',
        condition: condition || 'GOOD',
        quantity: qty,
        costPrice: cost,
        totalValuation,
        notes: notes?.trim() || null,
        companyId: Number(companyId),
        branchId: targetBranchId
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    try {
      await prisma.assetTransaction.create({
        data: {
          assetId: asset.id,
          type: 'PURCHASE',
          quantity: qty,
          notes: 'Initial Asset Purchase / Registration',
          branchId: targetBranchId,
          companyId: Number(companyId)
        }
      });
    } catch (txErr) {
      console.warn('⚠️ Initial transaction logging warning:', txErr.message);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Asset registered successfully!', 
      data: asset 
    });
  } catch (err) {
    console.error('createAsset error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
const updateAsset = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }

    const existing = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, quantity: true, costPrice: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This asset belongs to another branch.' 
      });
    }

    const { name, code, category, condition, quantity, costPrice, branchId: newBranchId, notes } = req.body;

    if (code?.trim()) {
      const duplicate = await prisma.asset.findFirst({
        where: {
          code: code.trim(),
          companyId: existing.companyId,
          NOT: { id: id },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          message: 'Another asset with this code/tag already exists.' 
        });
      }
    }

    const qty = quantity !== undefined ? parseInt(quantity) : existing.quantity;
    const cost = costPrice !== undefined ? parseFloat(costPrice) : Number(existing.costPrice);
    const totalValuation = qty * cost;

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(category && { category: category.trim() }),
        ...(condition && { condition }),
        quantity: qty,
        costPrice: cost,
        totalValuation,
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(newBranchId && { branchId: parseInt(newBranchId) })
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: 'Asset updated successfully!', 
      data: updated 
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    console.error('updateAsset error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Soft Delete asset
// @route   DELETE /api/assets/:id
const deleteAsset = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }

    const existing = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This asset belongs to another branch.' 
      });
    }

    await prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({ success: true, message: 'Asset deleted successfully!' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    console.error('deleteAsset error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Perform Asset Transaction / Adjustment (Damage, Transfer, Add/Reduce)
// @route   POST /api/assets/transaction
const createAssetTransaction = async (req, res) => {
  try {
    const { assetId, type, quantity, notes, toBranchId } = req.body;
    const companyId = req.companyId || req.user?.companyId;
    const branchId = getBranchId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (!assetId || !type || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Asset ID, type, and quantity are required.' });
    }

    const qty = parseInt(quantity);
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(assetId) } });

    if (!asset || asset.deletedAt) {
      return res.status(404).json({ success: false, message: 'Fixed asset not found.' });
    }

    if (asset.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Asset belongs to another branch.' });
    }

    let stockChange = 0;
    if (['PURCHASE', 'TRANSFER_IN', 'ADD'].includes(type)) {
      stockChange = qty;
    } else if (['ADJUSTMENT', 'TRANSFER_OUT', 'DAMAGED_LOG', 'DISPOSAL', 'REDUCE'].includes(type)) {
      stockChange = -qty;
    }

    const updatedQuantity = Math.max(0, asset.quantity + stockChange);
    const updatedValuation = updatedQuantity * Number(asset.costPrice);

    const result = await prisma.$transaction(async (tx) => {
      const txLog = await tx.assetTransaction.create({
        data: {
          assetId: asset.id,
          type,
          quantity: qty,
          notes: notes?.trim() || null,
          branchId: toBranchId ? parseInt(toBranchId) : branchId,
          companyId: Number(companyId)
        }
      });

      const updateData = {
        quantity: updatedQuantity,
        totalValuation: updatedValuation
      };

      if (type === 'TRANSFER_OUT' && toBranchId) {
        updateData.branchId = parseInt(toBranchId);
      }

      await tx.asset.update({
        where: { id: asset.id },
        data: updateData
      });

      return txLog;
    });

    res.status(200).json({
      success: true,
      message: 'Asset transaction recorded and stock updated successfully!',
      data: result
    });
  } catch (err) {
    console.error('createAssetTransaction error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

module.exports = {
  getAssets,
  getAsset,
  getAssetsByBranch,
  getAssetTransactions,
  createAsset,
  updateAsset,
  deleteAsset,
  createAssetTransaction
};