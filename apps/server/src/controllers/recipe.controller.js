const prisma = require('../config/database');

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.body?.branchId) return parseInt(req.body.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// ═══════════════════════════════════════════════════════════
// ITEM RECIPES (RecipeIngredient Model)
// Item (Dish) -> Inventory Items (Ingredients)
// ═══════════════════════════════════════════════════════════

// @desc    Get all recipe ingredients (STRICT Branch-Wise)
// @route   GET /api/recipes/ingredients
const getRecipeIngredients = async (req, res) => {
  console.log('📋 getRecipeIngredients called - query:', req.query);
  try {
    const { search, itemId } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = { 
      AND: [
        { item: { branchId, deletedAt: null } },
        { item: { isActive: true } }
      ] 
    };

    if (itemId) where.AND.push({ itemId: parseInt(itemId) });
    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search} },
          { item: { name: { contains: search} } }
        ]
      });
    }

    const ingredients = await prisma.recipeIngredient.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, code: true, unit: true, salePrice: true } },
        inventoryItem: { 
          select: { 
            id: true, name: true, code: true, unit: true, 
            currentStock: true, avgCostPrice: true, lastCostPrice: true 
          } 
        },
        unitRef: { select: { id: true, name: true, symbol: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ 
      success: true, 
      count: ingredients.length, 
      data: ingredients,
      branch: branchId
    });
  } catch (error) {
    console.error('getRecipeIngredients error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get complete recipe for an item with LIVE cost calculation
// @route   GET /api/recipes/item/:itemId
const getItemRecipe = async (req, res) => {
  console.log('🔥 getItemRecipe called - ID:', req.params.itemId, 'Branch:', req.query.branchId);
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { 
        id: true, name: true, code: true, branchId: true, 
        companyId: true, costPrice: true, salePrice: true, unit: true 
      }
    });

    if (!item || item.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Item not found or access denied.' });
    }

    const ingredients = await prisma.recipeIngredient.findMany({
      where: { itemId },
      include: {
        inventoryItem: { 
          select: { 
            id: true, name: true, code: true, unit: true, 
            currentStock: true, avgCostPrice: true, lastCostPrice: true, 
            isBoxEnabled: true, unitsPerBox: true 
          } 
        },
        unitRef: { select: { id: true, name: true, symbol: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // LIVE cost calculation — hamesha latest inventory price se
    let totalRecipeCost = 0;
    const enrichedIngredients = ingredients.map(ing => {
      const liveCostPerUnit = ing.inventoryItem?.avgCostPrice 
        ? parseFloat(ing.inventoryItem.avgCostPrice) 
        : parseFloat(ing.costPerUnit) || 0;
      const quantity = parseFloat(ing.quantity) || 0;
      const ingredientTotalCost = liveCostPerUnit * quantity;
      totalRecipeCost += ingredientTotalCost;

      return {
        ...ing,
        liveCostPerUnit: parseFloat(liveCostPerUnit.toFixed(2)),
        liveTotalCost: parseFloat(ingredientTotalCost.toFixed(2)),
        stockAvailable: ing.inventoryItem?.currentStock ? parseFloat(ing.inventoryItem.currentStock) : 0
      };
    });

    const salePrice = parseFloat(item.salePrice) || 0;
    const profitMargin = salePrice > 0 
      ? parseFloat(((salePrice - totalRecipeCost) / salePrice * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        item,
        ingredients: enrichedIngredients,
        summary: {
          totalRecipeCost: parseFloat(totalRecipeCost.toFixed(2)),
          salePrice,
          profitMargin,
          profitAmount: parseFloat((salePrice - totalRecipeCost).toFixed(2)),
          ingredientCount: ingredients.length
        }
      }
    });
  } catch (error) {
    console.error('getItemRecipe error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Check stock availability for an item recipe
// @route   GET /api/recipes/item/:itemId/stock-check
const checkItemRecipeStock = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, branchId: true }
    });

    if (!item || item.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Item not found or access denied.' });
    }

    const ingredients = await prisma.recipeIngredient.findMany({
      where: { itemId },
      include: {
        inventoryItem: { 
          select: { id: true, name: true, currentStock: true, unit: true, isBoxEnabled: true, unitsPerBox: true } 
        }
      }
    });

    const stockCheck = ingredients.map(ing => {
      const requiredQty = parseFloat(ing.quantity) || 0;
      const availableQty = ing.inventoryItem ? parseFloat(ing.inventoryItem.currentStock) || 0 : 0;
      const isAvailable = availableQty >= requiredQty;
      const shortage = isAvailable ? 0 : parseFloat((requiredQty - availableQty).toFixed(3));

      return {
        ingredientName: ing.name,
        requiredQty,
        availableQty,
        unit: ing.unit,
        isAvailable,
        shortage,
        inventoryItem: ing.inventoryItem
      };
    });

    const allAvailable = stockCheck.every(item => item.isAvailable);

    res.status(200).json({
      success: true,
      data: {
        item,
        stockCheck,
        allAvailable,
        totalIngredients: ingredients.length,
        availableCount: stockCheck.filter(i => i.isAvailable).length
      }
    });
  } catch (error) {
    console.error('checkItemRecipeStock error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Add single ingredient to item recipe
// @route   POST /api/recipes/ingredients
const createRecipeIngredient = async (req, res) => {
  console.log('📝 createRecipeIngredient called - body:', req.body);
  try {
    const { itemId, inventoryItemId, name, unit, unitId, quantity, costPerUnit } = req.body;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (!itemId || !name?.trim() || !unit?.trim() || quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item ID, ingredient name, unit, and quantity are required.' 
      });
    }

    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) },
      select: { id: true, branchId: true, companyId: true }
    });

    if (!item || item.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Item not found or access denied.' });
    }

    let finalCostPerUnit = costPerUnit ? parseFloat(costPerUnit) : 0;

    // Agar inventory item linked hai to uski current cost fetch karo
    if (inventoryItemId) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: parseInt(inventoryItemId) },
        select: { id: true, branchId: true, name: true, avgCostPrice: true }
      });

      if (!inventoryItem || inventoryItem.branchId !== branchId) {
        return res.status(404).json({ success: false, message: 'Inventory item not found or access denied.' });
      }

      if (!finalCostPerUnit && inventoryItem.avgCostPrice) {
        finalCostPerUnit = parseFloat(inventoryItem.avgCostPrice);
      }
    }

    const ingredient = await prisma.recipeIngredient.create({
      data: {
        itemId: parseInt(itemId),
        inventoryItemId: inventoryItemId ? parseInt(inventoryItemId) : null,
        name: name.trim(),
        unit: unit.trim(),
        unitId: unitId ? parseInt(unitId) : null,
        quantity: parseFloat(quantity) || 0,
        costPerUnit: finalCostPerUnit
      },
      include: {
        item: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, currentStock: true, avgCostPrice: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Recipe ingredient added successfully', 
      data: ingredient 
    });
  } catch (error) {
    console.error('createRecipeIngredient error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update recipe ingredient
// @route   PUT /api/recipes/ingredients/:id
const updateRecipeIngredient = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ingredient ID' });
    }

    const existing = await prisma.recipeIngredient.findUnique({
      where: { id },
      include: { item: { select: { branchId: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Recipe ingredient not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.item.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This recipe belongs to another branch.' });
    }

    const { inventoryItemId, name, unit, unitId, quantity, costPerUnit } = req.body;

    const updated = await prisma.recipeIngredient.update({
      where: { id },
      data: {
        ...(inventoryItemId !== undefined && { inventoryItemId: inventoryItemId ? parseInt(inventoryItemId) : null }),
        ...(name !== undefined && { name: name.trim() }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(unitId !== undefined && { unitId: unitId ? parseInt(unitId) : null }),
        ...(quantity !== undefined && { quantity: parseFloat(quantity) || 0 }),
        ...(costPerUnit !== undefined && { costPerUnit: parseFloat(costPerUnit) || 0 })
      },
      include: {
        item: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true, name: true, currentStock: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ success: true, message: 'Recipe ingredient updated', data: updated });
  } catch (error) {
    console.error('updateRecipeIngredient error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete recipe ingredient
// @route   DELETE /api/recipes/ingredients/:id
const deleteRecipeIngredient = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ingredient ID' });
    }

    const existing = await prisma.recipeIngredient.findUnique({
      where: { id },
      include: { item: { select: { branchId: true } } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Recipe ingredient not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.item.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await prisma.recipeIngredient.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Recipe ingredient deleted successfully' });
  } catch (error) {
    console.error('deleteRecipeIngredient error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Bulk save complete recipe for an item (replace all ingredients)
// @route   POST /api/recipes/item/:itemId/bulk
const saveItemRecipeBulk = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, branchId: true, companyId: true }
    });

    if (!item || item.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Item not found or access denied.' });
    }

    const { ingredients } = req.body;

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ success: false, message: 'Ingredients array is required.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Purani recipe delete karo
      await tx.recipeIngredient.deleteMany({ where: { itemId } });

      // Naye ingredients create karo
      const created = [];
      let totalCost = 0;

      for (const ing of ingredients) {
        const qty = parseFloat(ing.quantity) || 0;
        const cost = ing.costPerUnit ? parseFloat(ing.costPerUnit) : 0;
        totalCost += qty * cost;

        const newIng = await tx.recipeIngredient.create({
          data: {
            itemId,
            inventoryItemId: ing.inventoryItemId ? parseInt(ing.inventoryItemId) : null,
            name: ing.name.trim(),
            unit: ing.unit.trim(),
            unitId: ing.unitId ? parseInt(ing.unitId) : null,
            quantity: qty,
            costPerUnit: cost
          }
        });
        created.push(newIng);
      }

      // Item ki cost price update karo
      await tx.item.update({
        where: { id: itemId },
        data: { costPrice: totalCost }
      });

      return { created, totalCost };
    });

    res.status(200).json({
      success: true,
      message: 'Recipe saved successfully',
      data: {
        itemId,
        ingredientCount: result.created.length,
        totalRecipeCost: result.totalCost
      }
    });
  } catch (error) {
    console.error('saveItemRecipeBulk error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// INVENTORY ITEM RECIPES / BOM (RecipeItem Model) - UNCHANGED
// ═══════════════════════════════════════════════════════════

// @desc    Get all BOM/recipes for inventory items
// @route   GET /api/recipes/bom
const getInventoryBOMs = async (req, res) => {
  try {
    const { dishId, search } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required.',
        data: [] 
      });
    }

    const where = { branchId };
    if (dishId) where.dishId = parseInt(dishId);
    if (search) {
      where.OR = [
        { dish: { name: { contains: search} } },
        { ingredient: { name: { contains: search} } }
      ];
    }

    const boms = await prisma.recipeItem.findMany({
      where,
      include: {
        dish: { select: { id: true, name: true, code: true, unit: true, currentStock: true } },
        ingredient: { select: { id: true, name: true, code: true, unit: true, currentStock: true, avgCostPrice: true } },
        unitRef: { select: { id: true, name: true, symbol: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ 
      success: true, 
      count: boms.length, 
      data: boms,
      branch: branchId
    });
  } catch (error) {
    console.error('getInventoryBOMs error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single BOM
// @route   GET /api/recipes/bom/:id
const getInventoryBOM = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid BOM ID' });
    }

    const bom = await prisma.recipeItem.findUnique({
      where: { id },
      include: {
        dish: { select: { id: true, name: true, code: true, unit: true, currentStock: true } },
        ingredient: { select: { id: true, name: true, code: true, unit: true, currentStock: true, avgCostPrice: true } },
        unitRef: { select: { id: true, name: true, symbol: true } }
      }
    });

    if (!bom) {
      return res.status(404).json({ success: false, message: 'BOM not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && bom.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data: bom });
  } catch (error) {
    console.error('getInventoryBOM error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get complete BOM for a dish with live cost
// @route   GET /api/recipes/bom/dish/:dishId
const getDishBOM = async (req, res) => {
  try {
    const dishId = parseInt(req.params.dishId);
    if (isNaN(dishId)) {
      return res.status(400).json({ success: false, message: 'Invalid dish ID' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    const dish = await prisma.inventoryItem.findUnique({
      where: { id: dishId },
      select: { id: true, name: true, code: true, branchId: true, currentStock: true, avgCostPrice: true }
    });

    if (!dish || dish.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Dish not found or access denied.' });
    }

    const ingredients = await prisma.recipeItem.findMany({
      where: { dishId },
      include: {
        ingredient: { 
          select: { 
            id: true, name: true, code: true, unit: true, 
            currentStock: true, avgCostPrice: true 
          } 
        },
        unitRef: { select: { id: true, name: true, symbol: true } }
      }
    });

    let totalCost = 0;
    const enriched = ingredients.map(ing => {
      const costPerUnit = parseFloat(ing.ingredient?.avgCostPrice) || 0;
      const qty = parseFloat(ing.quantity) || 0;
      const total = costPerUnit * qty;
      totalCost += total;
      return { 
        ...ing, 
        liveCostPerUnit: parseFloat(costPerUnit.toFixed(2)), 
        liveTotalCost: parseFloat(total.toFixed(2)) 
      };
    });

    res.status(200).json({
      success: true,
      data: {
        dish,
        ingredients: enriched,
        totalBOMCost: parseFloat(totalCost.toFixed(2)),
        ingredientCount: ingredients.length
      }
    });
  } catch (error) {
    console.error('getDishBOM error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create BOM item
// @route   POST /api/recipes/bom
const createInventoryBOM = async (req, res) => {
  try {
    const { dishId, ingredientId, quantity, unit, unitId } = req.body;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (!dishId || !ingredientId || quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dish ID, ingredient ID, and quantity are required.' 
      });
    }

    const [dish, ingredient] = await Promise.all([
      prisma.inventoryItem.findUnique({ 
        where: { id: parseInt(dishId) }, 
        select: { id: true, branchId: true, companyId: true } 
      }),
      prisma.inventoryItem.findUnique({ 
        where: { id: parseInt(ingredientId) }, 
        select: { id: true, branchId: true } 
      })
    ]);

    if (!dish || dish.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Dish item not found or access denied.' });
    }
    if (!ingredient || ingredient.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Ingredient item not found or access denied.' });
    }

    const existing = await prisma.recipeItem.findUnique({
      where: { dishId_ingredientId: { dishId: parseInt(dishId), ingredientId: parseInt(ingredientId) } }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'This ingredient already exists in the recipe.' });
    }

    const bom = await prisma.recipeItem.create({
      data: {
        dishId: parseInt(dishId),
        ingredientId: parseInt(ingredientId),
        quantity: parseFloat(quantity) || 0,
        unit: unit?.trim() || '',
        unitId: unitId ? parseInt(unitId) : null,
        branchId,
        companyId: dish.companyId
      },
      include: {
        dish: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true, currentStock: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, message: 'BOM created successfully', data: bom });
  } catch (error) {
    console.error('createInventoryBOM error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update BOM
// @route   PUT /api/recipes/bom/:id
const updateInventoryBOM = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid BOM ID' });
    }

    const existing = await prisma.recipeItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'BOM not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { quantity, unit, unitId } = req.body;

    const updated = await prisma.recipeItem.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity: parseFloat(quantity) || 0 }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(unitId !== undefined && { unitId: unitId ? parseInt(unitId) : null })
      },
      include: {
        dish: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true, currentStock: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ success: true, message: 'BOM updated', data: updated });
  } catch (error) {
    console.error('updateInventoryBOM error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete BOM
// @route   DELETE /api/recipes/bom/:id
const deleteInventoryBOM = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid BOM ID' });
    }

    const existing = await prisma.recipeItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'BOM not found' });
    }

    const branchId = getBranchId(req);
    if (branchId && existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await prisma.recipeItem.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'BOM deleted successfully' });
  } catch (error) {
    console.error('deleteInventoryBOM error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  // Item Recipes (New)
  getRecipeIngredients,
  getItemRecipe,
  checkItemRecipeStock,
  createRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
  saveItemRecipeBulk,
  // Inventory BOM (Unchanged)
  getInventoryBOMs,
  getInventoryBOM,
  getDishBOM,
  createInventoryBOM,
  updateInventoryBOM,
  deleteInventoryBOM
};