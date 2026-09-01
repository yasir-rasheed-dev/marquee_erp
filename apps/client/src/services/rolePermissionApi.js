// services/roleApi.js
import apiClient from './apiClient';

// ── Helpers ──
const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

const getCompanyId = () => {
  try {
    const company = JSON.parse(localStorage.getItem('selectedCompany') || 'null');
    return company?.id || null;
  } catch (e) {
    return null;
  }
};

const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || null;
  } catch (e) {
    return null;
  }
};

export default {
  // ── GET ALL ROLES ──
  getRoles: (params = {}) => {
    const branchId = getSelectedBranchId();
    const companyId = getCompanyId();
    const finalParams = {
      ...params,
      branchId: params.branchId || branchId,
      companyId: params.companyId || companyId
    };
    return apiClient.get('/role-permissions/roles-list', { params: finalParams })
      .then(res => res.data || res);
  },

  // ── CREATE ROLE WITH PERMISSIONS ──
  createRoleWithPermissions: (data) => {
    const branchId = getSelectedBranchId();
    const companyId = getCompanyId();
    return apiClient.post('/role-permissions/roles/with-permissions', {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    }).then(res => res.data || res);
  },

  // ── GET ALL PERMISSIONS MATRIX ──
  getAllPermissions: (params = {}) => {
    const branchId = getSelectedBranchId();
    const companyId = getCompanyId();
    return apiClient.get('/role-permissions', {
      params: { ...params, branchId: params.branchId || branchId, companyId: params.companyId || companyId }
    }).then(res => res.data || res);
  },

  // ── GET MY PERMISSIONS (NEW — for current logged-in user) ──
  getMyPermissions: () => {
    return apiClient.get('/role-permissions/my-permissions').then(res => res.data || res);
  },

  // ── SAVE / UPDATE / DELETE PERMISSION ──
  savePermission: (data) => {
    const branchId = getSelectedBranchId();
    const companyId = getCompanyId();
    return apiClient.post('/role-permissions', {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    }).then(res => res.data || res);
  },

  updatePermission: (id, data) => {
    return apiClient.put(`/role-permissions/${id}`, data).then(res => res.data || res);
  },

  deletePermission: (id) => {
    return apiClient.delete(`/role-permissions/${id}`).then(res => res.data || res);
  },

  // ── ASSIGNMENTS ──
  getAssignments: (params = {}) => {
    const branchId = getSelectedBranchId();
    const companyId = getCompanyId();
    return apiClient.get('/role-permissions/assignments', {
      params: { ...params, branchId: params.branchId || branchId, companyId: params.companyId || companyId }
    }).then(res => res.data || res);
  },

  assignRole: (userId, roleId, branchId = null) => {
    return apiClient.post('/role-permissions/assign', {
      userId,
      roleId,
      companyId: getCompanyId(),
      branchId: branchId || getSelectedBranchId()
    }).then(res => res.data || res);
  },

  removeAssignment: (assignmentId) => {
    return apiClient.delete(`/role-permissions/assign/${assignmentId}`).then(res => res.data || res);
  }
};