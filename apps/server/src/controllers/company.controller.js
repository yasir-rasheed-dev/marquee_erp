// controllers/company.controller.js
const prisma = require('../config/database');

// ── Helper: Check if user has access to company ──
const hasCompanyAccess = (req, companyId) => {
  // Super Admin: full access
  if (req.userRole === 'super_admin') {
    return true;
  }
  
  // Admin: only their own company
  if (req.userRole === 'admin') {
    return req.companyId === companyId;
  }
  
  // Manager/Staff: only their own company
  if (req.userRole === 'manager' || req.userRole === 'staff') {
    return req.companyId === companyId;
  }
  
  // Others: no access
  return false;
};

// ── GET ALL COMPANIES ──
exports.getCompanies = async (req, res) => {
  try {
    // ✅ Super Admin can see all companies
    // ✅ Admin can only see their own company
    const where = {};
    
    if (req.userRole === 'admin') {
      where.id = req.companyId;
    }
    // Super Admin: no filter

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            branches: true,
            users: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: {
              select: {
                users: true,
                bookings: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      count: companies.length,
      companies
    });

  } catch (error) {
    console.error('❌ Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get companies'
    });
  }
};

// ── GET SINGLE COMPANY ──
exports.getCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    // ✅ Check access
    if (!hasCompanyAccess(req, companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        branches: {
          include: {
            _count: {
              select: {
                users: true,
                bookings: true,
                menus: true,
                invoices: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            branches: true,
            users: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('❌ Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get company'
    });
  }
};

// ── CREATE COMPANY ──
exports.createCompany = async (req, res) => {
  try {
    // ✅ Only Super Admin can create companies
    if (req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin only.'
      });
    }

    const { name, address, phone, email, taxNumber, logo } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    // ✅ Check if company already exists
    const existing = await prisma.company.findFirst({
      where: {
        OR: [
          { name: name },
          { email: email }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Company with this name or email already exists'
      });
    }

    const company = await prisma.company.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        taxNumber: taxNumber || null,
        logo: logo || null,
        isActive: true
      },
      include: {
        branches: true
      }
    });

    console.log('✅ Company created:', company.name);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company
    });

  } catch (error) {
    console.error('❌ Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company: ' + error.message
    });
  }
};

// ── UPDATE COMPANY ──
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);
    const { name, address, phone, email, taxNumber, logo, isActive } = req.body;

    // ✅ Only Super Admin can update companies
    if (req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin only.'
      });
    }

    const existing = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // ✅ Check duplicate name/email (excluding current)
    if (name || email) {
      const duplicate = await prisma.company.findFirst({
        where: {
          OR: [
            { name: name },
            { email: email }
          ],
          NOT: { id: companyId }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Another company with this name or email already exists'
        });
      }
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: name || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        taxNumber: taxNumber || undefined,
        logo: logo || undefined,
        isActive: isActive !== undefined ? isActive : undefined
      },
      include: {
        branches: true
      }
    });

    console.log('✅ Company updated:', company.name);

    res.json({
      success: true,
      message: 'Company updated successfully',
      company
    });

  } catch (error) {
    console.error('❌ Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company'
    });
  }
};

// ── DELETE COMPANY ──
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    // ✅ Only Super Admin can delete companies
    if (req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin only.'
      });
    }

    // ✅ Prevent deleting default company
    if (companyId === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default company. It is the system default.'
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            branches: true,
            users: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // ✅ Check if company has data
    const hasData = company._count.branches > 0 || company._count.users > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete company with existing data. Delete branches and users first.',
        counts: {
          branches: company._count.branches,
          users: company._count.users
        }
      });
    }

    await prisma.company.delete({
      where: { id: companyId }
    });

    console.log('✅ Company deleted:', company.name);

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company'
    });
  }
};

// ── GET COMPANY STATS ──
exports.getCompanyStats = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    // ✅ Check access
    if (!hasCompanyAccess(req, companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    const [company, totalRevenue, activeBookings, todayBookings] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          _count: {
            select: {
              branches: true,
              users: true
            }
          }
        }
      }),
      prisma.invoice.aggregate({
        where: {
          branch: {
            companyId: companyId
          },
          status: 'paid'
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.booking.count({
        where: {
          branch: {
            companyId: companyId
          },
          status: 'confirmed'
        }
      }),
      prisma.booking.count({
        where: {
          branch: {
            companyId: companyId
          },
          eventDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      stats: {
        totalBranches: company._count.branches,
        totalUsers: company._count.users,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        activeBookings: activeBookings,
        todayBookings: todayBookings
      }
    });

  } catch (error) {
    console.error('❌ Get company stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get company stats'
    });
  }
};

// ── GET COMPANY BRANCHES ──
exports.getCompanyBranches = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    // ✅ Check access
    if (!hasCompanyAccess(req, companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    const branches = await prisma.branch.findMany({
      where: {
        companyId: companyId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            users: true,
            bookings: true,
            menus: true
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
    console.error('❌ Get company branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get company branches'
    });
  }
};

// ── GET COMPANY USERS ──
exports.getCompanyUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);

    // ✅ Check access
    if (!hasCompanyAccess(req, companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    const users = await prisma.user.findMany({
      where: {
        companyId: companyId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
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
    console.error('❌ Get company users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get company users'
    });
  }
};

// ── TOGGLE COMPANY STATUS ──
exports.toggleCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);
    const { isActive } = req.body;

    // ✅ Only Super Admin can toggle status
    if (req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin only.'
      });
    }

    // ✅ Prevent deactivating default company
    if (companyId === 1 && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate default company'
      });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    // ✅ Also toggle all branches of this company
    if (isActive !== undefined) {
      await prisma.branch.updateMany({
        where: { companyId: companyId },
        data: { isActive: isActive }
      });
    }

    console.log(`✅ Company ${company.name} status toggled to: ${isActive}`);

    res.json({
      success: true,
      message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
      company
    });

  } catch (error) {
    console.error('❌ Toggle company status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle company status'
    });
  }
};

// ── GET MY COMPANY (Admin) ──
exports.getMyCompany = async (req, res) => {
  try {
    // ✅ Admin gets their own company
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Super Admin required.'
      });
    }

    const companyId = req.companyId;

    if (!companyId) {
      return res.status(404).json({
        success: false,
        message: 'Company not found for this user'
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        branches: {
          include: {
            _count: {
              select: {
                users: true,
                bookings: true
              }
            }
          }
        },
        _count: {
          select: {
            branches: true,
            users: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('❌ Get my company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get company'
    });
  }
};