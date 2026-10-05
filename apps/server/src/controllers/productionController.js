// ═══════════════════════════════════════════════════════════
// controllers/productionPlan.controller.js
// Production Plans | Recipe Auto-Fill | Stock Deduct | Cost Track
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const { deductInventoryForBooking, previewDeduction } = require('../services/inventoryDeduction.service');
const prisma = new PrismaClient();

const VALID_PLAN_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'];

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

// ── Helper: Validate plan status ──
const validatePlanStatus = (status) => {
  const s = (status || 'planned').toLowerCase();
  if (!VALID_PLAN_STATUSES.includes(s)) {
    return { error: `Invalid status. Allowed: ${VALID_PLAN_STATUSES.join(', ')}` };
  }
  return { status: s };
};

// ═══════════════════════════════════════════════════════════
// PRODUCTION PLANS
// ═══════════════════════════════════════════════════════════

// ── GET ALL PRODUCTION PLANS (STRICT Branch-Wise + Filters) ──
const getProductionPlans = async (req, res) => {
  try {
    const { search, status, bookingId, startDate, endDate } = req.query;
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
    if (bookingId) where.bookingId = parseInt(bookingId);

    if (startDate || endDate) {
      where.planDate = {};
      if (startDate) where.planDate.gte = new Date(startDate);
      if (endDate) where.planDate.lte = new Date(endDate);
    }

    if (search && search.trim() !== '') {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { notes: { contains: search.trim()} },
          { booking: { title: { contains: search.trim()} } },
          { booking: { guestName: { contains: search.trim()} } }
        ]
      });
    }

    const plans = await prisma.productionPlan.findMany({
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
      orderBy: { planDate: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
      branch: branchId
    });
  } catch (error) {
    console.error('getProductionPlans error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET SINGLE PRODUCTION PLAN (with items & live cost) ──
const getProductionPlan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const plan = await prisma.productionPlan.findUnique({
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
            menuItem: { select: { id: true, name: true, code: true, unit: true, salePrice: true, quantityPerHead: true, conversionRate: true } },
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

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (plan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This plan belongs to another branch.' });
    }

    // LIVE cost calculation
    let totalEstimatedCost = 0;
    const enrichedItems = plan.items.map(item => {
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
        ...plan,
        items: enrichedItems,
        summary: {
          totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
          itemCount: plan.items.length
        }
      }
    });
  } catch (error) {
    console.error('getProductionPlan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── CREATE PRODUCTION PLAN (with optional recipe auto-fill) ──
const createProductionPlan = async (req, res) => {
  try {
    const { bookingId, planDate, notes, status, items, autoFillRecipes } = req.body;

    if (!bookingId || !planDate) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and plan date are required.'
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

    const statusValidation = validatePlanStatus(status);
    if (statusValidation.error) {
      return res.status(400).json({ success: false, message: statusValidation.error });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create plan
      const plan = await tx.productionPlan.create({
        data: {
          bookingId: parseInt(bookingId),
          planDate: new Date(planDate),
          status: statusValidation.status,
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
          const newItem = await tx.productionPlanItem.create({
            data: {
              productionPlanId: plan.id,
              menuItemId: item.menuItemId ? parseInt(item.menuItemId) : null,
              inventoryItemId: item.inventoryItemId ? parseInt(item.inventoryItemId) : null,
              quantity: parseFloat(item.quantity) || 0,
              unit: item.unit?.trim() || '',
              unitId: item.unitId ? parseInt(item.unitId) : null,
              notes: item.notes || null
            }
          });
          createdItems.push(newItem);
        }
      } else if (autoFillRecipes === true) {
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

                const newItem = await tx.productionPlanItem.create({
                  data: {
                    productionPlanId: plan.id,
                    menuItemId: mi.id,
                    inventoryItemId: ing.inventoryItemId,
                    quantity: totalQty,
                    unit: ing.unit,
                    unitId: ing.unitId,
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

            const newItem = await tx.productionPlanItem.create({
              data: {
                productionPlanId: plan.id,
                menuItemId: null,
                inventoryItemId: ing.inventoryItemId,
                quantity: totalQty,
                unit: ing.unit,
                unitId: ing.unitId,
                notes: `Auto from recipe: ${ing.name} (${ci.itemName} × ${totalDeghs} Degh)`
              }
            });
            createdItems.push(newItem);
          }
        }
      }

      return { plan, createdItems };
    });

    res.status(201).json({
      success: true,
      message: `Production plan created successfully with ${result.createdItems.length} item(s).`,
      data: result.plan,
      itemsCreated: result.createdItems.length
    });
  } catch (error) {
    console.error('createProductionPlan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── UPDATE PRODUCTION PLAN ──
const updateProductionPlan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const existing = await prisma.productionPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This plan belongs to another branch.' });
    }

    // Lock if already completed
    if (existing.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot update a completed production plan.' });
    }

    const { planDate, notes, status } = req.body;
    const data = {};

    if (planDate !== undefined) data.planDate = new Date(planDate);
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined) {
      const statusValidation = validatePlanStatus(status);
      if (statusValidation.error) {
        return res.status(400).json({ success: false, message: statusValidation.error });
      }
      data.status = statusValidation.status;
    }

    const updated = await prisma.productionPlan.update({
      where: { id },
      data,
      include: {
        booking: { select: { id: true, bookingNo: true, title: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      }
    });

    res.status(200).json({ success: true, message: 'Production plan updated successfully', data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }
    console.error('updateProductionPlan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── DELETE PRODUCTION PLAN (Hard Delete — schema has no deletedAt) ──
const deleteProductionPlan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const existing = await prisma.productionPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This plan belongs to another branch.' });
    }

    if (existing.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot delete a completed production plan.' });
    }

    // Hard delete — cascade will delete items too
    await prisma.productionPlan.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Production plan deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }
    console.error('deleteProductionPlan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// PRODUCTION PLAN ITEMS
// ═══════════════════════════════════════════════════════════

// ── GET ITEMS OF A PRODUCTION PLAN ──
const getProductionPlanItems = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const plan = await prisma.productionPlan.findUnique({
      where: { id: planId },
      select: { id: true, branchId: true }
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    if (plan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const items = await prisma.productionPlanItem.findMany({
      where: { productionPlanId: planId },
      include: {
        menuItem: { select: { id: true, name: true, code: true, unit: true, salePrice: true, quantityPerHead: true, conversionRate: true } },
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

    // Enrich with live cost
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
    console.error('getProductionPlanItems error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── ADD ITEM TO PRODUCTION PLAN ──
const addProductionPlanItem = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const {
      menuItemId,
      inventoryItemId,
      isExternal,
      externalItemName,
      quantity,
      unit,
      unitId,
      notes,
      costPrice,
      salePrice
    } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Quantity is required.' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const plan = await prisma.productionPlan.findUnique({
      where: { id: planId },
      select: { id: true, branchId: true, companyId: true, status: true }
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    if (plan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (plan.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot add items to a completed plan.' });
    }

    let resolvedInvId = inventoryItemId ? parseInt(inventoryItemId) : null;

    // Handle External Item (direct / market purchase)
    if ((isExternal || externalItemName?.trim()) && !resolvedInvId) {
      const trimmedName = (externalItemName || '').trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'External item name is required.' });
      }

      // Find existing item by name (case-insensitive) in branch or company
      let existingItem = await prisma.inventoryItem.findFirst({
        where: {
          branchId: branchId,
          name: { equals: trimmedName}
        }
      });

      if (!existingItem) {
        // Auto-create external item in inventory
        existingItem = await prisma.inventoryItem.create({
          data: {
            name: trimmedName,
            category: 'Kitchen / External',
            unit: unit?.trim() || 'kg',
            unitId: unitId ? parseInt(unitId) : null,
            avgCostPrice: parseFloat(costPrice) || 0,
            lastCostPrice: parseFloat(costPrice) || 0,
            salePrice: parseFloat(salePrice) || 0,
            currentStock: 0,
            manageStock: false, // External direct purchase; does not block warehouse stock
            isActive: true,
            companyId: plan.companyId,
            branchId: branchId
          }
        });
      } else {
        // Optionally update prices
        const updateData = {};
        if (costPrice !== undefined && costPrice !== '' && !isNaN(parseFloat(costPrice))) {
          updateData.avgCostPrice = parseFloat(costPrice);
        }
        if (salePrice !== undefined && salePrice !== '' && !isNaN(parseFloat(salePrice))) {
          updateData.salePrice = parseFloat(salePrice);
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: updateData
          });
        }
      }
      resolvedInvId = existingItem.id;
    } else if (resolvedInvId) {
      // Verify inventory item if provided and optionally update cost/sale price
      const inv = await prisma.inventoryItem.findUnique({
        where: { id: resolvedInvId },
        select: { id: true, branchId: true, name: true }
      });
      if (!inv || inv.branchId !== branchId) {
        return res.status(404).json({ success: false, message: 'Inventory item not found or access denied.' });
      }

      // Update costPrice / salePrice if provided at runtime
      const updateData = {};
      if (costPrice !== undefined && costPrice !== '' && !isNaN(parseFloat(costPrice))) {
        updateData.avgCostPrice = parseFloat(costPrice);
      }
      if (salePrice !== undefined && salePrice !== '' && !isNaN(parseFloat(salePrice))) {
        updateData.salePrice = parseFloat(salePrice);
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.inventoryItem.update({
          where: { id: resolvedInvId },
          data: updateData
        });
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

    const itemNotes = isExternal
      ? (notes ? `[External] ${notes}` : '[External Item]')
      : (notes || null);

    const item = await prisma.productionPlanItem.create({
      data: {
        productionPlanId: planId,
        menuItemId: menuItemId ? parseInt(menuItemId) : null,
        inventoryItemId: resolvedInvId,
        quantity: parseFloat(quantity) || 0,
        unit: unit?.trim() || '',
        unitId: unitId ? parseInt(unitId) : null,
        notes: itemNotes
      },
      include: {
        menuItem: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, category: true, currentStock: true, avgCostPrice: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, message: 'Item added to production plan', data: item });
  } catch (error) {
    console.error('addProductionPlanItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── UPDATE PRODUCTION PLAN ITEM ──
const updateProductionPlanItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const existing = await prisma.productionPlanItem.findUnique({
      where: { id: itemId },
      include: { productionPlan: { select: { branchId: true, status: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Plan item not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.productionPlan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (existing.productionPlan.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot update items of a completed plan.' });
    }

    const { quantity, unit, unitId, notes } = req.body;
    const data = {};

    if (quantity !== undefined) data.quantity = parseFloat(quantity) || 0;
    if (unit !== undefined) data.unit = unit.trim();
    if (unitId !== undefined) data.unitId = unitId ? parseInt(unitId) : null;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.productionPlanItem.update({
      where: { id: itemId },
      data,
      include: {
        menuItem: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, currentStock: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ success: true, message: 'Plan item updated', data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Plan item not found' });
    }
    console.error('updateProductionPlanItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── DELETE PRODUCTION PLAN ITEM ──
const deleteProductionPlanItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const existing = await prisma.productionPlanItem.findUnique({
      where: { id: itemId },
      include: { productionPlan: { select: { branchId: true, status: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Plan item not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.productionPlan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (existing.productionPlan.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot delete items of a completed plan.' });
    }

    await prisma.productionPlanItem.delete({ where: { id: itemId } });

    res.status(200).json({ success: true, message: 'Plan item deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Plan item not found' });
    }
    console.error('deleteProductionPlanItem error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// EXECUTE / COMPLETE PRODUCTION PLAN (Stock Deduct + History)
// ═══════════════════════════════════════════════════════════

// ── EXECUTE PRODUCTION PLAN (Deduct stock & create transactions) ──
const executeProductionPlan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const plan = await prisma.productionPlan.findUnique({
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

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    if (plan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (plan.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Plan is already executed.' });
    }

    if (plan.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot execute a cancelled plan.' });
    }

    // Check if force execute was requested
    const force = req.body?.force === true || req.query?.force === 'true';

    // Stock availability check before deducting
    const shortageItems = [];
    for (const item of plan.items) {
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

    if (shortageItems.length > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${shortageItems.length} item(s).`,
        shortageItems,
        canForce: true
      });
    }

    const userId = req.user?.id || 1;
    const companyId = plan.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const transactions = [];
      let totalDeductedCost = 0;

      for (const item of plan.items) {
        if (!item.inventoryItemId || !item.inventoryItem) continue;
        if (!item.inventoryItem.manageStock) continue;

        const qty = parseFloat(item.quantity) || 0;
        const currentStock = parseFloat(item.inventoryItem.currentStock) || 0;
        const newStock = parseFloat((currentStock - qty).toFixed(3));
        const costPrice = parseFloat(item.inventoryItem.avgCostPrice) || 0;
        const totalCost = costPrice * qty;
        totalDeductedCost += totalCost;

        // Deduct stock (supports negative stock if force execution)
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { currentStock: newStock }
        });

        // Create stock transaction history
        const isShortage = currentStock < qty;
        const stockTx = await tx.stockTransaction.create({
          data: {
            inventoryId: item.inventoryItemId,
            type: 'ADJUSTMENT',
            quantity: qty,
            costPrice: costPrice,
            notes: `Production Plan #${plan.id} — Booking: ${plan.booking?.bookingNo || plan.bookingId}${isShortage ? ` [Deficit/Shortage: -${(qty - currentStock).toFixed(2)}]` : ''}`,
            referenceType: 'PRODUCTION_PLAN',
            referenceId: plan.id,
            bookingId: plan.bookingId,
            userId: userId,
            branchId: branchId,
            companyId: companyId
          }
        });
        transactions.push(stockTx);

        // Record EventInventoryConsumption directly for this booking
        try {
          await tx.eventInventoryConsumption.create({
            data: {
              bookingId: plan.bookingId,
              inventoryItemId: item.inventoryItemId,
              plannedQuantity: qty,
              actualQuantity: qty,
              unit: item.unit || item.inventoryItem.unit || 'kg',
              unitId: item.unitId,
              costPerUnit: costPrice,
              totalCost: totalCost,
              notes: `Production Plan #${plan.id} execution${isShortage ? ' (Forced)' : ''}`
            }
          });
        } catch (cErr) {
          // non-fatal consumption tracking
        }
      }

      // Update plan status to completed
      const updatedPlan = await tx.productionPlan.update({
        where: { id },
        data: { status: 'completed' }
      });

      return { updatedPlan, transactions, totalDeductedCost };
    });

    res.status(200).json({
      success: true,
      message: `Production plan executed successfully. ${result.transactions.length} stock transaction(s) recorded.`,
      data: {
        plan: result.updatedPlan,
        transactionsCreated: result.transactions.length,
        totalDeductedCost: parseFloat(result.totalDeductedCost.toFixed(2))
      }
    });
  } catch (error) {
    console.error('executeProductionPlan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── PREVIEW INVENTORY IMPACT BEFORE EXECUTING PLAN ──
const previewProductionPlan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const plan = await prisma.productionPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true, bookingId: true, status: true }
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    if (plan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!plan.bookingId) {
      return res.status(400).json({ success: false, message: 'Plan has no linked booking.' });
    }

    const preview = await previewDeduction(plan.bookingId, {
      userId: req.user?.id || 1,
      branchId
    });

    const planItems = await prisma.productionPlanItem.findMany({
      where: { productionPlanId: id },
      include: {
        inventoryItem: { select: { id: true, name: true, currentStock: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        preview,
        planItems: planItems.map(item => ({
          ...item,
          stockAvailable: item.inventoryItem?.currentStock || 0
        }))
      }
    });
  } catch (error) {
    console.error('previewProductionPlan error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET STOCK TRANSACTIONS LINKED TO A PRODUCTION PLAN ──
const getProductionPlanStockHistory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid production plan ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const plan = await prisma.productionPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Production plan not found' });
    }

    if (plan.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const transactions = await prisma.stockTransaction.findMany({
      where: {
        referenceType: 'PRODUCTION_PLAN',
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
    console.error('getProductionPlanStockHistory error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getProductionPlans,
  getProductionPlan,
  createProductionPlan,
  updateProductionPlan,
  deleteProductionPlan,
  getProductionPlanItems,
  addProductionPlanItem,
  updateProductionPlanItem,
  deleteProductionPlanItem,
  executeProductionPlan,
  previewProductionPlan,
  getProductionPlanStockHistory
};

