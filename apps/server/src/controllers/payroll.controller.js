// ═══════════════════════════════════════════════════════════
// controllers/payroll.controller.js
// Payroll | Loans | StaffLedger | EventStaffAssignment | StaffPayment
// Follows EXACT pattern from accounts.controller.js
// ═══════════════════════════════════════════════════════════

const prisma = require('../config/database');

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
// PAYROLL
// ═══════════════════════════════════════════════════════════

const getAllPayrolls = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { month, year, status, page = 1, limit = 20 } = req.query;
    const where = { companyId };
    if (branchId) where.branchId = branchId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status.toLowerCase();

    const [data, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          _count: { select: { items: true } },
        },
      }),
      prisma.payroll.count({ where }),
    ]);

    res.status(200).json({
      success: true, count: data.length, data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getAllPayrolls error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getPayrollById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const data = await prisma.payroll.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            employee: { select: { id: true, name: true, employeeCode: true, salaryType: true } },
          },
        },
      },
    });

    if (!data) return res.status(404).json({ success: false, message: 'Payroll not found' });

    const branchId = getBranchId(req);
    if (data.branchId && data.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getPayrollById error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const generatePayroll = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.body;
    if (!month || !year || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Month, year, startDate and endDate are required' });
    }

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    // Check existing
    const existing = await prisma.payroll.findFirst({
      where: { month: parseInt(month), year: parseInt(year), companyId, branchId: branchId || null },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Payroll already exists for this month' });

    const employees = await prisma.employee.findMany({
      where: { companyId, branchId, status: 'active', deletedAt: null },
      include: {
        designation: true,
        leaveBalances: { where: { year: parseInt(year) } },
      },
    });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const payrollNo = `PR-${year}-${String(month).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      const payroll = await tx.payroll.create({
        data: {
          payrollNo,
          month: parseInt(month),
          year: parseInt(year),
          startDate: start,
          endDate: end,
          totalEmployees: employees.length,
          companyId,
          branchId,
        },
      });

      let totalBasic = 0, totalAllowances = 0, totalDeductions = 0, totalBonuses = 0, totalOvertime = 0, totalNet = 0;

      for (const emp of employees) {
        // Attendance in period
        const attendances = await tx.attendance.findMany({
          where: {
            employeeId: emp.id,
            date: { gte: start, lte: end },
          },
        });

        const presentDays = attendances.filter(a => a.status === 'present').length;
        const absentDays = attendances.filter(a => a.status === 'absent').length;
        const leaveDays = attendances.filter(a => a.status === 'on_leave').length;
        const halfDays = attendances.filter(a => a.status === 'half_day').length;
        const totalDays = attendances.length || 30;

        const overtimeAmount = attendances.reduce((sum, a) => sum + parseFloat(a.overtimeAmount || 0), 0);
        const overtimeHours = attendances.reduce((sum, a) => sum + parseFloat(a.overtimeHours || 0), 0);

        // Fixed monthly calculation
        let basicSalary = parseFloat(emp.basicSalary || 0);
        let absentDeduction = 0;

        if (emp.salaryType === 'fixed_monthly') {
          const perDay = basicSalary / 30;
          absentDeduction = (absentDays * perDay) + (halfDays * perDay * 0.5);
          basicSalary = basicSalary - absentDeduction;
        } else {
          basicSalary = 0; // Per-event/hourly/daily paid separately
        }

        // Loan deduction
        const activeLoans = await tx.employeeLoan.findMany({
          where: { employeeId: emp.id, status: 'active', deductFromSalary: true },
        });
        let loanDeduction = 0;
        for (const loan of activeLoans) {
          const remaining = parseFloat(loan.remainingAmount);
          const inst = parseFloat(loan.installmentAmount);
          const deduct = Math.min(inst, remaining);
          loanDeduction += deduct;

          // Update loan
          const newPaid = parseFloat(loan.paidAmount) + deduct;
          const newRemaining = parseFloat(loan.amount) - newPaid;
          await tx.employeeLoan.update({
            where: { id: loan.id },
            data: {
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              status: newRemaining <= 0 ? 'paid' : 'active',
            },
          });

          await tx.loanInstallment.create({
            data: {
              loanId: loan.id,
              amount: deduct,
              payrollId: payroll.id,
            },
          });
        }

        // Default allowances (can be extended)
        const houseRent = emp.salaryType === 'fixed_monthly' ? basicSalary * 0.3 : 0;
        const medicalAllowance = emp.salaryType === 'fixed_monthly' ? basicSalary * 0.1 : 0;
        const conveyance = emp.salaryType === 'fixed_monthly' ? basicSalary * 0.05 : 0;

        const grossSalary = basicSalary + houseRent + medicalAllowance + conveyance + overtimeAmount;
        const totalDed = loanDeduction;
        const netSalary = grossSalary - totalDed;

        await tx.payrollItem.create({
          data: {
            payrollId: payroll.id,
            employeeId: emp.id,
            totalDays,
            presentDays,
            absentDays,
            leaveDays,
            overtimeHours,
            basicSalary,
            houseRent,
            medicalAllowance,
            conveyance,
            overtimeAmount,
            loanDeduction,
            totalDeductions: totalDed,
            grossSalary,
            netSalary,
            dueAmount: netSalary,
          },
        });

        totalBasic += basicSalary;
        totalAllowances += (houseRent + medicalAllowance + conveyance);
        totalDeductions += totalDed;
        totalOvertime += overtimeAmount;
        totalNet += netSalary;
      }

      await tx.payroll.update({
        where: { id: payroll.id },
        data: {
          totalBasicSalary: totalBasic,
          totalAllowances,
          totalDeductions,
          totalOvertime,
          totalNetSalary: totalNet,
        },
      });

      return tx.payroll.findUnique({
        where: { id: payroll.id },
        include: {
          items: {
            include: { employee: { select: { id: true, name: true, employeeCode: true } } },
          },
        },
      });
    });

    res.status(201).json({ success: true, data: result, message: `Payroll generated for ${month}/${year}` });
  } catch (error) {
    console.error('generatePayroll error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const processPayroll = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Payroll not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: 'processed',
        processedById: req.user?.id || null,
        processedAt: new Date(),
      },
    });

    res.status(200).json({ success: true, data: payroll, message: 'Payroll processed' });
  } catch (error) {
    console.error('processPayroll error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const payPayrollItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) return res.status(400).json({ success: false, message: 'Invalid item ID' });

    const { bankAccountId, paymentDate, notes } = req.body;

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const item = await prisma.payrollItem.findUnique({
      where: { id: itemId },
      include: { employee: true, payroll: true },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Payroll item not found' });
    if (item.payroll.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const amount = parseFloat(item.netSalary);
    const paymentNo = `SP-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Update payroll item
      const updatedItem = await tx.payrollItem.update({
        where: { id: itemId },
        data: {
          paidAmount: amount,
          dueAmount: 0,
          paymentStatus: 'paid',
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
        },
      });

      // Create staff payment record
      const staffPayment = await tx.staffPayment.create({
        data: {
          paymentNo,
          employeeId: item.employeeId,
          amount,
          paymentType: 'salary',
          payrollItemId: itemId,
          method: bankAccountId ? 'bank_transfer' : 'cash',
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          companyId,
          branchId,
          createdById: req.user?.id || 1,
        },
      });

      // Update employee balance
      await tx.employee.update({
        where: { id: item.employeeId },
        data: {
          currentBalance: { increment: amount },
          totalPaid: { increment: amount },
        },
      });

      // Staff ledger entry
      await tx.staffLedger.create({
        data: {
          employeeId: item.employeeId,
          type: 'salary',
          amount,
          balance: { increment: amount },
          referenceType: 'PayrollItem',
          referenceId: itemId,
          notes: `Salary for ${item.payroll.month}/${item.payroll.year}`,
          companyId,
          branchId,
          createdById: req.user?.id || 1,
        },
      });

      // Bank transaction if bank account selected
      if (bankAccountId) {
        const account = await tx.bankAccount.findFirst({
          where: { id: parseInt(bankAccountId), branchId, companyId },
        });
        if (account) {
          const newBal = parseFloat(account.currentBalance) - amount;
          await tx.bankAccount.update({ where: { id: account.id }, data: { currentBalance: newBal } });
          await tx.accountTransaction.create({
            data: {
              bankAccountId: account.id,
              type: 'DEBIT',
              amount,
              balanceAfter: newBal,
              category: 'SALARY',
              description: `Salary payment to ${item.employee.name}`,
              relatedEntityType: 'StaffPayment',
              relatedEntityId: staffPayment.id,
              paymentMode: 'BANK_TRANSFER',
              transactionDate: new Date(),
              branchId,
              companyId,
              createdBy: req.user?.id || 1,
            },
          });
        }
      }

      return { item: updatedItem, staffPayment };
    });

    res.status(200).json({ success: true, data: result, message: 'Salary paid successfully' });
  } catch (error) {
    console.error('payPayrollItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EMPLOYEE LOANS
// ═══════════════════════════════════════════════════════════

const getAllLoans = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { employeeId, status, page = 1, limit = 50 } = req.query;
    const where = { companyId, branchId };
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (status) where.status = status.toLowerCase();

    const [data, total] = await Promise.all([
      prisma.employeeLoan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
          installments: { orderBy: { paidDate: 'desc' }, take: 5 },
          _count: { select: { installments: true } },
        },
      }),
      prisma.employeeLoan.count({ where }),
    ]);

    res.status(200).json({
      success: true, count: data.length, data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getAllLoans error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const data = await prisma.employeeLoan.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        installments: { orderBy: { paidDate: 'desc' } },
      },
    });

    if (!data) return res.status(404).json({ success: false, message: 'Loan not found' });

    const branchId = getBranchId(req);
    if (data.branchId && data.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getLoanById error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createLoan = async (req, res) => {
  try {
    const { employeeId, type, amount, totalInstallments, installmentAmount, deductFromSalary, purpose } = req.body;
    if (!employeeId || !amount) return res.status(400).json({ success: false, message: 'Employee and amount are required' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const emp = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId), companyId, branchId },
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const loanNo = `LN-${Date.now()}`;
    const amt = parseFloat(amount);
    const inst = parseFloat(installmentAmount || 0);
    const totalInst = parseInt(totalInstallments || 1);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.employeeLoan.create({
        data: {
          loanNo,
          employeeId: parseInt(employeeId),
          type: type?.toLowerCase() || 'loan',
          amount: amt,
          paidAmount: 0,
          remainingAmount: amt,
          totalInstallments: totalInst,
          installmentAmount: inst,
          deductFromSalary: deductFromSalary !== false,
          purpose: purpose || null,
          companyId,
          branchId,
          approvedById: req.user?.id || null,
          approvedAt: new Date(),
        },
        include: { employee: { select: { id: true, name: true } } },
      });

      // Update employee totals
      await tx.employee.update({
        where: { id: parseInt(employeeId) },
        data: {
          totalLoan: { increment: amt },
          currentBalance: { decrement: amt }, // Negative balance = company gave loan
        },
      });

      // Ledger entry
      await tx.staffLedger.create({
        data: {
          employeeId: parseInt(employeeId),
          type: type?.toLowerCase() === 'advance' ? 'advance' : 'loan_given',
          amount: -amt,
          balance: { decrement: amt },
          referenceType: 'EmployeeLoan',
          referenceId: loan.id,
          notes: purpose || `${type || 'Loan'} approved`,
          companyId,
          branchId,
          createdById: req.user?.id || 1,
        },
      });

      return loan;
    });

    res.status(201).json({ success: true, data: result, message: 'Loan/Advance created' });
  } catch (error) {
    console.error('createLoan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const updateLoan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const { installmentAmount, deductFromSalary, status, purpose } = req.body;

    const existing = await prisma.employeeLoan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Loan not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const data = await prisma.employeeLoan.update({
      where: { id },
      data: {
        installmentAmount: installmentAmount !== undefined ? parseFloat(installmentAmount) : undefined,
        deductFromSalary: deductFromSalary !== undefined ? deductFromSalary : undefined,
        status: status !== undefined ? status.toLowerCase() : undefined,
        purpose: purpose !== undefined ? purpose : undefined,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    res.status(200).json({ success: true, data, message: 'Loan updated' });
  } catch (error) {
    console.error('updateLoan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.employeeLoan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Loan not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    await prisma.$transaction(async (tx) => {
      // Reverse employee balance
      await tx.employee.update({
        where: { id: existing.employeeId },
        data: {
          totalLoan: { decrement: parseFloat(existing.amount) },
          currentBalance: { increment: parseFloat(existing.amount) },
        },
      });

      // Delete related ledger entries
      await tx.staffLedger.deleteMany({
        where: { referenceType: 'EmployeeLoan', referenceId: id },
      });

      // Delete installments
      await tx.loanInstallment.deleteMany({ where: { loanId: id } });

      // Delete loan
      await tx.employeeLoan.delete({ where: { id } });
    });

    res.status(200).json({ success: true, message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('deleteLoan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const addLoanInstallment = async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    if (isNaN(loanId)) return res.status(400).json({ success: false, message: 'Invalid loan ID' });

    const { amount, notes } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const loan = await prisma.employeeLoan.findUnique({
      where: { id: loanId },
      include: { employee: true },
    });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.companyId !== companyId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const amt = parseFloat(amount);
    const remaining = parseFloat(loan.remainingAmount) - amt;

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.loanInstallment.create({
        data: {
          loanId,
          amount: amt,
          notes: notes || null,
        },
      });

      await tx.employeeLoan.update({
        where: { id: loanId },
        data: {
          paidAmount: { increment: amt },
          remainingAmount: remaining > 0 ? remaining : 0,
          status: remaining <= 0 ? 'paid' : 'active',
        },
      });

      await tx.employee.update({
        where: { id: loan.employeeId },
        data: {
          totalLoanPaid: { increment: amt },
          currentBalance: { increment: amt },
        },
      });

      await tx.staffLedger.create({
        data: {
          employeeId: loan.employeeId,
          type: 'loan_repayment',
          amount: amt,
          balance: { increment: amt },
          referenceType: 'LoanInstallment',
          referenceId: installment.id,
          notes: notes || `Loan installment #${loan.installments?.length + 1 || 1}`,
          companyId,
          branchId,
          createdById: req.user?.id || 1,
        },
      });

      return installment;
    });

    res.status(201).json({ success: true, data: result, message: 'Installment added' });
  } catch (error) {
    console.error('addLoanInstallment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EVENT STAFF ASSIGNMENT
// ═══════════════════════════════════════════════════════════
// controllers/payroll.controller.js - getAllEventAssignments FIXED

const getAllEventAssignments = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
      });
    }

    const { bookingId, employeeId, isPaid, page = 1, limit = 50 } = req.query;
    const where = { 
      companyId: parseInt(companyId),
      branchId: parseInt(branchId)
    };
    
    if (bookingId) where.bookingId = parseInt(bookingId);
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (isPaid !== undefined) where.isPaid = isPaid === 'true';

    console.log('🔍 getAllEventAssignments - where:', where);

    const [data, total] = await Promise.all([
      prisma.eventStaffAssignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              phone: true,
              email: true
            }
          },
          booking: {
            select: {
              id: true,
              // ✅ FIX: eventName → title
              title: true,
              eventDate: true,
              status: true,
              guestName: true,
              guestPhone: true,
              bookingNo: true
            }
          }
        }
      }),
      prisma.eventStaffAssignment.count({ where })
    ]);

    console.log('✅ getAllEventAssignments - found:', data.length, 'records');

    res.status(200).json({
      success: true,
      count: data.length,
      data: data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ getAllEventAssignments error:', error);
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
    });
  }
};

// controllers/payroll.controller.js - getEventAssignmentById FIXED

const getEventAssignmentById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const data = await prisma.eventStaffAssignment.findUnique({
      where: { id },
      include: {
        employee: { 
          select: { 
            id: true, 
            name: true, 
            employeeCode: true, 
            salaryType: true, 
            basicSalary: true 
          } 
        },
        booking: { 
          select: { 
            id: true, 
            // ✅ FIX: eventName → title
            title: true, 
            eventDate: true, 
            status: true,
            bookingNo: true,
            guestName: true,
            guestPhone: true
          } 
        },
      },
    });

    if (!data) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const branchId = getBranchId(req);
    if (data.branchId && data.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getEventAssignmentById error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// controllers/payroll.controller.js - createEventAssignment FIXED

const createEventAssignment = async (req, res) => {
  try {
    const { bookingId, employeeId, role, paymentType, agreedAmount, hoursWorked, autoPayOnEventStart, notes } = req.body;
    
    console.log('📤 createEventAssignment payload:', req.body);

    if (!bookingId || !employeeId || !agreedAmount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking, employee and agreedAmount are required' 
      });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required.' 
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is required.' 
      });
    }

    // ✅ Check if already assigned
    const existing = await prisma.eventStaffAssignment.findFirst({
      where: { 
        bookingId: parseInt(bookingId), 
        employeeId: parseInt(employeeId) 
      }
    });

    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Employee already assigned to this booking' 
      });
    }

    // ✅ Create assignment
    const data = await prisma.eventStaffAssignment.create({
      data: {
        bookingId: parseInt(bookingId),
        employeeId: parseInt(employeeId),
        role: role || null,
        paymentType: paymentType || 'auto',
        agreedAmount: parseFloat(agreedAmount),
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        autoPayOnEventStart: autoPayOnEventStart !== false,
        notes: notes || null,
        companyId: parseInt(companyId),
        branchId: parseInt(branchId)
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true }
        },
        booking: {
          select: { 
            id: true, 
            // ✅ FIX: eventName → title
            title: true, 
            eventDate: true,
            bookingNo: true,
            status: true,
            guestName: true,
            guestPhone: true
          }
        }
      }
    });

    console.log('✅ createEventAssignment - created:', data.id);

    res.status(201).json({
      success: true,
      data: data,
      message: 'Staff assigned to event successfully'
    });
  } catch (error) {
    console.error('❌ createEventAssignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

const updateEventAssignment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const { role, paymentType, agreedAmount, hoursWorked, isPresent, checkInTime, checkOutTime, autoPayOnEventStart, notes } = req.body;

    const existing = await prisma.eventStaffAssignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const data = await prisma.eventStaffAssignment.update({
      where: { id },
      data: {
        role: role !== undefined ? role : undefined,
        paymentType: paymentType !== undefined ? paymentType : undefined,
        agreedAmount: agreedAmount !== undefined ? parseFloat(agreedAmount) : undefined,
        hoursWorked: hoursWorked !== undefined ? parseFloat(hoursWorked) : undefined,
        isPresent: isPresent !== undefined ? isPresent : undefined,
        checkInTime: checkInTime !== undefined ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime !== undefined ? new Date(checkOutTime) : undefined,
        autoPayOnEventStart: autoPayOnEventStart !== undefined ? autoPayOnEventStart : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        employee: { select: { id: true, name: true } },
        booking: { select: { id: true, eventName: true } },
      },
    });

    res.status(200).json({ success: true, data, message: 'Assignment updated' });
  } catch (error) {
    console.error('updateEventAssignment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteEventAssignment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.eventStaffAssignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    if (existing.isPaid) return res.status(400).json({ success: false, message: 'Cannot delete paid assignment' });

    await prisma.eventStaffAssignment.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    console.error('deleteEventAssignment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const markEventAttendance = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const { isPresent, checkInTime, checkOutTime, hoursWorked } = req.body;

    const existing = await prisma.eventStaffAssignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    const data = await prisma.eventStaffAssignment.update({
      where: { id },
      data: {
        isPresent: isPresent !== undefined ? isPresent : existing.isPresent,
        checkInTime: checkInTime !== undefined ? new Date(checkInTime) : existing.checkInTime,
        checkOutTime: checkOutTime !== undefined ? new Date(checkOutTime) : existing.checkOutTime,
        hoursWorked: hoursWorked !== undefined ? parseFloat(hoursWorked) : existing.hoursWorked,
      },
      include: {
        employee: { select: { id: true, name: true } },
        booking: { select: { id: true, eventName: true } },
      },
    });

    res.status(200).json({ success: true, data, message: 'Attendance marked' });
  } catch (error) {
    console.error('markEventAttendance error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// controllers/payroll.controller.js - payEventAssignment FIXED

// controllers/payroll.controller.js - payEventAssignment FIXED

const payEventAssignment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID' 
      });
    }

    const { bankAccountId, paymentDate, notes } = req.body;

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required.' 
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is required.' 
      });
    }

    // Get assignment
    const assignment = await prisma.eventStaffAssignment.findUnique({
      where: { id },
      include: { 
        employee: true, 
        booking: true 
      }
    });

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    if (assignment.branchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied.' 
      });
    }

    if (assignment.isPaid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already paid' 
      });
    }

    const amount = parseFloat(assignment.agreedAmount);
    const paymentNo = `EV-${Date.now()}`;

    console.log('💰 Processing payment:', { id, amount, bankAccountId, paymentDate });

    // ✅ Get current employee balance first
    const employee = await prisma.employee.findUnique({
      where: { id: assignment.employeeId },
      select: { currentBalance: true }
    });

    const newBalance = (employee?.currentBalance || 0) + amount;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update assignment
      const updated = await tx.eventStaffAssignment.update({
        where: { id },
        data: {
          isPaid: true,
          paidAmount: amount,
          paidAt: paymentDate ? new Date(paymentDate) : new Date(),
        },
      });

      // 2. Create staff payment
      const staffPayment = await tx.staffPayment.create({
        data: {
          paymentNo,
          employeeId: assignment.employeeId,
          amount: amount,
          paymentType: 'event_payment',
          eventAssignmentId: id,
          method: bankAccountId ? 'bank_transfer' : 'cash',
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          companyId: parseInt(companyId),
          branchId: parseInt(branchId),
          createdById: req.user?.id || 1,
          notes: notes || `Event payment for ${assignment.booking?.title || assignment.booking?.eventName || 'Event'}`,
        },
      });

      // 3. Update employee balance
      await tx.employee.update({
        where: { id: assignment.employeeId },
        data: {
          currentBalance: newBalance,
          totalPaid: { increment: amount },
        },
      });

      // 4. Staff ledger entry - ✅ FIXED: Use direct value, not increment object
      await tx.staffLedger.create({
        data: {
          employeeId: assignment.employeeId,
          type: 'event_payment',
          amount: amount,
          balance: newBalance, // ✅ Direct Decimal value
          referenceType: 'EventStaffAssignment',
          referenceId: id,
          notes: notes || `Event payment for ${assignment.booking?.title || assignment.booking?.eventName || 'Event'}`,
          companyId: parseInt(companyId),
          branchId: parseInt(branchId),
          createdById: req.user?.id || 1,
          date: new Date(),
        },
      });

      // 5. Bank transaction if bank account selected
      if (bankAccountId) {
        const account = await tx.bankAccount.findFirst({
          where: { 
            id: parseInt(bankAccountId), 
            branchId: parseInt(branchId), 
            companyId: parseInt(companyId) 
          },
        });

        if (account) {
          const newBal = parseFloat(account.currentBalance) - amount;
          await tx.bankAccount.update({ 
            where: { id: account.id }, 
            data: { currentBalance: newBal } 
          });

          await tx.accountTransaction.create({
            data: {
              bankAccountId: account.id,
              type: 'DEBIT',
              amount: amount,
              balanceAfter: newBal,
              category: 'EVENT_STAFF',
              description: `Event payment to ${assignment.employee?.name || 'Staff'}`,
              relatedEntityType: 'StaffPayment',
              relatedEntityId: staffPayment.id,
              paymentMode: 'BANK_TRANSFER',
              transactionDate: new Date(),
              branchId: parseInt(branchId),
              companyId: parseInt(companyId),
              createdBy: req.user?.id || 1,
            },
          });
        }
      }

      return { assignment: updated, staffPayment };
    });

    console.log('✅ Payment processed successfully:', result.staffPayment.id);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Event payment processed successfully'
    });
  } catch (error) {
    console.error('❌ payEventAssignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════
// STAFF LEDGER
// ═══════════════════════════════════════════════════════════

const getStaffLedger = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { employeeId, type, fromDate, toDate, page = 1, limit = 50 } = req.query;
    const where = { companyId, branchId };
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (type) where.type = type;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      prisma.staffLedger.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.staffLedger.count({ where }),
    ]);

    res.status(200).json({
      success: true, count: data.length, data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getStaffLedger error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getEmployeeBalance = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    if (isNaN(employeeId)) return res.status(400).json({ success: false, message: 'Invalid employee ID' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, branchId },
      select: { id: true, name: true, currentBalance: true, totalPaid: true, totalLoan: true, totalLoanPaid: true },
    });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const summary = await prisma.staffLedger.groupBy({
      by: ['type'],
      where: { employeeId, companyId },
      _sum: { amount: true },
    });

    res.status(200).json({ success: true, data: { employee, summary } });
  } catch (error) {
    console.error('getEmployeeBalance error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// STAFF PAYMENT (Direct payments outside payroll)
// ═══════════════════════════════════════════════════════════

const getAllStaffPayments = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const { employeeId, paymentType, page = 1, limit = 50 } = req.query;
    const where = { companyId, branchId };
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (paymentType) where.paymentType = paymentType;

    const [data, total] = await Promise.all([
      prisma.staffPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
          bankAccount: { select: { id: true, accountName: true, bankName: true } },
        },
      }),
      prisma.staffPayment.count({ where }),
    ]);

    res.status(200).json({
      success: true, count: data.length, data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getAllStaffPayments error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getStaffPaymentById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const data = await prisma.staffPayment.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        bankAccount: { select: { id: true, accountName: true, bankName: true } },
      },
    });

    if (!data) return res.status(404).json({ success: false, message: 'Payment not found' });

    const branchId = getBranchId(req);
    if (data.branchId && data.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getStaffPaymentById error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createStaffPayment = async (req, res) => {
  try {
    const { employeeId, amount, paymentType, method, bankAccountId, reference, notes } = req.body;
    if (!employeeId || !amount || !paymentType) {
      return res.status(400).json({ success: false, message: 'Employee, amount and paymentType are required' });
    }

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

    const emp = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId), companyId, branchId },
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const amt = parseFloat(amount);
    const paymentNo = `ST-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.staffPayment.create({
        data: {
          paymentNo,
          employeeId: parseInt(employeeId),
          amount: amt,
          paymentType,
          method: method || 'cash',
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          reference: reference || null,
          notes: notes || null,
          companyId,
          branchId,
          createdById: req.user?.id || 1,
        },
        include: {
          employee: { select: { id: true, name: true } },
        },
      });

      // Update employee balance
      await tx.employee.update({
        where: { id: parseInt(employeeId) },
        data: {
          currentBalance: { increment: amt },
          totalPaid: { increment: amt },
        },
      });

      // Ledger entry
      await tx.staffLedger.create({
        data: {
          employeeId: parseInt(employeeId),
          type: paymentType,
          amount: amt,
          balance: { increment: amt },
          referenceType: 'StaffPayment',
          referenceId: payment.id,
          notes: notes || `${paymentType} payment`,
          companyId,
          branchId,
          createdById: req.user?.id || 1,
        },
      });

      // Bank transaction
      if (bankAccountId) {
        const account = await tx.bankAccount.findFirst({
          where: { id: parseInt(bankAccountId), branchId, companyId },
        });
        if (account) {
          const newBal = parseFloat(account.currentBalance) - amt;
          await tx.bankAccount.update({ where: { id: account.id }, data: { currentBalance: newBal } });
          await tx.accountTransaction.create({
            data: {
              bankAccountId: account.id,
              type: 'DEBIT',
              amount: amt,
              balanceAfter: newBal,
              category: 'STAFF_PAYMENT',
              description: `${paymentType} to ${emp.name}`,
              relatedEntityType: 'StaffPayment',
              relatedEntityId: payment.id,
              paymentMode: method?.toUpperCase() || 'BANK_TRANSFER',
              transactionDate: new Date(),
              branchId,
              companyId,
              createdBy: req.user?.id || 1,
            },
          });
        }
      }

      return payment;
    });

    res.status(201).json({ success: true, data: result, message: 'Payment recorded' });
  } catch (error) {
    console.error('createStaffPayment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const deleteStaffPayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.staffPayment.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });

    const branchId = getBranchId(req);
    if (existing.branchId !== branchId) return res.status(403).json({ success: false, message: 'Access denied.' });

    await prisma.$transaction(async (tx) => {
      // Reverse employee balance
      await tx.employee.update({
        where: { id: existing.employeeId },
        data: {
          currentBalance: { decrement: parseFloat(existing.amount) },
          totalPaid: { decrement: parseFloat(existing.amount) },
        },
      });

      // Reverse ledger
      await tx.staffLedger.deleteMany({
        where: { referenceType: 'StaffPayment', referenceId: id },
      });

      // Reverse bank transaction if applicable
      if (existing.bankAccountId) {
        const account = await tx.bankAccount.findUnique({ where: { id: existing.bankAccountId } });
        if (account) {
          const newBal = parseFloat(account.currentBalance) + parseFloat(existing.amount);
          await tx.bankAccount.update({ where: { id: account.id }, data: { currentBalance: newBal } });
          await tx.accountTransaction.create({
            data: {
              bankAccountId: account.id,
              type: 'CREDIT',
              amount: parseFloat(existing.amount),
              balanceAfter: newBal,
              category: 'STAFF_PAYMENT_REVERSAL',
              description: `Reversal of payment ${existing.paymentNo}`,
              transactionDate: new Date(),
              branchId,
              companyId: existing.companyId,
              createdBy: req.user?.id || 1,
            },
          });
        }
      }

      await tx.staffPayment.delete({ where: { id } });
    });

    res.status(200).json({ success: true, message: 'Payment deleted and reversed' });
  } catch (error) {
    console.error('deleteStaffPayment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Payroll
  getAllPayrolls,
  getPayrollById,
  generatePayroll,
  processPayroll,
  payPayrollItem,

  // Loans
  getAllLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  addLoanInstallment,

  // Event Staff
  getAllEventAssignments,
  getEventAssignmentById,
  createEventAssignment,
  updateEventAssignment,
  deleteEventAssignment,
  markEventAttendance,
  payEventAssignment,

  // Ledger
  getStaffLedger,
  getEmployeeBalance,

  // Staff Payments
  getAllStaffPayments,
  getStaffPaymentById,
  createStaffPayment,
  deleteStaffPayment,
};