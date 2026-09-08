// ═══════════════════════════════════════════════════════════
// services/reportApi.js
// DEDICATED REPORT API SERVICE (BACKEND POWERED)
// 100% Accurate Data, Server-Side Aggregation, Zero Double-Counting
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

const withBranchParam = (params = {}) => {
  const branchId = getSelectedBranchId();
  return {
    ...params,
    branchId: params.branchId !== undefined ? params.branchId : branchId,
  };
};

export default {
  // ═══════════════════════════════════════════════════════════
  // 1. PROFIT & LOSS REPORT
  // ═══════════════════════════════════════════════════════════
  getProfitLoss: async ({ fromDate, toDate, branchId } = {}) => {
    try {
      const finalParams = withBranchParam({ fromDate, toDate, branchId });
      const res = await apiClient.get('/reports/profit-loss', { params: finalParams });
      return res.data;
    } catch (err) {
      console.error('❌ reportApi.getProfitLoss error:', err);
      throw err.response?.data || err;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 2. BOOKINGS SUMMARY REPORT
  // ═══════════════════════════════════════════════════════════
  getBookingsSummary: async (params = {}) => {
    try {
      const finalParams = withBranchParam(params);
      const res = await apiClient.get('/reports/bookings-summary', { params: finalParams });
      return res.data;
    } catch (err) {
      console.error('❌ reportApi.getBookingsSummary error:', err);
      throw err.response?.data || err;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 3. FINANCE SUMMARY REPORT
  // ═══════════════════════════════════════════════════════════
  getFinanceSummary: async (params = {}) => {
    try {
      const finalParams = withBranchParam(params);
      const res = await apiClient.get('/reports/finance-summary', { params: finalParams });
      return res.data;
    } catch (err) {
      console.error('❌ reportApi.getFinanceSummary error:', err);
      throw err.response?.data || err;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 4. INVENTORY SUMMARY REPORT
  // ═══════════════════════════════════════════════════════════
  getInventorySummary: async (params = {}) => {
    try {
      const finalParams = withBranchParam(params);
      const res = await apiClient.get('/reports/inventory-summary', { params: finalParams });
      return res.data;
    } catch (err) {
      console.error('❌ reportApi.getInventorySummary error:', err);
      throw err.response?.data || err;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 5. KITCHEN PRODUCTION SUMMARY REPORT
  // ═══════════════════════════════════════════════════════════
  getKitchenSummary: async (params = {}) => {
    try {
      const finalParams = withBranchParam(params);
      const res = await apiClient.get('/reports/kitchen-summary', { params: finalParams });
      return res.data;
    } catch (err) {
      console.error('❌ reportApi.getKitchenSummary error:', err);
      throw err.response?.data || err;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 6. QUICK SUMMARY (KPIs)
  // ═══════════════════════════════════════════════════════════
  getQuickSummary: async ({ fromDate, toDate, branchId } = {}) => {
    try {
      const finalParams = withBranchParam({ fromDate, toDate, branchId });
      const res = await apiClient.get('/reports/profit-loss', { params: finalParams });
      const pl = res.data?.data || {};
      return {
        success: true,
        data: {
          revenue: pl.summary?.totalRevenue || 0,
          cogs: pl.summary?.totalCOGS || 0,
          grossProfit: pl.summary?.grossProfit || 0,
          salaries: pl.expenses?.salaries?.amount || 0,
          otherExpenses: pl.expenses?.operatingVouchers?.amount || 0,
          netProfit: pl.summary?.netProfit || 0,
          profitMargin: pl.summary?.profitMargin || 0,
        }
      };
    } catch (err) {
      console.error('❌ reportApi.getQuickSummary error:', err);
      throw err.response?.data || err;
    }
  },
};