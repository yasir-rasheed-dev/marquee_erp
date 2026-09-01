import authApi from './authApi';

class BaseApiService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  // ── Get with branch awareness ──
  async get(endpoint, params = {}, options = {}) {
    const { 
      skipBranch = false,
      skipCache = false,
      forceRefresh = false
    } = options;

    let branchId = null;
    let companyId = null;

    if (!skipBranch) {
      try {
        const storedBranch = localStorage.getItem('selectedBranch');
        const storedUser = localStorage.getItem('user');
        
        if (storedBranch) {
          const branch = JSON.parse(storedBranch);
          branchId = branch.id;
          companyId = branch.companyId;
        } else if (storedUser) {
          const user = JSON.parse(storedUser);
          branchId = user.branchId;
          companyId = user.companyId;
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // Build unique cache key including branch & company context
    const cacheKey = `${endpoint}_branch_${branchId}_company_${companyId}_${JSON.stringify(params)}`;

    // Check cache
    if (!skipCache && !forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prevent duplicate concurrent requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Make request with strict branchId query parameter
    const request = authApi.api.get(endpoint, { 
      params: { ...params, branchId } 
    })
    .then(response => {
      // ✅ Handle standard ERP response format: { success, data, ... }
      const responseData = response.data.data !== undefined ? response.data.data : response.data;
      
      if (!skipCache) {
        this.cache.set(cacheKey, responseData);
      }
      return responseData;
    })
    .finally(() => {
      this.pendingRequests.delete(cacheKey);
    });

    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  // ── Post with branch awareness ──
  async post(endpoint, data = {}, options = {}) {
    const { skipBranch = false } = options;
    let branchId = null;

    if (!skipBranch) {
      try {
        const stored = localStorage.getItem('selectedBranch');
        if (stored) {
          branchId = JSON.parse(stored).id;
        }
      } catch (e) {}
    }

    // Clear cache on mutations (POST/PUT/DELETE) so fresh data is fetched next time
    this.clearCache();

    const response = await authApi.api.post(endpoint, data, {
      params: { branchId }
    });
    return response.data.data !== undefined ? response.data.data : response.data;
  }

  // ── Put with branch awareness ──
  async put(endpoint, data = {}, options = {}) {
    const { skipBranch = false } = options;
    let branchId = null;

    if (!skipBranch) {
      try {
        const stored = localStorage.getItem('selectedBranch');
        if (stored) {
          branchId = JSON.parse(stored).id;
        }
      } catch (e) {}
    }

    this.clearCache();

    const response = await authApi.api.put(endpoint, data, {
      params: { branchId }
    });
    return response.data.data !== undefined ? response.data.data : response.data;
  }

  // ── Delete with branch awareness ──
  async delete(endpoint, options = {}) {
    const { skipBranch = false } = options;
    let branchId = null;

    if (!skipBranch) {
      try {
        const stored = localStorage.getItem('selectedBranch');
        if (stored) {
          branchId = JSON.parse(stored).id;
        }
      } catch (e) {}
    }

    this.clearCache();

    const response = await authApi.api.delete(endpoint, {
      params: { branchId }
    });
    return response.data.data !== undefined ? response.data.data : response.data;
  }

  // ── Clear cache ──
  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🧹 API Cache cleared successfully.');
  }

  clearCacheForEndpoint(endpoint) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(endpoint)) {
        this.cache.delete(key);
      }
    }
  }
}

export const baseApi = new BaseApiService();
export default baseApi;