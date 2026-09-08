// controllers/rolePermission.controller.js
// COMPLETE FIXED - getMyPermissions returns array format

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.branchId) return parseInt(req.branchId);
  if (req.user?.branchId) return parseInt(req.user.branchId);
  return null;
};

const getCompanyId = (req) => {
  if (req.companyId) return parseInt(req.companyId);
  if (req.user?.companyId) return parseInt(req.user.companyId);
  return null;
};

const hasPermission = async (userId, resource, action, branchId = null) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role === 'super_admin') return true;

    const userRoleAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId, isActive: true },
      select: { roleId: true }
    });

    if (!userRoleAssignment) return false;

    const where = {
      roleId: userRoleAssignment.roleId,
      resource,
      action,
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

const getUserRoleId = async (userId) => {
  try {
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId, isActive: true },
      select: { roleId: true }
    });
    return assignment?.roleId || null;
  } catch (err) {
    console.error('getUserRoleId error:', err);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// 1. ROLES MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getRoles = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    const roles = await prisma.role.findMany({
      where: { companyId: parseInt(companyId) },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    console.error('getRoles error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

const createRoleWithPermissions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const branchId = getBranchId(req);
    const { name, description, permissions } = req.body;

    if (!companyId || !name) {
      return res.status(400).json({ success: false, message: 'Company ID and Role Name are required.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const existingRole = await prisma.role.findFirst({
      where: { slug, companyId: parseInt(companyId) }
    });

    if (existingRole) {
      return res.status(400).json({ success: false, message: 'A role with this name already exists.' });
    }

    const newRole = await prisma.role.create({
      data: {
        name,
        slug,
        description,
        companyId: parseInt(companyId),
        branchId: branchId ? parseInt(branchId) : null
      }
    });

    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permissionData = permissions.map(p => ({
        roleId: newRole.id,
        resource: p.resource,
        action: p.action,
        allowed: true,
        companyId: parseInt(companyId),
        branchId: branchId ? parseInt(branchId) : null
      }));

      await prisma.rolePermission.createMany({
        data: permissionData,
        skipDuplicates: true
      });
    }

    res.status(201).json({
      success: true,
      message: 'Role and permissions created successfully!',
      data: newRole
    });
  } catch (err) {
    console.error('createRoleWithPermissions error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 2. GET ALL ROLE PERMISSIONS
// ═══════════════════════════════════════════════════════════

const getRolePermissions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { roleId, resource, action } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = {
      companyId: parseInt(companyId),
      branchId: parseInt(branchId)
    };

    if (roleId) where.roleId = parseInt(roleId);
    if (resource) where.resource = resource;
    if (action) where.action = action;

    const permissions = await prisma.rolePermission.findMany({
      where,
      include: {
        role: { select: { id: true, name: true, slug: true } }
      },
      orderBy: [{ roleId: 'asc' }, { resource: 'asc' }, { action: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions,
      branch: branchId
    });
  } catch (err) {
    console.error('getRolePermissions error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 3. GET SINGLE ROLE PERMISSION BY ID
// ═══════════════════════════════════════════════════════════

const getRolePermission = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid permission ID' });
    }

    const permission = await prisma.rolePermission.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true, slug: true } } }
    });

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    res.status(200).json({ success: true, data: permission });
  } catch (err) {
    console.error('getRolePermission error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 4. CREATE / UPDATE / DELETE PERMISSION
// ═══════════════════════════════════════════════════════════

const createRolePermission = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { roleId, resource, action, allowed, branchId } = req.body;

    if (!companyId || !roleId || !resource || !action) {
      return res.status(400).json({ success: false, message: 'Role ID, resource, and action are required.' });
    }

    let targetBranchId = branchId || getBranchId(req);
    targetBranchId = targetBranchId ? parseInt(targetBranchId) : null;

    const existing = await prisma.rolePermission.findFirst({
      where: {
        roleId: parseInt(roleId),
        resource,
        action,
        companyId: parseInt(companyId),
        branchId: targetBranchId
      }
    });

    let permission;
    if (existing) {
      permission = await prisma.rolePermission.update({
        where: { id: existing.id },
        data: { allowed: allowed !== undefined ? allowed : true }
      });
    } else {
      permission = await prisma.rolePermission.create({
        data: {
          roleId: parseInt(roleId),
          resource,
          action,
          allowed: allowed !== undefined ? allowed : true,
          companyId: parseInt(companyId),
          branchId: targetBranchId
        }
      });
    }

    res.status(201).json({ success: true, message: 'Permission saved successfully!', data: permission });
  } catch (err) {
    console.error('createRolePermission error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

const updateRolePermission = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { allowed } = req.body;

    const updated = await prisma.rolePermission.update({
      where: { id },
      data: { allowed }
    });

    res.status(200).json({ success: true, message: 'Permission updated!', data: updated });
  } catch (err) {
    console.error('updateRolePermission error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

const deleteRolePermission = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.rolePermission.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Permission deleted!' });
  } catch (err) {
    console.error('deleteRolePermission error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 5. CHECK & MY PERMISSIONS
// ═══════════════════════════════════════════════════════════

const checkPermission = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { resource, action, branchId } = req.body;

    const has = await hasPermission(userId, resource, action, branchId);
    res.status(200).json({ success: true, data: { hasPermission: has } });
  } catch (err) {
    console.error('checkPermission error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// ✅ FIXED: getMyPermissions with branchId filter + ARRAY FORMAT
const getMyPermissions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context missing.' });
    }

    const branchId = getBranchId(req);
    const roleId = await getUserRoleId(userId);

    if (!roleId) {
      return res.status(404).json({ success: false, message: 'Role not assigned.' });
    }

    // ✅ Build where clause
    const where = {
      roleId: parseInt(roleId),
      companyId: parseInt(companyId),
      allowed: true
    };

    // ✅ Branch filter
    if (branchId) {
      where.branchId = parseInt(branchId);
    }

    const permissions = await prisma.rolePermission.findMany({
      where,
      select: {
        id: true,
        resource: true,
        action: true,
        allowed: true,
        branchId: true
      }
    });

    console.log('✅ getMyPermissions - branchId:', branchId || 'ALL');
    console.log('✅ getMyPermissions - permissions count:', permissions.length);

    // ✅ RETURN ARRAY FORMAT (frontend expects this)
    res.status(200).json({
      success: true,
      data: permissions  // ← Array format
    });

  } catch (err) {
    console.error('❌ getMyPermissions error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 6. USER ROLE ASSIGNMENTS
// ═══════════════════════════════════════════════════════════

const getUserRoleAssignments = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const branchId = getBranchId(req);

    const assignments = await prisma.userRoleAssignment.findMany({
      where: { companyId: parseInt(companyId), branchId: parseInt(branchId), isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true, slug: true } }
      }
    });

    res.status(200).json({ success: true, data: assignments });
  } catch (err) {
    console.error('getUserRoleAssignments error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

const assignUserRole = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { userId, roleId, branchId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ success: false, message: 'User ID and Role ID required.' });
    }

    let targetBranchId = branchId || getBranchId(req);
    targetBranchId = targetBranchId ? parseInt(targetBranchId) : null;

    const existing = await prisma.userRoleAssignment.findFirst({
      where: { userId: parseInt(userId), companyId: parseInt(companyId), branchId: targetBranchId }
    });

    let assignment;
    if (existing) {
      assignment = await prisma.userRoleAssignment.update({
        where: { id: existing.id },
        data: { roleId: parseInt(roleId), isActive: true }
      });
    } else {
      assignment = await prisma.userRoleAssignment.create({
        data: {
          userId: parseInt(userId),
          roleId: parseInt(roleId),
          companyId: parseInt(companyId),
          branchId: targetBranchId,
          isActive: true
        }
      });
    }

    res.status(201).json({ success: true, message: 'Role assigned successfully!', data: assignment });
  } catch (err) {
    console.error('assignUserRole error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

const removeUserRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.userRoleAssignment.update({
      where: { id },
      data: { isActive: false }
    });
    res.status(200).json({ success: true, message: 'Role removed successfully!' });
  } catch (err) {
    console.error('removeUserRole error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  getRoles,
  createRoleWithPermissions,
  getRolePermissions,
  getRolePermission,
  createRolePermission,
  updateRolePermission,
  deleteRolePermission,
  checkPermission,
  getMyPermissions,
  getUserRoleAssignments,
  assignUserRole,
  removeUserRole,
  hasPermission,
  getUserRoleId
};