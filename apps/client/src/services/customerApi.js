// ═══════════════════════════════════════════════════════════
// services/customerApi.js
// CUSTOMER API CLIENT — Following Category API Structure
// ═══════════════════════════════════════════════════════════

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
  // ── GET ALL CUSTOMERS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 customerApi.getAll - params:', finalParams);
      return apiClient.get('/customers', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ customerApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ customerApi error:', e);
      return apiClient.get('/customers', { params });
    }
  },
  
  getById: (id) => apiClient.get(`/customers/${id}`),

  // ── CREATE CUSTOMER ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('📝 customerApi.create - data:', finalData);
    return apiClient.post('/customers', finalData);
  },

  // ── UPDATE CUSTOMER ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('✏️ customerApi.update - id:', id, 'data:', finalData);
    return apiClient.put(`/customers/${id}`, finalData);
  },

  // ── DELETE CUSTOMER ──
  delete: (id) => apiClient.delete(`/customers/${id}`),

  getByBranch: (branchId) => apiClient.get(`/customers/branch/${branchId}`)
};