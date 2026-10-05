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

// @desc    Get all categories (STRICT Branch-Wise + Optional Scope Filter)
const getCategories = async (req, res) => {
  try {
    const { search, isActive, scope } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId };

    if (scope && scope !== 'ALL') {
      where.OR = [
        { scope: scope.toUpperCase() },
        { scope: 'ALL' }
      ];
    }

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: search} },
          { description: { contains: search} },
          { code: { contains: search} },
        ]
      });
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
      branch: branchId
    });
  } catch (error) {
    console.error('getCategories error 500 details:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single category
const getCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        items: {
          where: { isActive: true },
          select: { id: true, name: true }
        },
        _count: {
          select: {
            items: true
          }
        }
      },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    if (category.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This category belongs to another branch.'
      });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error('getCategory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create category (Branch-Wise + Scope)
const createCategory = async (req, res) => {
  try {
    const { name, description, color, icon, code, scope, branchId, companyId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }
    targetBranchId = parseInt(targetBranchId);

    // ✅ Pehle req.body dekho ke aa kya raha hai
    console.log('🔴 BACKEND req.body:', req.body);
    
    let targetCompanyId = companyId || req.companyId || req.user?.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }
    targetCompanyId = targetCompanyId ? parseInt(targetCompanyId) : null;

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Branch may not be linked to any company.'
      });
    }

    const orConditions = [
      { name: { equals: name.trim()} }
    ];
    if (code?.trim()) {
      orConditions.push({ code: { equals: code.trim()} });
    }

   const existing = await prisma.category.findFirst({
  where: {
    OR: orConditions,
    companyId: parseInt(targetCompanyId), // ⚠️ If targetCompanyId is NaN or null, this breaks completely!
    deletedAt: null
  }
});

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name or code already exists in this company'
      });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || null,
        icon: icon || null,
        code: code?.trim() || null,
        scope: scope?.toUpperCase() || 'ALL',
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId),
        isActive: true
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { items: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: category,
      message: `Category "${category.name}" created successfully`
    });
  } catch (error) {
    console.error('createCategory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update category
const updateCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This category belongs to another branch.'
      });
    }

    const { name, description, color, icon, isActive, code, scope } = req.body;

    if (name || code) {
      const duplicate = await prisma.category.findFirst({
        where: {
          OR: [
            name ? { name: { equals: name.trim()} } : {},
            code ? { code: { equals: code.trim()} } : {}
          ],
          companyId: existing.companyId || (await getCompanyIdByBranch(branchId)),
          NOT: { id: id },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another category with this name or code already exists'
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(color !== undefined && { color: color || null }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(scope !== undefined && { scope: scope.toUpperCase() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { items: true }
        }
      }
    });

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    console.error('updateCategory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete category (Soft delete)
const deleteCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, branchId: true, name: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This category belongs to another branch.'
      });
    }

    const linkedCounts = await prisma.category.findUnique({
      where: { id },
      select: {
        _count: {
          select: { items: true }
        }
      }
    });

    const totalLinked = linkedCounts._count.items;

    if (totalLinked > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${totalLinked} item(s) linked. Move or reassign them first.`,
        linkedCounts: linkedCounts._count
      });
    }

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.status(200).json({
      success: true,
      message: `Category "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    console.error('deleteCategory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get categories by branch
const getCategoriesByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Super Admin required.'
      });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const categories = await prisma.category.findMany({
      where: { branchId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('getCategoriesByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByBranch,
};