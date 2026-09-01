// ═══════════════════════════════════════════════════════════
// controllers/attendance.controller.js
// Attendance | Leaves | Leave Balances
// Follows EXACT pattern from accounts.controller.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// ═══════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════

const getAllAttendance = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { employeeId, from, to, status, page = 1, limit = 50 } = req.query;
    const where = { companyId, branchId };
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (status) where.status = status.toLowerCase();
    if (from && to) {
      where.date = {
        gte: new Date(from + 'T00:00:00'),
        lte: new Date(to + 'T23:59:59'),
      };
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    res.status(200).json({
      success: true, count: data.length, data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
      branch: branchId, company: companyId,
    });
  } catch (error) {
    console.error('getAllAttendance error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, overtimeHours, overtimeRate, notes, location } = req.body;
    if (!employeeId || !date) return res.status(400).json({ success: false, message: 'Employee ID and date are required' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const emp = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId), companyId, branchId },
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found in this branch' });

    const otHours = parseFloat(overtimeHours || 0);
    const otRate = parseFloat(overtimeRate || emp.hourlyRate || 0);
    const otAmount = otHours * otRate;

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: { employeeId: parseInt(employeeId), date: new Date(date) },
      },
      update: {
        ...(checkIn && { checkIn: new Date(checkIn) }),
        ...(checkOut && { checkOut: new Date(checkOut) }),
        ...(status && { status: status.toLowerCase() }),
        overtimeHours: otHours,
        overtimeRate: otRate,
        overtimeAmount: otAmount,
        ...(notes !== undefined && { notes }),
        ...(location && { location }),
      },
      create: {
        employeeId: parseInt(employeeId),
        date: new Date(date),
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status?.toLowerCase() || 'present',
        overtimeHours: otHours,
        overtimeRate: otRate,
        overtimeAmount: otAmount,
        notes: notes || null,
        location: location || null,
        companyId,
        branchId,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: attendance, message: 'Attendance recorded' });
  } catch (error) {
    console.error('createAttendance error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    await prisma.attendance.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Attendance deleted' });
  } catch (error) {
    console.error('deleteAttendance error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { employeeId, month, year } = req.query;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const where = { companyId, branchId, date: { gte: start, lte: end } };
    if (employeeId) where.employeeId = parseInt(employeeId);

    const attendances = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true, basicSalary: true, salaryType: true } } },
    });

    const summary = {};
    attendances.forEach((a) => {
      const eid = a.employeeId;
      if (!summary[eid]) {
        summary[eid] = {
          employee: a.employee,
          present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0,
          totalOvertimeHours: 0, totalOvertimeAmount: 0,
        };
      }
      summary[eid][a.status] = (summary[eid][a.status] || 0) + 1;
      summary[eid].totalOvertimeHours += parseFloat(a.overtimeHours || 0);
      summary[eid].totalOvertimeAmount += parseFloat(a.overtimeAmount || 0);
    });

    res.status(200).json({ success: true, data: Object.values(summary), month, year });
  } catch (error) {
    console.error('getAttendanceSummary error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// LEAVES
// ═══════════════════════════════════════════════════════════

const getAllLeaves = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { employeeId, status, type, from, to, page = 1, limit = 50 } = req.query;
    const where = { companyId, branchId };
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (status) where.status = status.toLowerCase();
    if (type) where.type = type.toLowerCase();
    if (from && to) {
      where.startDate = { gte: new Date(from) };
      where.endDate = { lte: new Date(to) };
    }

    const [data, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    res.status(200).json({
      success: true, count: data.length, data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getAllLeaves error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createLeave = async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, reason, days } = req.body;
    if (!employeeId || !type || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Employee, type, start and end dates are required' });
    }

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const emp = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId), companyId, branchId },
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = days || Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leave.create({
      data: {
        employeeId: parseInt(employeeId),
        type: type.toLowerCase(),
        startDate: start,
        endDate: end,
        days: diffDays,
        reason: reason || null,
        companyId,
        branchId,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: leave, message: 'Leave request submitted' });
  } catch (error) {
    console.error('createLeave error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const approveLeave = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.leave.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Leave not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: req.user?.id || null,
        approvedAt: new Date(),
      },
    });

    // Deduct from leave balance
    const currentYear = new Date().getFullYear();
    await prisma.employeeLeaveBalance.updateMany({
      where: { employeeId: existing.employeeId, year: currentYear },
      data: {
        ...(existing.type === 'casual' && { casualUsed: { increment: existing.days } }),
        ...(existing.type === 'sick' && { sickUsed: { increment: existing.days } }),
        ...(existing.type === 'annual' && { annualUsed: { increment: existing.days } }),
      },
    });

    res.status(200).json({ success: true, data: leave, message: 'Leave approved' });
  } catch (error) {
    console.error('approveLeave error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const rejectLeave = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.leave.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const { rejectionReason } = req.body;
    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason || null,
        approvedById: req.user?.id || null,
      },
    });

    res.status(200).json({ success: true, data: leave, message: 'Leave rejected' });
  } catch (error) {
    console.error('rejectLeave error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteLeave = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.leave.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    await prisma.leave.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Leave deleted' });
  } catch (error) {
    console.error('deleteLeave error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getLeaveBalance = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    if (isNaN(employeeId)) return res.status(400).json({ success: false, message: 'Invalid employee ID' });

    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balance = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId, year },
    });

    if (!balance) return res.status(404).json({ success: false, message: 'Leave balance not found' });
    res.status(200).json({ success: true, data: balance });
  } catch (error) {
    console.error('getLeaveBalance error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════
module.exports = {
  getAllAttendance,
  createAttendance,
  deleteAttendance,
  getAttendanceSummary,
  getAllLeaves,
  createLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
  getLeaveBalance,
};