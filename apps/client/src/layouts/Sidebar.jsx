// src/components/layout/Sidebar.jsx
// ✅ COMPLETE FIXED - All resources matched with backend permissions

import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, ChevronLeft, ChevronRight,
  Crown, ChevronDown, Utensils, Menu, X, Coffee, Package,
  ChefHat, Truck, Settings, BookOpen, Briefcase, Activity,
  Shield, Loader2,
  CalendarPlus, CalendarDays, UserPlus, PartyPopper, ConciergeBell,
  UtensilsCrossed, PlusCircle, Boxes, Layers, FolderTree, Scale,
  Box, ArrowLeftRight, SlidersHorizontal, ClipboardList, MonitorPlay,
  CalendarRange, BookOpenCheck, Trash2, Landmark, CreditCard, Receipt,
  FileText, Clock, Building, RefreshCw, Store, ClipboardCheck,
  RotateCcw, CalendarCheck2, Banknote, CalendarOff, Coins, UserCheck,
  Settings2, BarChart3, TrendingUp, CalendarCheck, LineChart,
  ShoppingBag, BadgeDollarSign, Building2, Printer, Percent, ShieldCheck,
  Database,
  Compass
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

// ✅ ALL RESOURCES MATCH EXACTLY WITH BACKEND PERMISSIONS
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', resource: 'dashboard' },
  {
    icon: Calendar, 
    label: 'Bookings', 
    path: '/bookings', 
    resource: 'bookings_list',
    submenu: [
      { label: 'All Bookings', path: '/bookings', icon: Calendar },
      { label: 'Create Booking', path: '/bookings/create', icon: CalendarPlus },
      { label: 'Booking Calendar', path: '/bookings/calendar', icon: CalendarDays },
    ]
  },
  {
    icon: Users, 
    label: 'Customer', 
    path: '/customers', 
    resource: 'customers',
    submenu: [
      { label: 'All Customers', path: '/customers', icon: Users },
      { label: 'Add Customer', path: '/customers/add', icon: UserPlus }
    ]
  },
  {
    icon: Coffee, 
    label: 'Events', 
    path: '/events', 
    resource: 'events',
    submenu: [
      { label: 'Event', path: '/events/add', icon: PartyPopper }
    ]
  },
  {
    icon: Coffee, 
    label: 'Services', 
    path: '/serviceslist', 
    resource: 'services',
    submenu: [
      { label: 'Services List', path: '/serviceslist', icon: ConciergeBell }
    ]
  },
  {
    icon: Utensils, 
    label: 'Menu & Packages', 
    path: '/menus', 
    resource: 'menus',
    submenu: [
      { label: 'Menu List', path: '/menus', icon: UtensilsCrossed },
      { label: 'Add Menu', path: '/menus/add', icon: PlusCircle },
      { label: 'Packages', path: '/menus/packages', icon: Boxes },
      { label: 'Items', path: '/menus/items', icon: Layers },
      { label: 'Categories', path: '/menus/categories', icon: FolderTree },
      { label: 'Units', path: '/menus/units', icon: Scale },
    ]
  },
  {
    icon: Package, 
    label: 'Inventory', 
    path: '/inventory', 
    resource: 'inventory',
    submenu: [
      { label: 'Item Master', path: '/inventory/item-master', icon: Box },
      { label: 'Stock Transfer', path: '/inventory/stock-transfer', icon: ArrowLeftRight },
      { label: 'Stock Adjustment', path: '/inventory/stock-adjustment', icon: SlidersHorizontal },
    ]
  },
  {
    icon: ChefHat, 
    label: 'Kitchen', 
    path: '/kitchen', 
    resource: 'kitchen',
    submenu: [
      { label: 'Kitchen Sheet', path: '/kitchen', icon: ClipboardList },
      { label: 'KDS', path: '/kitchen/kds', icon: MonitorPlay },
      { label: 'Production Plan', path: '/kitchen/production-plan', icon: CalendarRange },
      { label: 'Recipe Manager', path: '/kitchen/recipe-manager', icon: BookOpenCheck },
      { label: 'Wastage Log', path: '/kitchen/wastage-log', icon: Trash2 },
    ]
  },
  {
    icon: BookOpen, 
    label: 'Accounts', 
    path: '/accounts', 
    resource: 'accounts',
    submenu: [
      { label: 'Accounts List', path: '/accounts', icon: Landmark },
      { label: 'Payment Voucher', path: '/accounts/payment-voucher', icon: CreditCard },
      { label: 'Expense Voucher', path: '/accounts/expense-voucher', icon: Receipt },
      { label: 'Voucher List', path: '/accounts/vouchers', icon: FileText },
      { label: 'Ledger', path: '/accounts/ledger', icon: BookOpen },
      { label: 'Day Book', path: '/accounts/day-book', icon: Clock },
    ]
  },
  {
    icon: Briefcase, 
    label: 'Fixed Assets', 
    path: '/fixed-assets', 
    resource: 'fixed_assets',
    submenu: [
      { label: 'Assets List', path: '/fixed-assets', icon: Building },
      { label: 'Asset Adjustments', path: '/fixed-assets/adjustments', icon: RefreshCw },
    ]
  },
  {
    icon: Truck, 
    label: 'Procurement', 
    path: '/procurement', 
    resource: 'procurement',
    submenu: [
      { label: 'Suppliers', path: '/procurement/suppliers', icon: Store },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders', icon: ClipboardCheck },
      { label: 'Create PO', path: '/procurement/purchase-orders/create', icon: PlusCircle },
      { label: 'GRN (Bills)', path: '/procurement/grn', icon: Receipt },
      { label: 'Purchase Return', path: '/procurement/purchase-return', icon: RotateCcw },
    ]
  },
  {
    icon: Users, 
    label: 'HR', 
    path: '/hr', 
    resource: 'hr',
    submenu: [
      { label: 'Staff List', path: '/hr', icon: Users },
      { label: 'Add Employee', path: '/hr/employees/add', icon: UserPlus },
      { label: 'Attendance', path: '/hr/attendance', icon: CalendarCheck2 },
      { label: 'Payroll', path: '/hr/payroll', icon: Banknote },
      { label: 'Leave', path: '/hr/leave', icon: CalendarOff },
      { label: 'Advance & Loan', path: '/hr/advance-loan', icon: Coins },
      { label: 'Event Staff', path: '/hr/event-staff', icon: UserCheck },
      { label: 'HR Setup', path: '/hr/setup', icon: Settings2 },
    ]
  },
  {
    icon: Activity, 
    label: 'Reports', 
    path: '/reports', 
    resource: 'reports',
    submenu: [
      { label: 'Dashboard', path: '/reports', icon: BarChart3 },
      { label: 'Profit & Loss', path: '/reports/profit_loss', icon: TrendingUp },
      { label: 'Booking & Event', path: '/reports/bookings', icon: CalendarCheck },
      { label: 'Inventory & Stock', path: '/reports/inventory', icon: Boxes },
      { label: 'HR & Payroll', path: '/reports/hr', icon: Users },
      { label: 'Financial Reports', path: '/reports/finance', icon: LineChart },
      { label: 'Kitchen & Production', path: '/reports/kitchenreport', icon: ChefHat },
      { label: 'Supplier & Purchase', path: '/reports/purchases', icon: ShoppingBag },
      { label: 'Customer & Sale', path: '/reports/customerreport', icon: BadgeDollarSign },
    ]
  },
  {
    icon: Settings, 
    label: 'Settings', 
    path: '/settings', 
    resource: 'settings',
    submenu: [
      { label: 'Onboarding / Setup', path: '/settings/onboarding', icon: Compass },
      { label: 'Branch Settings', path: '/settings/branches', icon: Building2 },
      { label: 'Hall Settings', path: '/settings/halls', icon: Building },
      { label: 'Receipt Settings', path: '/settings/receipt', icon: Printer },
      { label: 'Tax Config', path: '/settings/tax', icon: Percent },
      { label: 'Roles', path: '/settings/roles', icon: ShieldCheck },
      { label: 'Backup', path: '/settings/backup', icon: Database },
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

  const handleNavigate = () => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  };

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
            onClick={handleNavigate}
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
          <div className="ml-5 mt-1 space-y-0.5">
            {item.submenu.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = location.pathname === sub.path || (sub.path !== item.path && location.pathname.startsWith(sub.path + '/'));
              return (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  onClick={handleNavigate}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all group/sub
                    ${isSubActive 
                      ? 'text-blue-700 bg-blue-50 font-bold' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 font-medium'}`}
                >
                  {SubIcon && (
                    <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSubActive ? 'text-blue-600' : 'text-slate-400 group-hover/sub:text-blue-600'}`} />
                  )}
                  <span className="truncate">{sub.label}</span>
                </NavLink>
              );
            })}
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