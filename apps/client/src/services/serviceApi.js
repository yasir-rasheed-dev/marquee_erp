// ═══════════════════════════════════════════════════════════
// services/serviceApi.js
// ═══════════════════════════════════════════════════════════

import apiClient from './apiClient';

// ── Pricing Types Enum ──
export const PRICING_TYPES = {
  FIXED: 'FIXED',
  HOURLY: 'HOURLY'
};

// ── Helper: Get Tenant Context from LocalStorage ──
const getTenantContext = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return {
      branchId: branch?.id || user?.branchId || null,
      companyId: branch?.companyId || user?.companyId || null
    };
  } catch (e) {
    console.error('❌ getTenantContext parse error:', e);
    return { branchId: null, companyId: null };
  }
};

// ── Helper: Calculate Service Total Price ──
// Use this when creating bookings/invoices
export const calculateServiceTotal = (service, hours = 1) => {
  if (!service) return 0;
  
  const price = parseFloat(service.salePrice) || 0;
  
  if (service.pricingType === PRICING_TYPES.HOURLY) {
    const minHours = parseInt(service.minimumHours) || 1;
    const actualHours = Math.max(hours, minHours);
    return price * actualHours;
  }
  
  // FIXED rate
  return price;
};

// ── Helper: Format service price for display ──
export const formatServicePrice = (service) => {
  if (!service) return '—';
  
  const price = parseFloat(service.salePrice).toLocaleString('en-IN');
  
  if (service.pricingType === PRICING_TYPES.HOURLY) {
    const minHrs = service.minimumHours ? ` (min ${service.minimumHours}h)` : '';
    return `₹${price}/hr${minHrs}`;
  }
  
  return `₹${price} (Fixed)`;
};

// ── Helper: Build clean service payload ──
const buildServicePayload = (data) => {
  const { branchId, companyId } = getTenantContext();
  
  const payload = {
    ...data,
    branchId: data.branchId || branchId,
    companyId: data.companyId || companyId
  };

  // Clean up pricing fields
  if (payload.pricingType) {
    payload.pricingType = payload.pricingType.toUpperCase();
  }
  
  if (payload.salePrice !== undefined) {
    payload.salePrice = parseFloat(payload.salePrice) || 0;
  }
  
  if (payload.costPrice !== undefined) {
    payload.costPrice = parseFloat(payload.costPrice) || 0;
  }
  
  if (payload.minimumHours !== undefined) {
    // Only send minimumHours for HOURLY, or null for FIXED
    if (payload.pricingType === PRICING_TYPES.HOURLY) {
      payload.minimumHours = parseInt(payload.minimumHours) || 1;
    } else {
      payload.minimumHours = null;
    }
  }

  // Remove empty/null fields to keep payload clean
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

const serviceApi = {
  // ── GET ALL SERVICES ──
  getAll: (params = {}) => {
    try {
      const { branchId } = getTenantContext();
      const finalParams = {
        ...params,
        branchId: params.branchId || branchId
      };
      
      console.log('🔍 serviceApi.getAll - params:', finalParams);
      return apiClient.get('/services', { params: finalParams })
        .then(response => response)
        .catch(error => {
          console.error('❌ serviceApi.getAll - error:', error);
          throw error;
        });
    } catch (e) {
      console.error('❌ serviceApi.getAll - outer error:', e);
      return apiClient.get('/services', { params });
    }
  },
  
  // ── GET SERVICE BY ID ──
  getById: (id) => {
    if (!id) return Promise.reject(new Error('Service ID is required'));
    return apiClient.get(`/services/${id}`);
  },

  // ── CREATE SERVICE ──
  create: (data) => {
    const finalData = buildServicePayload(data);
    console.log('📝 serviceApi.create - payload:', finalData);
    return apiClient.post('/services', finalData);
  },

  // ── UPDATE SERVICE ──
  update: (id, data) => {
    if (!id) return Promise.reject(new Error('Service ID is required'));
    const finalData = buildServicePayload(data);
    console.log('✏️ serviceApi.update - id:', id, 'payload:', finalData);
    return apiClient.put(`/services/${id}`, finalData);
  },

  // ── DELETE SERVICE ──
  delete: (id) => {
    if (!id) return Promise.reject(new Error('Service ID is required'));
    return apiClient.delete(`/services/${id}`);
  },

  // ── GET SERVICES BY BRANCH (Admin/Super Admin) ──
  getByBranch: (branchId) => {
    if (!branchId) return Promise.reject(new Error('Branch ID is required'));
    return apiClient.get(`/services/branch/${branchId}`);
  },

  // ── BULK CREATE SERVICES (useful for imports) ──
  bulkCreate: (servicesArray) => {
    if (!Array.isArray(servicesArray) || servicesArray.length === 0) {
      return Promise.reject(new Error('Array of services required'));
    }
    const payload = servicesArray.map(s => buildServicePayload(s));
    return apiClient.post('/services/bulk', { services: payload });
  }
};

export default serviceApi;