// ═══════════════════════════════════════════════════════════
// services/accountApi.js
// ACCOUNT API CLIENT — Complete with Transactions & Vouchers
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
  // ── GET ALL ACCOUNTS ──
  getAll: (params = {}) => {
    try {
      const branchId = getSelectedBranchId();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };

      console.log('🔍 accountApi.getAll - params:', finalParams);
      return apiClient.get('/accounts', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ accountApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ accountApi error:', e);
      return apiClient.get('/accounts', { params });
    }
  },

  // ── GET SINGLE ACCOUNT ──
  getById: (id) => {
    const branchId = getSelectedBranchId();
    console.log('🔍 accountApi.getById - id:', id, 'branchId:', branchId);
    return apiClient.get(`/accounts/${id}`, { params: { branchId } });
  },

  // ── CREATE ACCOUNT ──
  create: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('📝 accountApi.create - data:', finalData);
    return apiClient.post('/accounts', finalData);
  },

  // ── UPDATE ACCOUNT ──
  update: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('✏️ accountApi.update - id:', id, 'data:', finalData);
    return apiClient.put(`/accounts/${id}`, finalData);
  },

  // ── DELETE ACCOUNT ──
  delete: (id) => {
    console.log('🗑️ accountApi.delete - id:', id);
    return apiClient.delete(`/accounts/${id}`);
  },

  // ═══════════════════════════════════════════════════════════
  // ACCOUNT HISTORY / LEDGER
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // ACCOUNT HISTORY / LEDGER (FIXED)
  // ═══════════════════════════════════════════════════════════

  getHistory: (id, params = {}) => {
    // 1. Account ID check
    if (!id || isNaN(id)) {
      console.error('❌ accountApi.getHistory - Invalid account ID:', id);
      return Promise.reject(new Error('Invalid Account ID'));
    }

    const branchId = getSelectedBranchId();
    
    // 2. Clean parameters (remove empty strings like from: '', to: '')
    const cleanParams = {};
    
    // Set Branch ID if valid
    const finalBranchId = params.branchId || branchId;
    if (finalBranchId) cleanParams.branchId = finalBranchId;
    
    // Set limit/page
    if (params.limit) cleanParams.limit = params.limit;
    if (params.page) cleanParams.page = params.page;

    // Only attach dates if they have actual value
    if (params.from && params.from.trim() !== '') cleanParams.from = params.from;
    if (params.to && params.to.trim() !== '') cleanParams.to = params.to;

    console.log('📜 accountApi.getHistory - id:', id, 'cleaned params:', cleanParams);

    return apiClient.get(`/accounts/${id}/history`, { params: cleanParams })
      .then(response => {
        console.log('📜 accountApi.getHistory - raw response:', response);
        return response;
      })
      .catch(error => {
        console.error('❌ accountApi.getHistory - error:', error?.response?.status, error?.response?.data);
        throw error;
      });
  },

  getTodaySummary: (id) => {
    const branchId = getSelectedBranchId();
    console.log('📊 accountApi.getTodaySummary - id:', id, 'branchId:', branchId);
    return apiClient.get(`/accounts/${id}/today-summary`, { params: { branchId } })
      .then(response => response)
      .catch(error => {
        console.error('❌ accountApi.getTodaySummary - error:', error);
        throw error;
      });
  },

  // ═══════════════════════════════════════════════════════════
  // TRANSACTIONS & PAYMENT VOUCHERS
  // ═══════════════════════════════════════════════════════════

  // ── GET ALL TRANSACTIONS / VOUCHERS ──
  getAllTransactions: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = {
      ...params,
      branchId: params.branchId || branchId
    };
    console.log('📜 accountApi.getAllTransactions - params:', finalParams);
    return apiClient.get('/accounts/transactions', { params: finalParams })
      .then(response => response)
      .catch(error => {
        console.error('❌ accountApi.getAllTransactions - error:', error);
        throw error;
      });
  },

  // ── ADD TRANSACTION (Credit / Debit / Voucher) ──
  addTransaction: (id, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('💰 accountApi.addTransaction - id:', id, 'data:', finalData);
    return apiClient.post(`/accounts/${id}/transaction`, finalData)
      .then(response => response)
      .catch(error => {
        console.error('❌ accountApi.addTransaction - error:', error);
        throw error;
      });
  },

  // ── UPDATE TRANSACTION ──
  updateTransaction: (transactionId, data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('✏️ accountApi.updateTransaction - id:', transactionId, 'data:', finalData);
    return apiClient.put(`/accounts/transactions/${transactionId}`, finalData);
  },

  // ── DELETE TRANSACTION ──
  deleteTransaction: (transactionId) => {
    console.log('🗑️ accountApi.deleteTransaction - id:', transactionId);
    return apiClient.delete(`/accounts/transactions/${transactionId}`);
  },

  // ── TRANSFER BETWEEN ACCOUNTS ──
  transfer: (data) => {
    const branchId = getSelectedBranchId();
    const finalData = {
      ...data,
      branchId: data.branchId || branchId
    };
    console.log('🔄 accountApi.transfer - data:', finalData);
    return apiClient.post('/accounts/transfer', finalData)
      .then(response => response)
      .catch(error => {
        console.error('❌ accountApi.transfer - error:', error);
        throw error;
      });
  },

  // ═══════════════════════════════════════════════════════════
  // CUSTOM CATEGORIES
  // ═══════════════════════════════════════════════════════════

  getCustomCategories: (params = {}) => {
    const branchId = getSelectedBranchId();
    return apiClient.get('/accounts/custom-categories', { params: { ...params, branchId } })
      .then(response => response)
      .catch(error => { console.error('❌ getCustomCategories error:', error); throw error; });
  },

  createCustomCategory: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/accounts/custom-categories', { ...data, branchId })
      .then(response => response)
      .catch(error => { console.error('❌ createCustomCategory error:', error); throw error; });
  },

  deleteCustomCategory: (id) => {
    return apiClient.delete(`/accounts/custom-categories/${id}`)
      .then(response => response)
      .catch(error => { console.error('❌ deleteCustomCategory error:', error); throw error; });
  },
};