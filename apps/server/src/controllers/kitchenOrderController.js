// ═══════════════════════════════════════════════════════════
// controllers/kitchenOrder.controller.js
// Kitchen Orders | Recipe Auto-Fill | Stock Deduct | Status Flow
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

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

// ── Helper: Validate status ──
const validateStatus = (status, allowed = VALID_ORDER_STATUSES) => {
  const s = (status || 'pending').toLowerCase();
  if (!allowed.includes(s)) {
    return { error: `Invalid status. Allowed: ${allowed.join(', ')}` };
  }
  return { status: s };
};

// ═══════════════════════════════════════════════════════════
// KITCHEN ORDERS
// ═══════════════════════════════════════════════════════════

// ── GET ALL KITCHEN ORDERS (STRICT Branch-Wise + Filters) ──
const getKitchenOrders = async (req, res) => {
  try {
    const { search, status, priority, bookingId } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (bookingId) where.bookingId = parseInt(bookingId);

    if (search && search.trim() !== '') {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { notes: { contains: search.trim(), mode: 'insensitive' } },
          { booking: { title: { contains: search.trim(), mode: 'insensitive' } } },
          { booking: { guestName: { contains: search.trim(), mode: 'insensitive' } } }
        ]
      });
    }

    const orders = await prisma.kitchenOrder.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNo: true,
            title: true,
            guestName: true,
            guestPhone: true,
            eventDate: true,
            guestCount: true
          }
        },
        branch: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
      branch: branchId
    });
  } catch (error) {
    console.error('getKitchenOrders error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET SINGLE KITCHEN ORDER (with items & live cost) ──
const getKitchenOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const order = await prisma.kitchenOrder.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            bookingNo: true,
            title: true,
            guestName: true,
            guestPhone: true,
            eventDate: true,
            guestCount: true,
            eventType: true
          }
        },
        branch: { select: { id: true, name: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, code: true, unit: true, salePrice: true } },
            inventoryItem: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                currentStock: true,
                avgCostPrice: true
              }
            },
            unitRef: { select: { id: true, name: true, symbol: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (order.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This order belongs to another branch.' });
    }

    // LIVE cost calculation
    let totalEstimatedCost = 0;
    const enrichedItems = order.items.map(item => {
      const costPerUnit = item.inventoryItem
        ? parseFloat(item.inventoryItem.avgCostPrice) || 0
        : 0;
      const qty = parseFloat(item.quantity) || 0;
      const itemCost = costPerUnit * qty;
      totalEstimatedCost += itemCost;

      return {
        ...item,
        liveCostPerUnit: parseFloat(costPerUnit.toFixed(2)),
        liveTotalCost: parseFloat(itemCost.toFixed(2))
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...order,
        items: enrichedItems,
        summary: {
          totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
          itemCount: order.items.length
        }
      }
    });
  } catch (error) {
    console.error('getKitchenOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── CREATE KITCHEN ORDER (with optional recipe auto-fill) ──
const createKitchenOrder = async (req, res) => {
  try {
    const { bookingId, priority, notes, items, autoFillRecipes } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required.'
      });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }

    const targetCompanyId = req.companyId || await getCompanyIdByBranch(branchId);
    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Verify booking belongs to branch
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      select: { id: true, branchId: true, title: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. Booking belongs to another branch.' });
    }

    const priorityValidation = validateStatus(priority, VALID_PRIORITIES);
    if (priorityValidation.error) {
      return res.status(400).json({ success: false, message: priorityValidation.error });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.kitchenOrder.create({
        data: {
          bookingId: parseInt(bookingId),
          priority: priorityValidation.status,
          status: 'pending',
          notes: notes || null,
          branchId,
          companyId: parseInt(targetCompanyId)
        },
        include: {
          booking: { select: { id: true, bookingNo: true, title: true } }
        }
      });

      let createdItems = [];

      // If items provided directly
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const newItem = await tx.kitchenOrderItem.create({
            data: {
              kitchenOrderId: order.id,
              menuItemId: item.menuItemId ? parseInt(item.menuItemId) : null,
              inventoryItemId: item.inventoryItemId ? parseInt(item.inventoryItemId) : null,
              quantity: parseFloat(item.quantity) || 0,
              unit: item.unit?.trim() || '',
              unitId: item.unitId ? parseInt(item.unitId) : null,
              status: item.status || 'pending',
              notes: item.notes || null
            }
          });
          createdItems.push(newItem);
        }
      }

      // If autoFillRecipes requested
      if (autoFillRecipes === true) {
        const bookingData = await tx.booking.findUnique({
          where: { id: parseInt(bookingId) },
          include: {
            menus: {
              include: {
                menu: {
                  include: {
                    categories: {
                      include: {
                        items: {
                          include: {
                            item: {
                              include: {
                                recipeIngredients: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            customItems: true
          }
        });

        const bookingGuests = Math.max(parseInt(bookingData?.guestCount) || 100, 1);

        // Process standard menus
        for (const bm of bookingData?.menus || []) {
          for (const cat of bm.menu?.categories || []) {
            for (const mi of cat.items || []) {
              const dish = mi.item;
              const recipes = dish?.recipeIngredients || [];
              if (recipes.length === 0) continue;

              const convRate = parseFloat(dish?.conversionRate || mi.conversionRate) || 50;
              const isBulkOrDegh = (
                (mi.unit && mi.unit.toLowerCase().includes('degh')) ||
                (dish?.unit && dish.unit.toLowerCase().includes('degh')) ||
                mi.isBulkUnit === true ||
                dish?.isBulkUnit === true ||
                convRate > 1
              );

              const qtyPerHead = parseFloat(mi.quantityPerHead) || 1;
              const totalPlates = bookingGuests * qtyPerHead;
              const totalDeghs = isBulkOrDegh && convRate > 1 
                ? parseFloat((totalPlates / convRate).toFixed(2)) 
                : (isBulkOrDegh ? parseFloat((totalPlates / 50).toFixed(2)) : totalPlates);

              for (const ing of recipes) {
                const baseQty = parseFloat(ing.quantity) || 0;
                const totalQty = parseFloat((baseQty * totalDeghs).toFixed(3));
                if (totalQty <= 0) continue;

                const newItem = await tx.kitchenOrderItem.create({
                  data: {
                    kitchenOrderId: order.id,
                    menuItemId: mi.id,
                    inventoryItemId: ing.inventoryItemId,
                    quantity: totalQty,
                    unit: ing.unit,
                    unitId: ing.unitId,
                    status: 'pending',
                    notes: `Auto from recipe: ${ing.name} (${mi.name} × ${totalDeghs} Degh)`
                  }
                });
                createdItems.push(newItem);
              }
            }
          }
        }

        // Process custom items
        for (const ci of bookingData?.customItems || []) {
          if (!ci.itemId) continue;
          const dish = await tx.item.findUnique({
            where: { id: ci.itemId },
            include: { recipeIngredients: true }
          });
          if (!dish || !dish.recipeIngredients?.length) continue;

          const convRate = parseFloat(dish.conversionRate) || 50;
          let totalDeghs = parseFloat(ci.quantity) || 1;
          if (ci.unit && (ci.unit.toLowerCase().includes('plate') || ci.unit.toLowerCase() === 'pcs')) {
            totalDeghs = parseFloat((totalDeghs / convRate).toFixed(2));
          }

          for (const ing of dish.recipeIngredients) {
            const baseQty = parseFloat(ing.quantity) || 0;
            const totalQty = parseFloat((baseQty * totalDeghs).toFixed(3));
            if (totalQty <= 0) continue;

            const newItem = await tx.kitchenOrderItem.create({
              data: {
                kitchenOrderId: order.id,
                menuItemId: null,
                inventoryItemId: ing.inventoryItemId,
                quantity: totalQty,
                unit: ing.unit,
                unitId: ing.unitId,
                status: 'pending',
                notes: `Auto from recipe: ${ing.name} (${ci.itemName} × ${totalDeghs} Degh)`
              }
            });
            createdItems.push(newItem);
          }
        }
      }

      return { order, createdItems };
    });

    res.status(201).json({
      success: true,
      message: `Kitchen order created successfully with ${result.createdItems.length} item(s).`,
      data: result.order,
      itemsCreated: result.createdItems.length
    });
  } catch (error) {
    console.error('createKitchenOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── UPDATE KITCHEN ORDER ──
const updateKitchenOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const existing = await prisma.kitchenOrder.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This order belongs to another branch.' });
    }

    if (existing.status === 'served' || existing.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update a served or cancelled order.' });
    }

    const { priority, notes, status } = req.body;
    const data = {};

    if (notes !== undefined) data.notes = notes;
    if (priority !== undefined) {
      const pv = validateStatus(priority, VALID_PRIORITIES);
      if (pv.error) return res.status(400).json({ success: false, message: pv.error });
      data.priority = pv.status;
    }
    if (status !== undefined) {
      const sv = validateStatus(status, VALID_ORDER_STATUSES);
      if (sv.error) return res.status(400).json({ success: false, message: sv.error });
      data.status = sv.status;
    }

    const updated = await prisma.kitchenOrder.update({
      where: { id },
      data,
      include: {
        booking: { select: { id: true, bookingNo: true, title: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      }
    });

    res.status(200).json({ success: true, message: 'Kitchen order updated successfully', data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }
    console.error('updateKitchenOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── DELETE KITCHEN ORDER (Hard Delete — schema has no deletedAt) ──
const deleteKitchenOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const existing = await prisma.kitchenOrder.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This order belongs to another branch.' });
    }

    if (existing.status === 'served') {
      return res.status(400).json({ success: false, message: 'Cannot delete a served order.' });
    }

    // Hard delete — cascade will delete items too
    await prisma.kitchenOrder.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Kitchen order deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }
    console.error('deleteKitchenOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// KITCHEN ORDER ITEMS
// ═══════════════════════════════════════════════════════════

// ── GET ITEMS OF A KITCHEN ORDER ──
const getKitchenOrderItems = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const order = await prisma.kitchenOrder.findUnique({
      where: { id: orderId },
      select: { id: true, branchId: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    if (order.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const items = await prisma.kitchenOrderItem.findMany({
      where: { kitchenOrderId: orderId },
      include: {
        menuItem: { select: { id: true, name: true, code: true, unit: true } },
        inventoryItem: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            currentStock: true,
            avgCostPrice: true
          }
        },
        unitRef: { select: { id: true, name: true, symbol: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const enriched = items.map(item => {
      const costPerUnit = item.inventoryItem
        ? parseFloat(item.inventoryItem.avgCostPrice) || 0
        : 0;
      const qty = parseFloat(item.quantity) || 0;
      return {
        ...item,
        liveCostPerUnit: parseFloat(costPerUnit.toFixed(2)),
        liveTotalCost: parseFloat((costPerUnit * qty).toFixed(2))
      };
    });

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('getKitchenOrderItems error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── ADD ITEM TO KITCHEN ORDER ──
const addKitchenOrderItem = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const { menuItemId, inventoryItemId, quantity, unit, unitId, notes } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Quantity is required.' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const order = await prisma.kitchenOrder.findUnique({
      where: { id: orderId },
      select: { id: true, branchId: true, status: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    if (order.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (order.status === 'served' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot add items to a served or cancelled order.' });
    }

    // Verify inventory item if provided
    if (inventoryItemId) {
      const inv = await prisma.inventoryItem.findUnique({
        where: { id: parseInt(inventoryItemId) },
        select: { id: true, branchId: true, name: true }
      });
      if (!inv || inv.branchId !== branchId) {
        return res.status(404).json({ success: false, message: 'Inventory item not found or access denied.' });
      }
    }

    // Verify menu item if provided
    if (menuItemId) {
      const mi = await prisma.menuItem.findUnique({
        where: { id: parseInt(menuItemId) },
        select: { id: true, branchId: true, name: true }
      });
      if (!mi || mi.branchId !== branchId) {
        return res.status(404).json({ success: false, message: 'Menu item not found or access denied.' });
      }
    }

    const item = await prisma.kitchenOrderItem.create({
      data: {
        kitchenOrderId: orderId,
        menuItemId: menuItemId ? parseInt(menuItemId) : null,
        inventoryItemId: inventoryItemId ? parseInt(inventoryItemId) : null,
        quantity: parseFloat(quantity) || 0,
        unit: unit?.trim() || '',
        unitId: unitId ? parseInt(unitId) : null,
        status: 'pending',
        notes: notes || null
      },
      include: {
        menuItem: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, currentStock: true, avgCostPrice: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, message: 'Item added to kitchen order', data: item });
  } catch (error) {
    console.error('addKitchenOrderItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── UPDATE KITCHEN ORDER ITEM ──
const updateKitchenOrderItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const existing = await prisma.kitchenOrderItem.findUnique({
      where: { id: itemId },
      include: { kitchenOrder: { select: { branchId: true, status: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.kitchenOrder.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (existing.kitchenOrder.status === 'served' || existing.kitchenOrder.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update items of a served or cancelled order.' });
    }

    const { quantity, unit, unitId, status, notes } = req.body;
    const data = {};

    if (quantity !== undefined) data.quantity = parseFloat(quantity) || 0;
    if (unit !== undefined) data.unit = unit.trim();
    if (unitId !== undefined) data.unitId = unitId ? parseInt(unitId) : null;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.kitchenOrderItem.update({
      where: { id: itemId },
      data,
      include: {
        menuItem: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, currentStock: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ success: true, message: 'Order item updated', data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }
    console.error('updateKitchenOrderItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── DELETE KITCHEN ORDER ITEM ──
const deleteKitchenOrderItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const existing = await prisma.kitchenOrderItem.findUnique({
      where: { id: itemId },
      include: { kitchenOrder: { select: { branchId: true, status: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.kitchenOrder.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (existing.kitchenOrder.status === 'served' || existing.kitchenOrder.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot delete items of a served or cancelled order.' });
    }

    await prisma.kitchenOrderItem.delete({ where: { id: itemId } });

    res.status(200).json({ success: true, message: 'Order item deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }
    console.error('deleteKitchenOrderItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXECUTE / SERVE KITCHEN ORDER (Stock Deduct + History)
// ═══════════════════════════════════════════════════════════

// ── EXECUTE KITCHEN ORDER (Deduct stock & create transactions) ──
const executeKitchenOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const order = await prisma.kitchenOrder.findUnique({
      where: { id },
      include: {
        booking: { select: { id: true, bookingNo: true, title: true } },
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                currentStock: true,
                avgCostPrice: true,
                manageStock: true,
                companyId: true,
                branchId: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    if (order.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (order.status === 'served') {
      return res.status(400).json({ success: false, message: 'Order is already served.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot execute a cancelled order.' });
    }

    // Stock availability check
    const shortageItems = [];
    for (const item of order.items) {
      if (!item.inventoryItemId || !item.inventoryItem) continue;
      if (!item.inventoryItem.manageStock) continue;

      const required = parseFloat(item.quantity) || 0;
      const available = parseFloat(item.inventoryItem.currentStock) || 0;

      if (available < required) {
        shortageItems.push({
          name: item.inventoryItem.name,
          required,
          available,
          shortage: parseFloat((required - available).toFixed(3))
        });
      }
    }

    if (shortageItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock to execute order.',
        shortageItems
      });
    }

    const userId = req.user?.id || 1;
    const companyId = order.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const transactions = [];
      let totalDeductedCost = 0;

      for (const item of order.items) {
        if (!item.inventoryItemId || !item.inventoryItem) continue;
        if (!item.inventoryItem.manageStock) continue;

        const qty = parseFloat(item.quantity) || 0;
        const currentStock = parseFloat(item.inventoryItem.currentStock) || 0;
        const newStock = parseFloat((currentStock - qty).toFixed(3));
        const costPrice = parseFloat(item.inventoryItem.avgCostPrice) || 0;
        const totalCost = costPrice * qty;
        totalDeductedCost += totalCost;

        // Deduct stock
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { currentStock: newStock }
        });

        // Create stock transaction history
        const stockTx = await tx.stockTransaction.create({
          data: {
            inventoryId: item.inventoryItemId,
            type: 'ADJUSTMENT',
            quantity: qty,
            costPrice: costPrice,
            notes: `Kitchen Order #${order.id} — Booking: ${order.booking?.bookingNo || order.bookingId}`,
            referenceType: 'KITCHEN_ORDER',
            referenceId: order.id,
            bookingId: order.bookingId,
            userId: userId,
            branchId: branchId,
            companyId: companyId
          }
        });
        transactions.push(stockTx);

        // Update kitchen order item status to served
        await tx.kitchenOrderItem.update({
          where: { id: item.id },
          data: { status: 'served' }
        });
      }

      // Update order status to served
      const updatedOrder = await tx.kitchenOrder.update({
        where: { id },
        data: { status: 'served' }
      });

      return { updatedOrder, transactions, totalDeductedCost };
    });

    res.status(200).json({
      success: true,
      message: `Kitchen order executed successfully. ${result.transactions.length} stock transaction(s) recorded.`,
      data: {
        order: result.updatedOrder,
        transactionsCreated: result.transactions.length,
        totalDeductedCost: parseFloat(result.totalDeductedCost.toFixed(2))
      }
    });
  } catch (error) {
    console.error('executeKitchenOrder error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET STOCK TRANSACTIONS LINKED TO A KITCHEN ORDER ──
const getKitchenOrderStockHistory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen order ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const order = await prisma.kitchenOrder.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    }

    if (order.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const transactions = await prisma.stockTransaction.findMany({
      where: {
        referenceType: 'KITCHEN_ORDER',
        referenceId: id,
        branchId
      },
      include: {
        inventory: { select: { id: true, name: true, code: true, unit: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('getKitchenOrderStockHistory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getKitchenOrders,
  getKitchenOrder,
  createKitchenOrder,
  updateKitchenOrder,
  deleteKitchenOrder,
  getKitchenOrderItems,
  addKitchenOrderItem,
  updateKitchenOrderItem,
  deleteKitchenOrderItem,
  executeKitchenOrder,
  getKitchenOrderStockHistory
};

