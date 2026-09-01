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
  getAll: async (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    console.log('🔍 receiptSettingsApi.getAll - params:', finalParams);
    
    try {
      const res = await apiClient.get('/receipt-settings', { params: finalParams });
      // ✅ apiClient already unwrap kar chuka hai - res = {success, data, count}
      console.log('✅ receiptSettingsApi.getAll - response:', res);
      return res;
    } catch (err) {
      console.error('❌ receiptSettingsApi.getAll:', err);
      throw err;
    }
  },

  getById: async (id) => {
    const res = await apiClient.get(`/receipt-settings/${id}`);
    return res;
  },

  create: async (data) => {
    const branchId = getSelectedBranchId();
    const finalData = { ...data, branchId: data.branchId || branchId };
    console.log('📝 receiptSettingsApi.create - payload:', finalData);
    
    try {
      const res = await apiClient.post('/receipt-settings', finalData);
      console.log('✅ receiptSettingsApi.create - response:', res);
      return res;
    } catch (err) {
      console.error('❌ receiptSettingsApi.create ERROR:', err);
      
      // ✅ apiClient ne error alag format mein diya ho sakta hai
      const errorData = err?.data || err?.response?.data || err;
      const status = err?.status || err?.response?.status;
      
      console.log('❌ Error extracted:', { status, errorData });
      
      // 409 pe existing data return karo
      if (status === 409 || errorData?.existingId) {
        return {
          success: false,
          status: 409,
          isConflict: true,
          existingId: errorData?.existingId || errorData?.data?.id,
          data: errorData?.data,
          message: errorData?.message || 'Settings already exist'
        };
      }
      
      throw err;
    }
  },

  update: async (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = { ...data, branchId: data.branchId || branchId };
    console.log('✏️ receiptSettingsApi.update - id:', id, 'payload:', finalData);
    
    const res = await apiClient.put(`/receipt-settings/${id}`, finalData);
    return res;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/receipt-settings/${id}`);
    return res;
  },

  getByBranch: async (branchId) => {
    const res = await apiClient.get(`/receipt-settings/branch/${branchId}`);
    return res;
  }
};