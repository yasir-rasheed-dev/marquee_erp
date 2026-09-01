// services/itemApi.js
import apiClient from './apiClient';

// Helper function to get branch and company details safely from localStorage
const getTenantContext = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return {
      branchId: branch?.id || user?.branchId || null,
      companyId: branch?.companyId || user?.companyId || null
    };
  } catch (e) {
    return { branchId: null, companyId: null };
  }
};

export default {
  // ── GET ALL ITEMS ──
  getAll: (params = {}) => {
    try {
      const { branchId } = getTenantContext();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      console.log('🔍 itemApi.getAll - params:', finalParams);
      return apiClient.get('/items', { params: finalParams });
    } catch (e) {
      console.error('❌ itemApi error:', e);
      return apiClient.get('/items', { params });
    }
  },
  
  // ── GET ITEM BY ID ──
  getById: (id) => apiClient.get(`/items/${id}`),

  // ── CREATE ITEM (Auto appends branchId and companyId) ──
  create: (data) => {
    const { branchId, companyId } = getTenantContext();
    const payload = {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    };
    console.log('🔍 itemApi.create - payload:', payload);
    return apiClient.post('/items', payload);
  },

  // ── UPDATE ITEM (Auto appends branchId and companyId) ──
  update: (id, data) => {
    const { branchId, companyId } = getTenantContext();
    const payload = {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    };
    console.log('🔍 itemApi.update - payload:', payload);
    return apiClient.put(`/items/${id}`, payload);
  },

  // ── DELETE ITEM ──
  delete: (id) => apiClient.delete(`/items/${id}`),

  // ── GET ITEMS BY BRANCH ──
  getByBranch: (branchId) => apiClient.get(`/items/branch/${branchId}`),

  // ── BULK CREATE ITEMS ──
  bulkCreate: (items) => {
    const { branchId, companyId } = getTenantContext();
    return apiClient.post('/items/bulk', { items, branchId, companyId });
  }
};