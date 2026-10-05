const prisma = require('../config/database');

// ── Helper: Get company filter ──
const getCompanyFilter = (req) => {
  // Super Admin: no filter (sari companies ki branches)
  if (req.userRole === 'super_admin') {
    return {};
  }
  
  // ✅ Admin, Manager, Cashier, Staff — Sab ke liye sirf apni company
  return { companyId: req.companyId };
};

// ── GET ALL BRANCHES (Company-Wise) ──
// ── GET ALL BRANCHES (Company-Wise) ──
exports.getBranches = async (req, res) => {
  try {
    const where = { isActive: true };
    
    // ✅ Apply company filter — FIXED
    const companyFilter = getCompanyFilter(req);
    Object.assign(where, companyFilter);
    
    const branches = await prisma.branch.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        _count: {
          select: {
            users: true,
            menus: true,
            bookings: true,
            invoices: true,
            categories: true,
            items: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      count: branches.length,
      branches
    });

  } catch (error) {
    console.error('❌ Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get branches'
    });
  }
};

// ── GET MY BRANCHES (User's Company Branches) ──
exports.getMyBranches = async (req, res) => {
  try {
    const where = { 
      isActive: true,
      companyId: req.companyId 
    };

    const branches = await prisma.branch.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        _count: {
          select: {
            users: true,
            menus: true,
            bookings: true,
            invoices: true,
            categories: true,
            items: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      count: branches.length,
      branches
    });

  } catch (error) {
    console.error('❌ Get my branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get branches'
    });
  }
};

// ── GET SINGLE BRANCH ──
exports.getBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true
          }
        },
        _count: {
          select: {
            users: true,
            menus: true,
            bookings: true,
            invoices: true,
            categories: true,
            items: true,
            packages: true,
            halls: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // ✅ Check if user has access to this branch
    if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
      if (branch.id !== req.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch'
        });
      }
    }

    // ✅ Admin: check if branch belongs to their company
    if (req.userRole === 'admin' && branch.companyId !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This branch belongs to another company.'
      });
    }

    res.json({
      success: true,
      branch
    });

  } catch (error) {
    console.error('❌ Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get branch'
    });
  }
};

// ── CREATE BRANCH ──
exports.createBranch = async (req, res) => {
  try {
    const { name, address, phone, email, companyId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Branch name is required'
      });
    }

    // ✅ Super Admin: can create branch for any company
    // ✅ Admin: can create branch for their own company only
    let targetCompanyId = companyId;
    
    if (req.userRole === 'admin') {
      // Admin can only create branches for their own company
      targetCompanyId = req.companyId;
    } else if (req.userRole !== 'super_admin') {
      // Manager/Staff cannot create branches
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Super Admin required.'
      });
    }

    // If no companyId provided, get or create default company
    if (!targetCompanyId) {
      let company = await prisma.company.findFirst();
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: 'Marquee Events',
            address: 'Default Address',
            phone: '0300-0000000',
            email: 'info@marquee.com'
          }
        });
        console.log('✅ Default company created:', company.name);
      }
      targetCompanyId = company.id;
    }

    // ✅ Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // ✅ Create branch
    const branch = await prisma.branch.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        companyId: targetCompanyId,
        isActive: true
      },
      include: {
        company: true
      }
    });

    console.log('✅ Branch created:', branch.name);

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      branch
    });

  } catch (error) {
    console.error('❌ Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create branch: ' + error.message
    });
  }
};

// ── UPDATE BRANCH ──
exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);
    const { name, address, phone, email, isActive } = req.body;

    const existing = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { company: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // ✅ Check permissions
    if (req.userRole !== 'super_admin') {
      if (req.userRole === 'admin') {
        // Admin can only update branches of their company
        if (existing.companyId !== req.companyId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This branch belongs to another company.'
          });
        }
      } else {
        // Manager/Staff cannot update branches
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or Super Admin required.'
        });
      }
    }

    // ✅ Check if it's the last active branch before deactivating
    if (isActive === false) {
      const activeBranches = await prisma.branch.count({
        where: { 
          companyId: existing.companyId,
          isActive: true 
        }
      });

      if (activeBranches === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the only active branch of this company'
        });
      }
    }

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name: name || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        isActive: isActive !== undefined ? isActive : undefined
      },
      include: {
        company: true
      }
    });

    console.log('✅ Branch updated:', branch.name);

    res.json({
      success: true,
      message: 'Branch updated successfully',
      branch
    });

  } catch (error) {
    console.error('❌ Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update branch'
    });
  }
};

// ── DELETE BRANCH ──
exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: {
            users: true,
            menus: true,
            bookings: true,
            invoices: true,
            categories: true,
            items: true,
            packages: true,
            halls: true,
            posSessions: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // ✅ Check permissions
    if (req.userRole !== 'super_admin') {
      if (req.userRole === 'admin') {
        if (branch.companyId !== req.companyId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This branch belongs to another company.'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or Super Admin required.'
        });
      }
    }

    // ✅ Check if it's the last branch before deleting
    const totalBranches = await prisma.branch.count({
      where: { 
        companyId: branch.companyId
      }
    });

    if (totalBranches === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only branch of this company'
      });
    }

    // Check if branch has data
    const hasData = branch._count.users > 0 ||
      branch._count.menus > 0 ||
      branch._count.bookings > 0 ||
      branch._count.invoices > 0 ||
      branch._count.categories > 0 ||
      branch._count.items > 0 ||
      branch._count.packages > 0 ||
      branch._count.halls > 0 ||
      branch._count.posSessions > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with existing data. Deactivate instead.',
        counts: branch._count
      });
    }

    await prisma.branch.delete({
      where: { id: branchId }
    });

    console.log('✅ Branch deleted:', branch.name);

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch'
    });
  }
};

// ── GET BRANCH USERS ──
exports.getBranchUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);

    // ✅ Check branch access
    if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
      if (branchId !== req.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch'
        });
      }
    }

    // ✅ Admin: check if branch belongs to their company
    if (req.userRole === 'admin') {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { companyId: true }
      });
      
      if (!branch || branch.companyId !== req.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This branch belongs to another company.'
        });
      }
    }

    const users = await prisma.user.findMany({
      where: {
        branchId: branchId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('❌ Get branch users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get branch users'
    });
  }
};

// ── GET BRANCH STATS ──
exports.getBranchStats = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);

    // ✅ Check branch access
    if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
      if (branchId !== req.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch'
        });
      }
    }

    // ✅ Admin: check if branch belongs to their company
    if (req.userRole === 'admin') {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { companyId: true }
      });
      
      if (!branch || branch.companyId !== req.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This branch belongs to another company.'
        });
      }
    }

    const [branch, todayBookings, activeBookings, revenue] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          _count: {
            select: {
              users: true,
              menus: true,
              bookings: true,
              invoices: true,
              categories: true,
              items: true,
              packages: true,
              halls: true
            }
          }
        }
      }),
      prisma.booking.count({
        where: {
          branchId: branchId,
          eventDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.booking.count({
        where: {
          branchId: branchId,
          status: 'confirmed'
        }
      }),
      prisma.invoice.aggregate({
        where: {
          branchId: branchId,
          status: 'paid'
        },
        _sum: {
          totalAmount: true
        }
      })
    ]);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.json({
      success: true,
      stats: {
        totalUsers: branch._count.users,
        totalMenus: branch._count.menus,
        totalBookings: branch._count.bookings,
        totalInvoices: branch._count.invoices,
        totalCategories: branch._count.categories,
        totalItems: branch._count.items,
        totalPackages: branch._count.packages,
        totalHalls: branch._count.halls,
        todayBookings: todayBookings,
        activeBookings: activeBookings,
        totalRevenue: revenue._sum.totalAmount || 0
      }
    });

  } catch (error) {
    console.error('❌ Get branch stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get branch stats'
    });
  }
};

// ── GET BRANCHES BY COMPANY ──
exports.getBranchesByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const targetCompanyId = parseInt(companyId);

    // ✅ Check permissions
    if (req.userRole !== 'super_admin') {
      if (req.userRole === 'admin' && targetCompanyId !== req.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view branches of your company.'
        });
      }
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or Super Admin required.'
        });
      }
    }

    const branches = await prisma.branch.findMany({
      where: {
        companyId: targetCompanyId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            users: true,
            bookings: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      count: branches.length,
      branches
    });

  } catch (error) {
    console.error('❌ Get branches by company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get branches'
    });
  }
};