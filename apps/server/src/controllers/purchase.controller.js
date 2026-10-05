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

// ── POStatus Enum Values (from schema) ──
const PO_STATUS = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// ==========================================
// 1. PURCHASE ORDERS (PO) CRUD & BRANCH
// ==========================================

const getPurchaseOrders = async (req, res) => {
  try {
    const { search, status, supplierId, fromDate, toDate, from, to, startDate, endDate } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId };

    if (status && Object.values(PO_STATUS).includes(status)) {
      where.status = status;
    }
    if (supplierId && supplierId !== 'all') {
      where.supplierId = parseInt(supplierId);
    }

    const fDate = fromDate || from || startDate;
    const tDate = toDate || to || endDate;

    if (fDate || tDate) {
      where.orderDate = {};
      if (fDate) {
        const s = new Date(fDate);
        s.setHours(0, 0, 0, 0);
        where.orderDate.gte = s;
      }
      if (tDate) {
        const e = new Date(tDate);
        e.setHours(23, 59, 59, 999);
        where.orderDate.lte = e;
      }
    }

    if (search) {
      where.OR = [
        { poNo: { contains: search} },
        { notes: { contains: search} },
      ];
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: { include: { inventory: { select: { name: true, unit: true } } } },
        branch: { select: { id: true, name: true } },
        purchaseBills: { select: { id: true, billNo: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      data: purchaseOrders,
      branch: branchId
    });
  } catch (error) {
    console.error('getPurchaseOrders error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getPurchaseOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid PO ID' });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { inventory: { select: { name: true, unit: true } } } },
        purchaseBills: true,
        branch: { select: { id: true, name: true } }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId || purchaseOrder.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This purchase order belongs to another branch.'
      });
    }

    res.status(200).json({ success: true, data: purchaseOrder });
  } catch (error) {
    console.error('getPurchaseOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, expectedDate, notes, items, taxAmount, discount, branchId, companyId } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and order items are required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) targetCompanyId = await getCompanyIdByBranch(targetBranchId);

    const supplier = await prisma.supplier.findFirst({
      where: { id: parseInt(supplierId), companyId: parseInt(targetCompanyId), deletedAt: null }
    });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found in this company' });
    }

    const count = await prisma.purchaseOrder.count({ where: { companyId: parseInt(targetCompanyId) } });
    const poNo = `PO-${Date.now().toString().slice(-6)}-${count + 1}`;

    let subTotal = 0;
    const formattedItems = items.map(i => {
      const totalPrice = parseFloat(i.quantity) * parseFloat(i.unitPrice);
      subTotal += totalPrice;
      return {
        inventoryId: parseInt(i.inventoryId),
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
        totalPrice,
        unit: i.unit || 'pcs'
      };
    });

    const tax = taxAmount ? parseFloat(taxAmount) : 0;
    const disc = discount ? parseFloat(discount) : 0;
    const totalAmount = subTotal + tax - disc;

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNo,
          supplierId: parseInt(supplierId),
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          subTotal,
          taxAmount: tax,
          discount: disc,
          totalAmount,
          notes,
          companyId: parseInt(targetCompanyId),
          branchId: targetBranchId,
          createdById: req.user.id,
          items: { create: formattedItems }
        },
        include: { items: true, supplier: true }
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: parseInt(supplierId),
          type: 'PO_CREATED',
          amount: totalAmount,
          balance: parseFloat(supplier.currentBalance || 0),
          referenceId: purchaseOrder.id,
          referenceType: 'PURCHASE_ORDER',
          notes: `PO ${poNo} issued`,
          branchId: targetBranchId,
          companyId: parseInt(targetCompanyId),
          userId: req.user.id,
          date: new Date(),
        }
      });

      return purchaseOrder;
    });

    res.status(201).json({
      success: true,
      message: `Purchase Order ${poNo} created successfully`,
      data: result
    });
  } catch (error) {
    console.error('createPurchaseOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const updatePurchaseOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid PO ID' });
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId || existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { status, notes, expectedDate } = req.body;

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (expectedDate) updateData.expectedDate = new Date(expectedDate);

    if (status && Object.values(PO_STATUS).includes(status)) {
      updateData.status = status;
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true, supplier: true, purchaseBills: true }
    });

    res.status(200).json({ success: true, message: 'Purchase Order updated successfully', data: updatedPO });
  } catch (error) {
    console.error('updatePurchaseOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getPurchaseOrdersByBranch = async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) return res.status(400).json({ success: false, message: 'Invalid branch ID' });

    const orders = await prisma.purchaseOrder.findMany({
      where: { branchId },
      include: { supplier: true, items: true, purchaseBills: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('getPurchaseOrdersByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ==========================================
// 2. PURCHASE BILLS (GRN) CRUD & BRANCH
// ==========================================

const getPurchaseBills = async (req, res) => {
  try {
    const { search, status, supplierId, fromDate, toDate, from, to, startDate, endDate } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });
    }

    const where = { branchId };
    if (status) where.status = status;
    if (supplierId && supplierId !== 'all') where.supplierId = parseInt(supplierId);

    const fDate = fromDate || from || startDate;
    const tDate = toDate || to || endDate;

    if (fDate || tDate) {
      where.createdAt = {};
      if (fDate) {
        const s = new Date(fDate);
        s.setHours(0, 0, 0, 0);
        where.createdAt.gte = s;
      }
      if (tDate) {
        const e = new Date(tDate);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
    }

    if (search) {
      where.OR = [
        { billNo: { contains: search} },
        { vehicleNo: { contains: search} },
      ];
    }

    const bills = await prisma.purchaseBill.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: { include: { inventory: { select: { name: true, unit: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
        branch: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNo: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: bills.length, data: bills, branch: branchId });
  } catch (error) {
    console.error('getPurchaseBills error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getPurchaseBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid Bill ID' });

    const bill = await prisma.purchaseBill.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { inventory: { select: { name: true, unit: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
        branch: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNo: true } }
      }
    });

    if (!bill) return res.status(404).json({ success: false, message: 'Purchase Bill not found' });

    const branchId = getBranchId(req);
    if (!branchId || bill.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    console.error('getPurchaseBill error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ✅ FIXED: createPurchaseBill
const createPurchaseBill = async (req, res) => {
  try {
    const { 
      purchaseOrderId, supplierId, items, 
      shippingCost, loadingCost, otherExpense, 
      taxAmount, discount, vehicleNo, driverPhone, dueDate, notes,
      branchId, companyId,
      payment 
    } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and bill items are required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) targetCompanyId = await getCompanyIdByBranch(targetBranchId);

    const supplier = await prisma.supplier.findFirst({
      where: { id: parseInt(supplierId), companyId: parseInt(targetCompanyId), deletedAt: null }
    });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    if (purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: parseInt(purchaseOrderId), branchId: targetBranchId, companyId: parseInt(targetCompanyId) }
      });
      if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found in this branch' });
    }

    const count = await prisma.purchaseBill.count({ where: { companyId: parseInt(targetCompanyId) } });
    const billNo = `BILL-${Date.now().toString().slice(-6)}-${count + 1}`;

    let subTotal = 0;
    const formattedItems = items.map(i => {
      const totalPrice = parseFloat(i.quantity) * parseFloat(i.unitPrice);
      subTotal += totalPrice;
      return {
        inventoryId: parseInt(i.inventoryId),
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
        totalPrice,
        unit: i.unit || 'pcs'
      };
    });

    const tax = taxAmount ? parseFloat(taxAmount) : 0;
    const shipping = shippingCost ? parseFloat(shippingCost) : 0;
    const loading = loadingCost ? parseFloat(loadingCost) : 0;
    const other = otherExpense ? parseFloat(otherExpense) : 0;
    const disc = discount ? parseFloat(discount) : 0;
    const totalAmount = subTotal + tax + shipping + loading + other - disc;

    const paymentAmount = payment?.amount ? parseFloat(payment.amount) : 0;
    const paymentMode = payment?.mode || 'CASH';
    const paymentAccountId = payment?.accountId ? parseInt(payment.accountId) : null;
    const paymentDate = payment?.paymentDate ? new Date(payment.paymentDate) : new Date();
    const isPartial = payment?.isPartial || false;
    const dueAmount = payment?.dueAmount !== undefined ? parseFloat(payment.dueAmount) : (totalAmount - paymentAmount);

    // ✅ FIX: Use correct BillStatus enum values
    let billStatus = 'PENDING';
    let paymentStatus = 'PENDING'; // PurchasePaymentStatus has no 'UNPAID' — that made every unpaid GRN fail
    
    if (paymentAmount > 0) {
      if (paymentAmount >= totalAmount) {
        billStatus = 'PAID';          // ✅ Correct
        paymentStatus = 'PAID';
      } else if (paymentAmount > 0 && paymentAmount < totalAmount) {
        billStatus = 'PARTIAL';       // ✅ Correct (not PARTIALLY_PAID)
        paymentStatus = 'PARTIAL';
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.create({
        data: {
          billNo,
          purchaseOrderId: purchaseOrderId ? parseInt(purchaseOrderId) : null,
          supplierId: parseInt(supplierId),
          dueDate: dueDate ? new Date(dueDate) : null,
          subTotal,
          taxAmount: tax,
          shippingCost: shipping,
          loadingCost: loading,
          otherExpense: other,
          discount: disc,
          totalAmount,
          paidAmount: paymentAmount,
          dueAmount: dueAmount,
          paymentStatus: paymentStatus,
          status: billStatus,
          vehicleNo,
          driverPhone,
          notes,
          companyId: parseInt(targetCompanyId),
          branchId: targetBranchId,
          createdById: req.user.id,
          items: { create: formattedItems }
        },
        include: { items: true }
      });

      if (paymentAmount > 0 && paymentAccountId) {
        const paymentNo = `PAY-${Date.now().toString().slice(-8)}`;
        
        const paymentRecord = await tx.payment.create({
          data: {
            paymentNo,
            supplierId: parseInt(supplierId),
            purchaseBillId: bill.id,
            bankAccountId: paymentAccountId,
            amount: paymentAmount,
            method: paymentMode.toLowerCase(),
            notes: `Payment against GRN ${billNo}`,
            branchId: targetBranchId,
            companyId: parseInt(targetCompanyId),
            userId: req.user.id,
            status: 'completed',
          }
        });

        const account = await tx.bankAccount.findUnique({ 
          where: { id: paymentAccountId } 
        });
        if (!account) throw new Error('Bank account not found');
        
        const newBankBalance = parseFloat(account.currentBalance) - paymentAmount;
        if (newBankBalance < 0) {
          throw new Error(`Insufficient balance in ${account.bankName}. Current: ${account.currentBalance}`);
        }
        
        await tx.bankAccount.update({
          where: { id: paymentAccountId },
          data: { currentBalance: newBankBalance }
        });

        // ✅ AccountTransaction - Use relatedEntityId
        await tx.accountTransaction.create({
          data: {
            bankAccountId: paymentAccountId,
            type: 'DEBIT',
            amount: paymentAmount,
            balanceAfter: newBankBalance,
            category: 'VENDOR_PAYMENT',
            description: `Payment to ${supplier.name} for GRN ${billNo}`,
            relatedEntityId: paymentRecord.id,
            relatedEntityType: 'SUPPLIER_PAYMENT',
            paymentMode: paymentMode,
            paidTo: supplier.name,
            paidFrom: account.bankName,
            branchId: targetBranchId,
            companyId: parseInt(targetCompanyId),
            createdBy: req.user.id,
            transactionDate: paymentDate,
          }
        });

        const supplierUpdate = await tx.supplier.update({
          where: { id: parseInt(supplierId) },
          data: { currentBalance: { decrement: paymentAmount } }
        });

        // ✅ SupplierLedger - Use referenceId
        await tx.supplierLedger.create({
          data: {
            supplierId: parseInt(supplierId),
            type: 'PAYMENT_MADE',
            amount: paymentAmount,
            balance: parseFloat(supplierUpdate.currentBalance),
            referenceId: paymentRecord.id,
            referenceType: 'PAYMENT',
            notes: `GRN ${billNo} | Account: ${account.bankName}`,
            branchId: targetBranchId,
            companyId: parseInt(targetCompanyId),
            userId: req.user.id,
            date: paymentDate,
          }
        });

        await tx.supplierLedger.create({
          data: {
            supplierId: parseInt(supplierId),
            type: 'BILL_RECEIVED',
            amount: totalAmount,
            balance: parseFloat(supplierUpdate.currentBalance) + dueAmount,
            referenceId: bill.id,
            referenceType: 'PURCHASE_BILL',
            notes: `GRN ${billNo} | Paid: ${paymentAmount}, Due: ${dueAmount}`,
            branchId: targetBranchId,
            companyId: parseInt(targetCompanyId),
            userId: req.user.id,
            date: new Date(),
          }
        });
      } else {
        const supplierUpdate = await tx.supplier.update({
          where: { id: parseInt(supplierId) },
          data: { currentBalance: { increment: totalAmount } }
        });

        await tx.supplierLedger.create({
          data: {
            supplierId: parseInt(supplierId),
            type: 'BILL_RECEIVED',
            amount: totalAmount,
            balance: parseFloat(supplierUpdate.currentBalance),
            referenceId: bill.id,
            referenceType: 'PURCHASE_BILL',
            notes: `GRN ${billNo} | Pending Payment`,
            branchId: targetBranchId,
            companyId: parseInt(targetCompanyId),
            userId: req.user.id,
            date: new Date(),
          }
        });
      }

      for (const item of formattedItems) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryId } });
        if (invItem) {
          const currentStock = parseFloat(invItem.currentStock || 0);
          const newStock = currentStock + item.quantity;
          
          await tx.inventoryItem.update({
            where: { id: item.inventoryId },
            data: {
              currentStock: newStock,
              lastCostPrice: item.unitPrice,
              avgCostPrice: ((currentStock * parseFloat(invItem.avgCostPrice || 0)) + (item.quantity * item.unitPrice)) / newStock
            }
          });

          await tx.stockTransaction.create({
            data: {
              inventoryId: item.inventoryId,
              type: 'PURCHASE',
              quantity: item.quantity,
              costPrice: item.unitPrice,
              referenceType: 'PURCHASE_BILL',
              referenceId: bill.id,
              userId: req.user.id,
              branchId: targetBranchId,
              companyId: parseInt(targetCompanyId),
              notes: `GRN received: ${billNo}`
            }
          });
        }
      }

      if (purchaseOrderId) {
        const poBills = await tx.purchaseBill.count({
          where: { purchaseOrderId: parseInt(purchaseOrderId) }
        });
        
        let poStatus = PO_STATUS.ISSUED;
        if (poBills >= 1) {
          const poBillsList = await tx.purchaseBill.findMany({
            where: { purchaseOrderId: parseInt(purchaseOrderId) },
            select: { status: true }
          });
          
          const allPaid = poBillsList.every(b => b.status === 'PAID');
          poStatus = allPaid ? PO_STATUS.COMPLETED : PO_STATUS.PARTIALLY_RECEIVED;
        }
        
        await tx.purchaseOrder.update({
          where: { id: parseInt(purchaseOrderId) },
          data: { status: poStatus }
        });
      }

      return bill;
    });

    let message = `GRN ${billNo} generated successfully`;
    if (billStatus === 'PAID') {
      message = `GRN ${billNo} generated & FULLY PAID (${paymentAmount})`;
    } else if (billStatus === 'PARTIAL') {
      message = `GRN ${billNo} generated with PARTIAL payment. Due: ${dueAmount}`;
    } else {
      message = `GRN ${billNo} generated. Payment pending.`;
    }

    res.status(201).json({
      success: true,
      message,
      data: result
    });
  } catch (error) {
    console.error('createPurchaseBill error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const updatePurchaseBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid Bill ID' });

    const existing = await prisma.purchaseBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Bill not found' });

    const branchId = getBranchId(req);
    if (!branchId || existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { status, notes, dueDate } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    const updatedBill = await prisma.purchaseBill.update({
      where: { id },
      data: updateData,
      include: { items: true, supplier: true, payments: true }
    });

    res.status(200).json({ success: true, message: 'Purchase Bill updated successfully', data: updatedBill });
  } catch (error) {
    console.error('updatePurchaseBill error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getPurchaseBillsByBranch = async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) return res.status(400).json({ success: false, message: 'Invalid branch ID' });

    const bills = await prisma.purchaseBill.findMany({
      where: { branchId },
      include: { supplier: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    console.error('getPurchaseBillsByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ✅ FIXED: payPurchaseBill
const payPurchaseBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid Bill ID' });

    const { amount, accountId, method, reference, notes } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Bank Account ID is required' });
    }

    const bill = await prisma.purchaseBill.findUnique({
      where: { id },
      include: { supplier: true, purchaseOrder: true }
    });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    const branchId = getBranchId(req);
    if (!branchId || bill.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const payAmount = parseFloat(amount);
    if (payAmount > parseFloat(bill.dueAmount)) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds due amount. Due: ${bill.dueAmount}, Attempted: ${payAmount}`
      });
    }

    const paymentNo = `PAY-${Date.now().toString().slice(-8)}`;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNo,
          supplierId: bill.supplierId,
          purchaseBillId: bill.id,
          bankAccountId: parseInt(accountId),
          amount: payAmount,
          method: method || 'bank_transfer',
          reference: reference || null,
          notes: notes || `Payment against bill ${bill.billNo}`,
          branchId: bill.branchId,
          companyId: bill.companyId,
          userId: req.user.id,
          status: 'completed',
        }
      });

      const account = await tx.bankAccount.findUnique({ where: { id: parseInt(accountId) } });
      if (!account) throw new Error('Bank account not found');
      
      const newBankBalance = parseFloat(account.currentBalance) - payAmount;
      if (newBankBalance < 0) {
        throw new Error(`Insufficient balance in ${account.bankName}. Current: ${account.currentBalance}`);
      }
      
      await tx.bankAccount.update({
        where: { id: parseInt(accountId) },
        data: { currentBalance: newBankBalance }
      });

      // ✅ FIXED: Use payment.id (not paymentRecord)
      await tx.accountTransaction.create({
        data: {
          bankAccountId: parseInt(accountId),
          type: 'DEBIT',
          amount: payAmount,
          balanceAfter: newBankBalance,
          category: 'VENDOR_PAYMENT',
          description: `Payment to ${bill.supplier.name} for Bill ${bill.billNo}`,
          relatedEntityId: payment.id,        // ✅ FIXED
          relatedEntityType: 'SUPPLIER_PAYMENT',
          paymentMode: method?.toUpperCase() || 'BANK_TRANSFER',
          paidTo: bill.supplier.name,
          paidFrom: account.bankName,
          branchId: bill.branchId,
          companyId: bill.companyId,
          createdBy: req.user.id,
          transactionDate: new Date(),
        }
      });

      const newPaid = parseFloat(bill.paidAmount || 0) + payAmount;
      const newDue = parseFloat(bill.dueAmount || 0) - payAmount;
      const updatedBill = await tx.purchaseBill.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue,
          paymentStatus: newDue <= 0 ? 'PAID' : 'PARTIAL',
          status: newDue <= 0 ? 'PAID' : bill.status,
        }
      });

      if (bill.purchaseOrderId && newDue <= 0) {
        await tx.purchaseOrder.update({
          where: { id: bill.purchaseOrderId },
          data: { status: PO_STATUS.COMPLETED }
        });
      }

      const supplierUpdate = await tx.supplier.update({
        where: { id: bill.supplierId },
        data: { currentBalance: { decrement: payAmount } }
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: bill.supplierId,
          type: 'PAYMENT_MADE',
          amount: payAmount,
          balance: parseFloat(supplierUpdate.currentBalance),
          referenceId: payment.id,
          referenceType: 'PAYMENT',
          notes: `Bill ${bill.billNo} | Account: ${account.bankName}`,
          branchId: bill.branchId,
          companyId: bill.companyId,
          userId: req.user.id,
          date: new Date(),
        }
      });

      return { payment, bill: updatedBill };
    });

    res.status(201).json({
      success: true,
      message: `Payment ${paymentNo} recorded successfully`,
      data: result
    });
  } catch (error) {
    console.error('payPurchaseBill error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ==========================================
// 3. PURCHASE RETURNS CRUD & BRANCH
// ==========================================

const getPurchaseReturns = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID is required.', data: [] });

    const returns = await prisma.purchaseReturn.findMany({
      where: { branchId },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: { include: { inventory: { select: { name: true, unit: true } } } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: returns.length, data: returns });
  } catch (error) {
    console.error('getPurchaseReturns error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const createPurchaseReturn = async (req, res) => {
  try {
    const { supplierId, purchaseId, items, reason, branchId, companyId } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and return items are required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) targetCompanyId = await getCompanyIdByBranch(targetBranchId);

    const count = await prisma.purchaseReturn.count({ where: { companyId: parseInt(targetCompanyId) } });
    const returnNo = `RET-${Date.now().toString().slice(-6)}-${count + 1}`;

    let totalAmount = 0;
    const formattedItems = items.map(i => {
      const totalPrice = parseFloat(i.quantity) * parseFloat(i.unitPrice);
      totalAmount += totalPrice;
      return {
        inventoryId: parseInt(i.inventoryId),
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
        totalPrice,
        reason: i.reason || reason || 'Defective item return'
      };
    });

    const result = await prisma.$transaction(async (tx) => {
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNo,
          supplierId: parseInt(supplierId),
          purchaseId: purchaseId ? parseInt(purchaseId) : null,
          totalAmount,
          reason,
          status: 'COMPLETED',
          companyId: parseInt(targetCompanyId),
          branchId: targetBranchId,
          createdById: req.user.id,
          items: { create: formattedItems }
        },
        include: { items: true }
      });

      for (const item of formattedItems) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryId } });
        if (invItem) {
          const currentStock = parseFloat(invItem.currentStock || 0);
          const newStock = Math.max(0, currentStock - item.quantity);

          await tx.inventoryItem.update({
            where: { id: item.inventoryId },
            data: { currentStock: newStock }
          });

          await tx.stockTransaction.create({
            data: {
              inventoryId: item.inventoryId,
              type: 'ADJUSTMENT',
              quantity: -Math.abs(item.quantity),
              costPrice: item.unitPrice,
              referenceType: 'PURCHASE_RETURN',
              referenceId: purchaseReturn.id,
              userId: req.user.id,
              branchId: targetBranchId,
              companyId: parseInt(targetCompanyId),
              notes: `Purchase Return: ${returnNo} - ${item.reason}`
            }
          });
        }
      }

      const supplierUpdate = await tx.supplier.update({
        where: { id: parseInt(supplierId) },
        data: { currentBalance: { decrement: totalAmount } }
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: parseInt(supplierId),
          type: 'RETURN_ISSUED',
          amount: totalAmount,
          balance: parseFloat(supplierUpdate.currentBalance),
          referenceId: purchaseReturn.id,
          referenceType: 'PURCHASE_RETURN',
          notes: `Return ${returnNo} | Reason: ${reason || 'N/A'}`,
          branchId: targetBranchId,
          companyId: parseInt(targetCompanyId),
          userId: req.user.id,
          date: new Date(),
        }
      });

      return purchaseReturn;
    });

    res.status(201).json({ success: true, message: `Purchase Return ${returnNo} processed`, data: result });
  } catch (error) {
    console.error('createPurchaseReturn error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getPurchaseReturnsByBranch = async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) return res.status(400).json({ success: false, message: 'Invalid branch ID' });

    const returns = await prisma.purchaseReturn.findMany({
      where: { branchId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: returns.length, data: returns });
  } catch (error) {
    console.error('getPurchaseReturnsByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrdersByBranch,
  getPurchaseBills,
  getPurchaseBill,
  createPurchaseBill,
  updatePurchaseBill,
  getPurchaseBillsByBranch,
  payPurchaseBill,
  getPurchaseReturns,
  createPurchaseReturn,
  getPurchaseReturnsByBranch,
};