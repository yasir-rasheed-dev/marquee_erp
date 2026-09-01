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
    
    if (fromDate || toDate) {
      where.eventDate = {};
      if (fromDate) where.eventDate.gte = new Date(fromDate);
      if (toDate) where.eventDate.lte = new Date(toDate);
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
customItems: true
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
    
    const summary = {
      totalPaid,
      totalInvoiced,
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
      menus, services, replaceMenus, replaceServices
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

module.exports = {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingsByBranch,
  addPayment
};