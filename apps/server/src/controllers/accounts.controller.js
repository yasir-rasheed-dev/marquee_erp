// ═══════════════════════════════════════════════════════════
// controllers/accounts.controller.js
// Bank Account + Transaction Ledger + Transfer
// Follows EXACT pattern from category.controller.js
// ═══════════════════════════════════════════════════════════

const prisma = require('../config/database');

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.body.branchId) return parseInt(req.body.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// ── Helper: Resolve Company ID ──
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

// ── Helper: Start of day balance ──
const getStartOfDayBalance = async (accountId, branchId, companyId, date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const lastTxn = await prisma.accountTransaction.findFirst({
    where: {
      bankAccountId: accountId,
      branchId,
      companyId,
      transactionDate: { lt: start },
    },
    orderBy: { transactionDate: 'desc' },
  });

  return lastTxn ? parseFloat(lastTxn.balanceAfter) : 0;
};

// ═══════════════════════════════════════════════════════════
// 1. GET ALL ACCOUNTS
// ═══════════════════════════════════════════════════════════
const getAllAccounts = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const { search, status, accountType } = req.query;
    const companyId = await resolveCompanyId(req, branchId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Branch may not be linked to any company.'
      });
    }

    const where = { branchId, companyId };

    if (status) where.status = status.toUpperCase();
    if (accountType) where.accountType = accountType.toUpperCase();
    if (search) {
      where.OR = [
        { bankName: { contains: search} },
        { accountHolder: { contains: search} },
        { accountNumber: { contains: search} },
      ];
    }

    const accounts = await prisma.bankAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
      branch: branchId,
      company: companyId,
    });
  } catch (error) {
    console.error('getAllAccounts error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 2. GET SINGLE ACCOUNT
// ═══════════════════════════════════════════════════════════
const getAccountById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id, branchId },
      include: {
        _count: { select: { transactions: true, dailySnapshots: true } },
      },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    console.error('getAccountById error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 3. CREATE ACCOUNT
// ═══════════════════════════════════════════════════════════
const createAccount = async (req, res) => {
  try {
    const {
      bankName, accountHolder, accountType, accountNumber,
      initialBalance, status, notes
    } = req.body;

    if (!bankName?.trim()) {
      return res.status(400).json({ success: false, message: 'Bank name is required' });
    }
    if (!accountNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Account number is required' });
    }

    let branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Branch may not be linked to any company.'
      });
    }

    // Duplicate check: accountNumber is @unique in schema, but also check branch scope
    const existing = await prisma.bankAccount.findFirst({
      where: {
        accountNumber: { equals: accountNumber.trim()},
        branchId,
        companyId,
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this number already exists in this branch'
      });
    }

    const initBal = parseFloat(initialBalance || 0);

    const account = await prisma.bankAccount.create({
      data: {
        bankName: bankName.trim(),
        accountHolder: accountHolder?.trim() || null,
        accountType: accountType?.toUpperCase() || 'SAVINGS',
        accountNumber: accountNumber.trim(),
        initialBalance: initBal,
        currentBalance: initBal,
        status: status?.toUpperCase() || 'ACTIVE',
        notes: notes || null,
        branchId,
        companyId,
        createdBy: req.user?.id || null,
      },
      include: {
        _count: { select: { transactions: true } },
      }
    });

    // Auto-create opening balance transaction
    if (initBal > 0) {
      await prisma.accountTransaction.create({
        data: {
          bankAccountId: account.id,
          type: 'CREDIT',
          amount: initBal,
          balanceAfter: initBal,
          category: 'OPENING_BALANCE',
          description: `Opening balance for ${bankName.trim()} — ${accountNumber.trim()}`,
          paymentMode: 'CASH',
          transactionDate: new Date(),
          branchId,
          companyId,
          createdBy: req.user?.id || 1,
        }
      });
    }

    res.status(201).json({
      success: true,
      data: account,
      message: `Account "${account.bankName}" created successfully`
    });
  } catch (error) {
    console.error('createAccount error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Account number already exists globally'
      });
    }
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 4. UPDATE ACCOUNT
// ═══════════════════════════════════════════════════════════
const updateAccount = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID' });
    }

    const existing = await prisma.bankAccount.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, accountNumber: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Account not found' });
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
        message: 'Access denied. This account belongs to another branch.'
      });
    }

    const { bankName, accountHolder, accountType, accountNumber, status, notes } = req.body;

    // Duplicate check if accountNumber changing
    if (accountNumber && accountNumber.trim() !== existing.accountNumber) {
      const duplicate = await prisma.bankAccount.findFirst({
        where: {
          accountNumber: { equals: accountNumber.trim()},
          branchId,
          companyId: existing.companyId,
          NOT: { id }
        }
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another account with this number already exists in this branch'
        });
      }
    }

    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(bankName && { bankName: bankName.trim() }),
        ...(accountHolder !== undefined && { accountHolder: accountHolder?.trim() || null }),
        ...(accountType && { accountType: accountType.toUpperCase() }),
        ...(accountNumber && { accountNumber: accountNumber.trim() }),
        ...(status && { status: status.toUpperCase() }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        _count: { select: { transactions: true } },
      }
    });

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Account number already exists' });
    }
    console.error('updateAccount error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 5. DELETE ACCOUNT (Restrict if transactions exist)
// ═══════════════════════════════════════════════════════════
const deleteAccount = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID' });
    }

    const existing = await prisma.bankAccount.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        bankName: true,
        accountNumber: true,
        _count: { select: { transactions: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Account not found' });
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
        message: 'Access denied. This account belongs to another branch.'
      });
    }

    if (existing._count.transactions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${existing._count.transactions} transaction(s) linked. Archive or transfer transactions first.`,
        linkedCounts: existing._count
      });
    }

    await prisma.bankAccount.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Account "${existing.bankName} — ${existing.accountNumber}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    console.error('deleteAccount error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 6. GET ACCOUNT HISTORY (Complete Ledger)
// ═══════════════════════════════════════════════════════════
const getAccountHistory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const { from, to, category, type, page = 1, limit = 50 } = req.query;

    const where = {
      bankAccountId: id,
      branchId,
      companyId,
    };

    if (from && to) {
      where.transactionDate = {
        gte: new Date(from + 'T00:00:00'),
        lte: new Date(to + 'T23:59:59'),
      };
    }
    if (category) where.category = category.toUpperCase();
    if (type) where.type = type.toUpperCase();

    const [transactions, total, creditAgg, debitAgg] = await Promise.all([
      prisma.accountTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          createdByUser: { select: { id: true, name: true } },
        },
      }),
      prisma.accountTransaction.count({ where }),
      prisma.accountTransaction.aggregate({
        where: { bankAccountId: id, branchId, companyId, type: 'CREDIT' },
        _sum: { amount: true },
      }),
      prisma.accountTransaction.aggregate({
        where: { bankAccountId: id, branchId, companyId, type: 'DEBIT' },
        _sum: { amount: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      summary: {
        totalCredits: parseFloat(creditAgg._sum.amount || 0),
        totalDebits: parseFloat(debitAgg._sum.amount || 0),
        netFlow: parseFloat(creditAgg._sum.amount || 0) - parseFloat(debitAgg._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error('getAccountHistory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 7. GET TODAY SUMMARY (Start vs Current Balance)
// ═══════════════════════════════════════════════════════════
const getTodaySummary = async (req, res) => {
  console.log('🔥 HIT: /today-summary', req.params.id, req.query.branchId);
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Start of day balance
    const startBalance = await getStartOfDayBalance(id, branchId, companyId, today);

    // 2. Current balance
    const account = await prisma.bankAccount.findFirst({
      where: { id, branchId, companyId },
      select: { currentBalance: true, bankName: true, accountNumber: true, accountHolder: true },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // 3. Today's transactions
    const todayTxns = await prisma.accountTransaction.findMany({
      where: {
        bankAccountId: id,
        branchId,
        companyId,
        transactionDate: { gte: today, lt: tomorrow },
      },
      orderBy: { transactionDate: 'asc' },
      include: {
        createdByUser: { select: { id: true, name: true } },
      },
    });

    const todayCredits = todayTxns
      .filter(t => t.type === 'CREDIT')
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    const todayDebits = todayTxns
      .filter(t => t.type === 'DEBIT')
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    const currentBal = parseFloat(account.currentBalance);

    // 4. Upsert daily snapshot
    await prisma.dailyBalanceSnapshot.upsert({
      where: {
        bankAccountId_date: { bankAccountId: id, date: today }
      },
      update: {
        openingBalance: startBalance,
        closingBalance: currentBal,
        totalCredits: todayCredits,
        totalDebits: todayDebits,
        transactionCount: todayTxns.length,
      },
      create: {
        bankAccountId: id,
        date: today,
        openingBalance: startBalance,
        closingBalance: currentBal,
        totalCredits: todayCredits,
        totalDebits: todayDebits,
        transactionCount: todayTxns.length,
        branchId,
        companyId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        accountName: `${account.bankName} — ${account.accountNumber}`,
        accountHolder: account.accountHolder,
        startOfDayBalance: startBalance,
        currentBalance: currentBal,
        change: currentBal - startBalance,
        todayCredits,
        todayDebits,
        transactionCount: todayTxns.length,
        transactions: todayTxns,
      },
    });
  } catch (error) {
    console.error('getTodaySummary error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 8. ADD TRANSACTION (Credit / Debit)
// ═══════════════════════════════════════════════════════════
const addTransaction = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const {
      type, amount, category, description, referenceNumber,
      relatedEntityType, relatedEntityId, paymentMode,
      paidTo, paidFrom, transactionDate,
    } = req.body;

    if (!type || !['CREDIT', 'DEBIT'].includes(type.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Valid type (CREDIT/DEBIT) is required' });
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const amt = parseFloat(amount);

    // Get account with lock
    const account = await prisma.bankAccount.findFirst({
      where: { id, branchId, companyId },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const currentBal = parseFloat(account.currentBalance);
    const newBalance = type.toUpperCase() === 'CREDIT'
      ? currentBal + amt
      : currentBal - amt;

    if (newBalance < 0 && type.toUpperCase() === 'DEBIT') {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        currentBalance: currentBal,
        requestedDebit: amt
      });
    }

    // ── Safe Category Mapping for Prisma Enum Validation ──
    const VALID_ENUM_CATEGORIES = [
      'VENDOR_PAYMENT', 'SALARY', 'EXPENSE', 'BOOKING_REFUND', 
      'TRANSFER_OUT', 'TRANSFER_IN', 'OPENING_BALANCE', 'OTHER'
    ];

    const rawCategory = category.toUpperCase().trim();
    const isStandardEnum = VALID_ENUM_CATEGORIES.includes(rawCategory);
    
    // If it's a custom category name, fallback Prisma enum to 'OTHER' and prepend custom tag to description
    const dbCategory = isStandardEnum ? rawCategory : 'OTHER';
    const finalDescription = isStandardEnum 
      ? (description || `${type.toUpperCase()} transaction`)
      : `[${category.trim()}] ${description || `${type.toUpperCase()} transaction`}`;

    const [txn, updatedAccount] = await prisma.$transaction([
      prisma.accountTransaction.create({
        data: {
          bankAccountId: id,
          type: type.toUpperCase(),
          amount: amt,
          balanceAfter: newBalance,
          category: dbCategory,
          description: finalDescription,
          referenceNumber: referenceNumber || null,
          relatedEntityType: relatedEntityType || null,
          relatedEntityId: relatedEntityId ? parseInt(relatedEntityId) : null,
          paymentMode: paymentMode?.toUpperCase() || 'CASH',
          paidTo: paidTo || null,
          paidFrom: paidFrom || null,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          branchId,
          companyId,
          createdBy: req.user?.id || 1,
        },
        include: {
          createdByUser: { select: { id: true, name: true } },
        }
      }),
      prisma.bankAccount.update({
        where: { id },
        data: { currentBalance: newBalance },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: { transaction: txn, newBalance },
      message: `${type.toUpperCase()} of ${amt} recorded successfully`
    });
  } catch (error) {
    console.error('addTransaction error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 9. TRANSFER BETWEEN ACCOUNTS
// ═══════════════════════════════════════════════════════════
const transferBetweenAccounts = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const { fromAccountId, toAccountId, amount, description, referenceNumber, transferDate } = req.body;

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ success: false, message: 'Both from and to account IDs are required' });
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }
    if (parseInt(fromAccountId) === parseInt(toAccountId)) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to the same account' });
    }

    const amt = parseFloat(amount);
    const fromId = parseInt(fromAccountId);
    const toId = parseInt(toAccountId);

    const [fromAcc, toAcc] = await Promise.all([
      prisma.bankAccount.findFirst({ where: { id: fromId, branchId, companyId } }),
      prisma.bankAccount.findFirst({ where: { id: toId, branchId, companyId } }),
    ]);

    if (!fromAcc) {
      return res.status(404).json({ success: false, message: 'Source account not found in this branch' });
    }
    if (!toAcc) {
      return res.status(404).json({ success: false, message: 'Destination account not found in this branch' });
    }

    const fromBal = parseFloat(fromAcc.currentBalance);
    const toBal = parseFloat(toAcc.currentBalance);

    if (fromBal < amt) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance in source account',
        currentBalance: fromBal,
        requestedTransfer: amt
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const debitTxn = await tx.accountTransaction.create({
        data: {
          bankAccountId: fromId,
          type: 'DEBIT',
          amount: amt,
          balanceAfter: fromBal - amt,
          category: 'TRANSFER_OUT',
          description: description || `Transfer to ${toAcc.bankName} — ${toAcc.accountNumber}`,
          referenceNumber: referenceNumber || null,
          paymentMode: 'BANK_TRANSFER',
          transactionDate: transferDate ? new Date(transferDate) : new Date(),
          branchId,
          companyId,
          createdBy: req.user?.id || 1,
        },
      });

      const creditTxn = await tx.accountTransaction.create({
        data: {
          bankAccountId: toId,
          type: 'CREDIT',
          amount: amt,
          balanceAfter: toBal + amt,
          category: 'TRANSFER_IN',
          description: description || `Transfer from ${fromAcc.bankName} — ${fromAcc.accountNumber}`,
          referenceNumber: referenceNumber || null,
          paymentMode: 'BANK_TRANSFER',
          transactionDate: transferDate ? new Date(transferDate) : new Date(),
          branchId,
          companyId,
          createdBy: req.user?.id || 1,
        },
      });

      await tx.bankAccount.update({ where: { id: fromId }, data: { currentBalance: fromBal - amt } });
      await tx.bankAccount.update({ where: { id: toId }, data: { currentBalance: toBal + amt } });

      const transfer = await tx.accountTransfer.create({
        data: {
          fromAccountId: fromId,
          toAccountId: toId,
          amount: amt,
          transferDate: transferDate ? new Date(transferDate) : new Date(),
          description: description || null,
          referenceNumber: referenceNumber || null,
          debitTransactionId: debitTxn.id,
          creditTransactionId: creditTxn.id,
          branchId,
          companyId,
          createdBy: req.user?.id || 1,
        },
      });

      return { transfer, debitTxn, creditTxn };
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Transferred ${amt} from ${fromAcc.bankName} to ${toAcc.bankName}`
    });
  } catch (error) {
    console.error('transferBetweenAccounts error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
// ═══════════════════════════════════════════════════════════
// 10. GET ALL TRANSACTIONS / PAYMENT VOUCHERS (Global for Branch)
// ═══════════════════════════════════════════════════════════
const getAllTransactions = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const { search, category, type, fromDate, toDate, from, to, startDate, endDate, bankAccountId, page = 1, limit = 50, all } = req.query;

    const where = {
      branchId,
      companyId,
      ...(type && { type: type.toUpperCase() }),
    };

    if (category) where.category = category.toUpperCase();
    if (bankAccountId) where.bankAccountId = parseInt(bankAccountId);

    const fDate = fromDate || from || startDate;
    const tDate = toDate || to || endDate;

    if (fDate || tDate) {
      where.transactionDate = {};
      if (fDate) {
        const s = new Date(fDate);
        s.setHours(0, 0, 0, 0);
        where.transactionDate.gte = s;
      }
      if (tDate) {
        const e = new Date(tDate);
        e.setHours(23, 59, 59, 999);
        where.transactionDate.lte = e;
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search} },
        { paidTo: { contains: search} },
        { referenceNumber: { contains: search} },
      ];
    }

    const isAll = all === 'true' || limit === 'all' || limit === '-1';
    const parsedLimit = isAll ? 5000 : Math.min(parseInt(limit) || 50, 1000);
    const parsedPage = isAll ? 1 : Math.max(parseInt(page) || 1, 1);

    const [transactions, total] = await Promise.all([
      prisma.accountTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: isAll ? undefined : (parsedPage - 1) * parsedLimit,
        take: isAll ? undefined : parsedLimit,
        include: {
          bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
          createdByUser: { select: { id: true, name: true } },
        },
      }),
      prisma.accountTransaction.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getAllTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 11. GET CUSTOM CATEGORIES
// ═══════════════════════════════════════════════════════════
const getCustomCategories = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    const { type } = req.query;
    const where = { branchId, companyId };
    if (type) where.type = type.toUpperCase();

    const categories = await prisma.accountCustomCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('getCustomCategories error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 12. CREATE CUSTOM CATEGORY
// ═══════════════════════════════════════════════════════════
const createCustomCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const companyId = await resolveCompanyId(req, branchId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required.'
      });
    }

    // Duplicate check
    const existing = await prisma.accountCustomCategory.findFirst({
      where: {
        name: { equals: name.trim()},
        branchId,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Category "${name.trim()}" already exists in this branch`
      });
    }

    const category = await prisma.accountCustomCategory.create({
      data: {
        name: name.trim(),
        type: type?.toUpperCase() || 'DEBIT',
        branchId,
        companyId,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
      message: `Category "${category.name}" created successfully`
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Category name already exists' });
    }
    console.error('createCustomCategory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// 13. DELETE CUSTOM CATEGORY
// ═══════════════════════════════════════════════════════════
const deleteCustomCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    const existing = await prisma.accountCustomCategory.findFirst({
      where: { id, branchId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await prisma.accountCustomCategory.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Category "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    console.error('deleteCustomCategory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════
module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountHistory,
  getTodaySummary,
  addTransaction,
  transferBetweenAccounts,
  getAllTransactions,
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
};