// services/stockTransferApi.js
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
  // ── GET ALL STOCK TRANSFERS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 stockTransferApi.getAll - params:', finalParams);
      return apiClient.get('/stock-transfers', { params: finalParams })
        .then(response => {
          console.log('✅ stockTransferApi.getAll - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ stockTransferApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ stockTransferApi error:', e);
      return apiClient.get('/stock-transfers', { params });
    }
  },
  
  // ── GET STOCK TRANSFER BY ID ──
  getById: (id) => {
    console.log('🔍 stockTransferApi.getById - id:', id);
    return apiClient.get(`/stock-transfers/${id}`);
  },

  // ── PURGE OLD TRANSFERS ──
  purge: (years = 3, params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { 
      years, 
      branchId: params.branchId || branchId, 
      ...params 
    };
    console.log('🗑️ stockTransferApi.purge - params:', finalParams);
    return apiClient.delete('/stock-transfers/purge', { params: finalParams });
  }
};