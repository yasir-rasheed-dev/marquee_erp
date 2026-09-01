// services/menuApi.js
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
  // ── GET ALL MENUS ──
  getAll: (params = {}) => {
    try {
      const { branchId } = getTenantContext();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      return apiClient.get('/menus', { params: finalParams });
    } catch (e) {
      return apiClient.get('/menus', { params });
    }
  },
  
  // ── GET MENU BY ID ──
  getById: (id) => apiClient.get(`/menus/${id}`),

  // ── CREATE MENU (Auto appends branchId and companyId) ──
  create: (data) => {
    const { branchId, companyId } = getTenantContext();
    const payload = {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    };
    console.log('🔍 menuApi.create - payload:', payload);
    return apiClient.post('/menus', payload);
  },

  // ── UPDATE MENU (Auto appends branchId and companyId) ──
  update: (id, data) => {
    const { branchId, companyId } = getTenantContext();
    const payload = {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    };
    console.log('🔍 menuApi.update - payload:', payload);
    return apiClient.put(`/menus/${id}`, payload);
  },

  // ── DELETE MENU ──
  delete: (id) => apiClient.delete(`/menus/${id}`),

  // ── GET MENUS BY BRANCH ──
  getByBranch: (branchId) => apiClient.get(`/menus/branch/${branchId}`)
};