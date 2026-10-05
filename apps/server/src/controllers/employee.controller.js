// controllers/employee.controller.js
// Departments | Designations | Employees | User Account Creation
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// ── Helpers ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.body.branchId) return parseInt(req.body.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

const getCompanyIdByBranch = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true }
  });
  return branch?.companyId || null;
};

const resolveCompanyId = async (req, branchId) => {
  let companyId = req.body.companyId || req.companyId || req.user?.companyId;
  if (!companyId) {
    companyId = await getCompanyIdByBranch(branchId);
  }
  return companyId ? parseInt(companyId) : null;
};

// ✅ NEW: Resolve role name to Role ID from Role table
const resolveRoleId = async (tx, roleName, companyId) => {
  // Try to find role by name in the company
  const role = await tx.role.findFirst({
    where: { 
      name: roleName || 'staff',
      companyId: companyId 
    }
  });
  
  if (role) return role.id;
  
  // Fallback: try without company filter
  const defaultRole = await tx.role.findFirst({
    where: { name: roleName || 'staff' }
  });
  
  if (defaultRole) return defaultRole.id;
  
  // Ultimate fallback: get any available role
  const anyRole = await tx.role.findFirst();
  if (anyRole) return anyRole.id;
  
  throw new Error(`Role "${roleName || 'staff'}" not found. Please seed the Role table first.`);
};

// ── Helper: Create User Account ──
const createUserAccount = async (tx, employeeId, email, password, role, name, phone, companyId, branchId, createdById) => {
  // Password validation
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if user already exists
  const existingUser = await tx.user.findFirst({
    where: { email: email, companyId: companyId }
  });

  if (existingUser) {
    // Link existing user to employee
    await tx.employee.update({
      where: { id: employeeId },
      data: { userId: existingUser.id }
    });
    return existingUser;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // ✅ Resolve role ID from Role table
  const roleId = await resolveRoleId(tx, role, companyId);

  // Create new user
  const user = await tx.user.create({
    data: {
      name: name,
      email: email,
      password: hashedPassword,
      role: role || 'staff',
      phone: phone || null,
      isActive: true,
      companyId: companyId,
      branchId: branchId
    }
  });

  // ✅ FIX: Use scalar foreign keys instead of relation objects
  await tx.userRoleAssignment.create({
    data: {
      userId: user.id,
      roleId: roleId,
      companyId: companyId,
      branchId: branchId || null,
      isActive: true
    }
  });

  // Link employee to user
  await tx.employee.update({
    where: { id: employeeId },
    data: { userId: user.id }
  });

  return user;
};

// ── Helper: Update User Account ──
const updateUserAccount = async (tx, employee, email, password, role, name, phone, companyId, branchId) => {
  if (!employee.userId) {
    // No user exists, create one
    if (!password) throw new Error('Password is required to create new login');
    return await createUserAccount(tx, employee.id, email, password, role, name, phone, companyId, branchId, 1);
  }

  // Update existing user
  const updateData = {
    isActive: true,
  };
  
  if (email) updateData.email = email;
  if (name) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (role) updateData.role = role;
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const user = await tx.user.update({
    where: { id: employee.userId },
    data: updateData,
  });

  // ✅ FIX: Update role assignment using roleId scalar
  if (role) {
    const roleId = await resolveRoleId(tx, role, companyId);
    
    // Find existing active assignment for this user + company
    const existingAssignment = await tx.userRoleAssignment.findFirst({
      where: { userId: employee.userId, companyId: companyId, isActive: true }
    });

    if (existingAssignment) {
      await tx.userRoleAssignment.update({
        where: { id: existingAssignment.id },
        data: { roleId: roleId, isActive: true }
      });
    } else {
      await tx.userRoleAssignment.create({
        data: {
          userId: employee.userId,
          roleId: roleId,
          companyId: companyId,
          branchId: branchId || null,
          isActive: true,
        }
      });
    }
  }

  return user;
};

// ═══════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════

const getAllDepartments = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { search } = req.query;
    const where = { companyId, deletedAt: null };
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} },
      ];
    }

    const data = await prisma.department.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { employees: true } } },
    });

    res.status(200).json({ success: true, count: data.length, data, branch: branchId, company: companyId });
  } catch (error) {
    console.error('getAllDepartments error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Department name is required' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const existing = await prisma.department.findFirst({
      where: { code: { equals: code?.trim()}, companyId },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Department code already exists' });

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description || null,
        companyId,
        branchId,
      },
    });

    res.status(201).json({ success: true, data: dept, message: `Department "${dept.name}" created` });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Department code already exists' });
    console.error('createDepartment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Department not found' });

    const branchId = getBranchId(req);
    if (existing.branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Different branch.' });
    }

    const { name, code, description, isActive } = req.body;
    const data = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({ success: true, data, message: 'Department updated' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Code already exists' });
    console.error('updateDepartment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (existing._count.employees > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${existing._count.employees} employee(s) linked.` });
    }

    await prisma.department.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    res.status(200).json({ success: true, message: 'Department deleted' });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// DESIGNATIONS
// ═══════════════════════════════════════════════════════════

const getAllDesignations = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { search } = req.query;
    const where = { companyId, deletedAt: null };
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} },
      ];
    }

    const data = await prisma.designation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { employees: true } } },
    });

    res.status(200).json({ success: true, count: data.length, data, branch: branchId, company: companyId });
  } catch (error) {
    console.error('getAllDesignations error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createDesignation = async (req, res) => {
  try {
    const { name, code, description, defaultSalary, defaultSalaryType } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Designation name is required' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const existing = await prisma.designation.findFirst({
      where: { code: { equals: code?.trim()}, companyId },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Code already exists' });

    const desig = await prisma.designation.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description || null,
        defaultSalary: defaultSalary ? parseFloat(defaultSalary) : 0,
        defaultSalaryType: defaultSalaryType?.toLowerCase() || 'fixed_monthly',
        companyId,
        branchId,
      },
    });

    res.status(201).json({ success: true, data: desig, message: `Designation "${desig.name}" created` });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Code already exists' });
    console.error('createDesignation error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const updateDesignation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.designation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const branchId = getBranchId(req);
    if (existing.branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { name, code, description, defaultSalary, defaultSalaryType, isActive } = req.body;
    const data = await prisma.designation.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(description !== undefined && { description: description || null }),
        ...(defaultSalary !== undefined && { defaultSalary: parseFloat(defaultSalary) }),
        ...(defaultSalaryType && { defaultSalaryType: defaultSalaryType.toLowerCase() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({ success: true, data, message: 'Designation updated' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Code already exists' });
    console.error('updateDesignation error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteDesignation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.designation.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing._count.employees > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${existing._count.employees} employee(s) linked.` });
    }

    await prisma.designation.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    res.status(200).json({ success: true, message: 'Designation deleted' });
  } catch (error) {
    console.error('deleteDesignation error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EMPLOYEES — WITH USER ACCOUNT CREATION
// ═══════════════════════════════════════════════════════════

const getAllEmployees = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { search, status, salaryType, designationId, departmentId } = req.query;
    const where = { companyId, deletedAt: null };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status.toLowerCase();
    if (salaryType) where.salaryType = salaryType.toLowerCase();
    if (designationId) where.designationId = parseInt(designationId);
    if (departmentId) where.departmentId = parseInt(departmentId);
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { employeeCode: { contains: search} },
        { phone: { contains: search} },
        { cnic: { contains: search} },
      ];
    }

    const data = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        designation: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        _count: { select: { attendances: true, loans: true, eventAssignments: true } },
      },
    });

    res.status(200).json({ success: true, count: data.length, data, branch: branchId, company: companyId });
  } catch (error) {
    console.error('getAllEmployees error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const branchId = getBranchId(req);
    const data = await prisma.employee.findFirst({
      where: { id, branchId: branchId || undefined },
      include: {
        designation: true,
        department: true,
        user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        bankDetails: true,
        documents: true,
        leaveBalances: true,
        _count: {
          select: { attendances: true, leaves: true, loans: true, payrolls: true, eventAssignments: true, ledgers: true },
        },
      },
    });

    if (!data) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getEmployeeById error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const {
      name, fatherName, phone, email, cnic, dateOfBirth, gender, maritalStatus,
      address, city, emergencyContact, emergencyName,
      designationId, departmentId, joinDate,
      salaryType, basicSalary, perEventRate, hourlyRate, dailyRate,
      openingBalance,
      // User Account Fields
      enableLogin, password, userRole, userEmail
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!phone?.trim()) return res.status(400).json({ success: false, message: 'Phone is required' });
    if (!designationId) return res.status(400).json({ success: false, message: 'Designation is required' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    // Generate employee code
    const lastEmp = await prisma.employee.findFirst({
      where: { companyId },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const employeeCode = req.body.employeeCode || `EMP-${String((lastEmp?.id || 0) + 1).padStart(4, '0')}`;

    // Check duplicates
    const existingCode = await prisma.employee.findFirst({
      where: { employeeCode: { equals: employeeCode}, companyId },
    });
    if (existingCode) return res.status(409).json({ success: false, message: 'Employee code already exists' });

    const existingCnic = cnic ? await prisma.employee.findFirst({
      where: { cnic: { equals: cnic.trim()}, companyId },
    }) : null;
    if (existingCnic) return res.status(409).json({ success: false, message: 'CNIC already registered' });

    const openBal = parseFloat(openingBalance || 0);

    const result = await prisma.$transaction(async (tx) => {
      // ── Create Employee ──
      const emp = await tx.employee.create({
        data: {
          employeeCode,
          name: name.trim(),
          fatherName: fatherName?.trim() || null,
          phone: phone.trim(),
          email: email?.trim() || null,
          cnic: cnic?.trim() || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          maritalStatus: maritalStatus || null,
          address: address || null,
          city: city?.trim() || null,
          emergencyContact: emergencyContact?.trim() || null,
          emergencyName: emergencyName?.trim() || null,
          designationId: parseInt(designationId),
          departmentId: departmentId ? parseInt(departmentId) : null,
          joinDate: joinDate ? new Date(joinDate) : new Date(),
          salaryType: salaryType?.toLowerCase() || 'fixed_monthly',
          basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
          perEventRate: perEventRate ? parseFloat(perEventRate) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          dailyRate: dailyRate ? parseFloat(dailyRate) : null,
          openingBalance: openBal,
          currentBalance: openBal,
          companyId,
          branchId,
        },
        include: { designation: true, department: true },
      });

      // ── Create Opening Balance Ledger ──
      if (openBal !== 0) {
        await tx.staffLedger.create({
          data: {
            employeeId: emp.id,
            type: 'opening_balance',
            amount: openBal,
            balance: openBal,
            notes: 'Opening balance',
            companyId,
            branchId,
            createdById: req.user?.id || 1,
          },
        });
      }

      // ── Create Leave Balance ──
      const currentYear = new Date().getFullYear();
      await tx.employeeLeaveBalance.create({
        data: {
          employeeId: emp.id,
          year: currentYear,
          casualTotal: 10,
          sickTotal: 10,
          annualTotal: 14,
        },
      });

      // ── CREATE USER ACCOUNT IF ENABLED ──
      let user = null;
      if (enableLogin === true || enableLogin === 'true') {
        const loginEmail = userEmail || email;
        if (!loginEmail) {
          throw new Error('Email is required for login access');
        }
        if (!password) {
          throw new Error('Password is required for login access');
        }
        const loginRole = userRole || 'staff';

        user = await createUserAccount(
          tx, emp.id, loginEmail, password, loginRole,
          name, phone, companyId, branchId, req.user?.id || 1
        );
      }

      return { employee: emp, user };
    });

    res.status(201).json({
      success: true,
      data: result.employee,
      user: result.user,
      message: result.user
        ? `Employee "${result.employee.name}" created with user account!`
        : `Employee "${result.employee.name}" created successfully`
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Duplicate code, CNIC or email' });
    console.error('createEmployee error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Employee not found' });

    const branchId = getBranchId(req);
    if (existing.branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Different branch.' });
    }

    const {
      name, fatherName, phone, email, cnic, dateOfBirth, gender, maritalStatus,
      address, city, emergencyContact, emergencyName,
      designationId, departmentId, joinDate, resignDate,
      salaryType, basicSalary, perEventRate, hourlyRate, dailyRate,
      status, isActive,
      // User Account Fields
      enableLogin, password, userRole, userEmail
    } = req.body;

    // Salary history tracking
    const salaryChanged = basicSalary !== undefined && parseFloat(basicSalary) !== parseFloat(existing.basicSalary);
    const salaryTypeChanged = salaryType && salaryType.toLowerCase() !== existing.salaryType;

    const result = await prisma.$transaction(async (tx) => {
      // ── Update Employee ──
      const emp = await tx.employee.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(fatherName !== undefined && { fatherName: fatherName?.trim() || null }),
          ...(phone && { phone: phone.trim() }),
          ...(email !== undefined && { email: email?.trim() || null }),
          ...(cnic !== undefined && { cnic: cnic?.trim() || null }),
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
          ...(gender && { gender }),
          ...(maritalStatus && { maritalStatus }),
          ...(address !== undefined && { address: address || null }),
          ...(city !== undefined && { city: city?.trim() || null }),
          ...(emergencyContact !== undefined && { emergencyContact: emergencyContact?.trim() || null }),
          ...(emergencyName !== undefined && { emergencyName: emergencyName?.trim() || null }),
          ...(designationId && { designationId: parseInt(designationId) }),
          ...(departmentId !== undefined && { departmentId: departmentId ? parseInt(departmentId) : null }),
          ...(joinDate && { joinDate: new Date(joinDate) }),
          ...(resignDate !== undefined && { resignDate: resignDate ? new Date(resignDate) : null }),
          ...(salaryType && { salaryType: salaryType.toLowerCase() }),
          ...(basicSalary !== undefined && { basicSalary: parseFloat(basicSalary) }),
          ...(perEventRate !== undefined && { perEventRate: perEventRate ? parseFloat(perEventRate) : null }),
          ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null }),
          ...(dailyRate !== undefined && { dailyRate: dailyRate ? parseFloat(dailyRate) : null }),
          ...(status && { status: status.toLowerCase() }),
          ...(isActive !== undefined && { isActive }),
        },
        include: { designation: true, department: true, user: true },
      });

      // ── Salary History ──
      if (salaryChanged || salaryTypeChanged) {
        await tx.employeeSalaryHistory.create({
          data: {
            employeeId: id,
            oldSalary: existing.basicSalary,
            newSalary: emp.basicSalary,
            oldSalaryType: existing.salaryType,
            newSalaryType: emp.salaryType,
            effectiveDate: new Date(),
            reason: 'Salary updated',
            createdById: req.user?.id || null,
          },
        });
      }

      // ── USER ACCOUNT LOGIC ──
      let user = emp.user;

      if (enableLogin === true || enableLogin === 'true') {
        // LOGIN ENABLED: Create or Update + Reactivate user
        const loginEmail = userEmail || email || existing.email;
        const loginRole = userRole || existing.user?.role || 'staff';
        const loginName = name || existing.name;
        const loginPhone = phone || existing.phone;

        if (!loginEmail) {
          throw new Error('Email is required for login access');
        }

        user = await updateUserAccount(
          tx, emp, loginEmail, password, loginRole,
          loginName, loginPhone, existing.companyId, branchId
        );

      } else if (enableLogin === false || enableLogin === 'false') {
        // LOGIN DISABLED: Deactivate user AND unlink from employee
        if (emp.userId) {
          await tx.user.update({
            where: { id: emp.userId },
            data: { isActive: false }
          });
          await tx.userRoleAssignment.updateMany({
            where: { userId: emp.userId },
            data: { isActive: false }
          });
          // Unlink user from employee
          await tx.employee.update({
            where: { id: emp.id },
            data: { userId: null }
          });
          user = null;
        }
      }

      return { employee: emp, user };
    });

    res.status(200).json({
      success: true,
      data: result.employee,
      user: result.user,
      message: result.user
        ? 'Employee updated with user account!'
        : 'Employee updated successfully'
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Duplicate code, CNIC or email' });
    console.error('updateEmployee error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        _count: {
          select: { attendances: true, leaves: true, loans: true, payrolls: true, eventAssignments: true, ledgers: true },
        },
      },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const totalLinked = Object.values(existing._count).reduce((a, b) => a + b, 0);

    await prisma.$transaction(async (tx) => {
      // Soft delete employee
      await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false, status: 'terminated' },
      });

      // Deactivate user if exists
      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isActive: false }
        });
        await tx.userRoleAssignment.updateMany({
          where: { userId: existing.userId, isActive: true },
          data: { isActive: false }
        });
      }
    });

    res.status(200).json({
      success: true,
      message: totalLinked > 0
        ? 'Employee soft-deleted (records preserved)'
        : 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('deleteEmployee error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════
module.exports = {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};