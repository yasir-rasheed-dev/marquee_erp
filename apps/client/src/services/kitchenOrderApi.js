// services/kitchenOrderApi.js
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
  // ── GET ALL KITCHEN ORDERS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      console.log('🔍 kitchenOrderApi.getAll - params:', finalParams);
      return apiClient.get('/kitchen-orders', { params: finalParams })
        .then(response => {
          console.log('✅ kitchenOrderApi.getAll - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.get('/kitchen-orders', { params });
    }
  },

  // ── GET SINGLE KITCHEN ORDER BY ID ──
  getById: (id) => {
    try {
      console.log('🔍 kitchenOrderApi.getById - id:', id);
      return apiClient.get(`/kitchen-orders/${id}`)
        .then(response => {
          console.log('✅ kitchenOrderApi.getById - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.getById - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.get(`/kitchen-orders/${id}`);
    }
  },

  // ── CREATE KITCHEN ORDER ──
  create: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 kitchenOrderApi.create - data:', finalData);
      return apiClient.post('/kitchen-orders', finalData)
        .then(response => {
          console.log('✅ kitchenOrderApi.create - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.create - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.post('/kitchen-orders', data);
    }
  },

  // ── UPDATE KITCHEN ORDER ──
  update: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ kitchenOrderApi.update - id:', id, 'data:', finalData);
      return apiClient.put(`/kitchen-orders/${id}`, finalData)
        .then(response => {
          console.log('✅ kitchenOrderApi.update - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.update - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.put(`/kitchen-orders/${id}`, data);
    }
  },

  // ── DELETE KITCHEN ORDER ──
  delete: (id) => {
    try {
      console.log('🗑️ kitchenOrderApi.delete - id:', id);
      return apiClient.delete(`/kitchen-orders/${id}`)
        .then(response => {
          console.log('✅ kitchenOrderApi.delete - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.delete - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.delete(`/kitchen-orders/${id}`);
    }
  },

  // ── GET ORDER ITEMS ──
  getItems: (id) => {
    try {
      console.log('🔍 kitchenOrderApi.getItems - id:', id);
      return apiClient.get(`/kitchen-orders/${id}/items`)
        .then(response => {
          console.log('✅ kitchenOrderApi.getItems - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.getItems - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.get(`/kitchen-orders/${id}/items`);
    }
  },

  // ── ADD ITEM TO ORDER ──
  addItem: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 kitchenOrderApi.addItem - id:', id, 'data:', finalData);
      return apiClient.post(`/kitchen-orders/${id}/items`, finalData)
        .then(response => {
          console.log('✅ kitchenOrderApi.addItem - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.addItem - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.post(`/kitchen-orders/${id}/items`, data);
    }
  },

  // ── UPDATE ORDER ITEM ──
  updateItem: (itemId, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ kitchenOrderApi.updateItem - itemId:', itemId, 'data:', finalData);
      return apiClient.put(`/kitchen-orders/items/${itemId}`, finalData)
        .then(response => {
          console.log('✅ kitchenOrderApi.updateItem - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.updateItem - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.put(`/kitchen-orders/items/${itemId}`, data);
    }
  },

  // ── DELETE ORDER ITEM ──
  deleteItem: (itemId) => {
    try {
      console.log('🗑️ kitchenOrderApi.deleteItem - itemId:', itemId);
      return apiClient.delete(`/kitchen-orders/items/${itemId}`)
        .then(response => {
          console.log('✅ kitchenOrderApi.deleteItem - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.deleteItem - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.delete(`/kitchen-orders/items/${itemId}`);
    }
  },

  // ── EXECUTE / SERVE KITCHEN ORDER (Stock Deduct + History) ──
  execute: (id) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('▶️ kitchenOrderApi.execute - id:', id, 'branchId:', branchId);
      return apiClient.post(`/kitchen-orders/${id}/execute`, { branchId })
        .then(response => {
          console.log('✅ kitchenOrderApi.execute - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.execute - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.post(`/kitchen-orders/${id}/execute`, {});
    }
  },

  // ── GET STOCK TRANSACTION HISTORY FOR AN ORDER ──
  getHistory: (id) => {
    try {
      console.log('🔍 kitchenOrderApi.getHistory - id:', id);
      return apiClient.get(`/kitchen-orders/${id}/history`)
        .then(response => {
          console.log('✅ kitchenOrderApi.getHistory - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ kitchenOrderApi.getHistory - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ kitchenOrderApi error:', e);
      return apiClient.get(`/kitchen-orders/${id}/history`);
    }
  }
};