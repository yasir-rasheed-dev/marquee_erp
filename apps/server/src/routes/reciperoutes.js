// ═══════════════════════════════════════════════════════════
// routes/recipe.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  // ── Item Recipes (New - RecipeIngredient with Item) ──
  getRecipeIngredients,
  getItemRecipe,
  checkItemRecipeStock,
  createRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
  saveItemRecipeBulk,
  
  // ── Inventory BOM (RecipeItem) ──
  getInventoryBOMs,
  getInventoryBOM,
  getDishBOM,
  createInventoryBOM,
  updateInventoryBOM,
  deleteInventoryBOM
} = require('../controllers/recipe.controller');

const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── All routes require authentication ──
router.use(authMiddleware);

// ── Debug middleware (optional) ──
router.use((req, res, next) => {
  console.log(`📡 [RECIPE] ${req.method} ${req.originalUrl}`);
  next();
});

// ═══════════════════════════════════════════════════════════
// ITEM RECIPES (RecipeIngredient) — Item se Inventory Items ka relation
// ═══════════════════════════════════════════════════════════

// ── Static & specific routes first ──
router.get('/ingredients', getRecipeIngredients);                                    // GET /api/recipes/ingredients
router.post('/ingredients', authorize('admin', 'super_admin', 'manager'), createRecipeIngredient);  // POST /api/recipes/ingredients

router.put('/ingredients/:id', authorize('admin', 'super_admin', 'manager'), updateRecipeIngredient); // PUT /api/recipes/ingredients/:id
router.delete('/ingredients/:id', authorize('admin', 'super_admin'), deleteRecipeIngredient);       // DELETE /api/recipes/ingredients/:id

router.get('/item/:itemId/stock-check', checkItemRecipeStock);                       // GET /api/recipes/item/:itemId/stock-check
router.post('/item/:itemId/bulk', authorize('admin', 'super_admin', 'manager'), saveItemRecipeBulk); // POST /api/recipes/item/:itemId/bulk

// ── Dynamic routes last ──
router.get('/item/:itemId', getItemRecipe);                                          // GET /api/recipes/item/:itemId

// ═══════════════════════════════════════════════════════════
// INVENTORY BOM (RecipeItem) — Inventory Item se Inventory Items ka BOM
// ═══════════════════════════════════════════════════════════

// ── Static & specific routes first ──
router.get('/bom/dish/:dishId', getDishBOM);                                         // GET /api/recipes/bom/dish/:dishId

// ── Dynamic and CRUD routes ──
router.get('/bom', getInventoryBOMs);                                                // GET /api/recipes/bom
router.get('/bom/:id', getInventoryBOM);                                             // GET /api/recipes/bom/:id
router.post('/bom', authorize('admin', 'super_admin', 'manager'), createInventoryBOM); // POST /api/recipes/bom
router.put('/bom/:id', authorize('admin', 'super_admin', 'manager'), updateInventoryBOM); // PUT /api/recipes/bom/:id
router.delete('/bom/:id', authorize('admin', 'super_admin'), deleteInventoryBOM);    // DELETE /api/recipes/bom/:id

console.log('✅ recipe.routes.js - All routes registered');

module.exports = router;