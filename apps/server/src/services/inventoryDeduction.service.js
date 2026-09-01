// ═══════════════════════════════════════════════════════════
// services/inventoryDeduction.service.js
// AUTO INVENTORY DEDUCTION — Recipe → Menu → Booking → Event
// Biryani Degh (Recipe) × 3 = 6kg Rice + 6kg Oil auto deduct
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Stock Transaction Reference Type ──
const AUTO_DEDUCT_REF_TYPE = 'AUTO_RECIPE_DEDUCT';

// ═══════════════════════════════════════════════════════════
// MAIN FUNCTION: Deduct inventory for a booking based on recipes
// ═══════════════════════════════════════════════════════════

/**
 * @param {number} bookingId - Booking ID
 * @param {Object} options
 * @param {number} options.userId - User performing the action
 * @param {number} options.branchId - Branch ID for validation
 * @param {boolean} options.dryRun - If true, only calculates without deducting
 * @param {string} options.triggerSource - 'production_plan' | 'event_execution' | 'manual'
 * @param {number} options.referenceId - ProductionPlan ID or EventExecution ID
 * @returns {Object} Deduction result with details
 */
const deductInventoryForBooking = async (bookingId, options = {}) => {
  const {
    userId = 1,
    branchId,
    dryRun = false,
    triggerSource = 'event_execution',
    referenceId = null
  } = options;

  // ── 1. Fetch Booking with all menu data ──
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      menus: {
        include: {
          menu: {
            include: {
              categories: {
                include: {
                  items: {
                    include: {
                      recipeIngredients: {
                        include: {
                          inventoryItem: {
                            select: {
                              id: true,
                              name: true,
                              currentStock: true,
                              avgCostPrice: true,
                              lastCostPrice: true,
                              unit: true,
                              manageStock: true,
                              branchId: true
                            }
                          },
                          unitRef: { select: { id: true, name: true, symbol: true } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!booking) {
    throw new Error(`Booking #${bookingId} not found`);
  }

  if (branchId && booking.branchId !== branchId) {
    throw new Error('Access denied. Booking belongs to another branch.');
  }

  // ── 2. Check if already deducted (Idempotency) ──
  const existingTxns = await prisma.stockTransaction.count({
    where: {
      bookingId,
      referenceType: AUTO_DEDUCT_REF_TYPE
    }
  });

  if (existingTxns > 0 && !dryRun) {
    throw new Error(
      `Inventory already auto-deducted for this booking. ` +
      `Found ${existingTxns} existing transaction(s). ` +
      `Use rollback first if you want to re-deduct.`
    );
  }

  // ── 3. Calculate all ingredients needed ──
  const ingredientMap = new Map(); // inventoryItemId → aggregated data
  const dishUsageList = []; // For EventDishUsage tracking

  for (const bookingMenu of booking.menus) {
    const menu = bookingMenu.menu;
    if (!menu) continue;

    // How many "sets" of this menu were ordered
    const menuQuantity = parseFloat(bookingMenu.quantity) || 1;

    // Guest scaling factor: if menu designed for 100 guests but booking has 300
    const menuGuestCount = Math.max(parseInt(menu.guestCount) || 100, 1);
    const bookingGuestCount = Math.max(parseInt(booking.guestCount) || menuGuestCount, 1);
    const guestScaleFactor = bookingGuestCount / menuGuestCount;

    for (const category of menu.categories || []) {
      for (const menuItem of category.items || []) {
        const recipes = menuItem.recipeIngredients || [];
        if (recipes.length === 0) continue;

        // Calculate how many "units" of this dish we need
        // menuItem.quantityPerHead = amount per guest (or per menu base)
        const qtyPerHead = parseFloat(menuItem.quantityPerHead) || 1;
        const totalDishUnits = menuQuantity * guestScaleFactor * qtyPerHead;

        for (const recipe of recipes) {
          if (!recipe.inventoryItemId || !recipe.inventoryItem) {
            // Recipe ingredient not linked to inventory — skip but warn
            console.warn(`[AutoDeduct] Recipe ingredient "${recipe.name}" has no inventory link (MenuItem: ${menuItem.name})`);
            continue;
          }

          const inv = recipe.inventoryItem;
          const recipeQty = parseFloat(recipe.quantity) || 0;
          const totalQty = recipeQty * totalDishUnits;

          if (totalQty <= 0) continue;

          // Aggregate by inventory item
          const key = inv.id;
          if (!ingredientMap.has(key)) {
            ingredientMap.set(key, {
              inventoryItemId: inv.id,
              inventoryItemName: inv.name,
              currentStock: parseFloat(inv.currentStock) || 0,
              avgCostPrice: parseFloat(inv.avgCostPrice) || parseFloat(recipe.costPerUnit) || 0,
              unit: recipe.unit || inv.unit || 'unit',
              unitId: recipe.unitId,
              manageStock: inv.manageStock,
              totalRequired: 0,
              usedInDishes: []
            });
          }

          const agg = ingredientMap.get(key);
          agg.totalRequired += totalQty;
          agg.usedInDishes.push({
            menuItemName: menuItem.name,
            recipeQty,
            dishUnits: totalDishUnits,
            lineTotal: totalQty
          });
        }

        // Track dish usage for history
        dishUsageList.push({
          menuItemId: menuItem.id,
          dishName: menuItem.name,
          plannedQuantity: totalDishUnits,
          actualQuantity: totalDishUnits, // Same for auto-deduct
          unit: menuItem.unit || 'Degh',
          unitId: menuItem.unitId,
          costPerUnit: parseFloat(menuItem.costPrice) || 0
        });
      }
    }
  }

  // ── 4. Check stock availability ──
  const shortages = [];
  const deductions = [];

  for (const [, agg] of ingredientMap) {
    if (!agg.manageStock) continue; // Skip if stock not managed

    const required = parseFloat(agg.totalRequired.toFixed(3));
    const available = parseFloat(agg.currentStock.toFixed(3));

    if (available < required) {
      shortages.push({
        inventoryItemId: agg.inventoryItemId,
        name: agg.inventoryItemName,
        required,
        available,
        shortage: parseFloat((required - available).toFixed(3)),
        unit: agg.unit
      });
    } else {
      deductions.push({
        ...agg,
        totalRequired: required
      });
    }
  }

  // ── 5. If shortages, return error ──
  if (shortages.length > 0) {
    return {
      success: false,
      message: `Insufficient stock for ${shortages.length} ingredient(s).`,
      shortages,
      deductions: [],
      dishUsages: []
    };
  }

  // ── 6. If dry run, return preview only ──
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: `DRY RUN: Would deduct ${deductions.length} ingredient(s) for booking #${bookingId}`,
      deductions: deductions.map(d => ({
        inventoryItemId: d.inventoryItemId,
        name: d.inventoryItemName,
        quantity: d.totalRequired,
        unit: d.unit,
        costPerUnit: d.avgCostPrice,
        totalCost: parseFloat((d.totalRequired * d.avgCostPrice).toFixed(2)),
        usedInDishes: d.usedInDishes
      })),
      dishUsages: dishUsageList
    };
  }

  // ── 7. Execute Deduction (Transaction) ──
  const result = await prisma.$transaction(async (tx) => {
    const stockTransactions = [];
    const consumptions = [];
    const dishUsages = [];
    let totalDeductedCost = 0;

    // 7a. Deduct each ingredient
    for (const ded of deductions) {
      if (!ded.manageStock) continue;

      const qty = ded.totalRequired;
      const costPrice = ded.avgCostPrice;
      const totalCost = qty * costPrice;
      totalDeductedCost += totalCost;

      // Update inventory stock
      await tx.inventoryItem.update({
        where: { id: ded.inventoryItemId },
        data: {
          currentStock: {
            decrement: qty
          }
        }
      });

      // Create Stock Transaction (Ledger)
      const stockTx = await tx.stockTransaction.create({
        data: {
          inventoryId: ded.inventoryItemId,
          type: 'SALE',
          quantity: qty,
          costPrice: costPrice,
          notes: `Auto-deduct: Booking #${booking.bookingNo} | ${triggerSource}${referenceId ? ` #${referenceId}` : ''}`,
          referenceType: AUTO_DEDUCT_REF_TYPE,
          referenceId: referenceId || bookingId,
          bookingId: bookingId,
          userId: userId,
          branchId: booking.branchId,
          companyId: booking.companyId
        }
      });
      stockTransactions.push(stockTx);

      // Create Event Inventory Consumption
      const consumption = await tx.eventInventoryConsumption.create({
        data: {
          bookingId: bookingId,
          inventoryItemId: ded.inventoryItemId,
          plannedQuantity: qty,
          actualQuantity: qty,
          unit: ded.unit,
          unitId: ded.unitId,
          costPerUnit: costPrice,
          totalCost: totalCost,
          notes: `Auto-deducted via ${triggerSource}. Used in: ${ded.usedInDishes.map(u => u.menuItemName).join(', ')}`
        }
      });
      consumptions.push(consumption);
    }

    // 7b. Create Event Dish Usages (for tracking which dishes were made)
    for (const dish of dishUsageList) {
      const du = await tx.eventDishUsage.create({
        data: {
          bookingId: bookingId,
          menuItemId: dish.menuItemId,
          dishName: dish.dishName,
          plannedQuantity: dish.plannedQuantity,
          actualQuantity: dish.actualQuantity,
          unit: dish.unit,
          unitId: dish.unitId,
          costPerUnit: dish.costPerUnit,
          totalCost: dish.actualQuantity * dish.costPerUnit,
          notes: `Auto-tracked via ${triggerSource}`
        }
      });
      dishUsages.push(du);
    }

    // 7c. Update EventExecution if exists
    const eventExecution = await tx.eventExecution.findUnique({
      where: { bookingId }
    });

    if (eventExecution) {
      const currentInventoryCost = parseFloat(eventExecution.inventoryCost) || 0;
      const newInventoryCost = currentInventoryCost + totalDeductedCost;
      const currentTotalCost = parseFloat(eventExecution.totalCost) || 0;

      await tx.eventExecution.update({
        where: { bookingId },
        data: {
          inventoryCost: newInventoryCost,
          totalCost: currentTotalCost + totalDeductedCost,
          profit: parseFloat(eventExecution.netRevenue || 0) - (currentTotalCost + totalDeductedCost)
        }
      });
    }

    return {
      stockTransactions,
      consumptions,
      dishUsages,
      totalDeductedCost: parseFloat(totalDeductedCost.toFixed(2)),
      totalIngredients: deductions.length
    };
  }, {
    // Transaction options for safety
    maxWait: 5000,
    timeout: 10000
  });

  return {
    success: true,
    message: `Inventory auto-deducted successfully for booking #${booking.bookingNo}. ` +
             `${result.totalIngredients} ingredient(s) deducted. ` +
             `Total cost: ${result.totalDeductedCost}`,
    bookingId,
    bookingNo: booking.bookingNo,
    ...result
  };
};

// ═══════════════════════════════════════════════════════════
// ROLLBACK FUNCTION: Reverse auto-deduction for a booking
// ═══════════════════════════════════════════════════════════

/**
 * Rollback all auto-deducted inventory for a booking
 * Useful when: booking cancelled, event postponed, wrong deduction
 */
const rollbackInventoryDeduction = async (bookingId, options = {}) => {
  const { userId = 1, branchId } = options;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, bookingNo: true, branchId: true, companyId: true }
  });

  if (!booking) {
    throw new Error(`Booking #${bookingId} not found`);
  }

  if (branchId && booking.branchId !== branchId) {
    throw new Error('Access denied.');
  }

  // Find all auto-deduct stock transactions
  const autoTxns = await prisma.stockTransaction.findMany({
    where: {
      bookingId,
      referenceType: AUTO_DEDUCT_REF_TYPE
    }
  });

  if (autoTxns.length === 0) {
    return {
      success: false,
      message: 'No auto-deduction found to rollback for this booking.'
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const restored = [];

    for (const txn of autoTxns) {
      // Restore stock
      await tx.inventoryItem.update({
        where: { id: txn.inventoryId },
        data: {
          currentStock: {
            increment: txn.quantity
          }
        }
      });

      // Create reversal transaction
      await tx.stockTransaction.create({
        data: {
          inventoryId: txn.inventoryId,
          type: 'ADJUSTMENT',
          quantity: txn.quantity,
          costPrice: txn.costPrice,
          notes: `ROLLBACK: Reversed auto-deduct for Booking #${booking.bookingNo}`,
          referenceType: 'AUTO_RECIPE_ROLLBACK',
          referenceId: txn.id,
          bookingId,
          userId,
          branchId: booking.branchId,
          companyId: booking.companyId
        }
      });

      restored.push({
        inventoryItemId: txn.inventoryId,
        quantityRestored: txn.quantity
      });
    }

    // Delete auto-created EventInventoryConsumption records
    await tx.eventInventoryConsumption.deleteMany({
      where: {
        bookingId,
        notes: { contains: 'Auto-deducted' }
      }
    });

    // Delete auto-created EventDishUsage records
    await tx.eventDishUsage.deleteMany({
      where: {
        bookingId,
        notes: { contains: 'Auto-tracked' }
      }
    });

    // Delete original auto-deduct transactions
    await tx.stockTransaction.deleteMany({
      where: {
        bookingId,
        referenceType: AUTO_DEDUCT_REF_TYPE
      }
    });

    return restored;
  });

  return {
    success: true,
    message: `Rollback completed. ${result.length} item(s) restored to inventory.`,
    restoredItems: result
  };
};

// ═══════════════════════════════════════════════════════════
// PREVIEW FUNCTION: See what would be deducted (no changes)
// ═══════════════════════════════════════════════════════════

const previewDeduction = async (bookingId, options = {}) => {
  return await deductInventoryForBooking(bookingId, {
    ...options,
    dryRun: true
  });
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  deductInventoryForBooking,
  rollbackInventoryDeduction,
  previewDeduction,
  AUTO_DEDUCT_REF_TYPE
};