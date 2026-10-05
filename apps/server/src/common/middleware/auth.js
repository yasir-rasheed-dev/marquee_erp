const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'marquee-super-secret-key-2026';

// ═══════════════════════════════════════════════════════════
// 0. TENANT SCOPE — stop users reaching other companies' data
// ═══════════════════════════════════════════════════════════
// Controllers trust `branchId` / `companyId` from the query string, body or headers,
// so every one of those values is checked here, once, for every authenticated request:
//   super_admin → any branch/company
//   admin       → branches of their own company only
//   others      → their own branch only

// Branches never move between companies, so cache branchId → companyId lookups.
const branchCompanyCache = new Map();
const getBranchCompanyId = async (branchId) => {
  if (branchCompanyCache.has(branchId)) return branchCompanyCache.get(branchId);
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { companyId: true } });
  const companyId = branch ? branch.companyId : null;
  if (branch) branchCompanyCache.set(branchId, companyId);
  return companyId;
};

const collectIds = (req, key, headerName) => {
  const values = [req.query?.[key], req.body?.[key], req.params?.[key], req.headers?.[headerName]];
  const ids = new Set();
  for (const v of values.flat()) {
    if (v === undefined || v === null || v === '' || v === 'all') continue;
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) ids.add(n);
  }
  return [...ids];
};

const checkTenantScope = async (req) => {
  if (req.userRole === 'super_admin') return null;

  for (const companyId of collectIds(req, 'companyId', 'x-company-id')) {
    if (companyId !== req.companyId) return 'Access denied to this company';
  }

  for (const branchId of collectIds(req, 'branchId', 'x-branch-id')) {
    if (req.userRole === 'admin') {
      if ((await getBranchCompanyId(branchId)) !== req.companyId) return 'Access denied to this branch';
    } else if (branchId !== req.branchId) {
      return 'Access denied to this branch';
    }
  }
  return null;
};

exports.checkTenantScope = checkTenantScope;

// Path params (e.g. /branch/:branchId) aren't parsed yet when router-level auth runs,
// so routers register this with router.param('branchId' | 'companyId', tenantParam).
exports.tenantParam = async (req, res, next, value, name) => {
  try {
    if (!req.userRole) return next(); // unauthenticated route — auth middleware decides
    const denied = await checkTenantScope({
      userRole: req.userRole,
      companyId: req.companyId,
      branchId: req.branchId,
      params: { [name]: value },
    });
    if (denied) return res.status(403).json({ success: false, message: denied });
    next();
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 1. AUTHENTICATE — Verify JWT Token
// ═══════════════════════════════════════════════════════════

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please login.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // ✅ Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId || decoded.id },
        select: { 
          id: true, 
          name: true,
          email: true,
          isActive: true, 
          role: true, 
          branchId: true,
          companyId: true
        }
      });

      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          success: false,
          message: 'User account is inactive' 
        });
      }

      // ✅ Fetch active dynamic role assignment for the user
      const userRoleAssignment = await prisma.userRoleAssignment.findFirst({
        where: { userId: user.id, isActive: true },
        select: { roleId: true, role: { select: { slug: true } } }
      });

      // ✅ Set user info on request
      req.userId = user.id;
      req.userRole = user.role; // e.g. 'super_admin', 'admin', etc.
      req.roleId = userRoleAssignment?.roleId || null; // Dynamic role ID
      req.roleSlug = userRoleAssignment?.role?.slug || null; // Dynamic role slug
      req.branchId = user.branchId || decoded.branchId;
      req.companyId = user.companyId || decoded.companyId;
      req.user = user;

      // ✅ Tenant isolation: a branchId/companyId sent by the client must belong to this user
      const denied = await checkTenantScope(req);
      if (denied) {
        return res.status(403).json({ success: false, message: denied });
      }

      next();
    } catch (jwtError) {
      console.error('JWT Error:', jwtError.message);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token. Please login again.' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 2. AUTHORIZE — Role-Based Access Control
// ═══════════════════════════════════════════════════════════

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Super admin bypasses standard checks
    if (req.userRole === 'super_admin') {
      return next();
    }
    
    if (!roles.includes(req.userRole) && !roles.includes(req.roleSlug)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }
    
    next();
  };
};

// ═══════════════════════════════════════════════════════════
// 3. PERMISSION CHECK — Resource/Action Based (Updated for Dynamic roleId)
// ═══════════════════════════════════════════════════════════

exports.hasPermission = async (userId, resource, action, branchId = null) => {
  try {
    // Super Admin & Admin have all permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true }
    });

    if (user?.role === 'super_admin' || user?.role === 'admin') return true;

    // Get user's active dynamic role assignment ID
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: userId,
        isActive: true
      },
      select: { roleId: true }
    });

    let roleId = assignment?.roleId;
    if (!roleId && user?.role) {
      const fallbackRole = await prisma.role.findFirst({
        where: { slug: user.role }
      });
      if (fallbackRole) {
        roleId = fallbackRole.id;
      }
    }

    if (!roleId) return false;

    // Expand resource aliases
    const resourceList = [resource];
    if (resource === 'bookings') resourceList.push('bookings_create', 'bookings_list');
    if (resource === 'customers') resourceList.push('customers_add');
    if (resource === 'menus') resourceList.push('menus_add', 'menus_items', 'menus_packages', 'menus_categories', 'menus_units');
    if (resource === 'inventory') resourceList.push('inventory_item_master', 'inventory_stock_transfer', 'inventory_stock_adjustment');
    if (resource === 'kitchen') resourceList.push('kitchen_sheet', 'production_plan', 'recipe_manager');

    // Check permission using dynamic roleId
    const where = {
      roleId: roleId,
      resource: { in: resourceList },
      action: action,
      allowed: true
    };

    if (branchId) {
      where.branchId = parseInt(branchId);
    }

    const permission = await prisma.rolePermission.findFirst({ where });
    return !!permission;
  } catch (err) {
    console.error('hasPermission error:', err);
    return false;
  }
};

// ── Permission Guard Middleware ──
exports.permissionGuard = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const branchId = req.branchId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admin check
      if (req.userRole === 'super_admin') {
        return next();
      }

      const has = await exports.hasPermission(userId, resource, action, branchId);

      if (!has) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to ${action} ${resource}`
        });
      }

      next();
    } catch (err) {
      console.error('permissionGuard error:', err);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

// ═══════════════════════════════════════════════════════════
// 4. COMPANY ACCESS
// ═══════════════════════════════════════════════════════════

exports.companyAccess = (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    if (req.userRole === 'super_admin') {
      return next();
    }
    
    if (req.userRole === 'admin') {
      if (parseInt(companyId) !== req.companyId) {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied to this company' 
        });
      }
      return next();
    }
    
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin or Super Admin required.' 
    });
    
  } catch (error) {
    console.error('Company access error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Company access check failed' 
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 5. BRANCH ACCESS
// ═══════════════════════════════════════════════════════════

exports.branchAccess = (req, res, next) => {
  try {
    const { branchId } = req.params;
    
    if (req.userRole === 'super_admin' || req.userRole === 'admin') {
      return next();
    }
    
    if (parseInt(branchId) !== req.branchId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied to this branch' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Branch access error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Branch access check failed' 
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 6. VALIDATE BRANCH OWNERSHIP
// ═══════════════════════════════════════════════════════════

exports.validateBranchOwnership = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    
    if (req.userRole === 'super_admin') {
      return next();
    }
    
    if (req.userRole === 'admin') {
      const branch = await prisma.branch.findUnique({
        where: { id: parseInt(branchId) },
        select: { companyId: true }
      });
      
      if (!branch) {
        return res.status(404).json({ success: false, message: 'Branch not found' });
      }
      
      if (branch.companyId !== req.companyId) {
        return res.status(403).json({ success: false, message: 'Access denied. This branch belongs to another company.' });
      }
      
      return next();
    }
    
    if (parseInt(branchId) !== req.branchId) {
      return res.status(403).json({ success: false, message: 'Access denied to this branch' });
    }
    
    next();
  } catch (error) {
    console.error('Branch ownership validation error:', error);
    res.status(500).json({ success: false, message: 'Branch validation failed' });
  }
};

// ═══════════════════════════════════════════════════════════
// 7. VALIDATE COMPANY OWNERSHIP
// ═══════════════════════════════════════════════════════════

exports.validateCompanyOwnership = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    if (req.userRole === 'super_admin') {
      return next();
    }
    
    if (req.userRole === 'admin') {
      if (parseInt(companyId) !== req.companyId) {
        return res.status(403).json({ success: false, message: 'Access denied. This company does not belong to you.' });
      }
      return next();
    }
    
    return res.status(403).json({ success: false, message: 'Access denied. Admin or Super Admin required.' });
  } catch (error) {
    console.error('Company ownership validation error:', error);
    res.status(500).json({ success: false, message: 'Company validation failed' });
  }
};

// ═══════════════════════════════════════════════════════════
// 8. SUPER ADMIN / ADMIN ONLY
// ═══════════════════════════════════════════════════════════

exports.superAdminOnly = (req, res, next) => {
  if (req.userRole !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
  }
  next();
};

exports.adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin or Super Admin required.' });
  }
  next();
};

// ═══════════════════════════════════════════════════════════
// 9. FILTER HELPERS & ALIASES
// ═══════════════════════════════════════════════════════════

exports.getBranchFilter = (req) => {
  if (req.userRole === 'super_admin') return {};
  if (req.userRole === 'admin') return { companyId: req.companyId };
  return { branchId: req.branchId };
};

exports.getCompanyFilter = (req) => {
  if (req.userRole === 'super_admin') return {};
  return { companyId: req.companyId };
};

exports.testMode = (req, res, next) => {
  if (req.headers['x-test-mode'] === 'true') {
    req.testMode = true;
  }
  next();
};

exports.authMiddleware = exports.authenticate;

module.exports = exports;