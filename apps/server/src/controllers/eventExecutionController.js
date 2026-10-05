// ═══════════════════════════════════════════════════════════
// controllers/eventExecutionController.js
// EVENT EXECUTION — Secure & Multi-Tenant
// ═══════════════════════════════════════════════════════════

const { deductInventoryForBooking, rollbackInventoryDeduction, previewDeduction } = require('../services/inventoryDeduction.service');
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

// ═══════════════════════════════════════════════════════════
// EVENT EXECUTION CRUD
// ═══════════════════════════════════════════════════════════

// @desc    Get all Event Executions (Strict Branch-Wise)
// @route   GET /api/event-executions
const getEventExecutions = async (req, res) => {
  try {
    const { status, bookingId } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const where = {
      booking: { branchId }
    };
    if (status) where.status = status;
    if (bookingId) where.bookingId = parseInt(bookingId);

    const executions = await prisma.eventExecution.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true, bookingNo: true, guestName: true,
            guestCount: true, eventDate: true, branchId: true,
            hall: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: executions.length, data: executions, branch: branchId });
  } catch (error) {
    console.error('getEventExecutions error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single Event Execution with full details securely
// @route   GET /api/event-executions/:id
const getEventExecution = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid execution ID' });

    const execution = await prisma.eventExecution.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            hall: true,
            menus: { include: { menu: true } },
            services: { include: { service: true } },
            payments: true
          }
        }
      }
    });

    if (!execution) return res.status(404).json({ success: false, message: 'Event execution not found' });

    const branchId = getBranchId(req);
    if (!branchId || execution.booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized branch action.' });
    }

    res.status(200).json({ success: true, data: execution });
  } catch (error) {
    console.error('getEventExecution error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create Event Execution securely
// @route   POST /api/event-executions
const createEventExecution = async (req, res) => {
  try {
    const { bookingId, plannedGuestCount, notes, branchId } = req.body;
    
    let targetBranchId = branchId || req.branchId || req.query.branchId;
    if (!targetBranchId) return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    targetBranchId = parseInt(targetBranchId);

    if (!bookingId) return res.status(400).json({ success: false, message: 'Booking ID required.' });

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: {
        hall: true,
        menus: { include: { menu: true } },
        services: true,
        invoices: true
      }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.branchId !== targetBranchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Booking belongs to another branch.' });
    }

    const existing = await prisma.eventExecution.findUnique({
      where: { bookingId: parseInt(bookingId) }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Event execution already exists for this booking.' });
    }

    const hallCost = parseFloat(booking.hall?.price || 0);
    const menuCost = booking.menus.reduce((sum, m) => sum + parseFloat(m.totalPrice || 0), 0);
    const serviceCost = booking.services.reduce((sum, s) => sum + parseFloat(s.totalPrice || 0), 0);
    const totalRevenue = parseFloat(booking.totalAmount || 0);
    const totalDiscount = parseFloat(booking.discount || 0);
    const netRevenue = totalRevenue - totalDiscount;

    const execution = await prisma.eventExecution.create({
      data: {
        bookingId: parseInt(bookingId),
        status: 'in_progress',
        plannedGuestCount: parseInt(plannedGuestCount || booking.guestCount || 0),
        actualGuestCount: 0,
        hallCost,
        menuCost,
        serviceCost,
        totalCost: hallCost + menuCost + serviceCost,
        totalRevenue,
        totalDiscount,
        netRevenue,
        profit: netRevenue - (hallCost + menuCost + serviceCost),
        notes
      }
    });

    // ── AUTO DEDUCT INVENTORY when event starts ──
    let inventoryDeduction = null;
    try {
      inventoryDeduction = await deductInventoryForBooking(parseInt(bookingId), {
        userId: req.user?.id || 1,
        branchId: targetBranchId,
        triggerSource: 'event_execution',
        referenceId: execution.id
      });
    } catch (deductErr) {
      console.warn('[EventExecution] Inventory auto-deduct warning:', deductErr.message);
      inventoryDeduction = {
        success: false,
        message: deductErr.message,
        skipped: true
      };
    }

    res.status(201).json({
      success: true,
      message: 'Event execution started securely',
      data: execution,
      inventoryDeduction
    });
  } catch (error) {
    console.error('createEventExecution error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Finalize Event Execution securely
// @route   PUT /api/event-executions/:id/finalize
const finalizeEventExecution = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid execution ID' });

    const { actualGuestCount, extraGuestCount, otherCosts, notes } = req.body;
    const branchId = getBranchId(req);

    const execution = await prisma.eventExecution.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            eventDishUsages: true,
            eventInventoryConsumptions: true,
            eventDamages: true,
            wastageLogs: { include: { inventory: true } },
            hall: true,
            services: true
          }
        }
      }
    });

    if (!execution) return res.status(404).json({ success: false, message: 'Event execution not found' });
    if (!branchId || execution.booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized branch action.' });
    }

    const inventoryCost = execution.booking.eventInventoryConsumptions.reduce(
      (sum, item) => sum + parseFloat(item.totalCost || 0), 0
    );
    const wastageCost = execution.booking.wastageLogs.reduce(
      (sum, w) => sum + (parseFloat(w.quantity || 0) * parseFloat(w.inventory?.avgCostPrice || 0)), 0
    );
    const damageCost = execution.booking.eventDamages.reduce(
      (sum, d) => sum + parseFloat(d.totalCost || 0), 0
    );
    const serviceCost = execution.booking.services.reduce(
      (sum, s) => sum + parseFloat(s.totalPrice || 0), 0
    );
    const hallCost = parseFloat(execution.booking.hall?.price || 0);
    const other = parseFloat(otherCosts || 0);

    const totalCost = hallCost + execution.menuCost + serviceCost + inventoryCost + wastageCost + damageCost + other;
    const netRevenue = parseFloat(execution.totalRevenue || 0) - parseFloat(execution.totalDiscount || 0);
    const profit = netRevenue - totalCost;
    const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

    const updated = await prisma.eventExecution.update({
      where: { id },
      data: {
        status: 'completed',
        actualGuestCount: parseInt(actualGuestCount || execution.actualGuestCount),
        extraGuestCount: parseInt(extraGuestCount || 0),
        inventoryCost,
        wastageCost,
        damageCost,
        otherCosts: other,
        totalCost,
        netRevenue,
        profit,
        profitMargin,
        notes: notes || execution.notes
      }
    });

    res.status(200).json({ success: true, message: 'Event finalized securely', data: updated });
  } catch (error) {
    console.error('finalizeEventExecution error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const rollbackEventInventory = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID required.' });
    }

    const result = await rollbackInventoryDeduction(bookingId, {
      userId: req.user?.id || 1,
      branchId
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('rollbackEventInventory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
const previewInventoryDeduction = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID required.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, branchId: true, bookingNo: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const preview = await previewDeduction(bookingId, {
      userId: req.user?.id || 1,
      branchId
    });

    res.status(200).json({
      success: true,
      message: preview.success
        ? 'Preview: Stock available for all ingredients'
        : 'Preview: Stock shortage detected',
      data: preview
    });
  } catch (error) {
    console.error('previewInventoryDeduction error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
// ═══════════════════════════════════════════════════════════
// EVENT DISH USAGE
// ═══════════════════════════════════════════════════════════

const createDishUsage = async (req, res) => {
  try {
    const {
      bookingId, menuItemId, dishName,
      plannedQuantity, actualQuantity, unit, unitId, costPerUnit, notes
    } = req.body;
    const branchId = getBranchId(req);

    if (!bookingId || !dishName || actualQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'bookingId, dishName, actualQuantity required.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      select: { companyId: true, branchId: true }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!branchId || booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const qty = parseFloat(actualQuantity);
    const cost = parseFloat(costPerUnit || 0);
    const totalCost = qty * cost;

    const usage = await prisma.eventDishUsage.create({
      data: {
        bookingId: parseInt(bookingId),
        menuItemId: menuItemId ? parseInt(menuItemId) : null,
        dishName,
        plannedQuantity: parseFloat(plannedQuantity || 0),
        actualQuantity: qty,
        unit: unit || 'plate',
        unitId: unitId ? parseInt(unitId) : null,
        costPerUnit: cost,
        totalCost,
        notes
      },
      include: {
        menuItem: { select: { id: true, name: true } },
        unitRef: true
      }
    });

    res.status(201).json({ success: true, message: 'Dish usage recorded', data: usage });
  } catch (error) {
    console.error('createDishUsage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getDishUsages = async (req, res) => {
  try {
    const { bookingId, menuItemId } = req.query;
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required.' });

    const where = { booking: { branchId } };
    if (bookingId) where.bookingId = parseInt(bookingId);
    if (menuItemId) where.menuItemId = parseInt(menuItemId);

    const usages = await prisma.eventDishUsage.findMany({
      where,
      include: {
        booking: { select: { id: true, bookingNo: true, guestName: true, eventDate: true } },
        menuItem: { select: { id: true, name: true } },
        unitRef: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: usages.length, data: usages });
  } catch (error) {
    console.error('getDishUsages error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ═══════════════════════════════════════════════════════════
// EVENT INVENTORY CONSUMPTION (Stock Auto-Deduct)
// ═══════════════════════════════════════════════════════════

const createInventoryConsumption = async (req, res) => {
  try {
    const {
      bookingId, inventoryItemId,
      plannedQuantity, actualQuantity, unit, unitId, costPerUnit, notes
    } = req.body;
    const branchId = getBranchId(req);

    if (!bookingId || !inventoryItemId || actualQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'bookingId, inventoryItemId, actualQuantity required.' });
    }

    const [booking, item] = await Promise.all([
      prisma.booking.findUnique({ where: { id: parseInt(bookingId) }, select: { branchId: true, companyId: true } }),
      prisma.inventoryItem.findUnique({ where: { id: parseInt(inventoryItemId) }, select: { name: true, unit: true, avgCostPrice: true, branchId: true } })
    ]);

    if (!booking || !item) return res.status(404).json({ success: false, message: 'Booking or Inventory item not found' });
    if (!branchId || booking.branchId !== branchId || item.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Cross-branch operations prohibited.' });
    }

    const qty = parseFloat(actualQuantity);
    const cost = parseFloat(costPerUnit || item.avgCostPrice || 0);
    const totalCost = qty * cost;

    const consumption = await prisma.$transaction(async (tx) => {
      const c = await tx.eventInventoryConsumption.create({
        data: {
          bookingId: parseInt(bookingId),
          inventoryItemId: parseInt(inventoryItemId),
          plannedQuantity: parseFloat(plannedQuantity || 0),
          actualQuantity: qty,
          unit: unit || item.unit,
          unitId: unitId ? parseInt(unitId) : null,
          costPerUnit: cost,
          totalCost,
          notes
        },
        include: {
          booking: { select: { id: true, bookingNo: true, guestName: true, eventDate: true } },
          inventoryItem: { select: { id: true, name: true, code: true, unit: true } },
          unitRef: true
        }
      });

      // Deduct stock safely
      await tx.inventoryItem.update({
        where: { id: parseInt(inventoryItemId) },
        data: { currentStock: { decrement: qty } }
      });

      // Log transaction
      await tx.stockTransaction.create({
        data: {
          inventoryId: parseInt(inventoryItemId),
          type: 'SALE',
          quantity: qty,
          costPrice: cost,
          notes: notes || `Consumed in event booking #${bookingId}`,
          bookingId: parseInt(bookingId),
          userId: req.user?.id || 1,
          branchId,
          companyId: booking.companyId
        }
      });

      return c;
    });

    res.status(201).json({ success: true, message: 'Consumption recorded & stock securely deducted', data: consumption });
  } catch (error) {
    console.error('createInventoryConsumption error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getInventoryConsumptions = async (req, res) => {
  try {
    const { bookingId, inventoryItemId } = req.query;
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required.' });

    const where = { booking: { branchId } };
    if (bookingId) where.bookingId = parseInt(bookingId);
    if (inventoryItemId) where.inventoryItemId = parseInt(inventoryItemId);

    const consumptions = await prisma.eventInventoryConsumption.findMany({
      where,
      include: {
        booking: { select: { id: true, bookingNo: true, guestName: true, eventDate: true } },
        inventoryItem: { select: { id: true, name: true, code: true, unit: true } },
        unitRef: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: consumptions.length, data: consumptions });
  } catch (error) {
    console.error('getInventoryConsumptions error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ═══════════════════════════════════════════════════════════
// EVENT DAMAGE TRACKING
// ═══════════════════════════════════════════════════════════

const createEventDamage = async (req, res) => {
  try {
    const {
      bookingId, inventoryItemId, assetId, itemName,
      quantity, unit, unitId, costPrice, description, images,
      chargeCustomer = true // Default: true (billed to the party's ledger/invoice)
    } = req.body;
    const userId = req.user?.id;
    const branchId = getBranchId(req);

    if (!bookingId || !itemName || !quantity) {
      return res.status(400).json({ success: false, message: 'bookingId, itemName, quantity required.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
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
    if (!branchId || booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const qty = parseFloat(quantity) || 1;
    const cost = parseFloat(costPrice || 0);
    const totalCost = parseFloat((qty * cost).toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
      const damage = await tx.eventDamage.create({
        data: {
          bookingId: parseInt(bookingId),
          inventoryItemId: inventoryItemId ? parseInt(inventoryItemId) : null,
          assetId: assetId ? parseInt(assetId) : null,
          itemName,
          quantity: qty,
          unit: unit || 'unit',
          unitId: unitId ? parseInt(unitId) : null,
          costPrice: cost,
          totalCost,
          description,
          images,
          createdById: userId || 1
        },
        include: {
          booking: { select: { id: true, bookingNo: true } },
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
          where: { id: parseInt(bookingId) },
          data: {
            totalAmount: newTotal,
            dueAmount: newDue,
            paymentStatus: newPaymentStatus
          }
        });

        await tx.bookingChangeLog.create({
          data: {
            bookingId: parseInt(bookingId),
            fieldName: 'damage_extra_charge',
            oldValue: `Total: Rs ${curTotal}`,
            newValue: `Added ${itemName} (Qty: ${qty} @ Rs ${cost} = Rs ${totalCost}) -> New Total: Rs ${newTotal}`,
            changedById: userId || null
          }
        });
      }

      return { damage, updatedBooking };
    });

    res.status(201).json({
      success: true,
      message: `Damage / Extra charge recorded and added to party bill.`,
      data: result.damage,
      booking: result.updatedBooking
    });
  } catch (error) {
    console.error('createEventDamage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getEventDamages = async (req, res) => {
  try {
    const { bookingId } = req.query;
    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required.' });

    const where = { booking: { branchId } };
    if (bookingId) where.bookingId = parseInt(bookingId);

    const damages = await prisma.eventDamage.findMany({
      where,
      include: {
        booking: { select: { id: true, bookingNo: true, guestName: true, eventDate: true } },
        inventoryItem: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: damages.length, data: damages });
  } catch (error) {
    console.error('getEventDamages error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const deleteEventDamage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const branchId = getBranchId(req);
    const userId = req.user?.id || null;

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid damage ID' });
    }

    const damage = await prisma.eventDamage.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            branchId: true,
            totalAmount: true,
            dueAmount: true,
            paidAmount: true,
            discount: true
          }
        }
      }
    });

    if (!damage) return res.status(404).json({ success: false, message: 'Damage record not found' });
    if (branchId && damage.booking?.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const totalCost = parseFloat(damage.totalCost) || 0;
    const booking = damage.booking;

    await prisma.$transaction(async (tx) => {
      await tx.eventDamage.delete({ where: { id } });

      if (booking && totalCost > 0) {
        const curTotal = parseFloat(booking.totalAmount) || 0;
        const curPaid = parseFloat(booking.paidAmount) || 0;
        const curDisc = parseFloat(booking.discount) || 0;

        const newTotal = Math.max(0, parseFloat((curTotal - totalCost).toFixed(2)));
        const newDue = Math.max(0, parseFloat((newTotal - curDisc - curPaid).toFixed(2)));
        const newPaymentStatus = newDue <= 0 ? 'completed' : (curPaid > 0 ? 'partial' : 'pending');

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            totalAmount: newTotal,
            dueAmount: newDue,
            paymentStatus: newPaymentStatus
          }
        });

        await tx.bookingChangeLog.create({
          data: {
            bookingId: booking.id,
            fieldName: 'damage_extra_charge_deleted',
            oldValue: `Total: Rs ${curTotal}`,
            newValue: `Deleted ${damage.itemName} (-Rs ${totalCost}) -> New Total: Rs ${newTotal}`,
            changedById: userId
          }
        });
      }
    });

    res.status(200).json({ success: true, message: 'Damage record removed and party bill updated.' });
  } catch (error) {
    console.error('deleteEventDamage error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// COMPLETE EVENT REPORT — A-to-Z History
// ═══════════════════════════════════════════════════════════

const getEventReport = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({ success: false, message: 'Invalid booking ID' });

    const branchId = getBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required.' });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { emergencyContacts: true } },
        hall: true,
        event: true,
        menus: { include: { menu: true, unitRef: true } },
        services: { include: { service: true } },
        payments: true,
        invoices: { include: { items: true, payments: true } },
        eventExecution: true,
        eventDishUsages: { include: { menuItem: true, unitRef: true } },
        eventInventoryConsumptions: { include: { inventoryItem: true, unitRef: true } },
        eventDamages: { include: { inventoryItem: true, asset: true, createdBy: true } },
        wastageLogs: { include: { inventory: true, createdBy: true } },
        changeLogs: { include: { changedBy: true } },
        menuChangeLogs: { include: { menu: true, changedBy: true } },
        serviceChangeLogs: { include: { service: true, changedBy: true } },
        tasks: { include: { assignee: true } },
        createdBy: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Report belongs to another branch.' });
    }

    const totalMenuCost = booking.eventDishUsages.reduce((s, d) => s + parseFloat(d.totalCost || 0), 0);
    const totalInventoryCost = booking.eventInventoryConsumptions.reduce((s, i) => s + parseFloat(i.totalCost || 0), 0);
    const totalWastageCost = booking.wastageLogs.reduce((s, w) => s + (parseFloat(w.quantity || 0) * parseFloat(w.inventory?.avgCostPrice || 0)), 0);
    const totalDamageCost = booking.eventDamages.reduce((s, d) => s + parseFloat(d.totalCost || 0), 0);
    const totalServiceCost = booking.services.reduce((s, sv) => s + parseFloat(sv.totalPrice || 0), 0);
    const hallCost = parseFloat(booking.hall?.price || 0);

    const report = {
      bookingInfo: {
        bookingNo: booking.bookingNo,
        title: booking.title,
        status: booking.status,
        eventDate: booking.eventDate,
        guestCount: booking.guestCount,
        actualGuestCount: booking.actualGuestCount
      },
      customer: booking.customer,
      hall: booking.hall,
      financials: {
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        dueAmount: booking.dueAmount,
        advanceAmount: booking.advanceAmount,
        discount: booking.discount
      },
      costBreakdown: {
        hallCost,
        menuCost: totalMenuCost,
        serviceCost: totalServiceCost,
        inventoryCost: totalInventoryCost,
        wastageCost: totalWastageCost,
        damageCost: totalDamageCost,
        totalEventCost: hallCost + totalMenuCost + totalServiceCost + totalInventoryCost + totalWastageCost + totalDamageCost
      },
      menus: booking.menus,
      services: booking.services,
      dishUsages: booking.eventDishUsages,
      inventoryConsumptions: booking.eventInventoryConsumptions,
      damages: booking.eventDamages,
      wastage: booking.wastageLogs,
      changeHistory: {
        bookingChanges: booking.changeLogs,
        menuChanges: booking.menuChangeLogs,
        serviceChanges: booking.serviceChangeLogs
      },
      payments: booking.payments,
      eventExecution: booking.eventExecution
    };

    res.status(200).json({ success: true, data: report, branch: branchId });
  } catch (error) {
    console.error('getEventReport error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getEventExecutions,
  getEventExecution,
  createEventExecution,
  finalizeEventExecution,
  previewInventoryDeduction,
  rollbackEventInventory,
  createDishUsage,
  getDishUsages,
  createInventoryConsumption,
  getInventoryConsumptions,
  createEventDamage,
  getEventDamages,
  deleteEventDamage,
  getEventReport
};