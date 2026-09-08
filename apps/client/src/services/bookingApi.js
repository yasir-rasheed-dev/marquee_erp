// services/bookingApi.js
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
    try {
      const { branchId } = getTenantContext();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      return apiClient.get('/bookings', { params: finalParams });
    } catch (e) {
      return apiClient.get('/bookings', { params });
    }
  },

  getById: (id) => apiClient.get(`/bookings/${id}`),

  create: (data) => {
    const { branchId, companyId } = getTenantContext();
    return apiClient.post('/bookings', {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    });
  },

  update: (id, data) => {
    const { branchId, companyId } = getTenantContext();
    return apiClient.put(`/bookings/${id}`, {
      ...data,
      branchId: data.branchId || branchId,
      companyId: data.companyId || companyId
    });
  },

  delete: (id) => apiClient.delete(`/bookings/${id}`),

  getByBranch: (branchId) => apiClient.get(`/bookings/branch/${branchId}`),

  // ════════════════════════════════════════
  // 🔥 YEH METHOD MISSING THA — AB ADD KIYA
  // Field names backend controller ke mutabiq fix kiye
  // ════════════════════════════════════════
  addPayment: (id, data) => {
    // Backend expects: paymentMode (not mode), notes (not description), bankAccountId
    const payload = {
      amount: Number(data.amount),
      paymentMode: data.mode || data.paymentMode || 'cash',
      notes: data.description || data.notes || 'Payment received',
      bankAccountId: data.bankAccountId ? parseInt(data.bankAccountId) : undefined
    };
    console.log('💰 bookingApi.addPayment - payload:', payload);
    return apiClient.post(`/bookings/${id}/payments`, payload);
  },

  // ════════════════════════════════════════
  // 💥 Extra Charges & Damages / Penalties
  // ════════════════════════════════════════
  getDamages: (id) => apiClient.get(`/bookings/${id}/damages`),

  addDamage: (id, data) => apiClient.post(`/bookings/${id}/damages`, data),

  deleteDamage: (id, damageId) => apiClient.delete(`/bookings/${id}/damages/${damageId}`),

  // ════════════════════════════════════════
  // 🏁 Complete & Settle Event
  // ════════════════════════════════════════
  completeAndSettle: (id, data = {}) => apiClient.post(`/bookings/${id}/complete-settle`, data),

  // ════════════════════════════════════════
  // 💬 WhatsApp Messages Logging & Reminders
  // ════════════════════════════════════════
  logWhatsApp: (id, data) => apiClient.post(`/bookings/${id}/whatsapp`, data),
  getWhatsAppLogs: (id) => apiClient.get(`/bookings/${id}/whatsapp`),
  getUpcomingReminders: (params = {}) => {
    try {
      const { branchId } = getTenantContext();
      const finalParams = { ...params, branchId: params.branchId || branchId };
      return apiClient.get('/bookings/upcoming-reminders', { params: finalParams });
    } catch (e) {
      return apiClient.get('/bookings/upcoming-reminders', { params });
    }
  },
};