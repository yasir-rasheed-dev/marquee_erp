// services/stockTransactionApi.js
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
  // ── GET ALL STOCK TRANSACTIONS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 stockTransactionApi.getAll - params:', finalParams);
      return apiClient.get('/stock-transactions', { params: finalParams })
        .then(response => {
          console.log('✅ stockTransactionApi.getAll - response:', response);
          return response;
        })
        .catch(error => {
          console.error('❌ stockTransactionApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ stockTransactionApi error:', e);
      return apiClient.get('/stock-transactions', { params });
    }
  },
  
  // ── GET STOCK TRANSACTION BY ID ──
  getById: (id) => {
    console.log('🔍 stockTransactionApi.getById - id:', id);
    return apiClient.get(`/stock-transactions/${id}`);
  },

  // ── PURGE OLD TRANSACTIONS ──
  purge: (years = 3, params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { 
      years, 
      branchId: params.branchId || branchId, 
      ...params 
    };
    console.log('🗑️ stockTransactionApi.purge - params:', finalParams);
    return apiClient.delete('/stock-transactions/purge', { params: finalParams });
  }
};