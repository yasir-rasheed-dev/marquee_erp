// services/productionPlanApi.js
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
  // ── GET ALL PRODUCTION PLANS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      console.log('🔍 productionPlanApi.getAll - params:', finalParams);
      return apiClient.get('/production-plans', { params: finalParams })
        .then(response => {
          console.log('✅ productionPlanApi.getAll - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.get('/production-plans', { params });
    }
  },

  // ── GET SINGLE PRODUCTION PLAN BY ID ──
  getById: (id) => {
    try {
      console.log('🔍 productionPlanApi.getById - id:', id);
      return apiClient.get(`/production-plans/${id}`)
        .then(response => {
          console.log('✅ productionPlanApi.getById - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.getById - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.get(`/production-plans/${id}`);
    }
  },

  // ── 🔥 FIXED: CREATE PRODUCTION PLAN ──
  create: (data) => {
    try {
      const branchId = getSelectedBranchId();
      
      // 🔥 CRITICAL FIX: Map frontend field names to backend expected names
      const payload = {
        bookingId: parseInt(data.bookingId),
        planDate: data.planDate,
        notes: data.notes || '',
        status: data.status || 'planned',
        // ✅ Backend expects 'autoFillRecipes', NOT 'autoGenerateItems'
        autoFillRecipes: data.autoGenerateItems !== undefined ? data.autoGenerateItems : true,
        items: data.items || [],
        branchId: data.branchId || branchId
      };
      
      console.log('📝 productionPlanApi.create - payload:', payload);
      return apiClient.post('/production-plans', payload)
        .then(response => {
          console.log('✅ productionPlanApi.create - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.create - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.post('/production-plans', data);
    }
  },

  // ── UPDATE PRODUCTION PLAN ──
  update: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ productionPlanApi.update - id:', id, 'data:', finalData);
      return apiClient.put(`/production-plans/${id}`, finalData)
        .then(response => {
          console.log('✅ productionPlanApi.update - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.update - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.put(`/production-plans/${id}`, data);
    }
  },

  // ── DELETE PRODUCTION PLAN ──
  delete: (id) => {
    try {
      console.log('🗑️ productionPlanApi.delete - id:', id);
      return apiClient.delete(`/production-plans/${id}`)
        .then(response => {
          console.log('✅ productionPlanApi.delete - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.delete - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.delete(`/production-plans/${id}`);
    }
  },

  // ── GET PLAN ITEMS ──
  getItems: (id) => {
    try {
      console.log('🔍 productionPlanApi.getItems - id:', id);
      return apiClient.get(`/production-plans/${id}/items`)
        .then(response => {
          console.log('✅ productionPlanApi.getItems - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.getItems - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.get(`/production-plans/${id}/items`);
    }
  },

  // ── ADD ITEM TO PLAN ──
  addItem: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 productionPlanApi.addItem - id:', id, 'data:', finalData);
      return apiClient.post(`/production-plans/${id}/items`, finalData)
        .then(response => {
          console.log('✅ productionPlanApi.addItem - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.addItem - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.post(`/production-plans/${id}/items`, data);
    }
  },

  // ── UPDATE PLAN ITEM ──
  updateItem: (itemId, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ productionPlanApi.updateItem - itemId:', itemId, 'data:', finalData);
      return apiClient.put(`/production-plans/items/${itemId}`, finalData)
        .then(response => {
          console.log('✅ productionPlanApi.updateItem - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.updateItem - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.put(`/production-plans/items/${itemId}`, data);
    }
  },

  // ── DELETE PLAN ITEM ──
  deleteItem: (itemId) => {
    try {
      console.log('🗑️ productionPlanApi.deleteItem - itemId:', itemId);
      return apiClient.delete(`/production-plans/items/${itemId}`)
        .then(response => {
          console.log('✅ productionPlanApi.deleteItem - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.deleteItem - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.delete(`/production-plans/items/${itemId}`);
    }
  },

  // ── EXECUTE PRODUCTION PLAN (Stock Deduct + History) ──
  execute: (id, payload = {}) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('▶️ productionPlanApi.execute - id:', id, 'branchId:', branchId, 'payload:', payload);
      return apiClient.post(`/production-plans/${id}/execute`, { branchId, ...payload })
        .then(response => {
          console.log('✅ productionPlanApi.execute - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.execute - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.post(`/production-plans/${id}/execute`, { ...payload });
    }
  },

  // ── GET STOCK TRANSACTION HISTORY FOR A PLAN ──
  getHistory: (id) => {
    try {
      console.log('🔍 productionPlanApi.getHistory - id:', id);
      return apiClient.get(`/production-plans/${id}/history`)
        .then(response => {
          console.log('✅ productionPlanApi.getHistory - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.getHistory - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.get(`/production-plans/${id}/history`);
    }
  },

  // ── PREVIEW INVENTORY IMPACT BEFORE EXECUTING ──
  preview: (id) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 productionPlanApi.preview - id:', id, 'branchId:', branchId);
      return apiClient.get(`/production-plans/${id}/preview`, { params: { branchId } })
        .then(response => {
          console.log('✅ productionPlanApi.preview - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ productionPlanApi.preview - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ productionPlanApi error:', e);
      return apiClient.get(`/production-plans/${id}/preview`);
    }
  }
};