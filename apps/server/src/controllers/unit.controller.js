const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// @desc    Get all units (STRICT Branch-Wise & Optional Type Filter)
// @route   GET /api/units
const getUnits = async (req, res) => {
  try {
    const { search, type } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId };
    
    // ✅ Optional type filter (e.g. ?type=INVENTORY or ?type=POS)
    if (type) {
      where.OR_TYPE = undefined;
      if (type === 'INVENTORY') {
        where.OR = [
          { type: 'INVENTORY' },
          { type: 'BOTH' }
        ];
      } else if (type === 'POS') {
        where.OR = [
          { type: 'POS' },
          { type: 'BOTH' }
        ];
      } else {
        where.type = type;
      }
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { symbol: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: units.length,
      data: units,
      branch: branchId
    });
  } catch (error) {
    console.error('getUnits error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create unit
// @route   POST /api/units
const createUnit = async (req, res) => {
  try {
    const { name, symbol, description, type, branchId, companyId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Unit name is required' });
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

    // ✅ Check duplicate unit name in same branch
    const existing = await prisma.unit.findFirst({
      where: {
        name: name.trim(),
        branchId: targetBranchId
      }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Unit with this name already exists in this branch.' });
    }

    const unit = await prisma.unit.create({
      data: {
        name: name.trim(),
        symbol: symbol?.trim() || null,
        description: description?.trim() || null,
        type: type || 'BOTH', // ✅ Saved unit type (INVENTORY, POS, or BOTH)
        isActive: true,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId)
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  } catch (error) {
    console.error('createUnit error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update unit
// @route   PUT /api/units/:id
const updateUnit = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid unit ID' });
    }

    const existing = await prisma.unit.findUnique({ 
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // ✅ STRICT branch check
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This unit belongs to another branch.' });
    }

    const { name, symbol, description, type, isActive } = req.body;

    // ✅ Check duplicate name in same branch (excluding current)
    if (name) {
      const duplicate = await prisma.unit.findFirst({
        where: {
          name: name.trim(),
          branchId: branchId,
          NOT: { id: id }
        }
      });

      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Another unit with this name already exists in this branch.' });
      }
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(symbol !== undefined && { symbol: symbol?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type !== undefined && { type }), // ✅ Updated unit type
        ...(isActive !== undefined && { isActive })
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Unit updated successfully',
      data: unit
    });
  } catch (error) {
    console.error('updateUnit error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete unit
// @route   DELETE /api/units/:id
const deleteUnit = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid unit ID' });
    }

    const existing = await prisma.unit.findUnique({ 
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // ✅ STRICT branch check
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This unit belongs to another branch.' });
    }

    await prisma.unit.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    console.error('deleteUnit error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { getUnits, createUnit, updateUnit, deleteUnit };