const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'marquee-super-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'marquee-refresh-secret-key-2026';
// ✅ Yahan expiry time 15m aur 7d se barha kar 1d kar diya gaya hai (ya aap apni marzi ka rakh sakte hain)
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '1d'; 
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// ── Generate Tokens ──
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    companyId: user.companyId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
};

// ── REGISTER (Company + Admin + Branch) ──
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      name,         // Admin name
      email,        // Admin email
      password,     // Admin password
      companyName,    // ✅ Company name
      companyAddress, // ✅ Company address
      companyPhone,   // ✅ Company phone
      branchName,     // Optional: Branch name
      phone,        // Admin phone
      role          // Admin role
    } = req.body;

    console.log('📝 Register request:', { name, email, companyName, branchName });

    const existing = await prisma.user.findFirst({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // ── Start Transaction ──
    const result = await prisma.$transaction(async (tx) => {
      
      // 1️⃣ Create Company
      const company = await tx.company.create({
        data: {
          name: companyName || `${name}'s Company`,
          address: companyAddress || null,
          phone: companyPhone || null,
          email: email,
          isActive: true
        }
      });

      console.log('✅ Company created:', company.name, 'ID:', company.id);

      // 2️⃣ Create Default Branch
      const branch = await tx.branch.create({
        data: {
          name: branchName || `${companyName || name}'s Main Branch`,
          address: companyAddress || null,
          phone: companyPhone || null,
          email: email,
          companyId: company.id,
          isActive: true
        }
      });

      console.log('✅ Branch created:', branch.name, 'ID:', branch.id);

      // 3️⃣ Hash Password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 4️⃣ Create Admin User
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'admin',
          phone: phone || null,
          companyId: company.id,
          branchId: branch.id,
          isActive: true
        },
        include: {
          company: true,
          branch: true
        }
      });

      console.log('✅ User created:', user.email, 'Role:', user.role);

      return { company, branch, user };
    });

    // ── Generate Tokens ──
    const { accessToken, refreshToken } = generateTokens(result.user);

    // ── Remove password ──
    const { password: _, ...userData } = result.user;

    res.status(201).json({
      success: true,
      message: 'Company registered successfully!',
      accessToken,
      refreshToken,
      user: {
        ...userData,
        company: result.company,
        branch: result.branch
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed: ' + error.message
    });
  }
};

// ── LOGIN ──
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await prisma.user.findFirst({
      where: { 
        email,
        deletedAt: null
      },
      include: {
        branch: {
          include: {
            company: true
          }
        },
        company: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact admin.'
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Remove password
    const { password: _, ...userData } = user;

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        branchId: user.branchId,
        companyId: user.companyId
      }
    });

    console.log('✅ User logged in:', user.email);
    console.log('🏢 Company ID:', user.companyId);
    console.log('🏷️ Branch ID:', user.branchId);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message
    });
  }
};

// ── REFRESH TOKEN ──
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        branch: {
          include: {
            company: true
          }
        },
        company: true
      }
    });

    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

// ── LOGOUT ──
exports.logout = async (req, res) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: req.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        branchId: req.branchId,
        companyId: req.companyId
      }
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// ── GET CURRENT USER ──
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        branch: {
          include: {
            company: true
          }
        },
        company: true
      }
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password, ...userData } = user;
    res.json({ 
      success: true, 
      user: userData
    });

  } catch (error) {
    console.error('❌ Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

// ── GET ALL USERS (Company-Wise) ──
exports.getUsers = async (req, res) => {
  try {
    const where = { deletedAt: null };
    
    if (req.userRole === 'super_admin') {
      // Sab users
    } else if (req.userRole === 'admin') {
      where.companyId = req.companyId;
    } else {
      where.branchId = req.branchId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        branchId: true,
        companyId: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        company: {
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
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// ── UPDATE USER ──
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive, branchId, companyId } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSuperAdmin = req.userRole === 'super_admin';
    const isAdmin = req.userRole === 'admin';
    
    if (!isSuperAdmin) {
      if (isAdmin && existing.companyId !== req.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This user belongs to another company.'
        });
      }
      if (!isAdmin && existing.branchId !== req.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this user'
        });
      }
    }

    if (role === 'admin' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can assign admin role'
      });
    }

    let targetCompanyId = companyId;
    if (branchId && !targetCompanyId) {
      const branch = await prisma.branch.findUnique({
        where: { id: parseInt(branchId) },
        select: { companyId: true }
      });
      if (branch) {
        targetCompanyId = branch.companyId;
      }
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        branchId: branchId ? parseInt(branchId) : undefined,
        companyId: targetCompanyId ? parseInt(targetCompanyId) : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        branchId: true,
        companyId: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// ── DELETE USER (Soft Delete) ──
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.id === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const isSuperAdmin = req.userRole === 'super_admin';
    const isAdmin = req.userRole === 'admin';
    
    if (!isSuperAdmin) {
      if (isAdmin && user.companyId !== req.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This user belongs to another company.'
        });
      }
      if (!isAdmin && user.branchId !== req.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this user'
        });
      }
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// ── GET USERS BY COMPANY (Admin/Super Admin) ──
exports.getUsersByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Super Admin only.'
      });
    }

    if (req.userRole === 'admin' && parseInt(companyId) !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view users from your company.'
      });
    }

    const users = await prisma.user.findMany({
      where: { 
        companyId: parseInt(companyId),
        deletedAt: null
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
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('❌ Get users by company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};