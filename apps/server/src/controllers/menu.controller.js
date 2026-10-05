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

// @desc    Get all menus (STRICT Branch-Wise)
const getMenus = async (req, res) => {
  try {
    const { search, status, eventType } = req.query;
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

    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} },
        { eventType: { contains: search} },
      ];
    }
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;

    const menus = await prisma.menu.findMany({
      where,
      include: {
        categories: {
          include: { 
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    salePrice: true,
                    costPrice: true
                  }
                }
              }
            }
          },
          orderBy: { sortOrder: 'asc' },
        },
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            categories: true,
            items: true,
            packageMenus: true,
            bookingMenus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ 
      success: true, 
      count: menus.length, 
      data: menus,
      branch: branchId
    });
  } catch (error) {
    console.error('getMenus error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single menu
const getMenu = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.' 
      });
    }

    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        categories: {
          include: { 
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    salePrice: true,
                    costPrice: true
                  }
                }
              }
            }
          },
          orderBy: { sortOrder: 'asc' },
        },
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            categories: true,
            items: true,
            packageMenus: true,
            bookingMenus: true
          }
        }
      },
    });

    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    if (menu.branchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This menu belongs to another branch.' 
      });
    }

    res.status(200).json({ success: true, data: menu });
  } catch (error) {
    console.error('getMenu error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create menu with nested categories & items
const createMenu = async (req, res) => {
  try {
    const { name, code, description, eventType, packageType, status, guestCount, branchId, companyId, categories } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Menu name is required' });
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
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    let totalCost = 0;
    let totalSale = 0;
    const guests = parseInt(guestCount) || 100;

    categories?.forEach((cat) => {
      cat.items?.forEach((item) => {
        const cost = parseFloat(item.costPrice) || 0;
        const sale = parseFloat(item.salePrice) || 0;
        const qty = parseFloat(item.quantityPerHead) || 1;
        totalCost += cost * qty;
        totalSale += sale * qty;
      });
    });

    const profitMargin = totalSale > 0 ? ((totalSale - totalCost) / totalSale) * 100 : 0;

    const menu = await prisma.$transaction(async (tx) => {
      const newMenu = await tx.menu.create({
        data: {
          name: name.trim(),
          code: code?.trim() || null,
          description: description || null,
          eventType: eventType || null,
          packageType: packageType || 'per_head',
          status: status || 'active',
          guestCount: guests,
          branchId: targetBranchId,
          companyId: parseInt(targetCompanyId),
          totalCostPrice: totalCost,
          totalSalePrice: totalSale,
          profitMargin: profitMargin,
        }
      });

      if (categories && categories.length > 0) {
        for (const [catIdx, cat] of categories.entries()) {
          const newCategory = await tx.menuCategory.create({
            data: {
              name: cat.name.trim(),
              sortOrder: cat.sortOrder || catIdx,
              menuId: newMenu.id,
            }
          });

          if (cat.items && cat.items.length > 0) {
            for (const item of cat.items) {
              await tx.menuItem.create({
                data: {
                  name: item.name.trim(),
                  code: item.code?.trim() || null,
                  description: item.description || null,
                  unit: item.unit || 'Degh',
                  costPrice: parseFloat(item.costPrice) || 0,
                  salePrice: parseFloat(item.salePrice) || 0,
                  quantityPerHead: parseFloat(item.quantityPerHead) || 1,
                  isBulkUnit: Boolean(item.isBulkUnit),
                  conversionRate: parseFloat(item.conversionRate) || 50,
                  subUnitName: item.subUnitName?.trim() || 'plate',
                  isActive: item.isActive !== undefined ? item.isActive : true,
                  itemId: item.itemId ? parseInt(item.itemId) : null,
                  menuId: newMenu.id,
                  categoryId: newCategory.id,
                  branchId: targetBranchId,
                  companyId: parseInt(targetCompanyId)
                }
              });
            }
          }
        }
      }

      return await tx.menu.findUnique({
        where: { id: newMenu.id },
        include: {
          categories: {
            include: {
              items: {
                include: {
                  item: { select: { id: true, name: true, code: true } }
                }
              }
            }
          },
          branch: { select: { id: true, name: true } }
        }
      });
    });

    res.status(201).json({ 
      success: true, 
      data: menu,
      message: `Menu created successfully!`
    });
  } catch (error) {
    console.error('createMenu error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update menu (FIXED TRANSACTION & MENU_ID MAPPING)
const updateMenu = async (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    if (isNaN(menuId)) {
      return res.status(400).json({ success: false, message: 'Invalid menu ID' });
    }

    const { name, code, description, eventType, packageType, status, guestCount, categories } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Menu name is required' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.' 
      });
    }

    const existing = await prisma.menu.findUnique({
      where: { id: menuId },
      select: { id: true, branchId: true, companyId: true, guestCount: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This menu belongs to another branch.' 
      });
    }

    let totalCost = 0;
    let totalSale = 0;
    const guests = parseInt(guestCount) || existing.guestCount || 100;

    // Calculation loop
    categories?.forEach((cat) => {
      cat.items?.forEach((item) => {
        const cost = parseFloat(item.costPrice) || 0;
        const sale = parseFloat(item.salePrice) || 0;
        const qty = parseFloat(item.quantityPerHead) || 1;
        totalCost += cost * qty;
        totalSale += sale * qty;
      });
    });

    const profitMargin = totalSale > 0 ? ((totalSale - totalCost) / totalSale) * 100 : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items directly linked to menu first
      await tx.menuItem.deleteMany({ where: { menuId } });

      // 2. Delete existing categories linked to menu
      await tx.menuCategory.deleteMany({ where: { menuId } });

      // 3. Update main menu fields
      await tx.menu.update({
        where: { id: menuId },
        data: {
          name: name.trim(),
          code: code?.trim() || null,
          description: description || null,
          eventType: eventType || null,
          packageType: packageType || 'per_head',
          status: status || 'active',
          guestCount: guests,
          totalCostPrice: totalCost,
          totalSalePrice: totalSale,
          profitMargin: profitMargin,
        }
      });

      // 4. Re-create categories & items explicitly with menuId & categoryId
      if (categories && categories.length > 0) {
        for (const [catIdx, cat] of categories.entries()) {
          const newCategory = await tx.menuCategory.create({
            data: {
              name: cat.name.trim(),
              sortOrder: cat.sortOrder || catIdx,
              menuId: menuId,
            }
          });

          if (cat.items && cat.items.length > 0) {
            for (const item of cat.items) {
              await tx.menuItem.create({
                data: {
                  name: item.name.trim(),
                  code: item.code?.trim() || null,
                  description: item.description || null,
                  unit: item.unit || 'plate',
                  costPrice: parseFloat(item.costPrice) || 0,
                  salePrice: parseFloat(item.salePrice) || 0,
                  quantityPerHead: parseFloat(item.quantityPerHead) || 1,
                  isBulkUnit: Boolean(item.isBulkUnit),
                  conversionRate: parseFloat(item.conversionRate) || 1,
                  subUnitName: item.subUnitName?.trim() || 'plate',
                  isActive: item.isActive !== undefined ? item.isActive : true,
                  itemId: item.itemId ? parseInt(item.itemId) : null,
                  menuId: menuId,
                  categoryId: newCategory.id,
                  branchId: branchId,
                  companyId: parseInt(existing.companyId)
                }
              });
            }
          }
        }
      }

      // 5. Fetch updated data to send response
      return tx.menu.findUnique({
        where: { id: menuId },
        include: {
          categories: { 
            include: { 
              items: {
                include: {
                  item: { select: { id: true, name: true, code: true } }
                }
              }
            }
          },
          branch: { select: { id: true, name: true } },
        },
      });
    });

    res.status(200).json({ 
      success: true, 
      data: result,
      message: 'Menu updated successfully'
    });
  } catch (error) {
    console.error('updateMenu error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message
    });
  }
};

// @desc    Delete menu
const deleteMenu = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const existing = await prisma.menu.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const packageCount = await prisma.packageMenu.count({ where: { menuId: id } });
    const bookingCount = await prisma.bookingMenu.count({ where: { menuId: id } });

    if (packageCount > 0 || bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: Menu is linked to ${packageCount} package(s) and ${bookingCount} booking(s).`,
      });
    }

    await prisma.menu.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('deleteMenu error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getMenusByBranch = async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) return res.status(400).json({ success: false, message: 'Invalid branch ID' });

    const menus = await prisma.menu.findMany({
      where: { branchId },
      include: {
        categories: {
          include: { items: true },
          orderBy: { sortOrder: 'asc' },
        },
        branch: { select: { id: true, name: true } }
      },
    });

    res.status(200).json({ success: true, count: menus.length, data: menus });
  } catch (error) {
    console.error('getMenusByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenusByBranch
};