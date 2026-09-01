// services/supplierApi.js
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
  // ── GET ALL SUPPLIERS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      return apiClient.get('/suppliers', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ supplierApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ supplierApi error:', e);
      return apiClient.get('/suppliers', { params });
    }
  },
  
  // ── GET SINGLE SUPPLIER / LEDGER ──
  getById: (id) => {
    const branchId = getSelectedBranchId();
    return apiClient.get(`/suppliers/${id}`, {
      params: { branchId }
    });
  },

  // ── CREATE SUPPLIER ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      type: 'WHOLESALE',
      ...data,
      branchId: data.branchId || branchId
    };
    return apiClient.post('/suppliers', finalData);
  },

  // ── UPDATE SUPPLIER ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    return apiClient.put(`/suppliers/${id}`, finalData);
  },

  // ── DELETE SUPPLIER (Soft Delete) ──
  delete: (id) => {
    const branchId = getSelectedBranchId();
    return apiClient.delete(`/suppliers/${id}`, {
      params: { branchId }
    });
  },

  // ── GET SUPPLIERS BY SPECIFIC BRANCH ──
  getByBranch: (branchId) => apiClient.get(`/suppliers/branch/${branchId}`),

  // ── RECORD PAYMENT TO SUPPLIER (Pay Now Ledger Modal) ──
  recordPayment: (paymentData) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...paymentData,
      branchId: paymentData.branchId || branchId
    };
    return apiClient.post('/suppliers/payments', finalData);
  }
};