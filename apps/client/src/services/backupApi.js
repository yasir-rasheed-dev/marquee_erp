// ═══════════════════════════════════════════════════════════
// services/backupApi.js
// BACKUP API CLIENT — Schema Compliant
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
  getAll: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/backups', { params: finalParams });
  },

  getById: (id) => apiClient.get(`/backups/${id}`),

  create: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/backups', { ...data, branchId: data.branchId || branchId });
  },

  update: (id, data) => apiClient.put(`/backups/${id}`, data),

  delete: (id) => apiClient.delete(`/backups/${id}`),

  trigger: (data = {}) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/backups/trigger', { ...data, branchId: data.branchId || branchId });
  },

  download: (id) => apiClient.get(`/backups/${id}/download`, { responseType: 'blob' }),

  markAutoDeleted: (id) => apiClient.put(`/backups/${id}/auto-delete`),

  getByBranch: (branchId) => apiClient.get(`/backups/branch/${branchId}`),

  // ── Google Drive OAuth ──
  getGoogleDriveStatus: () => apiClient.get('/backups/google/status'),
  disconnectGoogleDrive: () => apiClient.delete('/backups/google/disconnect'),
  getGoogleAuthUrl: () => apiClient.get('/backups/google/auth'),
};