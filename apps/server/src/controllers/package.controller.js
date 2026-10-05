// ═══════════════════════════════════════════════════════════
// controllers/package.controller.js
// BANQUET PACKAGES — Robust & Multi-Tenant (Branch-Wise)
// ═══════════════════════════════════════════════════════════

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

// @desc    Get all Packages (STRICT Branch-Wise + Search & Status Filter)
const getPackages = async (req, res) => {
  try {
    const { search, status, eventType } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId, deletedAt: null };

    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} },
        { description: { contains: search} },
      ];
    }

    const packages = await prisma.package.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        menus: {
          include: {
            menu: {
              include: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    salePrice: true,
                    costPrice: true
                  }
                }
              }
            }
          }
        },
        extras: true,
        services: {
          include: {
            service: {
              select: { id: true, name: true, pricingType: true, salePrice: true }
            }
          }
        },
        _count: {
          select: { menus: true, extras: true, services: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages,
      branch: branchId
    });
  } catch (error) {
    console.error('getPackages error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single Package securely
const getPackage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid package ID' });
    }

    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        menus: {
          include: {
            menu: {
              include: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    salePrice: true,
                    costPrice: true
                  }
                }
              }
            }
          }
        },
        extras: true,
        services: {
          include: {
            service: {
              select: { id: true, name: true, pricingType: true, salePrice: true }
            }
          }
        }
      },
    });

    if (!pkg || pkg.deletedAt) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (pkg.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This package belongs to another branch.'
      });
    }

    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    console.error('getPackage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create Package with Nested Menus, Extras & Services
const createPackage = async (req, res) => {
  try {
    const { 
      name, code, eventType, status, description, 
      basePrice, discountPct, finalPrice, menus, extras, services,
      branchId, companyId 
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Package name is required' });
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

    const existing = await prisma.package.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim()} },
          code ? { code: { equals: code.trim()} } : {}
        ],
        companyId: parseInt(targetCompanyId),
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Package with this name or code already exists in this company'
      });
    }

    const newPackage = await prisma.$transaction(async (tx) => {
      const pkg = await tx.package.create({
        data: {
          name: name.trim(),
          code: code?.trim() || null,
          eventType: eventType || null,
          status: status || 'active',
          description: description || null,
          basePrice: parseFloat(basePrice) || 0,
          discountPct: parseFloat(discountPct) || 0,
          finalPrice: parseFloat(finalPrice) || 0,
          branchId: targetBranchId,
          companyId: parseInt(targetCompanyId),
          isActive: true
        }
      });

      // Attach Menus
      if (menus && menus.length > 0) {
        for (const m of menus) {
          await tx.packageMenu.create({
            data: {
              packageId: pkg.id,
              menuId: parseInt(m.menuId),
              quantity: parseInt(m.quantity) || 1
            }
          });
        }
      }

      // Attach Extras
      if (extras && extras.length > 0) {
        for (const ex of extras) {
          await tx.packageExtra.create({
            data: {
              packageId: pkg.id,
              name: ex.name.trim(),
              description: ex.description || null,
              costPrice: parseFloat(ex.costPrice) || 0,
              salePrice: parseFloat(ex.salePrice) || 0
            }
          });
        }
      }

      // Attach Services (Saved + Custom)
      if (services && services.length > 0) {
        for (const sv of services) {
          await tx.packageService.create({
            data: {
              packageId: pkg.id,
              serviceId: sv.serviceId ? parseInt(sv.serviceId) : null,
              name: sv.name.trim(),
              description: sv.description || null,
              pricingType: sv.pricingType || 'FIXED',
              costPrice: parseFloat(sv.costPrice) || 0,
              salePrice: parseFloat(sv.salePrice) || 0,
              quantity: parseInt(sv.quantity) || 1,
              hours: sv.pricingType === 'HOURLY' ? (parseInt(sv.hours) || 1) : null
            }
          });
        }
      }

      return await tx.package.findUnique({
        where: { id: pkg.id },
        include: {
          branch: { select: { id: true, name: true } },
          menus: {
            include: {
              menu: {
                include: {
                  items: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      salePrice: true
                    }
                  }
                }
              }
            }
          },
          extras: true,
          services: {
            include: {
              service: { select: { id: true, name: true, pricingType: true } }
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      data: newPackage,
      message: `Package "${newPackage.name}" created successfully`
    });
  } catch (error) {
    console.error('createPackage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update Package securely
const updatePackage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid package ID' });
    }

    const existing = await prisma.package.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This package belongs to another branch.'
      });
    }

    const { 
      name, code, eventType, status, description, 
      basePrice, discountPct, finalPrice, menus, extras, services 
    } = req.body;

    if (name || code) {
      const duplicate = await prisma.package.findFirst({
        where: {
          OR: [
            name ? { name: { equals: name.trim()} } : {},
            code ? { code: { equals: code.trim()} } : {}
          ],
          companyId: existing.companyId,
          NOT: { id: id },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another package with this name or code already exists'
        });
      }
    }

    const updatedPackage = await prisma.$transaction(async (tx) => {
      await tx.package.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(code !== undefined && { code: code?.trim() || null }),
          ...(eventType !== undefined && { eventType: eventType || null }),
          ...(status && { status }),
          ...(description !== undefined && { description: description || null }),
          ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) || 0 }),
          ...(discountPct !== undefined && { discountPct: parseFloat(discountPct) || 0 }),
          ...(finalPrice !== undefined && { finalPrice: parseFloat(finalPrice) || 0 }),
        }
      });

      // Update Menus
      if (menus !== undefined) {
        await tx.packageMenu.deleteMany({ where: { packageId: id } });
        if (menus.length > 0) {
          for (const m of menus) {
            await tx.packageMenu.create({
              data: {
                packageId: id,
                menuId: parseInt(m.menuId),
                quantity: parseInt(m.quantity) || 1
              }
            });
          }
        }
      }

      // Update Extras
      if (extras !== undefined) {
        await tx.packageExtra.deleteMany({ where: { packageId: id } });
        if (extras.length > 0) {
          for (const ex of extras) {
            await tx.packageExtra.create({
              data: {
                packageId: id,
                name: ex.name.trim(),
                description: ex.description || null,
                costPrice: parseFloat(ex.costPrice) || 0,
                salePrice: parseFloat(ex.salePrice) || 0
              }
            });
          }
        }
      }

      // Update Services
      if (services !== undefined) {
        await tx.packageService.deleteMany({ where: { packageId: id } });
        if (services.length > 0) {
          for (const sv of services) {
            await tx.packageService.create({
              data: {
                packageId: id,
                serviceId: sv.serviceId ? parseInt(sv.serviceId) : null,
                name: sv.name.trim(),
                description: sv.description || null,
                pricingType: sv.pricingType || 'FIXED',
                costPrice: parseFloat(sv.costPrice) || 0,
                salePrice: parseFloat(sv.salePrice) || 0,
                quantity: parseInt(sv.quantity) || 1,
                hours: sv.pricingType === 'HOURLY' ? (parseInt(sv.hours) || 1) : null
              }
            });
          }
        }
      }

      return await tx.package.findUnique({
        where: { id },
        include: {
          branch: { select: { id: true, name: true } },
          menus: {
            include: {
              menu: {
                include: {
                  items: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      salePrice: true
                    }
                  }
                }
              }
            }
          },
          extras: true,
          services: {
            include: {
              service: { select: { id: true, name: true, pricingType: true } }
            }
          }
        }
      });
    });

    res.status(200).json({ success: true, data: updatedPackage, message: 'Package updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    console.error('updatePackage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete Package (Soft Delete)
const deletePackage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid package ID' });
    }

    const existing = await prisma.package.findUnique({
      where: { id },
      select: { id: true, branchId: true, name: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This package belongs to another branch.'
      });
    }

    await prisma.package.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.status(200).json({
      success: true,
      message: `Package "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    console.error('deletePackage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get packages by branch (Admin/Super Admin/Manager)
const getPackagesByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin' && req.userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, Super Admin, or Manager required.'
      });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const packages = await prisma.package.findMany({
      where: { branchId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        menus: {
          include: {
            menu: {
              include: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    salePrice: true
                  }
                }
              }
            }
          }
        },
        extras: true,
        services: {
          include: {
            service: { select: { id: true, name: true, pricingType: true } }
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    console.error('getPackagesByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  getPackagesByBranch
};