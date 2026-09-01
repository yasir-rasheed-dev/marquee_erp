// context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authApi from '../services/authApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// 🔥 BULLETPROOF: Global event to notify permission system
const notifyAuthChange = () => {
  window.dispatchEvent(new CustomEvent('marquee:auth-changed'));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTestMode, setIsTestMode] = useState(
    localStorage.getItem('testMode') === 'true'
  );

  const getCurrentBranch = useCallback(() => {
    try {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const getCurrentCompany = useCallback(() => {
    try {
      const saved = localStorage.getItem('selectedCompany');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const getUser = useCallback(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  // ── Load user on mount ──
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        
        if (response.success) {
          const userData = response.user;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          if (userData.branchId) {
            const branch = {
              id: userData.branchId,
              name: userData.branch?.name || 'Main Branch'
            };
            localStorage.setItem('selectedBranch', JSON.stringify(branch));
          }
          
          if (userData.companyId) {
            const company = {
              id: userData.companyId,
              name: userData.company?.name || 'Company'
            };
            localStorage.setItem('selectedCompany', JSON.stringify(company));
          }
          notifyAuthChange(); // 🔥 Notify permissions
        } else {
          setUser(null);
          authApi.clearAuth();
        }
      } catch (err) {
        console.error('❌ Load user error:', err);
        setUser(null);
        authApi.clearAuth();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ── Refresh User ──
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await authApi.getMe();
      if (response.success) {
        const userData = response.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        notifyAuthChange(); // 🔥 Notify permissions
        return userData;
      }
    } catch (err) {
      console.error('❌ Refresh user error:', err);
    }
    return null;
  }, []);

  // ── Register ──
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.register(userData);
      
      if (response.success) {
        const { accessToken, refreshToken, user: userInfo } = response;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        setUser(userInfo);
        setLoading(false);
        notifyAuthChange(); // 🔥 Notify permissions
        
        return { success: true, user: userInfo };
      } else {
        setError(response.message || 'Registration failed');
        setLoading(false);
        return { success: false, error: response.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  // ── Login ──
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.login(email, password);
      
      if (response.success) {
        const { accessToken, refreshToken, user: userInfo } = response;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        if (userInfo.branchId) {
          const branch = {
            id: userInfo.branchId,
            name: userInfo.branch?.name || 'Main Branch'
          };
          localStorage.setItem('selectedBranch', JSON.stringify(branch));
        }
        
        if (userInfo.companyId) {
          const company = {
            id: userInfo.companyId,
            name: userInfo.company?.name || 'Company'
          };
          localStorage.setItem('selectedCompany', JSON.stringify(company));
        }
        
        setLoading(false);
        notifyAuthChange(); // 🔥 CRITICAL: Notify permissions to reload
        
        return { success: true, user: userInfo };
      } else {
        setError(response.message || 'Login failed');
        setLoading(false);
        return { success: false, error: response.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('❌ Logout error:', err);
    } finally {
      authApi.clearAuth();
      setUser(null);
      setIsTestMode(false);
      localStorage.removeItem('testMode');
      localStorage.removeItem('selectedBranch');
      localStorage.removeItem('selectedCompany');
      localStorage.removeItem('user');
      notifyAuthChange(); // 🔥 Notify permissions
    }
  }, []);

  // ── Test Mode ──
  const toggleTestMode = useCallback((enabled) => {
    setIsTestMode(enabled);
    if (enabled) {
      localStorage.setItem('testMode', 'true');
      const testUser = {
        id: 0,
        name: 'Test User',
        email: 'test@marquee.com',
        role: 'super_admin',
        branchId: 1,
        companyId: 1,
        branch: { id: 1, name: 'Main Branch' },
        company: { id: 1, name: 'Marquee Events' }
      };
      setUser(testUser);
      localStorage.setItem('user', JSON.stringify(testUser));
      localStorage.setItem('selectedBranch', JSON.stringify({ id: 1, name: 'Main Branch' }));
      localStorage.setItem('selectedCompany', JSON.stringify({ id: 1, name: 'Marquee Events' }));
      notifyAuthChange(); // 🔥
    } else {
      localStorage.removeItem('testMode');
      localStorage.removeItem('selectedBranch');
      localStorage.removeItem('selectedCompany');
      localStorage.removeItem('user');
      setUser(null);
      notifyAuthChange(); // 🔥
    }
  }, []);

  // ── Role Checks ──
  const isAdmin = useCallback(() => user?.role === 'admin' || user?.role === 'super_admin', [user]);
  const isSuperAdmin = useCallback(() => user?.role === 'super_admin', [user]);
  const isManager = useCallback(() => ['admin', 'super_admin', 'manager'].includes(user?.role), [user]);
  const isCashier = useCallback(() => ['admin', 'super_admin', 'manager', 'cashier'].includes(user?.role), [user]);
  const isStaff = useCallback(() => ['admin', 'super_admin', 'manager', 'cashier', 'staff'].includes(user?.role), [user]);
  
  const hasBranchAccess = useCallback((branchId) => {
    if (isSuperAdmin()) return true;
    if (isAdmin()) return true;
    return user?.branchId === branchId;
  }, [user, isAdmin, isSuperAdmin]);

  const hasCompanyAccess = useCallback((companyId) => {
    if (isSuperAdmin()) return true;
    return user?.companyId === companyId;
  }, [user, isSuperAdmin]);

  const value = {
    user,
    loading,
    isLoading: loading,
    error,
    isTestMode,
    register,
    login,
    logout,
    refreshUser,
    toggleTestMode,
    getCurrentBranch,
    getCurrentCompany,
    getUser,
    isAdmin,
    isSuperAdmin,
    isManager,
    isCashier,
    isStaff,
    hasBranchAccess,
    hasCompanyAccess,
    isAuthenticated: !!user || isTestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider as AuthContextProvider };
export default AuthProvider;