// hooks/usePermissions.js
// COMPLETE FIXED - With proper response handling

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

  const loadPermissions = useCallback(async () => {
    setLoading(true);

    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      console.log('🔐 PermissionContext - User:', user);

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
        console.log('🔐 Admin user - granting all permissions');
        setPermissions([]);
        setLoading(false);
        return;
      }

      const res = await roleApi.getMyPermissions();
      console.log('🔐 getMyPermissions Response:', res);

      let perms = [];

      // ── ✅ FIXED: Better response handling ──
      // Case 1: { success: true, data: { permissions: { resource: [actions] } } }
      if (res?.success && res?.data?.permissions && typeof res.data.permissions === 'object' && !Array.isArray(res.data.permissions)) {
        const groupedPerms = res.data.permissions;
        Object.entries(groupedPerms).forEach(([resource, actions]) => {
          if (Array.isArray(actions)) {
            actions.forEach(action => {
              perms.push({ resource, action, allowed: true });
            });
          }
        });
      }
      // Case 2: { success: true, data: [ { resource, action, allowed } ] }
      else if (res?.success && Array.isArray(res?.data)) {
        perms = res.data;
      }
      // Case 3: { success: true, data: { permissions: [ { resource, action, allowed } ] } }
      else if (res?.success && res?.data?.permissions && Array.isArray(res.data.permissions)) {
        perms = res.data.permissions;
      }
      // Case 4: Array directly
      else if (Array.isArray(res)) {
        perms = res;
      }
      // Case 5: { data: [ ... ] }
      else if (Array.isArray(res?.data)) {
        perms = res.data;
      }
      // Case 6: { permissions: [ ... ] }
      else if (Array.isArray(res?.permissions)) {
        perms = res.permissions;
      }

      // ✅ Ensure allowed field is boolean
      perms = perms.map(p => ({
        ...p,
        allowed: p.allowed === true || p.allowed === 'true' || p.allowed === 1
      }));

      console.log('🔐 Permissions loaded for', user.role, ':', perms.length, 'permissions');
      console.log('🔐 Resources:', perms.map(p => `${p.resource}:${p.action}`));

      setPermissions(perms);
    } catch (err) {
      console.error('❌ Permission load error:', err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load on mount + listen for auth changes ──
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
    console.log('🔐 Allowed Resources:', set);
    return set;
  }, [permissions]);

  // Resource alias groups for flexible permission checking
  const RESOURCE_ALIASES = useMemo(() => ({
    bookings: ['bookings', 'bookings_list', 'bookings_create', 'bookings_calendar'],
    bookings_list: ['bookings_list', 'bookings'],
    bookings_create: ['bookings_create', 'bookings'],
    customers: ['customers', 'customers_add'],
    customers_add: ['customers_add', 'customers'],
    events: ['events', 'events_add'],
    events_add: ['events_add', 'events'],
    menus: ['menus', 'menus_add', 'menu_packages', 'menus_packages', 'menu_items', 'menus_items', 'menu_categories', 'menus_categories', 'menus_units'],
    menu_packages: ['menu_packages', 'menus_packages', 'menus'],
    menus_packages: ['menus_packages', 'menu_packages', 'menus'],
    menu_items: ['menu_items', 'menus_items', 'menus'],
    menus_items: ['menus_items', 'menu_items', 'menus'],
    menus_categories: ['menus_categories', 'menu_categories', 'menus'],
    menus_units: ['menus_units', 'menus'],
    services: ['services', 'services_list'],
    services_list: ['services_list', 'services'],
    inventory: ['inventory', 'inventory_item_master', 'inventory_stock_transfer', 'inventory_stock_adjustment'],
    kitchen: ['kitchen', 'kitchen_sheet', 'production_plan', 'recipe_manager', 'wastage_log', 'kds'],
    kitchen_sheet: ['kitchen_sheet', 'kitchen'],
    production_plan: ['production_plan', 'kitchen'],
    recipe_manager: ['recipe_manager', 'kitchen'],
    accounts: ['accounts', 'accounts_list', 'payment_voucher', 'expense_voucher', 'ledger', 'day_book'],
    procurement: ['procurement', 'suppliers', 'purchase_orders', 'grn'],
    hr: ['hr', 'staff_list', 'employees_add', 'attendance', 'payroll']
  }), []);

  const can = useCallback((resource, action = 'view') => {
    if (userRole === 'super_admin' || userRole === 'admin') return true;
    
    // Direct check
    if (allowedResources.has(`${resource}:${action}`)) return true;

    // Check aliases
    const aliases = RESOURCE_ALIASES[resource] || [];
    for (const alias of aliases) {
      if (allowedResources.has(`${alias}:${action}`)) return true;
    }

    return false;
  }, [userRole, allowedResources, RESOURCE_ALIASES]);

  const canView = useCallback((res) => can(res, 'view'), [can]);
  const canCreate = useCallback((res) => can(res, 'create'), [can]);
  const canEdit = useCallback((res) => can(res, 'edit'), [can]);
  const canDelete = useCallback((res) => can(res, 'delete'), [can]);
  const canPrint = useCallback((res) => can(res, 'print') || can(res, 'export'), [can]);

  return (
    <PermissionContext.Provider value={{ 
      can, 
      canView, 
      canCreate, 
      canEdit, 
      canDelete, 
      canPrint, 
      permissions, 
      userRole, 
      loading, 
      allowedResources 
    }}>
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