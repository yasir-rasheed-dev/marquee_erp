// services/authApi.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.marquee.orangelogs.com/api';
// const API_URL = 'https://marque.digitalinsiderinc.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ── Helper: Get current branch ──
const getCurrentBranch = () => {
  try {
    const saved = localStorage.getItem('selectedBranch');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

// ── Helper: Get current company ──
const getCurrentCompany = () => {
  try {
    const saved = localStorage.getItem('selectedCompany');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

// ── Helper: Get user from localStorage ──
const getUser = () => {
  try {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

// ── Helper: Get token ──
const getToken = () => {
  return localStorage.getItem('token');
};

// ── Helper: Check if authenticated ──
const isAuthenticated = () => {
  return !!getToken();
};

// ── Request Interceptor ──
api.interceptors.request.use(
  (config) => {
    // ✅ Add token
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ Add branchId to params (if not already present)
    const branch = getCurrentBranch();
    if (branch && !config.params?.branchId) {
      config.params = {
        ...config.params,
        branchId: branch.id
      };
    }
    
    // ✅ Add companyId to params (if not already present)
    const company = getCurrentCompany();
    if (company && !config.params?.companyId) {
      config.params = {
        ...config.params,
        companyId: company.id
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor ──
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // ✅ Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        });
        
        if (response.data.success) {
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Refresh token failed:', refreshError);
        // Refresh failed - logout
        clearAuth();
        
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // ✅ Handle 403 - Forbidden
    if (error.response?.status === 403) {
      console.error('❌ Access Denied:', error.response?.data?.message);
    }
    
    // ✅ Handle 400 - Bad Request
    if (error.response?.status === 400) {
      console.error('❌ Bad Request:', error.response?.data?.message);
    }
    
    // ✅ Handle 404 - Not Found
    if (error.response?.status === 404) {
      console.error('❌ Not Found:', error.response?.data?.message);
    }
    
    // ✅ Handle 500 - Server Error
    if (error.response?.status >= 500) {
      console.error('❌ Server Error:', error.response?.data?.message);
    }
    
    return Promise.reject(error);
  }
);

// ── Clear Auth ──
const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('selectedBranch');
  localStorage.removeItem('selectedCompany');
  localStorage.removeItem('user');
  localStorage.removeItem('permissions');
  delete api.defaults.headers.common['Authorization'];
};

// ── Auth API Functions ──
const authApi = {
  // ═══════════════════════════════════════════════════════════
  // 1. AUTHENTICATION
  // ═══════════════════════════════════════════════════════════

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      const responseData = data.data || data;
      
      if (data.success !== false) {
        // ✅ Store user data
        const userData = responseData.user || responseData;
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
          
          // ✅ Store branch
          if (userData.branchId) {
            const branch = {
              id: userData.branchId,
              name: userData.branch?.name || userData.branchName || 'Main Branch'
            };
            localStorage.setItem('selectedBranch', JSON.stringify(branch));
          }
          
          // ✅ Store company
          if (userData.companyId) {
            const company = {
              id: userData.companyId,
              name: userData.company?.name || userData.companyName || 'Company'
            };
            localStorage.setItem('selectedCompany', JSON.stringify(company));
          }
        }
        
        // ✅ Store tokens
        const token = responseData.accessToken || responseData.token || data.token;
        if (token) {
          localStorage.setItem('token', token);
        }
        const refreshToken = responseData.refreshToken || data.refreshToken;
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      }
      
      return {
        success: data.success !== false,
        ...data,
        data: responseData
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
        error: error.response?.data
      };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Register error:', error);
      const apiErr = error.response?.data;
      const validationMsg = Array.isArray(apiErr?.errors) && apiErr.errors.length > 0
        ? apiErr.errors.map(e => e.msg).join(', ')
        : null;
      return {
        success: false,
        message: apiErr?.message || validationMsg || 'Registration failed',
        error: apiErr
      };
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return {
        success: response.data.success !== false,
        ...response.data
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Logout failed'
      };
    } finally {
      clearAuth();
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await api.post('/auth/refresh-token', { refreshToken });
      const data = response.data;
      const responseData = data.data || data;
      
      if (data.success !== false) {
        const token = responseData.accessToken || responseData.token || data.token;
        if (token) {
          localStorage.setItem('token', token);
        }
        const newRefreshToken = responseData.refreshToken || data.refreshToken;
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
      }
      
      return {
        success: data.success !== false,
        ...data,
        data: responseData
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Refresh token failed'
      };
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      const data = response.data;
      const userData = data.data || data;
      
      if (data.success !== false && userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      return {
        success: data.success !== false,
        ...data,
        data: userData
      };
    } catch (error) {
      console.error('Get me error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user',
        error: error.response?.data
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 2. USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        users: data.data || data.users || data
      };
    } catch (error) {
      console.error('Get users error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get users',
        error: error.response?.data,
        data: []
      };
    }
  },

  getUser: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        user: data.data || data
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user',
        error: error.response?.data
      };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        user: data.data || data
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create user',
        error: error.response?.data
      };
    }
  },

  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        user: data.data || data
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update user',
        error: error.response?.data
      };
    }
  },

  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete user',
        error: error.response?.data
      };
    }
  },

  bulkCreateUsers: async (usersData) => {
    try {
      const response = await api.post('/users/bulk', usersData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        users: data.data || data.users || data
      };
    } catch (error) {
      console.error('Bulk create users error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create users',
        error: error.response?.data
      };
    }
  },

  getUsersByCompany: async (companyId) => {
    try {
      const response = await api.get(`/users/company/${companyId}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        users: data.data || data.users || data
      };
    } catch (error) {
      console.error('Get users by company error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get users',
        error: error.response?.data,
        data: []
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 3. COMPANY MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getCompanies: async (params = {}) => {
    try {
      const response = await api.get('/companies', { params });
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        companies: data.data || data.companies || data
      };
    } catch (error) {
      console.error('Get companies error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get companies',
        error: error.response?.data,
        data: []
      };
    }
  },

  getCompany: async (id) => {
    try {
      const response = await api.get(`/companies/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        company: data.data || data
      };
    } catch (error) {
      console.error('Get company error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get company',
        error: error.response?.data
      };
    }
  },

  createCompany: async (companyData) => {
    try {
      const response = await api.post('/companies', companyData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        company: data.data || data
      };
    } catch (error) {
      console.error('Create company error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create company',
        error: error.response?.data
      };
    }
  },

  updateCompany: async (id, companyData) => {
    try {
      const response = await api.put(`/companies/${id}`, companyData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        company: data.data || data
      };
    } catch (error) {
      console.error('Update company error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update company',
        error: error.response?.data
      };
    }
  },

  deleteCompany: async (id) => {
    try {
      const response = await api.delete(`/companies/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Delete company error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete company',
        error: error.response?.data
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 4. BRANCH MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getBranches: async (params = {}) => {
    try {
      const response = await api.get('/branches', { params });
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        branches: data.data || data.branches || data
      };
    } catch (error) {
      console.error('Get branches error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get branches',
        error: error.response?.data,
        data: []
      };
    }
  },

  getBranch: async (id) => {
    try {
      const response = await api.get(`/branches/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        branch: data.data || data
      };
    } catch (error) {
      console.error('Get branch error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get branch',
        error: error.response?.data
      };
    }
  },

  createBranch: async (branchData) => {
    try {
      const response = await api.post('/branches', branchData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        branch: data.data || data
      };
    } catch (error) {
      console.error('Create branch error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create branch',
        error: error.response?.data
      };
    }
  },

  updateBranch: async (id, branchData) => {
    try {
      const response = await api.put(`/branches/${id}`, branchData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        branch: data.data || data
      };
    } catch (error) {
      console.error('Update branch error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update branch',
        error: error.response?.data
      };
    }
  },

  deleteBranch: async (id) => {
    try {
      const response = await api.delete(`/branches/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Delete branch error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete branch',
        error: error.response?.data
      };
    }
  },

  // ── Switch Branch ──
  switchBranch: async (branchId) => {
    try {
      const response = await api.post('/branches/switch', { branchId });
      const data = response.data;
      const responseData = data.data || data;
      
      return {
        success: data.success !== false,
        ...data,
        data: responseData,
        branch: responseData
      };
    } catch (error) {
      console.warn('⚠️ Branch switch endpoint not found, using local switch only');
      return {
        success: true,
        message: 'Branch switched locally',
        branch: { id: branchId }
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 5. CATEGORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getCategories: async (params = {}) => {
    try {
      const response = await api.get('/categories', { params });
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        categories: data.data || data.categories || data
      };
    } catch (error) {
      console.error('Get categories error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get categories',
        error: error.response?.data,
        data: []
      };
    }
  },

  getCategory: async (id) => {
    try {
      const response = await api.get(`/categories/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        category: data.data || data
      };
    } catch (error) {
      console.error('Get category error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get category',
        error: error.response?.data
      };
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/categories', categoryData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        category: data.data || data
      };
    } catch (error) {
      console.error('Create category error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create category',
        error: error.response?.data
      };
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/categories/${id}`, categoryData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        category: data.data || data
      };
    } catch (error) {
      console.error('Update category error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update category',
        error: error.response?.data
      };
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/categories/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Delete category error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete category',
        error: error.response?.data
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 6. ITEM MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getItems: async (params = {}) => {
    try {
      const response = await api.get('/items', { params });
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        items: data.data || data.items || data
      };
    } catch (error) {
      console.error('Get items error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get items',
        error: error.response?.data,
        data: []
      };
    }
  },

  getItem: async (id) => {
    try {
      const response = await api.get(`/items/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        item: data.data || data
      };
    } catch (error) {
      console.error('Get item error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get item',
        error: error.response?.data
      };
    }
  },

  createItem: async (itemData) => {
    try {
      const response = await api.post('/items', itemData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        item: data.data || data
      };
    } catch (error) {
      console.error('Create item error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create item',
        error: error.response?.data
      };
    }
  },

  updateItem: async (id, itemData) => {
    try {
      const response = await api.put(`/items/${id}`, itemData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        item: data.data || data
      };
    } catch (error) {
      console.error('Update item error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update item',
        error: error.response?.data
      };
    }
  },

  deleteItem: async (id) => {
    try {
      const response = await api.delete(`/items/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Delete item error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete item',
        error: error.response?.data
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 7. MENU MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getMenus: async (params = {}) => {
    try {
      const response = await api.get('/menus', { params });
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        menus: data.data || data.menus || data
      };
    } catch (error) {
      console.error('Get menus error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get menus',
        error: error.response?.data,
        data: []
      };
    }
  },

  getMenu: async (id) => {
    try {
      const response = await api.get(`/menus/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        menu: data.data || data
      };
    } catch (error) {
      console.error('Get menu error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get menu',
        error: error.response?.data
      };
    }
  },

  createMenu: async (menuData) => {
    try {
      const response = await api.post('/menus', menuData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        menu: data.data || data
      };
    } catch (error) {
      console.error('Create menu error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create menu',
        error: error.response?.data
      };
    }
  },

  updateMenu: async (id, menuData) => {
    try {
      const response = await api.put(`/menus/${id}`, menuData);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data,
        menu: data.data || data
      };
    } catch (error) {
      console.error('Update menu error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update menu',
        error: error.response?.data
      };
    }
  },

  deleteMenu: async (id) => {
    try {
      const response = await api.delete(`/menus/${id}`);
      const data = response.data;
      return {
        success: data.success !== false,
        ...data,
        data: data.data || data
      };
    } catch (error) {
      console.error('Delete menu error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete menu',
        error: error.response?.data
      };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 8. HELPERS
  // ═══════════════════════════════════════════════════════════

  getCurrentBranch,
  getCurrentCompany,
  getUser,
  getToken,
  isAuthenticated,
  setToken: (token) => {
    localStorage.setItem('token', token);
  },
  clearAuth,
  api
};

export default authApi;