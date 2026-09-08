// src/components/layout/Sidebar.jsx
// ✅ COMPLETE FIXED - All resources matched with backend permissions

import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, ChevronLeft, ChevronRight,
  Crown, ChevronDown, Utensils, Menu, X, Coffee, Package,
  ChefHat, Truck, Settings, BookOpen, Briefcase, Activity,
  Shield, Loader2
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

// ✅ ALL RESOURCES MATCH EXACTLY WITH BACKEND PERMISSIONS
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', resource: 'dashboard' },
  {
    icon: Calendar, 
    label: 'Bookings', 
    path: '/bookings', 
    resource: 'bookings_list',  // ✅ FIXED: bookings_list
    submenu: [
      { label: 'All Bookings', path: '/bookings' },
      { label: 'Create Booking', path: '/bookings/create' },
      { label: 'Booking Calendar', path: '/bookings/calendar' },
    ]
  },
  {
    icon: Users, 
    label: 'Customer', 
    path: '/customers', 
    resource: 'customers',  // ✅ FIXED: customers (not customers_list)
    submenu: [
      { label: 'All Customers', path: '/customers' },
      { label: 'Add Customer', path: '/customers/add' }
    ]
  },
  {
    icon: Coffee, 
    label: 'Events', 
    path: '/events', 
    resource: 'events',  // ✅ FIXED: events
    submenu: [

      { label: 'Event', path: '/events/add' }
    ]
  },
  {
    icon: Coffee, 
    label: 'Services', 
    path: '/serviceslist', 
    resource: 'services',  // ✅ FIXED: services
    submenu: [{ label: 'Services List', path: '/serviceslist' }]
  },
  {
    icon: Utensils, 
    label: 'Menu & Packages', 
    path: '/menus', 
    resource: 'menus',  // ✅ FIXED: menus
    submenu: [
      { label: 'Menu List', path: '/menus' },
      { label: 'Add Menu', path: '/menus/add' },
      { label: 'Packages', path: '/menus/packages' },
      { label: 'Items', path: '/menus/items' },
      { label: 'Categories', path: '/menus/categories' },
      { label: 'Units', path: '/menus/units' },
    ]
  },
  {
    icon: Package, 
    label: 'Inventory', 
    path: '/inventory', 
    resource: 'inventory',  // ✅ FIXED: inventory
    submenu: [
      // { label: 'Inventory List', path: '/inventory' },
      { label: 'Item Master', path: '/inventory/item-master' },
      { label: 'Stock Transfer', path: '/inventory/stock-transfer' },
      { label: 'Stock Adjustment', path: '/inventory/stock-adjustment' },
    ]
  },
  {
    icon: ChefHat, 
    label: 'Kitchen', 
    path: '/kitchen', 
    resource: 'kitchen',  // ✅ FIXED: kitchen
    submenu: [
      { label: 'Kitchen Sheet', path: '/kitchen' },
      { label: 'KDS', path: '/kitchen/kds' },
      { label: 'Production Plan', path: '/kitchen/production-plan' },
      { label: 'Recipe Manager', path: '/kitchen/recipe-manager' },
      { label: 'Wastage Log', path: '/kitchen/wastage-log' },
    ]
  },
  {
    icon: BookOpen, 
    label: 'Accounts', 
    path: '/accounts', 
    resource: 'accounts',  // ✅ FIXED: accounts
    submenu: [
      { label: 'Accounts List', path: '/accounts' },
      { label: 'Payment Voucher', path: '/accounts/payment-voucher' },
      { label: 'Expense Voucher', path: '/accounts/expense-voucher' },
      { label: 'Voucher List', path: '/accounts/vouchers' },
      { label: 'Ledger', path: '/accounts/ledger' },
      { label: 'Day Book', path: '/accounts/day-book' },
    ]
  },
  {
    icon: Briefcase, 
    label: 'Fixed Assets', 
    path: '/fixed-assets', 
    resource: 'fixed_assets',  // ✅ FIXED: fixed_assets
    submenu: [
      { label: 'Assets List', path: '/fixed-assets' },
      // { label: 'Add Asset', path: '/fixed-assets/add' },
      { label: 'Asset Adjustments', path: '/fixed-assets/adjustments' },
    ]
  },
  {
    icon: Truck, 
    label: 'Procurement', 
    path: '/procurement', 
    resource: 'procurement',  // ✅ FIXED: procurement
    submenu: [
      { label: 'Suppliers', path: '/procurement/suppliers' },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders' },
      { label: 'Create PO', path: '/procurement/purchase-orders/create' },
      { label: 'GRN (Bills)', path: '/procurement/grn' },
      { label: 'Purchase Return', path: '/procurement/purchase-return' },
    ]
  },
  {
    icon: Users, 
    label: 'HR', 
    path: '/hr', 
    resource: 'hr',  // ✅ FIXED: hr
    submenu: [
      { label: 'Staff List', path: '/hr' },
      { label: 'Add Employee', path: '/hr/employees/add' },
      { label: 'Attendance', path: '/hr/attendance' },
      { label: 'Payroll', path: '/hr/payroll' },
      { label: 'Leave', path: '/hr/leave' },
      { label: 'Advance & Loan', path: '/hr/advance-loan' },
      { label: 'Event Staff', path: '/hr/event-staff' },
      { label: 'HR Setup', path: '/hr/setup' },
    ]
  },
  {
    icon: Activity, 
    label: 'Reports', 
    path: '/reports', 
    resource: 'reports',  // ✅ FIXED: reports
    submenu: [
      { label: 'Dashboard', path: '/reports' },
      { label: 'Profit & Loss', path: '/reports/profit_loss' },
      { label: 'Booking & Event', path: '/reports/bookings' },
      { label: 'Inventory & Stock', path: '/reports/inventory' },
      { label: 'HR & Payroll', path: '/reports/hr' },
      { label: 'Financial Reports', path: '/reports/finance' },
      { label: 'Kitchen & Production', path: '/reports/kitchenreport' },
      { label: 'Supplier & Purchase', path: '/reports/purchases' },
      { label: 'Customer & Sale', path: '/reports/customerreport' },
    ]
  },
  {
    icon: Settings, 
    label: 'Settings', 
    path: '/settings', 
    resource: 'settings',  // ✅ FIXED: settings
    submenu: [
      { label: 'Branch Settings', path: '/settings/branches' },
      { label: 'Hall Settings', path: '/settings/halls' },
      { label: 'Receipt Settings', path: '/settings/receipt' },
      { label: 'Tax Config', path: '/settings/tax' },
      { label: 'Roles', path: '/settings/roles' },
      { label: 'Backup', path: '/settings/backup' },
    ]
  },
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);
  const { can, userRole, loading: permLoading, permissions, allowedResources } = usePermissions();

  // ✅ BULLETPROOF: Admin = all, loading = spinner, others = filter
  const visibleMenuItems = useMemo(() => {
    // If permissions are still loading, return null (spinner handles it)
    if (permLoading) return null;

    // SUPER_ADMIN or ADMIN = full access
    if (userRole === 'super_admin' || userRole === 'admin') {
      return menuItems;
    }

    // If no permissions at all
    if (!permissions || permissions.length === 0) {
      console.warn('⚠️ No permissions loaded');
      return [];
    }

    // ✅ DEBUG: Log what we're checking
    console.log('🔍 Filtering menu items with permissions:', permissions.map(p => `${p.resource}:${p.action}`));

    // Filter by permission
    const filtered = menuItems.filter(item => {
      if (!item.resource) return true;
      const hasAccess = can(item.resource, 'view');
      console.log(`🔍 ${item.label} (${item.resource}): ${hasAccess ? '✅' : '❌'}`);
      return hasAccess;
    });

    // Safety: if permissions exist but nothing matched, show dashboard at least
    if (filtered.length === 0 && permissions.length > 0) {
      console.warn('⚠️ No menu matched. Perms:', permissions.map(p => `${p.resource}:${p.action}`));
      return menuItems.filter(i => i.resource === 'dashboard');
    }

    console.log('✅ Visible menu items:', filtered.map(i => i.label));
    return filtered;
  }, [can, userRole, permissions, permLoading, allowedResources]);

  const isMenuActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.path !== '/' && location.pathname.startsWith(item.path + '/')) return true;
    if (item.submenu?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))) return true;
    return false;
  };

  useEffect(() => {
    const activeParent = visibleMenuItems?.find(item =>
      item.submenu?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))
    );
    if (activeParent) setExpandedMenu(activeParent.label);
  }, [location.pathname, visibleMenuItems]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleSubmenu = (label) => setExpandedMenu(prev => prev === label ? null : label);

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const active = isMenuActive(item);
    const hasSubmenu = !!item.submenu;
    const isExpanded = expandedMenu === item.label;

    return (
      <div key={item.path || item.label} className="select-none">
        {hasSubmenu ? (
          <button
            onClick={() => toggleSubmenu(item.label)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              ${active 
                ? 'bg-blue-50 text-blue-700 font-extrabold border-l-4 border-blue-600 shadow-2xs' 
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 font-semibold'}`}
          >
            <Icon className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
            <span className={`text-[14px] flex-1 text-left font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
              {item.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180 text-white' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
          </button>
        ) : (
          <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              ${isActive 
                ? 'bg-blue-50 text-blue-700 font-extrabold border-l-4 border-blue-600 shadow-2xs' 
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 font-semibold'}`}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
                <span className={`text-[14px] flex-1 font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
                {isActive && <span className="w-1.5 h-5 rounded-full bg-blue-600" />}
              </>
            )}
          </NavLink>
        )}

        {hasSubmenu && isExpanded && !collapsed && (
          <div className="ml-9 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
            {item.submenu.map((sub) => (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={() => setMobileOpen(false)}
                className={() => {
                  const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + '/');
                  return `block px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${isSubActive 
                      ? 'text-blue-700 bg-blue-50 font-bold' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 font-medium'}`;
                }}
              >
                <span className="truncate">{sub.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-300 shadow-md text-slate-800"
      >
        <Menu className="w-5 h-5 text-slate-800" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-[100dvh] flex flex-col z-[80] bg-white border-r border-slate-300 shadow-[2px_0_15px_rgba(15,23,42,0.06)]
          transition-all duration-300 ease-in-out
          w-[280px] lg:w-72
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:!w-[80px]' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200 shrink-0">
          <Link 
            to="/dashboard" 
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 overflow-hidden group cursor-pointer"
            title="Go to Dashboard"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(37,99,235,0.35)] group-hover:scale-105 transition-transform">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                Marquee<span className="text-blue-600">ERP</span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-500 tracking-[0.2em] uppercase whitespace-nowrap">Premium Palace</p>
            </div>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900">
            <X size={18} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">
              Main Menu
            </p>
          )}

          {permLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          ) : visibleMenuItems === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          ) : visibleMenuItems.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Shield size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs text-slate-600 mb-1">No modules accessible</p>
              <p className="text-[10px] text-slate-500">Role: {userRole || 'N/A'}</p>
              <p className="text-[10px] text-slate-500">Perms: {permissions?.length || 0}</p>
            </div>
          ) : (
            visibleMenuItems.map(renderMenuItem)
          )}
        </nav>

        {/* Footer Profile */}
        <div className="mx-4 mb-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-md">
              AM
            </div>
            <div className={`overflow-hidden transition-all ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <p className="text-sm font-bold text-slate-900 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate capitalize">{userRole || 'Staff'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 shrink-0">
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse shrink-0" />
            <div className={`overflow-hidden transition-all ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <p className="text-xs font-semibold text-slate-600 truncate">System Online & Active</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;