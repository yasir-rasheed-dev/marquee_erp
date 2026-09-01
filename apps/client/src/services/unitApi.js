// services/unitApi.js
import apiClient from './apiClient';

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
  // ── GET ALL UNITS (Supports ?scope=inventory|menu|asset|pos|all) ──
  getAll: (params = {}) => {
    try {
      const { branchId } = getTenantContext();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      console.log('🔍 unitApi.getAll - params:', finalParams);
      return apiClient.get('/units', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ unitApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ unitApi error:', e);
      return apiClient.get('/units', { params });
    }
  },

  getById: (id) => apiClient.get(`/units/${id}`),

  // ── CREATE UNIT (Supports scope, baseUnitId, conversionRate) ──
  create: (data) => {
    const { branchId, companyId } = getTenantContext();
    const finalData = {
      scope: 'ALL', // Default scope fallback
      type: 'BOTH', 
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    };
    console.log('📝 unitApi.create - data:', finalData);
    return apiClient.post('/units', finalData);
  },

  // ── UPDATE UNIT ──
  update: (id, data) => {
    const { branchId, companyId } = getTenantContext();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    };
    console.log('✏️ unitApi.update - id:', id, 'data:', finalData);
    return apiClient.put(`/units/${id}`, finalData);
  },

  // ── DELETE UNIT ──
  delete: (id) => {
    console.log('🗑️ unitApi.delete - id:', id);
    return apiClient.delete(`/units/${id}`);
  }
};