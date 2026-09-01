// ═══════════════════════════════════════════════════════════
// services/packageApi.js
// BANQUET PACKAGES API CLIENT — Robust & Branch-Aware
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
  // ── GET ALL PACKAGES ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 packageApi.getAll - params:', finalParams);
      return apiClient.get('/packages', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ packageApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ packageApi error:', e);
      return apiClient.get('/packages', { params });
    }
  },

  // ── GET PACKAGE BY ID ──
  getById: (id) => {
    try {
      console.log('🔍 packageApi.getById - id:', id);
      return apiClient.get(`/packages/${id}`)
        .then(response => response)
        .catch(error => {
          console.error('❌ packageApi.getById - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ packageApi getById error:', e);
      return apiClient.get(`/packages/${id}`);
    }
  },

  // ── CREATE PACKAGE ──
  create: (data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = {
        ...data,
        branchId: data.branchId || branchId
      };
      console.log('📝 packageApi.create - data:', finalData);
      return apiClient.post('/packages', finalData);
    } catch (e) {
      console.error('❌ packageApi create error:', e);
      return apiClient.post('/packages', data);
    }
  },

  // ── UPDATE PACKAGE ──
  update: (id, data) => {
    try {
      const branchId = getSelectedBranchId();
      const finalData = {
        ...data,
        branchId: data.branchId || branchId
      };
      console.log('✏️ packageApi.update - id:', id, 'data:', finalData);
      return apiClient.put(`/packages/${id}`, finalData);
    } catch (e) {
      console.error('❌ packageApi update error:', e);
      return apiClient.put(`/packages/${id}`, data);
    }
  },

  // ── DELETE PACKAGE ──
  delete: (id) => {
    try {
      console.log('🗑️ packageApi.delete - id:', id);
      return apiClient.delete(`/packages/${id}`);
    } catch (e) {
      console.error('❌ packageApi delete error:', e);
      return apiClient.delete(`/packages/${id}`);
    }
  },

  // ── GET PACKAGES BY BRANCH ──
  getByBranch: (branchId) => {
    try {
      return apiClient.get(`/packages/branch/${branchId}`);
    } catch (e) {
      console.error('❌ packageApi getByBranch error:', e);
      return apiClient.get(`/packages/branch/${branchId}`);
    }
  }
};