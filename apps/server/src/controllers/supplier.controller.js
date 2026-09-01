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

// @desc    Get all suppliers (STRICT Branch-Wise + Optional Type Filter)
const getSuppliers = async (req, res) => {
  try {
    const { search, isActive, type } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId, deletedAt: null };

    if (type && type !== 'ALL') {
      where.type = type.toUpperCase();
    }

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            purchaseOrders: true,
            purchases: true,
            returns: true,
            payments: true,
            purchaseBills: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
      branch: branchId
    });
  } catch (error) {
    console.error('getSuppliers error 500 details:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single supplier with complete ledger history
const getSupplier = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        purchases: {
          include: {
            items: { include: { inventory: { select: { name: true, unit: true } } } },
            payments: true
          },
          orderBy: { createdAt: 'desc' }
        },
        purchaseOrders: {
          include: {
            items: { include: { inventory: { select: { name: true, unit: true } } } }
          },
          orderBy: { createdAt: 'desc' }
        },
        purchaseBills: {
          orderBy: { createdAt: 'desc' }
        },
        returns: {
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        supplierLedgers: {
          orderBy: { date: 'desc' },
          take: 200
        },
        _count: {
          select: {
            purchaseOrders: true,
            purchases: true,
            returns: true,
            payments: true,
            purchaseBills: true,
            supplierLedgers: true
          }
        }
      },
    });

    if (!supplier || supplier.deletedAt) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    if (supplier.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This supplier belongs to another branch.'
      });
    }

    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    console.error('getSupplier error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create supplier (Branch-Wise)
const createSupplier = async (req, res) => {
  try {
    const { name, code, contactPerson, phone, email, address, city, type, openingBalance, branchId, companyId } = req.body;

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and Phone are required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const existing = await prisma.supplier.findFirst({
      where: {
        OR: [
          { phone: phone.trim() },
          code ? { code: { equals: code.trim(), mode: 'insensitive' } } : {}
        ],
        companyId: parseInt(targetCompanyId),
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Supplier with this phone number or code already exists in this company'
      });
    }

    const openBal = openingBalance ? parseFloat(openingBalance) : 0;

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        type: type ? type.toUpperCase() : 'WHOLESALE',
        openingBalance: openBal,
        currentBalance: openBal,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId),
        isActive: true
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { purchaseOrders: true, purchases: true, returns: true, payments: true }
        }
      }
    });

    // ── Create Opening Balance Ledger Entry ──
    if (openBal !== 0) {
      await prisma.supplierLedger.create({
        data: {
          supplierId: supplier.id,
          type: 'OPENING_BALANCE',
          amount: openBal,
          balance: openBal,
          notes: 'Supplier opening balance',
          branchId: targetBranchId,
          companyId: parseInt(targetCompanyId),
          userId: req.user.id,
          date: new Date(),
        }
      });
    }

    res.status(201).json({
      success: true,
      data: supplier,
      message: `Supplier "${supplier.name}" created successfully`
    });
  } catch (error) {
    console.error('createSupplier error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update supplier
const updateSupplier = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
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
        message: 'Access denied. This supplier belongs to another branch.'
      });
    }

    const { name, code, contactPerson, phone, email, address, city, type, isActive } = req.body;

    if (phone || code) {
      const duplicate = await prisma.supplier.findFirst({
        where: {
          OR: [
            phone ? { phone: phone.trim() } : {},
            code ? { code: { equals: code.trim(), mode: 'insensitive' } } : {}
          ],
          companyId: existing.companyId || (await getCompanyIdByBranch(branchId)),
          NOT: { id: id },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another supplier with this phone or code already exists'
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson?.trim() || null }),
        ...(phone && { phone: phone.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(type && { type: type.toUpperCase() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { purchaseOrders: true, purchases: true, returns: true, payments: true }
        }
      }
    });

    res.status(200).json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    console.error('updateSupplier error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete supplier (Soft delete)
const deleteSupplier = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, branchId: true, name: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
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
        message: 'Access denied. This supplier belongs to another branch.'
      });
    }

    const linkedCounts = await prisma.supplier.findUnique({
      where: { id },
      select: {
        _count: {
          select: { 
            purchases: true, 
            purchaseOrders: true, 
            returns: true, 
            payments: true,
            purchaseBills: true 
          }
        }
      }
    });

    const totalLinked = linkedCounts._count.purchases + 
                        linkedCounts._count.purchaseOrders + 
                        linkedCounts._count.returns +
                        linkedCounts._count.payments +
                        linkedCounts._count.purchaseBills;

    if (totalLinked > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${totalLinked} transaction(s) linked. Clear or remove them first.`,
        linkedCounts: linkedCounts._count
      });
    }

    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.status(200).json({
      success: true,
      message: `Supplier "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    console.error('deleteSupplier error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get suppliers by branch
const getSuppliersByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin' && req.userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Authorized roles required.'
      });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { branchId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { purchaseOrders: true, purchases: true, returns: true, payments: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    console.error('getSuppliersByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create supplier payment (Bank + Ledger + Account Transaction)
const createSupplierPayment = async (req, res) => {
  try {
    const { supplierId, amount, method, reference, notes, branchId, accountId, purchaseBillId } = req.body;

    if (!supplierId || !amount) {
      return res.status(400).json({ success: false, message: 'Supplier ID and amount are required' });
    }

    const supplier = await prisma.supplier.findUnique({ 
      where: { id: parseInt(supplierId) } 
    });
    
    if (!supplier || supplier.deletedAt) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const reqBranchId = getBranchId(req);
    if (!reqBranchId || supplier.branchId !== reqBranchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Supplier belongs to another branch.' 
      });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const targetBranchId = branchId ? parseInt(branchId) : supplier.branchId;
    const paymentNo = `PAY-${Date.now().toString().slice(-8)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          paymentNo,
          supplierId: parseInt(supplierId),
          purchaseBillId: purchaseBillId ? parseInt(purchaseBillId) : null,
          bankAccountId: accountId ? parseInt(accountId) : null,
          amount: payAmount,
          method: method || 'cash',
          reference: reference || null,
          notes: notes || null,
          branchId: targetBranchId,
          companyId: supplier.companyId,
          userId: req.user.id,
          status: 'completed',
        }
      });

      // 2. Deduct from Bank Account (if provided)
      let newBankBalance = null;
      if (accountId) {
        const account = await tx.bankAccount.findUnique({ where: { id: parseInt(accountId) } });
        if (!account) throw new Error('Bank account not found');
        
        newBankBalance = parseFloat(account.currentBalance) - payAmount;
        if (newBankBalance < 0) {
          throw new Error(`Insufficient balance in ${account.bankName}. Current: ${account.currentBalance}, Required: ${payAmount}`);
        }
        
        await tx.bankAccount.update({
          where: { id: parseInt(accountId) },
          data: { currentBalance: newBankBalance }
        });

        // 3. Account Transaction for Day Book
        await tx.accountTransaction.create({
          data: {
            bankAccountId: parseInt(accountId),
            type: 'DEBIT',
            amount: payAmount,
            balanceAfter: newBankBalance,
            category: 'VENDOR_PAYMENT',
            description: `Payment to supplier: ${supplier.name} — ${paymentNo}`,
            referenceId: payment.id,
            referenceType: 'SUPPLIER_PAYMENT',
            paymentMode: method?.toUpperCase() || 'CASH',
            branchId: targetBranchId,
            companyId: supplier.companyId,
            createdBy: req.user.id,
            transactionDate: new Date(),
          }
        });
      }

      // 4. Update Purchase Bill (if bill-wise payment)
      if (purchaseBillId) {
        const bill = await tx.purchaseBill.findUnique({ where: { id: parseInt(purchaseBillId) } });
        if (bill) {
          const newPaid = parseFloat(bill.paidAmount) + payAmount;
          const newDue = parseFloat(bill.dueAmount) - payAmount;
          await tx.purchaseBill.update({
            where: { id: parseInt(purchaseBillId) },
            data: {
              paidAmount: newPaid,
              dueAmount: newDue,
              paymentStatus: newDue <= 0 ? 'PAID' : 'PARTIAL',
              status: newDue <= 0 ? 'PAID' : bill.status,
            }
          });
        }
      }

      // 5. Update Supplier Balance
      const supplierUpdate = await tx.supplier.update({
        where: { id: parseInt(supplierId) },
        data: { currentBalance: { decrement: payAmount } }
      });

      // 6. Supplier Ledger Entry
      await tx.supplierLedger.create({
        data: {
          supplierId: parseInt(supplierId),
          type: 'PAYMENT_MADE',
          amount: payAmount,
          balance: parseFloat(supplierUpdate.currentBalance),
          referenceId: payment.id,
          referenceType: 'PAYMENT',
          notes: notes || `Payment ${paymentNo}${accountId ? ' via Bank' : ' via Cash'}`,
          branchId: targetBranchId,
          companyId: supplier.companyId,
          userId: req.user.id,
          date: new Date(),
        }
      });

      return payment;
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result
    });
  } catch (error) {
    console.error('createSupplierPayment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliersByBranch,
  createSupplierPayment,
};