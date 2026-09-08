// ═══════════════════════════════════════════════════════════
// controllers/booking.controller.js
// CLEANED — Removed menu/service change logs
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.body.branchId) return parseInt(req.body.branchId);
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

// ── Helper: Log Booking Changes (Audit Trail) ──
const logBookingChanges = async (tx, bookingId, oldData, newData, userId) => {
  const fieldsToTrack = [
    'title', 'description', 'eventType', 'eventDate', 'startTime', 'endTime',
    'guestCount', 'actualGuestCount', 'guestName', 'guestPhone', 'guestEmail',
    'hallId', 'isMealIncluded', 'totalAmount', 'paidAmount', 'advanceAmount',
    'dueAmount', 'discount', 'status', 'paymentStatus', 'customerId'
  ];

  const logs = [];
  for (const field of fieldsToTrack) {
    const oldVal = oldData?.[field] ?? null;
    const newVal = newData?.[field] ?? null;
    
    if (oldVal !== newVal && (oldVal !== null || newVal !== null)) {
      logs.push({
        bookingId,
        fieldName: field,
        oldValue: String(oldVal ?? ''),
        newValue: String(newVal ?? ''),
        changedById: userId || null
      });
    }
  }

  if (logs.length > 0) {
    await tx.bookingChangeLog.createMany({ data: logs });
  }
};

// ── Helper: Validate Service IDs against user's exact Service schema ──
const validateServiceIds = async (services, companyId) => {
  if (!services || !Array.isArray(services) || services.length === 0) return [];
  
  const serviceIds = services
    .map(s => parseInt(s.serviceId || s.id))
    .filter(id => !isNaN(id));
    
  if (serviceIds.length === 0) return [];

  const existingServices = await prisma.service.findMany({
    where: { 
      id: { in: serviceIds }, 
      companyId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true, name: true, salePrice: true, costPrice: true }
  });

  const existingIds = new Set(existingServices.map(s => s.id));
  
  const validServices = services
    .map(s => {
      const sid = parseInt(s.serviceId || s.id);
      if (!existingIds.has(sid)) return null;
      
      const svc = existingServices.find(es => es.id === sid);
      const qty = parseInt(s.quantity) || 1;
      const unitPrice = parseFloat(s.unitPrice || svc?.salePrice || 0);
      
      return {
        serviceId: sid,
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: parseFloat(s.totalPrice || (qty * unitPrice)),
        notes: s.notes || null,
        serviceName: svc?.name || 'Unknown Service'
      };
    })
    .filter(Boolean);

  return validServices;
};

// ───────────────────────────────────────────────────────────
// @desc    Get all bookings (STRICT Branch-Wise)
// @route   GET /api/bookings
// ───────────────────────────────────────────────────────────
const getBookings = async (req, res) => {
  try {
    const { search, status, paymentStatus, hallId, fromDate, toDate } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = { branchId, deletedAt: null };

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (hallId) where.hallId = parseInt(hallId);
    
    const fDate = fromDate || req.query.from || req.query.startDate;
    const tDate = toDate || req.query.to || req.query.endDate;
    if (fDate || tDate) {
      where.eventDate = {};
      if (fDate) {
        const s = new Date(fDate);
        s.setHours(0, 0, 0, 0);
        where.eventDate.gte = s;
      }
      if (tDate) {
        const e = new Date(tDate);
        e.setHours(23, 59, 59, 999);
        where.eventDate.lte = e;
      }
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { bookingNo: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { guestName: { contains: term, mode: 'insensitive' } },
        { guestPhone: { contains: term } },
        { customer: { name: { contains: term, mode: 'insensitive' } } }
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        hall: { select: { id: true, name: true, capacity: true } },
        event: { select: { id: true, name: true } },
        customer: { 
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            city: true,
            cnic: true,
            address: true,
            emergencyContacts: { 
              where: { isPrimary: true },
              select: { name: true, phone: true, relation: true } 
            }
          } 
        },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        menus: {
          include: {
            menu: { select: { id: true, name: true } },
            unitRef: { select: { id: true, name: true, symbol: true } }
          }
        },
        services: {
          include: {
            service: { select: { id: true, name: true, salePrice: true } }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            menus: true,
            services: true,
            payments: true,
            changeLogs: true
          }
        }
      },
      orderBy: { eventDate: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
      branch: branchId
    });
  } catch (error) {
    console.error('getBookings error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get single booking with Complete History Ledger
// @route   GET /api/bookings/:id
// ───────────────────────────────────────────────────────────
// controllers/booking.controller.js
// getBooking — MINIMAL SAFE VERSION

const getBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        hall: true,
        event: true,
        customer: {
          include: {
            emergencyContacts: true
          }
        },
        branch: true,
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        menus: {
          include: {
            menu: { select: { id: true, name: true } },
            unitRef: { select: { id: true, name: true, symbol: true } }
          }
        },
        services: {
          include: {
            service: { select: { id: true, name: true, salePrice: true } }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          orderBy: { createdAt: 'desc' }
        },
        changeLogs: {
          include: { changedBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        },
        customItems: true,
        eventDamages: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true } },
            asset: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        whatsappMessages: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!booking || booking.deletedAt) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && booking.branchId !== branchId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This booking belongs to another branch.' 
      });
    }

    const totalPaid = booking.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalInvoiced = booking.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalDamages = (booking.eventDamages || []).reduce((sum, d) => sum + Number(d.totalCost || 0), 0);
    
    const summary = {
      totalPaid,
      totalInvoiced,
      totalDamages,
      totalMenusCost: booking.menus.reduce((sum, m) => sum + Number(m.totalPrice), 0),
      totalServicesCost: booking.services.reduce((sum, s) => sum + Number(s.totalPrice), 0),
      profit: Number(booking.totalAmount) - (
        booking.menus.reduce((sum, m) => sum + Number(m.totalPrice), 0) +
        booking.services.reduce((sum, s) => sum + Number(s.totalPrice), 0)
      )
    };

    res.status(200).json({ 
      success: true, 
      data: { ...booking, summary } 
    });
  } catch (error) {
    console.error('🔴 getBooking error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Create new booking matching exact Prisma Schema
// @route   POST /api/bookings
// ───────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const { 
      title, description, eventId, eventType, eventDate, startTime, endTime, 
      guestCount, actualGuestCount, guestName, guestPhone, guestEmail, 
      customerId, hallId, isMealIncluded, totalAmount, paidAmount, 
      advanceAmount, discount, paymentMode, menus, services, 
      bankAccountId, branchId, companyId,
      packageTotal, selectedPackage,customItems  // ← FIXED: Added these
    } = req.body;

    if (!guestName || !guestPhone || !eventDate || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields missing: guestName, guestPhone, eventDate, startTime, endTime' 
      });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }
    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }
    targetCompanyId = parseInt(targetCompanyId);

    // ── SMART HALL CAPACITY COLLISION CHECK ──
    const parsedHallId = hallId ? parseInt(hallId) : null;
    const requestedGuests = parseInt(guestCount) || 0;

    if (parsedHallId) {
      const hall = await prisma.hall.findUnique({
        where: { id: parsedHallId },
        select: { id: true, capacity: true, name: true }
      });

      if (!hall) {
        return res.status(404).json({ success: false, message: 'Selected hall not found.' });
      }

      const overlappingBookings = await prisma.booking.findMany({
        where: {
          hallId: parsedHallId,
          eventDate: new Date(eventDate),
          status: { not: 'cancelled' },
          deletedAt: null
        },
        select: { guestCount: true, startTime: true, endTime: true }
      });

      let totalBookedGuestsInSlot = 0;
      for (const b of overlappingBookings) {
        const existingStart = new Date(b.startTime).getTime();
        const existingEnd = new Date(b.endTime).getTime();
        const newStart = new Date(startTime).getTime();
        const newEnd = new Date(endTime).getTime();

        if (newStart < existingEnd && newEnd > existingStart) {
          totalBookedGuestsInSlot += b.guestCount;
        }
      }

      const remainingCapacity = hall.capacity - totalBookedGuestsInSlot;
      if (requestedGuests > remainingCapacity) {
        return res.status(400).json({
          success: false,
          message: `Hall capacity exceeded! Hall "${hall.name}" capacity: ${hall.capacity}. Already booked: ${totalBookedGuestsInSlot}. Remaining: ${remainingCapacity}.`
        });
      }
    }

    // ── FINANCIAL LEDGER CALCULATIONS ──
    const tAmount = parseFloat(totalAmount) || 0;
    const pAmount = parseFloat(paidAmount) || 0;
    const advAmount = parseFloat(advanceAmount) || pAmount;
    const disc = parseFloat(discount) || 0;
    const dueAmount = Math.max(0, tAmount - disc - advAmount);
    const calculatedPaymentStatus = dueAmount <= 0 ? 'completed' : (advAmount > 0 ? 'partial' : 'pending');

    // ── Generate Booking Number ──
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNo = `BK-${dateStr}-${randomNum}`;

    // ── Validate & Prepare Menus ──
    const validMenus = (menus && Array.isArray(menus) && isMealIncluded !== false) 
      ? menus.filter(m => m.menuId && !isNaN(parseInt(m.menuId))).map(m => ({
          menuId: parseInt(m.menuId),
          menuName: m.menuName || null,
          quantity: parseInt(m.quantity) || 1,
          unit: m.unit || null,
          unitId: m.unitId ? parseInt(m.unitId) : null,
          unitPrice: parseFloat(m.unitPrice) || 0,
          totalPrice: parseFloat(m.totalPrice) || 0,
          notes: m.notes || null
        }))
      : [];
      // ── FIXED: Validate & Prepare Custom Items ──
const validCustomItems = (customItems && Array.isArray(customItems) && isMealIncluded !== false)
  ? customItems.filter(item => item.itemName).map(item => ({
      itemId: item.itemId || null,
      itemName: item.itemName || 'Custom Item',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      unit: item.unit || 'pcs',
      notes: item.note || item.notes || null
    }))
  : [];

    // ── Validate Services against exact schema ──
    const validServices = await validateServiceIds(services, targetCompanyId);

    const userId = req.user?.id || 1;

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingNo,
          title: title ? title.trim() : `${eventType || 'Event'} - ${guestName.trim()}`,
          description: description || null,
          eventId: eventId ? parseInt(eventId) : null,
          eventType: eventType || 'Wedding',
          eventDate: new Date(eventDate),
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          guestCount: requestedGuests,
          actualGuestCount: actualGuestCount ? parseInt(actualGuestCount) : null,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail ? guestEmail.trim() : null,
          customerId: customerId ? parseInt(customerId) : null,
          hallId: parsedHallId,
          isMealIncluded: isMealIncluded !== undefined ? Boolean(isMealIncluded) : true,
          totalAmount: tAmount,
          paidAmount: advAmount,
          advanceAmount: advAmount,
          dueAmount: dueAmount,
          discount: disc,
          paymentStatus: calculatedPaymentStatus,
          status: 'tentative',
          branchId: targetBranchId,
          companyId: targetCompanyId,
          createdById: userId,
          // ── FIXED: package_total and selected_package ──
          customItems: validCustomItems.length > 0 ? { create: validCustomItems } : undefined,
          package_total: parseFloat(packageTotal || 0),
          selected_package: selectedPackage || null,
          // ── END FIX ──
          menus: validMenus.length > 0 ? { create: validMenus } : undefined,
          services: validServices.length > 0 ? { create: validServices } : undefined,
        },
        include: {
          hall: true,
          customer: { include: { emergencyContacts: true } },
          menus: { include: { menu: true } },
          services: { include: { service: true } },
          customItems: true
        }
        
      });
console.log('📦 validCustomItems:', JSON.stringify(validCustomItems, null, 2));
      // ── Log Initial Payment if advance given ──
      if (advAmount > 0) {
        const payDateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const payRandom = Math.floor(1000 + Math.random() * 9000);
        const paymentNo = `PAY-${payDateStr}-${payRandom}`;

        const methodMap = {
          'Cash': 'cash',
          'Bank Transfer': 'bank_transfer',
          'JazzCash / EasyPaisa': 'jazzcash',
          'Credit Card': 'card',
          'Cheque': 'cheque'
        };

        await tx.payment.create({
          data: {
            paymentNo,
            bookingId: newBooking.id,
            userId: userId,
            amount: advAmount,
            method: methodMap[paymentMode] || 'cash',
            paymentType: 'advance',
            status: 'completed',
            companyId: targetCompanyId,
            branchId: targetBranchId,
            notes: 'Initial advance payment on booking creation'
          }
        });

        // ── Auto-create bank account transaction ──
        if (bankAccountId) {
          const parsedBankId = parseInt(bankAccountId);
          const account = await tx.bankAccount.findFirst({
            where: { id: parsedBankId, branchId: targetBranchId, companyId: targetCompanyId }
          });

          if (account) {
            const currentBal = parseFloat(account.currentBalance);
            const newBal = currentBal + advAmount;

            const accountPaymentModeMap = {
              'Cash': 'CASH',
              'Bank Transfer': 'BANK_TRANSFER',
              'JazzCash / EasyPaisa': 'JAZZCASH',
              'Credit Card': 'CREDIT_CARD',
              'Cheque': 'CHEQUE'
            };

            await tx.accountTransaction.create({
              data: {
                bankAccountId: parsedBankId,
                type: 'CREDIT',
                amount: advAmount,
                balanceAfter: newBal,
                category: 'BOOKING_PAYMENT',
                description: `Booking advance — ${newBooking.title || 'Booking #' + newBooking.id}`,
                referenceNumber: paymentNo,
                paymentMode: accountPaymentModeMap[paymentMode] || 'CASH',
                transactionDate: new Date(),
                branchId: targetBranchId,
                companyId: targetCompanyId,
                createdBy: userId,
                relatedEntityType: 'Booking',
                relatedEntityId: newBooking.id,
              }
            });

            await tx.bankAccount.update({
              where: { id: parsedBankId },
              data: { currentBalance: newBal }
            });
          }
        }
      }

      return newBooking;
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully with complete ledger & history',
      data: booking
    });
  } catch (error) {
    console.error('createBooking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message,
      hint: error.code === 'P2003' ? 'Foreign key violation. Ensure all referenced IDs (services, menus, hall, customer) exist in database.' : undefined
    });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Update booking with append/modify support & audit
// @route   PUT /api/bookings/:id
// ───────────────────────────────────────────────────────────
const updateBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: {
        menus: true,
        services: true,
        customer: { include: { emergencyContacts: true } }
      }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied or branch mismatch.' });
    }

    const { 
  title, description, eventId, eventType, eventDate, startTime, endTime, 
  guestCount, actualGuestCount, guestName, guestPhone, guestEmail, 
  customerId, status, paymentStatus, hallId, isMealIncluded, 
  totalAmount, paidAmount, advanceAmount, discount, 
  menus, services, replaceMenus, replaceServices,
  packageTotal, selectedPackage, customItems  
} = req.body;

    const userId = req.user?.id || null;

    // ── Hall Collision Check on Update ──
    const parsedHallId = hallId !== undefined ? (hallId ? parseInt(hallId) : null) : existing.hallId;
    const newGuestCount = guestCount !== undefined ? parseInt(guestCount) : existing.guestCount;
    const newEventDate = eventDate ? new Date(eventDate) : existing.eventDate;
    const newStartTime = startTime ? new Date(startTime) : existing.startTime;
    const newEndTime = endTime ? new Date(endTime) : existing.endTime;

    if (parsedHallId && (hallId !== undefined || guestCount !== undefined || eventDate || startTime || endTime)) {
      const hall = await prisma.hall.findUnique({
        where: { id: parsedHallId },
        select: { id: true, capacity: true, name: true }
      });

      if (hall) {
        const overlapping = await prisma.booking.findMany({
          where: {
            hallId: parsedHallId,
            eventDate: newEventDate,
            status: { not: 'cancelled' },
            deletedAt: null,
            id: { not: id }
          },
          select: { guestCount: true, startTime: true, endTime: true }
        });

        let totalBooked = 0;
        for (const b of overlapping) {
          if (newStartTime < b.endTime && newEndTime > b.startTime) {
            totalBooked += b.guestCount;
          }
        }

        if (newGuestCount > (hall.capacity - totalBooked)) {
          return res.status(400).json({
            success: false,
            message: `Update rejected! Hall "${hall.name}" remaining capacity: ${hall.capacity - totalBooked}. Requested: ${newGuestCount}.`
          });
        }
      }
    }

    // ── Financial Recalculation ──
    const newTotal = totalAmount !== undefined ? parseFloat(totalAmount) : Number(existing.totalAmount);
    const newDisc = discount !== undefined ? parseFloat(discount) : Number(existing.discount);
    const newAdv = advanceAmount !== undefined ? parseFloat(advanceAmount) : Number(existing.advanceAmount);
    const newPaid = paidAmount !== undefined ? parseFloat(paidAmount) : Number(existing.paidAmount);
    const finalAdv = newAdv || newPaid || 0;
    const newDue = Math.max(0, newTotal - newDisc - finalAdv);
    const newPayStatus = newDue <= 0 ? 'completed' : (finalAdv > 0 ? 'partial' : 'pending');

    // ── Validate New Services ──
    let validServices = [];
    if (services && Array.isArray(services)) {
      validServices = await validateServiceIds(services, existing.companyId);
    }

    const booking = await prisma.$transaction(async (tx) => {
      // ── Handle Menus: Replace or Append ──
      if (menus && Array.isArray(menus)) {
  if (replaceMenus === true) {
    await tx.bookingMenu.deleteMany({ where: { bookingId: id } });
  }

  const newMenus = menus.filter(m => m.menuId && !isNaN(parseInt(m.menuId))).map(m => ({
    menuId: parseInt(m.menuId),
    menuName: m.menuName || null,
    quantity: parseInt(m.quantity) || 1,
    unit: m.unit || null,
    unitId: m.unitId ? parseInt(m.unitId) : null,
    unitPrice: parseFloat(m.unitPrice) || 0,
    totalPrice: parseFloat(m.totalPrice) || 0,
    notes: m.notes || null
  }));

  if (newMenus.length > 0) {
    await tx.bookingMenu.createMany({
      data: newMenus.map(m => ({ ...m, bookingId: id })),
      skipDuplicates: true
    });
  }
}

      // ── Handle Services: Replace or Append ──
      if (validServices.length > 0) {
  if (replaceServices === true) {
    await tx.bookingService.deleteMany({ where: { bookingId: id } });
  }

  await tx.bookingService.createMany({
    data: validServices.map(s => ({
      bookingId: id,
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      totalPrice: s.totalPrice,
      notes: s.notes
    })),
    skipDuplicates: true
  });
}

// ── 🔥 NEW: Handle CustomItems ──
if (customItems && Array.isArray(customItems) && isMealIncluded !== false) {
  // Delete existing custom items
  await tx.bookingCustomItem.deleteMany({ where: { bookingId: id } });
  
  // Create new custom items
  const validCustomItems = customItems
    .filter(item => item.itemName)
    .map(item => ({
      bookingId: id,
      itemId: item.itemId || null,
      itemName: item.itemName || 'Custom Item',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      unit: item.unit || 'pcs',
      notes: item.note || item.notes || null
    }));
  
  if (validCustomItems.length > 0) {
    await tx.bookingCustomItem.createMany({
      data: validCustomItems
    });
  }
}

      // ── Build Update Data ──
      const updateData = {
  ...(title !== undefined && { title: title.trim() }),
  ...(description !== undefined && { description }),
  ...(eventId !== undefined && { eventId: eventId ? parseInt(eventId) : null }),
  ...(eventType !== undefined && { eventType }),
  ...(eventDate && { eventDate: new Date(eventDate) }),
  ...(startTime && { startTime: new Date(startTime) }),
  ...(endTime && { endTime: new Date(endTime) }),
  ...(guestCount !== undefined && { guestCount: parseInt(guestCount) }),
  ...(actualGuestCount !== undefined && { actualGuestCount: parseInt(actualGuestCount) }),
  ...(guestName !== undefined && { guestName: guestName.trim() }),
  ...(guestPhone !== undefined && { guestPhone: guestPhone.trim() }),
  ...(guestEmail !== undefined && { guestEmail }),
  ...(customerId !== undefined && { customerId: customerId ? parseInt(customerId) : null }),
  ...(status !== undefined && { status }),
  ...(paymentStatus !== undefined && { paymentStatus }),
  ...(hallId !== undefined && { hallId: hallId ? parseInt(hallId) : null }),
  ...(isMealIncluded !== undefined && { isMealIncluded: Boolean(isMealIncluded) }),
  ...(totalAmount !== undefined && { totalAmount: newTotal }),
  ...(paidAmount !== undefined && { paidAmount: newPaid }),
  ...(advanceAmount !== undefined && { advanceAmount: finalAdv }),
  ...(discount !== undefined && { discount: newDisc }),
  // ── 🔥 FIXED: Package fields update karein ──
  ...(packageTotal !== undefined && { package_total: parseFloat(packageTotal || 0) }),
  ...(selectedPackage !== undefined && { selected_package: selectedPackage }),
  dueAmount: newDue,
  paymentStatus: newPayStatus,
  updatedById: userId
};

      const updated = await tx.booking.update({
        where: { id },
        data: updateData,
        include: {
          hall: true,
          customer: { include: { emergencyContacts: true } },
          menus: { include: { menu: true } },
          services: { include: { service: true } },
          payments: { orderBy: { createdAt: 'desc' } }
        }
      });

      // ── Audit Log for field changes ──
      await logBookingChanges(tx, id, existing, updateData, userId);

      return updated;
    });

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully with audit trail',
      data: booking
    });
  } catch (error) {
    console.error('updateBooking error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Delete booking (Soft delete)
// @route   DELETE /api/bookings/:id
// ───────────────────────────────────────────────────────────
const deleteBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, branchId: true, bookingNo: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied or branch mismatch.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.bookingChangeLog.create({
        data: {
          bookingId: id,
          fieldName: 'status',
          oldValue: 'active',
          newValue: 'cancelled',
          changedById: req.user?.id || null
        }
      });

      await tx.booking.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'cancelled' }
      });
    });

    res.status(200).json({
      success: true,
      message: `Booking ${existing.bookingNo} cancelled successfully`
    });
  } catch (error) {
    console.error('deleteBooking error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get bookings by branch
// @route   GET /api/bookings/branch/:branchId
// ───────────────────────────────────────────────────────────
const getBookingsByBranch = async (req, res) => {
  try {
    if (!['admin', 'super_admin', 'manager'].includes(req.userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const bookings = await prisma.booking.findMany({
      where: { branchId, deletedAt: null },
      include: {
        hall: { select: { id: true, name: true } },
        event: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        _count: { select: { menus: true, services: true } }
      },
      orderBy: { eventDate: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('getBookingsByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Add payment to booking
// @route   POST /api/bookings/:id/payments
// ───────────────────────────────────────────────────────────
const addPayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, paymentMode, notes, bankAccountId } = req.body;
    
    if (isNaN(id) || !amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, message: 'Valid booking ID and amount required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { 
        id: true, 
        branchId: true, 
        companyId: true, 
        dueAmount: true, 
        paidAmount: true, 
        totalAmount: true, 
        discount: true,
        title: true
      }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const payAmount = parseFloat(amount);
    const newPaid = Number(booking.paidAmount) + payAmount;
    const newDue = Math.max(0, Number(booking.totalAmount) - Number(booking.discount) - newPaid);
    const newStatus = newDue <= 0 ? 'completed' : (newPaid > 0 ? 'partial' : 'pending');

    const result = await prisma.$transaction(async (tx) => {
      const payDateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const payRandom = Math.floor(1000 + Math.random() * 9000);
      const paymentNo = `PAY-${payDateStr}-${payRandom}`;

      const methodMap = {
        'Cash': 'cash',
        'Bank Transfer': 'bank_transfer',
        'JazzCash / EasyPaisa': 'jazzcash',
        'Credit Card': 'card',
        'Cheque': 'cheque'
      };

      const payment = await tx.payment.create({
        data: {
          paymentNo,
          bookingId: id,
          userId: req.user?.id || 1,
          amount: payAmount,
          method: methodMap[paymentMode] || paymentMode || 'cash',
          paymentType: 'final',
          status: 'completed',
          companyId: booking.companyId,
          branchId: booking.branchId,
          notes: notes || 'Payment received'
        }
      });

      await tx.booking.update({
        where: { id },
        data: { paidAmount: newPaid, dueAmount: newDue, paymentStatus: newStatus }
      });

      await tx.bookingChangeLog.create({
        data: {
          bookingId: id,
          fieldName: 'payment',
          oldValue: String(booking.paidAmount),
          newValue: String(newPaid),
          changedById: req.user?.id || null
        }
      });

      // ── Auto-create bank account transaction (LEDGER ENTRY) ──
      if (bankAccountId) {
        const parsedBankId = parseInt(bankAccountId);
        const account = await tx.bankAccount.findFirst({
          where: { 
            id: parsedBankId, 
            branchId: booking.branchId, 
            companyId: booking.companyId 
          }
        });

        if (account) {
          const currentBal = parseFloat(account.currentBalance);
          const newBal = currentBal + payAmount;

          const accountPaymentModeMap = {
            'cash': 'CASH',
            'bank_transfer': 'BANK_TRANSFER',
            'card': 'CREDIT_CARD',
            'easypaisa': 'EASYPAISA',
            'jazzcash': 'JAZZCASH',
            'cheque': 'CHEQUE'
          };

          await tx.accountTransaction.create({
            data: {
              bankAccountId: parsedBankId,
              type: 'CREDIT',
              amount: payAmount,
              balanceAfter: newBal,
              category: 'BOOKING_PAYMENT',
              description: `Payment received — ${booking.title || 'Booking #' + booking.id}`,
              referenceNumber: paymentNo,
              paymentMode: accountPaymentModeMap[paymentMode] || 'CASH',
              transactionDate: new Date(),
              branchId: booking.branchId,
              companyId: booking.companyId,
              createdBy: req.user?.id || 1,
              relatedEntityType: 'Booking',
              relatedEntityId: booking.id,
            }
          });

          await tx.bankAccount.update({
            where: { id: parsedBankId },
            data: { currentBalance: newBal }
          });
        }
      }

      return payment;
    });

    res.status(201).json({ success: true, message: 'Payment recorded', data: result });
  } catch (error) {
    console.error('addPayment error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get all damages for a booking
// @route   GET /api/bookings/:id/damages
// ───────────────────────────────────────────────────────────
const getBookingDamages = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const damages = await prisma.eventDamage.findMany({
      where: { bookingId },
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true } },
        asset: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalDamagesCost = damages.reduce((sum, d) => sum + Number(d.totalCost || 0), 0);
    res.status(200).json({ success: true, count: damages.length, totalDamagesCost, data: damages });
  } catch (error) {
    console.error('getBookingDamages error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Add damage / extra charge to booking (Billed to customer)
// @route   POST /api/bookings/:id/damages
// ───────────────────────────────────────────────────────────
const addBookingDamage = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const {
      itemName, quantity, unit, costPrice, description,
      inventoryItemId, assetId, chargeCustomer = true
    } = req.body;

    if (!itemName || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Item name and quantity are required.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        branchId: true,
        totalAmount: true,
        dueAmount: true,
        paidAmount: true,
        discount: true,
        title: true
      }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const qty = parseFloat(quantity) || 1;
    const cost = parseFloat(costPrice || 0);
    const totalCost = parseFloat((qty * cost).toFixed(2));
    const userId = req.user?.id || 1;

    const result = await prisma.$transaction(async (tx) => {
      const damage = await tx.eventDamage.create({
        data: {
          bookingId,
          itemName: itemName.trim(),
          quantity: qty,
          unit: unit || 'unit',
          costPrice: cost,
          totalCost,
          description: description || null,
          inventoryItemId: inventoryItemId ? parseInt(inventoryItemId) : null,
          assetId: assetId ? parseInt(assetId) : null,
          createdById: userId
        },
        include: {
          inventoryItem: { select: { id: true, name: true } },
          asset: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } }
        }
      });

      let updatedBooking = null;
      if (chargeCustomer !== false && totalCost > 0) {
        const curTotal = parseFloat(booking.totalAmount) || 0;
        const curDue = parseFloat(booking.dueAmount) || 0;
        const curPaid = parseFloat(booking.paidAmount) || 0;

        const newTotal = parseFloat((curTotal + totalCost).toFixed(2));
        const newDue = parseFloat((curDue + totalCost).toFixed(2));
        const newPaymentStatus = newDue <= 0 ? 'completed' : (curPaid > 0 ? 'partial' : 'pending');

        updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            totalAmount: newTotal,
            dueAmount: newDue,
            paymentStatus: newPaymentStatus
          }
        });

        await tx.bookingChangeLog.create({
          data: {
            bookingId,
            fieldName: 'damage_extra_charge',
            oldValue: `Total: Rs ${curTotal}`,
            newValue: `Added ${itemName} (Qty: ${qty} @ Rs ${cost} = Rs ${totalCost}) -> New Total: Rs ${newTotal}`,
            changedById: userId
          }
        });
      }

      return { damage, updatedBooking };
    });

    res.status(201).json({
      success: true,
      message: 'Damage / Extra charge added to party bill.',
      data: result.damage,
      booking: result.updatedBooking
    });
  } catch (error) {
    console.error('addBookingDamage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Remove damage / extra charge from booking
// @route   DELETE /api/bookings/:id/damages/:damageId
// ───────────────────────────────────────────────────────────
const removeBookingDamage = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const damageId = parseInt(req.params.damageId);

    const damage = await prisma.eventDamage.findUnique({
      where: { id: damageId }
    });

    if (!damage || damage.bookingId !== bookingId) {
      return res.status(404).json({ success: false, message: 'Damage record not found' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        totalAmount: true,
        dueAmount: true,
        paidAmount: true,
        discount: true
      }
    });

    const totalCost = parseFloat(damage.totalCost) || 0;
    const userId = req.user?.id || null;

    const result = await prisma.$transaction(async (tx) => {
      await tx.eventDamage.delete({ where: { id: damageId } });

      let updatedBooking = null;
      if (booking && totalCost > 0) {
        const curTotal = parseFloat(booking.totalAmount) || 0;
        const curPaid = parseFloat(booking.paidAmount) || 0;
        const curDisc = parseFloat(booking.discount) || 0;

        const newTotal = Math.max(0, parseFloat((curTotal - totalCost).toFixed(2)));
        const newDue = Math.max(0, parseFloat((newTotal - curDisc - curPaid).toFixed(2)));
        const newPaymentStatus = newDue <= 0 ? 'completed' : (curPaid > 0 ? 'partial' : 'pending');

        updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            totalAmount: newTotal,
            dueAmount: newDue,
            paymentStatus: newPaymentStatus
          }
        });

        await tx.bookingChangeLog.create({
          data: {
            bookingId,
            fieldName: 'damage_extra_charge_deleted',
            oldValue: `Total: Rs ${curTotal}`,
            newValue: `Deleted ${damage.itemName} (-Rs ${totalCost}) -> New Total: Rs ${newTotal}`,
            changedById: userId
          }
        });
      }

      return updatedBooking;
    });

    res.status(200).json({
      success: true,
      message: 'Damage record removed and party bill updated.',
      booking: result
    });
  } catch (error) {
    console.error('removeBookingDamage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Complete Booking with optional Settlement Payment
// @route   POST /api/bookings/:id/complete-settle
// ───────────────────────────────────────────────────────────
const completeAndSettleBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      settlePayment, // optional: { amount, paymentMode, bankAccountId, notes }
      notes,
      allowReceivable = false
    } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { eventDamages: true, payments: true }
    });

    if (!booking || booking.deletedAt) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const userId = req.user?.id || 1;

    const result = await prisma.$transaction(async (tx) => {
      let curPaid = parseFloat(booking.paidAmount) || 0;
      let curTotal = parseFloat(booking.totalAmount) || 0;
      let curDisc = parseFloat(booking.discount) || 0;
      let recordedPayment = null;

      // If final settlement payment is submitted
      if (settlePayment && parseFloat(settlePayment.amount) > 0) {
        const payAmount = parseFloat(settlePayment.amount);
        curPaid = parseFloat((curPaid + payAmount).toFixed(2));
        const payDateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const payRandom = Math.floor(1000 + Math.random() * 9000);
        const paymentNo = `PAY-${payDateStr}-${payRandom}`;

        const methodMap = {
          'Cash': 'cash',
          'Bank Transfer': 'bank_transfer',
          'JazzCash / EasyPaisa': 'jazzcash',
          'Credit Card': 'card',
          'Cheque': 'cheque'
        };

        recordedPayment = await tx.payment.create({
          data: {
            paymentNo,
            bookingId: id,
            userId,
            amount: payAmount,
            method: methodMap[settlePayment.paymentMode] || settlePayment.paymentMode || 'cash',
            paymentType: 'final',
            status: 'completed',
            companyId: booking.companyId,
            branchId: booking.branchId,
            notes: settlePayment.notes || 'Final settlement payment upon completion'
          }
        });

        // Update Bank Account balance if selected
        if (settlePayment.bankAccountId) {
          const parsedBankId = parseInt(settlePayment.bankAccountId);
          const bank = await tx.bankAccount.findUnique({ where: { id: parsedBankId } });
          if (bank) {
            const oldBal = Number(bank.currentBalance || 0);
            const newBal = oldBal + payAmount;
            await tx.accountTransaction.create({
              data: {
                bankAccountId: parsedBankId,
                transactionType: 'credit',
                amount: payAmount,
                balanceAfter: newBal,
                date: new Date(),
                description: `Settlement Payment Booking #${booking.bookingNo}`,
                relatedEntityType: 'Booking',
                relatedEntityId: booking.id
              }
            });
            await tx.bankAccount.update({
              where: { id: parsedBankId },
              data: { currentBalance: newBal }
            });
          }
        }
      }

      const newDue = Math.max(0, parseFloat((curTotal - curDisc - curPaid).toFixed(2)));
      const newPayStatus = newDue <= 0 ? 'completed' : (curPaid > 0 ? 'partial' : 'pending');

      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: 'completed',
          paymentStatus: newPayStatus,
          paidAmount: curPaid,
          dueAmount: newDue
        }
      });

      await tx.bookingChangeLog.create({
        data: {
          bookingId: id,
          fieldName: 'status',
          oldValue: booking.status,
          newValue: 'completed',
          changedById: userId
        }
      });

      return { booking: updated, payment: recordedPayment };
    });

    res.status(200).json({
      success: true,
      message: 'Booking successfully marked as Completed and accounts settled.',
      data: result
    });
  } catch (error) {
    console.error('completeAndSettleBooking error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Log a sent WhatsApp message for a booking
// @route   POST /api/bookings/:id/whatsapp
// ───────────────────────────────────────────────────────────
const logWhatsAppMessage = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const { phoneNumber, body, messageType } = req.body;
    if (!phoneNumber || !body) {
      return res.status(400).json({ success: false, message: 'Phone number and message body are required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, branchId: true, companyId: true, bookingNo: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const messageId = `WA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const waMessage = await prisma.whatsAppMessage.create({
      data: {
        messageId,
        phoneNumber: String(phoneNumber).trim(),
        body: String(body).trim(),
        status: 'sent',
        bookingId: booking.id,
        userId: req.user?.id || null,
        branchId: booking.branchId,
        companyId: booking.companyId,
        sentAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    // Also log in bookingChangeLog
    await prisma.bookingChangeLog.create({
      data: {
        bookingId: booking.id,
        fieldName: 'whatsapp_notification',
        oldValue: messageType || 'whatsapp_message',
        newValue: `Sent to ${phoneNumber}`,
        changedById: req.user?.id || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'WhatsApp message logged successfully',
      data: waMessage
    });
  } catch (error) {
    console.error('logWhatsAppMessage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get WhatsApp message history for a booking
// @route   GET /api/bookings/:id/whatsapp
// ───────────────────────────────────────────────────────────
const getWhatsAppMessages = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const messages = await prisma.whatsAppMessage.findMany({
      where: { bookingId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { sentAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('getWhatsAppMessages error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// @desc    Get upcoming event bookings for 1-day & 2-day reminders
// @route   GET /api/bookings/upcoming-reminders
// ═══════════════════════════════════════════════════════════
const getUpcomingReminders = async (req, res) => {
  try {
    const branchId = req.query.branchId ? parseInt(req.query.branchId) : null;
    const daysAhead = parseInt(req.query.days || '2');
    const pastDays = parseInt(req.query.pastDays || '2'); // check recent 2 days to catch today & imminent events

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() - pastDays, 0, 0, 0, 0);
    const endOfWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, 23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['cancelled', 'completed', 'no_show'] },
        eventDate: {
          gte: startOfWindow,
          lte: endOfWindow,
        },
        ...(branchId && !isNaN(branchId) && { branchId }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        hall: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, phone: true, address: true } },
        whatsappMessages: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { eventDate: 'asc' },
    });

    const mapped = bookings.map(b => {
      const eventDate = new Date(b.eventDate);
      const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 0, 0, 0, 0);
      const diffTime = eventMidnight.getTime() - startOfToday.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let timingLabel = 'Aaj (Today)';
      if (diffDays === -1) timingLabel = 'Kal Guzra (Yesterday)';
      else if (diffDays < -1) timingLabel = `${Math.abs(diffDays)} Din Pehle`;
      else if (diffDays === 1) timingLabel = 'Kal (Tomorrow)';
      else if (diffDays === 2) timingLabel = 'Parson (In 2 Days)';
      else if (diffDays > 2) timingLabel = `${diffDays} Din Baad`;

      // Check if reminder was sent in the last 48 hours
      const recentReminders = (b.whatsappMessages || []).filter(m => {
        const sentTime = new Date(m.sentAt).getTime();
        return (now.getTime() - sentTime) < (48 * 60 * 60 * 1000);
      });

      const lastSentMessage = recentReminders[0] || null;

      return {
        id: b.id,
        bookingNo: b.bookingNo,
        title: b.title,
        eventType: b.eventType,
        eventDate: b.eventDate,
        startTime: b.startTime,
        endTime: b.endTime,
        guestCount: b.guestCount,
        totalAmount: parseFloat(b.totalAmount) || 0,
        paidAmount: parseFloat(b.paidAmount) || 0,
        dueAmount: parseFloat(b.dueAmount) || 0,
        status: b.status,
        customer: b.customer,
        guestName: b.guestName,
        guestPhone: b.guestPhone || b.customer?.phone || '',
        hall: b.hall,
        branch: b.branch,
        diffDays,
        timingLabel,
        reminderSent: !!lastSentMessage,
        lastSentAt: lastSentMessage?.sentAt || null,
      };
    });

    const pendingCount = mapped.filter(b => !b.reminderSent).length;
    const sentCount = mapped.filter(b => b.reminderSent).length;

    res.status(200).json({
      success: true,
      data: {
        total: mapped.length,
        pendingCount,
        sentCount,
        daysAhead,
        bookings: mapped,
      },
    });
  } catch (error) {
    console.error('getUpcomingReminders error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingsByBranch,
  addPayment,
  getBookingDamages,
  addBookingDamage,
  removeBookingDamage,
  completeAndSettleBooking,
  logWhatsAppMessage,
  getWhatsAppMessages,
  getUpcomingReminders
};