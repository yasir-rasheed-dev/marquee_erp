// services/wastageLogApi.js
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
  // ── GET ALL WASTAGE LOGS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      console.log('🔍 wastageLogApi.getAll - params:', finalParams);
      return apiClient.get('/wastage-logs', { params: finalParams })
        .then(response => {
          console.log('✅ wastageLogApi.getAll - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ wastageLogApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ wastageLogApi error:', e);
      return apiClient.get('/wastage-logs', { params });
    }
  },

  // ── GET SINGLE WASTAGE LOG BY ID ──
  getById: (id) => {
    try {
      console.log('🔍 wastageLogApi.getById - id:', id);
      return apiClient.get(`/wastage-logs/${id}`)
        .then(response => {
          console.log('✅ wastageLogApi.getById - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ wastageLogApi.getById - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ wastageLogApi error:', e);
      return apiClient.get(`/wastage-logs/${id}`);
    }
  },

  // ── CREATE WASTAGE LOG (Auto Deduct Stock) ──
  create: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('📝 wastageLogApi.create - data:', finalData);
      return apiClient.post('/wastage-logs', finalData)
        .then(response => {
          console.log('✅ wastageLogApi.create - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ wastageLogApi.create - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ wastageLogApi error:', e);
      return apiClient.post('/wastage-logs', data);
    }
  },

  // ── UPDATE WASTAGE LOG ──
  update: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = { ...data, branchId: data.branchId || branchId };
      console.log('✏️ wastageLogApi.update - id:', id, 'data:', finalData);
      return apiClient.put(`/wastage-logs/${id}`, finalData)
        .then(response => {
          console.log('✅ wastageLogApi.update - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ wastageLogApi.update - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ wastageLogApi error:', e);
      return apiClient.put(`/wastage-logs/${id}`, data);
    }
  },

  // ── DELETE WASTAGE LOG ──
  delete: (id) => {
    try {
      console.log('🗑️ wastageLogApi.delete - id:', id);
      return apiClient.delete(`/wastage-logs/${id}`)
        .then(response => {
          console.log('✅ wastageLogApi.delete - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ wastageLogApi.delete - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ wastageLogApi error:', e);
      return apiClient.delete(`/wastage-logs/${id}`);
    }
  },

  // ── GET WASTAGE REPORT (Group by reason/inventory/date) ──
  getReport: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      console.log('📊 wastageLogApi.getReport - params:', finalParams);
      return apiClient.get('/wastage-logs/report', { params: finalParams })
        .then(response => {
          console.log('✅ wastageLogApi.getReport - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ wastageLogApi.getReport - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ wastageLogApi error:', e);
      return apiClient.get('/wastage-logs/report', { params });
    }
  }
};