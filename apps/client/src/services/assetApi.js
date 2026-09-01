import apiClient from './apiClient'; // Aapka base axios client

// ── Helper: Get selected branch ID safely from localStorage ──
const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

export default {
  // ── GET ALL ASSETS (Automatically appends branchId) ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 assetApi.getAll - params:', finalParams);
      return apiClient.get('/assets', { params: finalParams })
        .then(response => {
          console.log('✅ assetApi.getAll - response:', response);
          return response.data || response;
        })
        .catch(error => {
          console.error('❌ assetApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ assetApi error:', e);
      return apiClient.get('/assets', { params });
    }
  },
  
  // ── GET ASSET BY ID ──
  getById: (id) => apiClient.get(`/assets/${id}`).then(res => res.data || res),

  // ── CREATE ASSET (Automatically appends branchId if missing) ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('📝 assetApi.create - data:', finalData);
    return apiClient.post('/assets', finalData).then(res => res.data || res);
  },

  // ── UPDATE ASSET ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('✏️ assetApi.update - id:', id, 'data:', finalData);
    return apiClient.put(`/assets/${id}`, finalData).then(res => res.data || res);
  },

  // ── DELETE ASSET ──
  delete: (id) => apiClient.delete(`/assets/${id}`).then(res => res.data || res),

  // ── GET ASSETS BY SPECIFIC BRANCH ──
  getByBranch: (branchId) => apiClient.get(`/assets/branch/${branchId}`).then(res => res.data || res),

  // ── GET ASSET TRANSACTIONS / HISTORY ──
  getTransactions: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = {
      ...params,
      branchId: params.branchId || branchId
    };
    return apiClient.get('/assets/transactions', { params: finalParams }).then(res => res.data || res);
  },

  // ── CREATE ASSET TRANSACTION / ADJUSTMENT ──
  createTransaction: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('🔄 assetApi.createTransaction - data:', finalData);
    return apiClient.post('/assets/transaction', finalData).then(res => res.data || res);
  }
};