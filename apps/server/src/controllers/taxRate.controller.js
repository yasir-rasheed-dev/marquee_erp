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

// @desc    Get all tax rates (STRICT Branch-Wise / Company-Wise mapping)
const getTaxRates = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const companyId = await getCompanyIdByBranch(branchId);
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid company mapping for this branch',
        data: []
      });
    }

    const where = { companyId: parseInt(companyId) };

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.name = { contains: search};
    }

    const taxRates = await prisma.taxRate.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: taxRates.length,
      data: taxRates,
      branch: branchId
    });
  } catch (error) {
    console.error('getTaxRates error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single tax rate
const getTaxRate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tax Rate ID' });
    }

    const taxRate = await prisma.taxRate.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } }
    });

    if (!taxRate) {
      return res.status(404).json({ success: false, message: 'Tax Rate not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await getCompanyIdByBranch(branchId);
    if (taxRate.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This tax rate belongs to another company.'
      });
    }

    res.status(200).json({ success: true, data: taxRate });
  } catch (error) {
    console.error('getTaxRate error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create tax rate
const createTaxRate = async (req, res) => {
  try {
    const { name, rate, branchId, companyId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Tax name is required' });
    }
    if (rate === undefined || rate === '' || isNaN(rate)) {
      return res.status(400).json({ success: false, message: 'Valid tax rate is required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const existing = await prisma.taxRate.findFirst({
      where: {
        name: { equals: name.trim()},
        companyId: parseInt(targetCompanyId)
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Tax rate with this name already exists in this company'
      });
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        name: name.trim(),
        rate: parseFloat(rate),
        companyId: parseInt(targetCompanyId),
        isActive: true
      },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({
      success: true,
      data: taxRate,
      message: `Tax Rate "${taxRate.name}" created successfully`
    });
  } catch (error) {
    console.error('createTaxRate error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update tax rate
const updateTaxRate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tax Rate ID' });
    }

    const existing = await prisma.taxRate.findUnique({
      where: { id },
      select: { id: true, companyId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tax Rate not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const currentCompanyId = await getCompanyIdByBranch(branchId);
    if (existing.companyId !== currentCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This tax rate belongs to another company.'
      });
    }

    const { name, rate, isActive } = req.body;

    if (name) {
      const duplicate = await prisma.taxRate.findFirst({
        where: {
          name: { equals: name.trim()},
          companyId: existing.companyId,
          NOT: { id: id }
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another tax rate with this name already exists'
        });
      }
    }

    const updatedTaxRate = await prisma.taxRate.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(rate !== undefined && { rate: parseFloat(rate) }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedTaxRate,
      message: 'Tax Rate updated successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Tax Rate not found' });
    }
    console.error('updateTaxRate error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete tax rate
const deleteTaxRate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tax Rate ID' });
    }

    const existing = await prisma.taxRate.findUnique({
      where: { id },
      select: { id: true, companyId: true, name: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tax Rate not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const currentCompanyId = await getCompanyIdByBranch(branchId);
    if (existing.companyId !== currentCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This tax rate belongs to another company.'
      });
    }

    await prisma.taxRate.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: `Tax Rate "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Tax Rate not found' });
    }
    console.error('deleteTaxRate error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getTaxRates,
  getTaxRate,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
};