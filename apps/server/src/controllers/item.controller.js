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

// ── Helper: Get Company ID from Branch ──
const getCompanyIdByBranch = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true }
  });
  return branch?.companyId || null;
};

// ── Get all items (STRICT Branch-Wise) ──
const getItems = async (req, res) => {
  try {
    const { categoryId, search, isActive } = req.query;
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

    if (categoryId) where.categoryId = parseInt(categoryId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { description: { contains: search} },
        { code: { contains: search} },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: { 
        category: { 
          select: { id: true, name: true, color: true, branchId: true } 
        },
        branch: {
          select: { id: true, name: true }
        },
        _count: {
          select: { menuItems: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ 
      success: true, 
      count: items.length, 
      data: items,
      branch: branchId
    });
  } catch (error) {
    console.error('getItems error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── Get single item ──
const getItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const item = await prisma.item.findUnique({
      where: { id },
      include: { 
        category: { select: { id: true, name: true, color: true, branchId: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { menuItems: true } }
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const itemBranchId = item.branchId || item.category?.branchId;
    if (itemBranchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This item belongs to another branch.' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('getItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── Create item ──
const createItem = async (req, res) => {
  try {
    const { 
      name, description, salePrice, costPrice, categoryId, code, 
      unit, isBulkUnit, conversionRate, subUnitName, isActive, branchId, companyId 
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (salePrice === undefined || salePrice === null || parseFloat(salePrice) < 0) {
      return res.status(400).json({ success: false, message: 'Valid sale price is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
      select: { id: true, name: true, branchId: true }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.branchId !== targetBranchId) {
      return res.status(403).json({ success: false, message: 'This category belongs to another branch.' });
    }

    if (code?.trim()) {
      const existingItem = await prisma.item.findFirst({
        where: { code: code.trim(), branchId: targetBranchId }
      });
      if (existingItem) {
        return res.status(409).json({ success: false, message: 'Item with this code already exists in your branch.' });
      }
    }

    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        description: description || null,
        salePrice: parseFloat(salePrice),
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        categoryId: parseInt(categoryId),
        code: code?.trim() || null,
        unit: unit?.trim() || 'Degh',
        isBulkUnit: Boolean(isBulkUnit),
        conversionRate: conversionRate ? parseFloat(conversionRate) : 1,
        subUnitName: subUnitName?.trim() || 'plate',
        isActive: isActive !== undefined ? isActive : true,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId)
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { menuItems: true } }
      }
    });

    res.status(201).json({ success: true, data: item, message: 'Item created successfully' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Item code already exists in this branch' });
    }
    console.error('createItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── Update item ──
const updateItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const { 
      name, description, salePrice, costPrice, categoryId, code, 
      unit, isBulkUnit, conversionRate, subUnitName, isActive 
    } = req.body;

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const existing = await prisma.item.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, category: { select: { branchId: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const itemBranchId = existing.branchId || existing.category?.branchId;
    if (itemBranchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This item belongs to another branch.' });
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
        select: { branchId: true }
      });
      if (!category || category.branchId !== branchId) {
        return res.status(403).json({ success: false, message: 'Invalid category for this branch.' });
      }
    }

    if (code?.trim()) {
      const duplicateItem = await prisma.item.findFirst({
        where: { code: code.trim(), branchId: branchId, NOT: { id: id } }
      });
      if (duplicateItem) {
        return res.status(409).json({ success: false, message: 'Another item with this code already exists.' });
      }
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(salePrice !== undefined && { salePrice: parseFloat(salePrice) }),
        ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }),
        ...(categoryId !== undefined && { categoryId: parseInt(categoryId) }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(isBulkUnit !== undefined && { isBulkUnit: Boolean(isBulkUnit) }),
        ...(conversionRate !== undefined && { conversionRate: parseFloat(conversionRate) }),
        ...(subUnitName !== undefined && { subUnitName: subUnitName.trim() }),
        ...(isActive !== undefined && { isActive }),
        branchId: branchId
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { menuItems: true } }
      }
    });

    res.status(200).json({ success: true, data: item, message: 'Item updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Code already exists in this branch' });
    }
    console.error('updateItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── Delete item ──
const deleteItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const existing = await prisma.item.findUnique({
      where: { id },
      select: { id: true, branchId: true, category: { select: { branchId: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const itemBranchId = existing.branchId || existing.category?.branchId;
    if (itemBranchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const menuItemCount = await prisma.menuItem.count({ where: { itemId: id } });
    if (menuItemCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: Linked to ${menuItemCount} active menu item(s).` });
    }

    await prisma.item.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    console.error('deleteItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── Get items by branch ──
const getItemsByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const branchId = parseInt(req.params.branchId);
    if (req.params.branchId && isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const items = await prisma.item.findMany({
      where: { branchId },
      include: { 
        category: { select: { id: true, name: true, color: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { menuItems: true } }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('getItemsByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── Bulk create items ──
const bulkCreateItems = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items array is required' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const companyId = await getCompanyIdByBranch(branchId);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID not found for this branch.' });
    }

    const categoryIds = [...new Set(items.map(item => parseInt(item.categoryId)))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, branchId: branchId },
      select: { id: true }
    });

    if (categories.length !== categoryIds.length) {
      return res.status(400).json({ success: false, message: 'One or more categories do not belong to this branch' });
    }

    const itemsData = items.map(item => ({
      name: item.name.trim(),
      description: item.description || null,
      salePrice: parseFloat(item.salePrice) || 0,
      costPrice: item.costPrice ? parseFloat(item.costPrice) : 0,
      categoryId: parseInt(item.categoryId),
      code: item.code?.trim() || null,
      unit: item.unit?.trim() || 'Degh',
      isBulkUnit: Boolean(item.isBulkUnit),
      conversionRate: item.conversionRate ? parseFloat(item.conversionRate) : 1,
      subUnitName: item.subUnitName?.trim() || 'plate',
      isActive: item.isActive !== undefined ? item.isActive : true,
      branchId: branchId,
      companyId: companyId
    }));

    const createdItems = await prisma.$transaction(
      itemsData.map(item => prisma.item.create({ data: item }))
    );

    res.status(201).json({ 
      success: true, 
      count: createdItems.length, 
      data: createdItems,
      message: `${createdItems.length} items created successfully`
    });
  } catch (error) {
    console.error('bulkCreateItems error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getItemsByBranch,
  bulkCreateItems
};