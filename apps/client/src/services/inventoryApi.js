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
  // ── GET ALL INVENTORY ITEMS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      return apiClient.get('/inventory', { params: finalParams }).then(res => res.data || res);
    } catch (e) {
      return apiClient.get('/inventory', { params }).then(res => res.data || res);
    }
  },

  // ── GET SINGLE ITEM BY ID ──
  getById: (id) => apiClient.get(`/inventory/${id}`).then(res => res.data || res),

  // ── CREATE INVENTORY ITEM (Supports boxes & toggles) ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = { ...data, branchId: data.branchId || branchId };
    return apiClient.post('/inventory', finalData).then(res => res.data || res);
  },

  // ── UPDATE INVENTORY ITEM ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = { ...data, branchId: data.branchId || branchId };
    return apiClient.put(`/inventory/${id}`, finalData).then(res => res.data || res);
  },

  // ── DELETE INVENTORY ITEM ──
  delete: (id) => apiClient.delete(`/inventory/${id}`).then(res => res.data || res),

  // ── PERFORM STOCK TRANSACTION (Purchase, Sale, Adjustment, etc.) ──
  doTransaction: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = { ...data, branchId: data.branchId || branchId };
    return apiClient.post('/inventory/transaction', finalData).then(res => res.data || res);
  },

  // ── GET ITEM COMPLETE JANAMKUNDLI / HISTORY ──
  getHistory: (id) => apiClient.get(`/inventory/${id}/history`).then(res => res.data || res)
};