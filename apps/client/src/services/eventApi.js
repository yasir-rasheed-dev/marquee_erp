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
  getAll: (params = {}) => {
    const { branchId } = getTenantContext();
    return apiClient.get('/events', { 
      params: { ...params, branchId: params.branchId || branchId } 
    });
  },
  create: (data) => {
    const { branchId, companyId } = getTenantContext();
    return apiClient.post('/events', { ...data, branchId: data.branchId || branchId, companyId: data.companyId || companyId });
  },
  update: (id, data) => {
    const { branchId, companyId } = getTenantContext();
    return apiClient.put(`/events/${id}`, { ...data, branchId: data.branchId || branchId, companyId: data.companyId || companyId });
  },
  delete: (id) => apiClient.delete(`/events/${id}`)
};