// services/taxRateApi.js
import apiClient from './apiClient';

const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

export default {
  // ── GET ALL TAX RATES ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 taxRateApi.getAll - params:', finalParams);
      return apiClient.get('/tax-rates', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ taxRateApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ taxRateApi error:', e);
      return apiClient.get('/tax-rates', { params });
    }
  },
  
  getById: (id) => apiClient.get(`/tax-rates/${id}`),

  // ── CREATE TAX RATE ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('📝 taxRateApi.create - data:', finalData);
    return apiClient.post('/tax-rates', finalData);
  },

  // ── UPDATE TAX RATE ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('✏️ taxRateApi.update - id:', id, 'data:', finalData);
    return apiClient.put(`/tax-rates/${id}`, finalData);
  },

  // ── DELETE TAX RATE ──
  delete: (id) => apiClient.delete(`/tax-rates/${id}`)
};