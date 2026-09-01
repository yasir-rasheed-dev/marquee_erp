// services/purchaseApi.js
import apiClient from './apiClient';

const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

// ── Helper: Attach branchId to query params ──
const withBranchParam = (params = {}) => {
  const branchId = getSelectedBranchId();
  // ✅ FIX: Ensure branchId is always a valid number, fallback to 1 if null
  const finalBranchId = params?.branchId || branchId || 1;
  return { ...params, branchId: finalBranchId };
};

// ── Helper: Attach branchId to body ──
const withBranchBody = (data = {}) => {
  const branchId = getSelectedBranchId();
  const finalBranchId = data?.branchId || branchId || 1;
  return { ...data, branchId: finalBranchId };
};

export default {
  // ==========================================
  // 1. SUPPLIERS API
  // ==========================================
  suppliers: {
    getAll: async (params = {}) => {
      try {
        return await apiClient.get('/suppliers', { params: withBranchParam(params) });
      } catch (e) {
        console.error('❌ suppliers.getAll error:', e);
        throw e;
      }
    },
    getById: async (id) => {
      try {
        return await apiClient.get(`/suppliers/${id}`, { params: withBranchParam() });
      } catch (e) {
        console.error('❌ suppliers.getById error:', e);
        throw e;
      }
    },
    create: async (data) => {
      try {
        return await apiClient.post('/suppliers', withBranchBody(data));
      } catch (e) {
        console.error('❌ suppliers.create error:', e);
        throw e;
      }
    },
    update: async (id, data) => {
      try {
        return await apiClient.put(`/suppliers/${id}`, withBranchBody(data));
      } catch (e) {
        console.error('❌ suppliers.update error:', e);
        throw e;
      }
    },
    delete: async (id) => {
      try {
        return await apiClient.delete(`/suppliers/${id}`, { params: withBranchParam() });
      } catch (e) {
        console.error('❌ suppliers.delete error:', e);
        throw e;
      }
    },
    getByBranch: async (branchId) => {
      try {
        return await apiClient.get(`/suppliers/branch/${branchId}`);
      } catch (e) {
        console.error('❌ suppliers.getByBranch error:', e);
        throw e;
      }
    },

    // ── RECORD PAYMENT TO SUPPLIER ──
    recordPayment: async (paymentData) => {
      if (!paymentData?.supplierId || !paymentData?.amount) {
        return Promise.reject(new Error('supplierId and amount are required'));
      }
      try {
        return await apiClient.post('/suppliers/payments', withBranchBody(paymentData));
      } catch (e) {
        console.error('❌ suppliers.recordPayment error:', e);
        throw e;
      }
    }
  },

  // ==========================================
  // 2. PURCHASE ORDERS (PO) API
  // ==========================================
  orders: {
    getAll: async (params = {}) => {
      try {
        return await apiClient.get('/purchases/orders', { params: withBranchParam(params) });
      } catch (e) {
        console.error('❌ orders.getAll error:', e);
        throw e;
      }
    },
    getById: async (id) => {
      try {
        return await apiClient.get(`/purchases/orders/${id}`, { params: withBranchParam() });
      } catch (e) {
        console.error('❌ orders.getById error:', e);
        throw e;
      }
    },
    create: async (data) => {
      try {
        return await apiClient.post('/purchases/orders', withBranchBody(data));
      } catch (e) {
        console.error('❌ orders.create error:', e);
        throw e;
      }
    },
    update: async (id, data) => {
      try {
        return await apiClient.put(`/purchases/orders/${id}`, withBranchBody(data));
      } catch (e) {
        console.error('❌ orders.update error:', e);
        throw e;
      }
    },
    getByBranch: async (branchId) => {
      try {
        return await apiClient.get(`/purchases/orders/branch/${branchId}`);
      } catch (e) {
        console.error('❌ orders.getByBranch error:', e);
        throw e;
      }
    }
  },

  // ==========================================
  // 3. PURCHASE BILLS (GRN & STOCK IN) API
  // ==========================================
  bills: {
    getAll: async (params = {}) => {
      try {
        return await apiClient.get('/purchases/bills', { params: withBranchParam(params) });
      } catch (e) {
        console.error('❌ bills.getAll error:', e);
        throw e;
      }
    },
    getById: async (id) => {
      try {
        return await apiClient.get(`/purchases/bills/${id}`, { params: withBranchParam() });
      } catch (e) {
        console.error('❌ bills.getById error:', e);
        throw e;
      }
    },
    create: async (data) => {
      try {
        return await apiClient.post('/purchases/bills', withBranchBody(data));
      } catch (e) {
        console.error('❌ bills.create error:', e);
        throw e;
      }
    },
    update: async (id, data) => {
      try {
        return await apiClient.put(`/purchases/bills/${id}`, withBranchBody(data));
      } catch (e) {
        console.error('❌ bills.update error:', e);
        throw e;
      }
    },
    getByBranch: async (branchId) => {
      try {
        return await apiClient.get(`/purchases/bills/branch/${branchId}`);
      } catch (e) {
        console.error('❌ bills.getByBranch error:', e);
        throw e;
      }
    },

    // ── PAY A SPECIFIC BILL (Bank + Ledger + Stock) ──
    pay: async (id, paymentData) => {
      if (!id || !paymentData?.amount) {
        return Promise.reject(new Error('Bill ID and amount are required'));
      }
      try {
        return await apiClient.post(`/purchases/bills/${id}/pay`, withBranchBody(paymentData));
      } catch (e) {
        console.error('❌ bills.pay error:', e);
        throw e;
      }
    }
  },

  // ==========================================
  // 4. PURCHASE RETURNS API
  // ==========================================
  returns: {
    getAll: async (params = {}) => {
      try {
        return await apiClient.get('/purchases/returns', { params: withBranchParam(params) });
      } catch (e) {
        console.error('❌ returns.getAll error:', e);
        throw e;
      }
    },
    getById: async (id) => {
      try {
        return await apiClient.get(`/purchases/returns/${id}`, { params: withBranchParam() });
      } catch (e) {
        console.error('❌ returns.getById error:', e);
        throw e;
      }
    },
    create: async (data) => {
      try {
        return await apiClient.post('/purchases/returns', withBranchBody(data));
      } catch (e) {
        console.error('❌ returns.create error:', e);
        throw e;
      }
    },
    update: async (id, data) => {
      try {
        return await apiClient.put(`/purchases/returns/${id}`, withBranchBody(data));
      } catch (e) {
        console.error('❌ returns.update error:', e);
        throw e;
      }
    },
    getByBranch: async (branchId) => {
      try {
        return await apiClient.get(`/purchases/returns/branch/${branchId}`);
      } catch (e) {
        console.error('❌ returns.getByBranch error:', e);
        throw e;
      }
    }
  }
};