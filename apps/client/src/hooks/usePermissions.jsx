import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import roleApi from '../services/rolePermissionApi';

const PermissionContext = createContext({
  permissions: [],
  userRole: null,
  loading: true,
  can: () => false,
  allowedResources: new Set(),
});

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 BULLETPROOF: Always read fresh user from localStorage
  const loadPermissions = useCallback(async () => {
    setLoading(true);

    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) {
        console.log('🔐 PermissionContext: No user found, clearing permissions');
        setPermissions([]);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUserRole(user.role || null);

      // Admin = skip API call, instant access
      if (user.role === 'super_admin' || user.role === 'admin') {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const res = await roleApi.getMyPermissions();
      
      let perms = [];
      if (Array.isArray(res)) {
        perms = res;
      } else if (Array.isArray(res?.data)) {
        perms = res.data;
      } else if (res?.success && Array.isArray(res?.data)) {
        perms = res.data;
      } else if (res?.success && res?.data?.permissions) {
        perms = res.data.permissions;
      } else if (res?.permissions) {
        perms = res.permissions;
      }

      perms = perms.map(p => ({
        ...p,
        allowed: p.allowed === true || p.allowed === 'true' || p.allowed === 1
      }));

      console.log('🔐 Permissions loaded for', user.role, ':', perms);
      setPermissions(perms);
    } catch (err) {
      console.error('❌ Permission load error:', err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 CRITICAL: Load on mount + listen for auth changes
  useEffect(() => {
    loadPermissions();

    const handleAuthChange = () => {
      console.log('🔄 Auth changed, reloading permissions...');
      loadPermissions();
    };

    window.addEventListener('marquee:auth-changed', handleAuthChange);
    
    return () => {
      window.removeEventListener('marquee:auth-changed', handleAuthChange);
    };
  }, [loadPermissions]);

  const allowedResources = useMemo(() => {
    const set = new Set();
    permissions.forEach(p => {
      if (p.allowed) {
        set.add(`${p.resource}:${p.action}`);
      }
    });
    return set;
  }, [permissions]);

  const can = useCallback((resource, action = 'view') => {
    if (userRole === 'super_admin' || userRole === 'admin') return true;
    return allowedResources.has(`${resource}:${action}`);
  }, [userRole, allowedResources]);

  return (
    <PermissionContext.Provider value={{ can, permissions, userRole, loading, allowedResources }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};