// ═══════════════════════════════════════════════════════════
// services/inventoryDeduction.service.js
// AUTO INVENTORY DEDUCTION — Recipe (BOM) → Degh/Plate Math → Booking → Event
// Formula: Total Guests / conversionRate (e.g. 50) = Deghs × Recipe Qty (e.g. 12kg) = Raw Stock
// ═══════════════════════════════════════════════════════════

const prisma = require('../config/database');

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
 * @param {string} options.triggerSource - 'production_plan' | 'event_execution' | 'kitchen_order' | 'manual'
 * @param {number} options.referenceId - Reference entity ID
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

  // ── 1. Fetch Booking with menus, dishes, and custom items ──
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
                      item: {
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
      },
      customItems: true,
      bookingMenuItems: {
        include: {
          menuItem: {
            include: {
              item: {
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

  // ── 3. Load Recipes for Custom Items (if any) ──
  const customItemIds = (booking.customItems || [])
    .map(ci => ci.itemId)
    .filter(id => id && !isNaN(parseInt(id)));

  let customItemsWithRecipes = [];
  if (customItemIds.length > 0) {
    customItemsWithRecipes = await prisma.item.findMany({
      where: { id: { in: customItemIds } },
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
    });
  }

  // ── 4. Calculate all ingredients needed ──
  const ingredientMap = new Map(); // inventoryItemId → aggregated data
  const dishUsageList = []; // For EventDishUsage tracking
  const bookingGuestCount = Math.max(parseInt(booking.guestCount) || 100, 1);

  // Helper function to add ingredient to map
  const addIngredientToMap = (recipe, dishMultiplier, dishName, deghCount) => {
    if (!recipe.inventoryItemId || !recipe.inventoryItem) return;

    const inv = recipe.inventoryItem;
    const recipeQty = parseFloat(recipe.quantity) || 0;
    const totalQty = parseFloat((recipeQty * dishMultiplier).toFixed(3));

    if (totalQty <= 0) return;

    const key = inv.id;
    if (!ingredientMap.has(key)) {
      ingredientMap.set(key, {
        inventoryItemId: inv.id,
        inventoryItemName: inv.name,
        currentStock: parseFloat(inv.currentStock) || 0,
        avgCostPrice: parseFloat(inv.avgCostPrice) || parseFloat(recipe.costPerUnit) || 0,
        unit: recipe.unit || inv.unit || 'kg',
        unitId: recipe.unitId,
        manageStock: inv.manageStock,
        totalRequired: 0,
        usedInDishes: []
      });
    }

    const agg = ingredientMap.get(key);
    agg.totalRequired = parseFloat((agg.totalRequired + totalQty).toFixed(3));
    agg.usedInDishes.push({
      menuItemName: dishName,
      recipeQty,
      dishUnits: deghCount,
      lineTotal: totalQty
    });
  };

  // A) Process Standard Menus (from BookingMenu)
  for (const bookingMenu of booking.menus || []) {
    const menu = bookingMenu.menu;
    if (!menu) continue;

    for (const category of menu.categories || []) {
      for (const menuItem of category.items || []) {
        const dishItem = menuItem.item;
        const recipes = dishItem?.recipeIngredients || [];
        if (recipes.length === 0) continue;

        // ── Degh vs Plate conversion calculation ──
        // e.g. 50 plates in 1 Degh
        const conversionRate = parseFloat(menuItem.conversionRate || dishItem?.conversionRate) || 50;
        const isBulk = menuItem.isBulkUnit !== false && (
          (menuItem.unit && menuItem.unit.toLowerCase().includes('degh')) ||
          (dishItem?.unit && dishItem.unit.toLowerCase().includes('degh')) ||
          menuItem.isBulkUnit || dishItem?.isBulkUnit
        );

        const qtyPerHead = parseFloat(menuItem.quantityPerHead) || 1;
        const totalPlates = bookingGuestCount * qtyPerHead;
        // If bulk unit (Degh), totalDeghs = totalPlates / conversionRate (e.g. 100 / 50 = 2 Degh)
        const totalDeghs = isBulk ? parseFloat((totalPlates / conversionRate).toFixed(2)) : totalPlates;

        for (const recipe of recipes) {
          addIngredientToMap(recipe, totalDeghs, menuItem.name, totalDeghs);
        }

        dishUsageList.push({
          menuItemId: menuItem.id,
          dishName: menuItem.name,
          plannedQuantity: totalDeghs,
          actualQuantity: totalDeghs,
          unit: menuItem.unit || (isBulk ? 'Degh' : 'plate'),
          unitId: menuItem.unitId,
          costPerUnit: parseFloat(menuItem.costPrice || dishItem?.costPrice) || 0
        });
      }
    }
  }

  // B) Process Booking Custom Items
  for (const customItem of booking.customItems || []) {
    if (!customItem.itemId) continue;
    const dishItem = customItemsWithRecipes.find(i => i.id === customItem.itemId);
    if (!dishItem) continue;

    const recipes = dishItem.recipeIngredients || [];
    if (recipes.length === 0) continue;

    const conversionRate = parseFloat(dishItem.conversionRate) || 50;
    const isBulk = dishItem.isBulkUnit !== false && (
      (customItem.unit && customItem.unit.toLowerCase().includes('degh')) ||
      (dishItem.unit && dishItem.unit.toLowerCase().includes('degh')) ||
      dishItem.isBulkUnit
    );

    const orderedQty = parseFloat(customItem.quantity) || 1;
    let totalDeghs = orderedQty;

    // If unit is plates, convert to Deghs
    if (customItem.unit && (customItem.unit.toLowerCase().includes('plate') || customItem.unit.toLowerCase() === 'pcs')) {
      totalDeghs = parseFloat((orderedQty / conversionRate).toFixed(2));
    }

    for (const recipe of recipes) {
      addIngredientToMap(recipe, totalDeghs, customItem.itemName, totalDeghs);
    }

    dishUsageList.push({
      menuItemId: null,
      dishName: customItem.itemName,
      plannedQuantity: totalDeghs,
      actualQuantity: totalDeghs,
      unit: customItem.unit || (isBulk ? 'Degh' : 'plate'),
      unitId: null,
      costPerUnit: parseFloat(dishItem.costPrice) || 0
    });
  }

  // C) Process Direct BookingMenuItem (if populated)
  for (const bmi of booking.bookingMenuItems || []) {
    if (bmi.isDeducted) continue;
    const menuItem = bmi.menuItem;
    if (!menuItem) continue;
    const dishItem = menuItem.item;
    const recipes = dishItem?.recipeIngredients || [];
    if (recipes.length === 0) continue;

    const conversionRate = parseFloat(menuItem.conversionRate || dishItem?.conversionRate) || 50;
    const orderedQty = parseFloat(bmi.quantity) || 1;
    let totalDeghs = orderedQty;

    if (bmi.unit && (bmi.unit.toLowerCase().includes('plate') || bmi.unit.toLowerCase() === 'pcs')) {
      totalDeghs = parseFloat((orderedQty / conversionRate).toFixed(2));
    }

    for (const recipe of recipes) {
      addIngredientToMap(recipe, totalDeghs, menuItem.name, totalDeghs);
    }
  }

  // ── 5. Check stock availability ──
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

  // ── 6. If shortages, return error ──
  if (shortages.length > 0) {
    return {
      success: false,
      message: `Insufficient stock for ${shortages.length} ingredient(s).`,
      shortages,
      deductions: [],
      dishUsages: []
    };
  }

  // ── 7. If dry run, return preview only ──
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: `DRY RUN: Would deduct ${deductions.length} ingredient(s) for booking #${booking.bookingNo || bookingId}`,
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