// services/recipeApi.js
import apiClient from './apiClient';

// Helper function to get selected branch ID safely
const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

export default {
  // ═══════════════════════════════════════════════════════════
  // ITEM RECIPES (RecipeIngredient) — Item -> Inventory Items
  // ═══════════════════════════════════════════════════════════

  // ── GET ALL RECIPE INGREDIENTS ──
  getIngredients: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      console.log('🔍 recipeApi.getIngredients - params:', finalParams);
      return apiClient.get('/recipes/ingredients', { params: finalParams })
        .then(response => {
          console.log('✅ recipeApi.getIngredients - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.getIngredients - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.get('/recipes/ingredients', { params });
    }
  },

  // ── GET COMPLETE RECIPE FOR AN ITEM (with LIVE cost) ──
  getItemRecipe: (itemId) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 recipeApi.getItemRecipe - itemId:', itemId);
      return apiClient.get(`/recipes/item/${itemId}`, { params: { branchId } })
        .then(response => {
          console.log('✅ recipeApi.getItemRecipe - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.getItemRecipe - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.get(`/recipes/item/${itemId}`);
    }
  },

  // ── CHECK STOCK AVAILABILITY FOR AN ITEM RECIPE ──
  checkItemStock: (itemId) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 recipeApi.checkItemStock - itemId:', itemId);
      return apiClient.get(`/recipes/item/${itemId}/stock-check`, { params: { branchId } })
        .then(response => {
          console.log('✅ recipeApi.checkItemStock - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.checkItemStock - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.get(`/recipes/item/${itemId}/stock-check`);
    }
  },

  // ── ADD SINGLE INGREDIENT TO ITEM RECIPE ──
  addIngredient: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 recipeApi.addIngredient - data:', finalData);
      return apiClient.post('/recipes/ingredients', finalData)
        .then(response => {
          console.log('✅ recipeApi.addIngredient - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.addIngredient - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.post('/recipes/ingredients', data);
    }
  },

  // ── UPDATE RECIPE INGREDIENT ──
  updateIngredient: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ recipeApi.updateIngredient - id:', id, 'data:', finalData);
      return apiClient.put(`/recipes/ingredients/${id}`, finalData)
        .then(response => {
          console.log('✅ recipeApi.updateIngredient - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.updateIngredient - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.put(`/recipes/ingredients/${id}`, data);
    }
  },

  // ── DELETE RECIPE INGREDIENT ──
  deleteIngredient: (id) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🗑️ recipeApi.deleteIngredient - id:', id);
      return apiClient.delete(`/recipes/ingredients/${id}`, { params: { branchId } })
        .then(response => {
          console.log('✅ recipeApi.deleteIngredient - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.deleteIngredient - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.delete(`/recipes/ingredients/${id}`);
    }
  },

  // ── BULK SAVE COMPLETE RECIPE FOR AN ITEM ──
  saveBulkRecipe: (itemId, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 recipeApi.saveBulkRecipe - itemId:', itemId, 'data:', finalData);
      return apiClient.post(`/recipes/item/${itemId}/bulk`, finalData)
        .then(response => {
          console.log('✅ recipeApi.saveBulkRecipe - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.saveBulkRecipe - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.post(`/recipes/item/${itemId}/bulk`, data);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // INVENTORY BOM (RecipeItem) — Inventory Item -> Inventory Items
  // ═══════════════════════════════════════════════════════════

  // ── GET ALL INVENTORY BOMs ──
  getBOMs: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      console.log('🔍 recipeApi.getBOMs - params:', finalParams);
      return apiClient.get('/recipes/bom', { params: finalParams })
        .then(response => {
          console.log('✅ recipeApi.getBOMs - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.getBOMs - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.get('/recipes/bom', { params });
    }
  },

  // ── GET COMPLETE BOM FOR A DISH (with LIVE cost) ──
  getDishBOM: (dishId) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 recipeApi.getDishBOM - dishId:', dishId);
      return apiClient.get(`/recipes/bom/dish/${dishId}`, { params: { branchId } })
        .then(response => {
          console.log('✅ recipeApi.getDishBOM - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.getDishBOM - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.get(`/recipes/bom/dish/${dishId}`);
    }
  },

  // ── GET SINGLE BOM BY ID ──
  getBOM: (id) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 recipeApi.getBOM - id:', id);
      return apiClient.get(`/recipes/bom/${id}`, { params: { branchId } })
        .then(response => {
          console.log('✅ recipeApi.getBOM - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.getBOM - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.get(`/recipes/bom/${id}`);
    }
  },

  // ── CREATE BOM ──
  createBOM: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 recipeApi.createBOM - data:', finalData);
      return apiClient.post('/recipes/bom', finalData)
        .then(response => {
          console.log('✅ recipeApi.createBOM - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.createBOM - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.post('/recipes/bom', data);
    }
  },

  // ── UPDATE BOM ──
  updateBOM: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ recipeApi.updateBOM - id:', id, 'data:', finalData);
      return apiClient.put(`/recipes/bom/${id}`, finalData)
        .then(response => {
          console.log('✅ recipeApi.updateBOM - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.updateBOM - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.put(`/recipes/bom/${id}`, data);
    }
  },

  // ── DELETE BOM ──
  deleteBOM: (id) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🗑️ recipeApi.deleteBOM - id:', id);
      return apiClient.delete(`/recipes/bom/${id}`, { params: { branchId } })
        .then(response => {
          console.log('✅ recipeApi.deleteBOM - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ recipeApi.deleteBOM - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ recipeApi error:', e);
      return apiClient.delete(`/recipes/bom/${id}`);
    }
  }
};