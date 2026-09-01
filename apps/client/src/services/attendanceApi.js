// ═══════════════════════════════════════════════════════════
// services/attendanceApi.js
// ATTENDANCE API CLIENT — Attendance | Leaves | Leave Balances
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
  // ATTENDANCE
  // ═══════════════════════════════════════════════════════════
  getAll: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/attendance/attendance', { params: finalParams });
  },
  create: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/attendance/attendance', { ...data, branchId: data.branchId || branchId });
  },
  delete: (id) => apiClient.delete(`/attendance/attendance/${id}`),
  getSummary: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/attendance/attendance/summary', { params: finalParams });
  },

  // ═══════════════════════════════════════════════════════════
  // LEAVES
  // ═══════════════════════════════════════════════════════════
  getAllLeaves: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/attendance/leaves', { params: finalParams });
  },
  createLeave: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/attendance/leaves', { ...data, branchId: data.branchId || branchId });
  },
  approveLeave: (id) => apiClient.put(`/attendance/leaves/${id}/approve`),
  rejectLeave: (id, data = {}) => apiClient.put(`/attendance/leaves/${id}/reject`, data),
  deleteLeave: (id) => apiClient.delete(`/attendance/leaves/${id}`),

  // ═══════════════════════════════════════════════════════════
  // LEAVE BALANCE
  // ═══════════════════════════════════════════════════════════
  getLeaveBalance: (employeeId, year) => {
    const params = year ? { year } : {};
    return apiClient.get(`/attendance/leaves/employee/${employeeId}/balance`, { params });
  },

  // ═══════════════════════════════════════════════════════════
  // BRANCH-BASED SHORTCUTS
  // ═══════════════════════════════════════════════════════════
  getByBranch: (branchId, params = {}) => apiClient.get(`/attendance/branch/${branchId}/attendance`, { params }),
  getLeavesByBranch: (branchId, params = {}) => apiClient.get(`/attendance/branch/${branchId}/leaves`, { params }),
};