// services/categoryApi.js
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
  // ── GET ALL CATEGORIES (Supports ?scope=menu|inventory|asset|pos|all) ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 categoryApi.getAll - params:', finalParams);
      return apiClient.get('/categories', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ categoryApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ categoryApi error:', e);
      return apiClient.get('/categories', { params });
    }
  },
  
  getById: (id) => apiClient.get(`/categories/${id}`),

  // ── CREATE CATEGORY (Supports scope field e.g. scope: 'MENU') ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    
    // ✅ Agar companyId NaN/undefined/null hai toh localStorage se lo
    const safeCompanyId = (data.companyId && !isNaN(data.companyId)) 
      ? data.companyId 
      : (branch?.companyId || branch?.company?.id || 1);
    
    const finalData = {
      scope: 'ALL', // Default scope fallback
      ...data,
      branchId: data.branchId || branchId,
      companyId: safeCompanyId
    };
    
    // ✅ DEBUG: Exact yeh dekh ke bhejo ke kya ja raha hai
    console.log('📝 categoryApi.create - FINAL payload:', JSON.stringify(finalData, null, 2));
    return apiClient.post('/categories', finalData);
  },

  // ── UPDATE CATEGORY ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('✏️ categoryApi.update - id:', id, 'data:', finalData);
    return apiClient.put(`/categories/${id}`, finalData);
  },

  // ── DELETE CATEGORY ──
  delete: (id) => apiClient.delete(`/categories/${id}`),

  getByBranch: (branchId) => apiClient.get(`/categories/branch/${branchId}`)
};