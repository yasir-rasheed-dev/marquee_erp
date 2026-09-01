// services/eventExecutionApi.js
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
  // ── GET ALL EVENT EXECUTIONS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 eventExecutionApi.getAll - params:', finalParams);
      return apiClient.get('/event-executions', { params: finalParams })
        .then(response => {
          console.log('✅ eventExecutionApi.getAll - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ eventExecutionApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.get('/event-executions', { params });
    }
  },

  // ── GET SINGLE EVENT EXECUTION BY ID ──
  getById: (id) => {
    try {
      console.log('🔍 eventExecutionApi.getById - id:', id);
      return apiClient.get(`/event-executions/${id}`)
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.getById - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.get(`/event-executions/${id}`);
    }
  },

  // ── START EVENT EXECUTION ──
  create: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = {
        ...data,
        branchId: data.branchId || branchId
      };
      console.log('📝 eventExecutionApi.create - data:', finalData);
      return apiClient.post('/event-executions', finalData)
        .then(response => {
          console.log('✅ eventExecutionApi.create - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ eventExecutionApi.create - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.post('/event-executions', data);
    }
  },

  // ── FINALIZE EVENT (Calculate final cost & profit margins) ──
  finalize: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = {
        ...data,
        branchId: data.branchId || branchId
      };
      console.log('🏁 eventExecutionApi.finalize - id:', id, 'data:', finalData);
      return apiClient.put(`/event-executions/${id}/finalize`, finalData)
        .then(response => {
          console.log('✅ eventExecutionApi.finalize - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ eventExecutionApi.finalize - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.put(`/event-executions/${id}/finalize`, data);
    }
  },

  // ── COMPLETE A-to-Z EVENT REPORT & HISTORY ──
  getReport: (bookingId) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 eventExecutionApi.getReport - bookingId:', bookingId, 'branchId:', branchId);
      return apiClient.get(`/event-executions/report/${bookingId}`, { params: { branchId } })
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.getReport - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.get(`/event-executions/report/${bookingId}`);
    }
  },

  // ── DISH USAGE ("Kis degh me kya laga") ──
  getDishUsages: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      return apiClient.get('/event-executions/dish-usages', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.getDishUsages - error:', error);
          throw error;
        });
    } catch (e) {
      return apiClient.get('/event-executions/dish-usages', { params });
    }
  },

  recordDishUsage: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 eventExecutionApi.recordDishUsage - data:', finalData);
      return apiClient.post('/event-executions/dish-usages', finalData)
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.recordDishUsage - error:', error);
          throw error;
        });
    } catch (e) {
      return apiClient.post('/event-executions/dish-usages', data);
    }
  },

  // ── INVENTORY CONSUMPTION / AUTO STOCK DEDUCTION ("Bottle pack kahan use hua") ──
  getInventoryConsumptions: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      return apiClient.get('/event-executions/inventory-consumptions', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.getInventoryConsumptions - error:', error);
          throw error;
        });
    } catch (e) {
      return apiClient.get('/event-executions/inventory-consumptions', { params });
    }
  },

  recordInventoryConsumption: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 eventExecutionApi.recordInventoryConsumption - data:', finalData);
      return apiClient.post('/event-executions/inventory-consumptions', finalData)
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.recordInventoryConsumption - error:', error);
          throw error;
        });
    } catch (e) {
      return apiClient.post('/event-executions/inventory-consumptions', data);
    }
  },

  // ── DAMAGE & WASTAGE TRACKING ──
  getDamages: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      return apiClient.get('/event-executions/damages', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.getDamages - error:', error);
          throw error;
        });
    } catch (e) {
      return apiClient.get('/event-executions/damages', { params });
    }
  },

  recordDamage: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 eventExecutionApi.recordDamage - data:', finalData);
      return apiClient.post('/event-executions/damages', finalData)
        .then(response => response)
        .catch(error => {
          console.error('❌ eventExecutionApi.recordDamage - error:', error);
          throw error;
        });
    } catch (e) {
      return apiClient.post('/event-executions/damages', data);
    }
  },

  // ── PREVIEW INVENTORY DEDUCTION (Dry Run) ──
  previewInventoryDeduction: (bookingId) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔍 eventExecutionApi.previewInventoryDeduction - bookingId:', bookingId, 'branchId:', branchId);
      return apiClient.get(`/event-executions/preview/${bookingId}`, { params: { branchId } })
        .then(response => {
          console.log('✅ eventExecutionApi.previewInventoryDeduction - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ eventExecutionApi.previewInventoryDeduction - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.get(`/event-executions/preview/${bookingId}`);
    }
  },

  // ── ROLLBACK INVENTORY DEDUCTION ──
  rollbackInventoryDeduction: (bookingId) => {
    try {
      const branchId = getSelectedBranchId();
      console.log('🔄 eventExecutionApi.rollbackInventoryDeduction - bookingId:', bookingId, 'branchId:', branchId);
      return apiClient.post(`/event-executions/rollback/${bookingId}`, { branchId })
        .then(response => {
          console.log('✅ eventExecutionApi.rollbackInventoryDeduction - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ eventExecutionApi.rollbackInventoryDeduction - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ eventExecutionApi error:', e);
      return apiClient.post(`/event-executions/rollback/${bookingId}`);
    }
  }
};