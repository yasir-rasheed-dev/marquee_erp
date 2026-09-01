// ═══════════════════════════════════════════════════════════
// services/employeeApi.js
// EMPLOYEE API CLIENT — Departments | Designations | Employees
// ═══════════════════════════════════════════════════════════

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
  // ═══════════════════════════════════════════════════════════
  // DEPARTMENTS
  // ═══════════════════════════════════════════════════════════
  getAllDepartments: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/employee/departments', { params: finalParams });
  },
  createDepartment: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/employee/departments', { ...data, branchId: data.branchId || branchId });
  },
  updateDepartment: (id, data) => apiClient.put(`/employee/departments/${id}`, data),
  deleteDepartment: (id) => apiClient.delete(`/employee/departments/${id}`),

  // ═══════════════════════════════════════════════════════════
  // DESIGNATIONS
  // ═══════════════════════════════════════════════════════════
  getAllDesignations: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/employee/designations', { params: finalParams });
  },
  createDesignation: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/employee/designations', { ...data, branchId: data.branchId || branchId });
  },
  updateDesignation: (id, data) => apiClient.put(`/employee/designations/${id}`, data),
  deleteDesignation: (id) => apiClient.delete(`/employee/designations/${id}`),

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEES
  // ═══════════════════════════════════════════════════════════
  getAll: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/employee/employees', { params: finalParams });
  },
  getById: (id) => apiClient.get(`/employee/employees/${id}`),
  create: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/employee/employees', { ...data, branchId: data.branchId || branchId });
  },
  update: (id, data) => apiClient.put(`/employee/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/employee/employees/${id}`),

  // ═══════════════════════════════════════════════════════════
  // BRANCH-BASED SHORTCUTS
  // ═══════════════════════════════════════════════════════════
  getDepartmentsByBranch: (branchId) => apiClient.get(`/employee/branch/${branchId}/departments`),
  getDesignationsByBranch: (branchId) => apiClient.get(`/employee/branch/${branchId}/designations`),
  getByBranch: (branchId, params = {}) => apiClient.get(`/employee/branch/${branchId}/employees`, { params }),
};