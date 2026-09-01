// src/components/layout/Sidebar.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, ChevronLeft, ChevronRight,
  Crown, ChevronDown, Utensils, Menu, X, Coffee, Package,
  ChefHat, Truck, Settings, BookOpen, Briefcase, Activity,
  Shield, Loader2
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', resource: 'dashboard' },
  {
    icon: Calendar, label: 'Bookings', path: '/bookings', resource: 'bookings',
    submenu: [
      { label: 'All Bookings', path: '/bookings' },
      { label: 'Create Booking', path: '/bookings/create' },
      { label: 'Booking Calendar', path: '/bookings/calendar' },
    ]
  },
  {
    icon: Users, label: 'Customer', path: '/customers', resource: 'customers',
    submenu: [{ label: 'Customer', path: '/customers/add' }]
  },
  {
    icon: Coffee, label: 'Events', path: '/events', resource: 'events',
    submenu: [{ label: 'Event', path: '/events/add' }]
  },
  {
    icon: Coffee, label: 'Services', path: '/serviceslist', resource: 'services',
    submenu: [{ label: 'Services', path: '/serviceslist' }]
  },
  {
    icon: Utensils, label: 'Menu & Packages', path: '/menus', resource: 'menus',
    submenu: [
      { label: 'Menu', path: '/menus/add' },
      { label: 'Packages', path: '/menus/packages' },
      { label: 'Items', path: '/menus/items' },
      { label: 'Categories', path: '/menus/categories' },
      { label: 'Units', path: '/menus/units' },
    ]
  },
  {
    icon: Package, label: 'Inventory', path: '/inventory', resource: 'inventory',
    submenu: [
      { label: 'Item Master', path: '/inventory/item-master' },
      { label: 'Stock Transfer', path: '/inventory/stock-transfer' },
      { label: 'Stock Adjustment', path: '/inventory/stock-adjustment' },
    ]
  },
  {
    icon: ChefHat, label: 'Kitchen', path: '/kitchen', resource: 'kitchen',
    submenu: [
      { label: 'Kitchen Sheet', path: '/kitchen' },
      { label: 'KDS', path: '/kitchen/kds' },
      { label: 'Production Plan', path: '/kitchen/production-plan' },
      { label: 'Recipe Manager', path: '/kitchen/recipe-manager' },
      { label: 'Wastage Log', path: '/kitchen/wastage-log' },
    ]
  },
  {
    icon: BookOpen, label: 'Accounts', path: '/accounts', resource: 'accounts',
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
    icon: Briefcase, label: 'Fixed Assets', path: '/fixed-assets', resource: 'fixed_assets',
    submenu: [
      { label: 'Add Asset', path: '/fixed-assets' },
      { label: 'Asset Adjustments', path: '/fixed-assets/adjustments' },
    ]
  },
  {
    icon: Truck, label: 'Procurement', path: '/procurement', resource: 'procurement',
    submenu: [
      { label: 'Suppliers', path: '/procurement/suppliers' },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders' },
      { label: 'Create PO', path: '/procurement/purchase-orders/create' },
      { label: 'GRN (Bills)', path: '/procurement/grn' },
      { label: 'Purchase Return', path: '/procurement/purchase-return' },
    ]
  },
  {
    icon: Users, label: 'HR', path: '/hr', resource: 'hr',
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
    icon: Activity, label: 'Reports', path: '/reports', resource: 'reports',
    submenu: [
      { label: ' Dashboard', path: '/reports' },
      { label: ' Profit & Loss', path: '/reports/profit_loss' },
      { label: ' Booking & Event', path: '/reports/bookings' },
      { label: ' Inventory & Stock', path: '/reports/inventory' },
      { label: ' HR & Payroll', path: '/reports/hr' },
      { label: ' Financial Reports', path: '/reports/finance' },
      { label: ' Kitchen & Production', path: '/reports/kitchenreport' },
      { label: ' Supplier & Purchase', path: '/reports/purchases' },
      { label: ' Customer & Sale', path: '/reports/customerreport' },
    ]
  },
  {
    icon: Settings, label: 'Settings', path: '/settings', resource: 'settings',
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

    if (userRole === 'super_admin' || userRole === 'admin') {
      return menuItems;
    }

    // If no permissions at all
    if (!permissions || permissions.length === 0) return [];

    // Filter by permission
    const filtered = menuItems.filter(item => {
      if (!item.resource) return true;
      return can(item.resource, 'view');
    });

    // Safety: if permissions exist but nothing matched, show dashboard at least
    if (filtered.length === 0 && permissions.length > 0) {
      console.warn('⚠️ No menu matched. Perms:', permissions.map(p => `${p.resource}:${p.action}`));
      return menuItems.filter(i => i.resource === 'dashboard');
    }

    return filtered;
  }, [can, userRole, permissions, permLoading, allowedResources]);

  const isMenuActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.path !== '/' && location.pathname.startsWith(item.path + '/')) return true;
    if (item.submenu?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))) return true;
    return false;
  };

  useEffect(() => {
    const activeParent = visibleMenuItems.find(item =>
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
              ${active ? 'bg-[#F4E7C9] text-[#1F2937] font-semibold' : 'text-[#1F2937] hover:bg-[#F7F2E8]'}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#C89B3C]' : 'text-[#6B7280] group-hover:text-[#C89B3C]'}`} />
            <span className={`text-[15px] flex-1 text-left font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
              {item.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#6B7280] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
          </button>
        ) : (
          <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
              ${isActive ? 'bg-[#F4E7C9] text-[#1F2937] font-semibold' : 'text-[#1F2937] hover:bg-[#F7F2E8]'}`}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#C89B3C]' : 'text-[#6B7280] group-hover:text-[#C89B3C]'}`} />
                <span className={`text-[15px] flex-1 font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
                {isActive && <span className="w-1.5 h-6 rounded-full bg-[#C89B3C] shadow-[0_0_12px_rgba(200,155,60,0.3)]" />}
              </>
            )}
          </NavLink>
        )}

        {hasSubmenu && isExpanded && !collapsed && (
          <div className="ml-10 mt-1 space-y-0.5 border-l-2 border-[#ECE8DF] pl-4">
            {item.submenu.map((sub) => (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={() => setMobileOpen(false)}
                className={() => {
                  const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + '/');
                  return `block px-3 py-2 rounded-lg text-sm transition-all
                    ${isSubActive ? 'text-[#1F2937] font-medium bg-[#F4E7C9]/50' : 'text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F7F2E8]'}`;
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
        className="fixed top-4 left-4 z-[60] lg:hidden p-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#ECE8DF] shadow-lg"
      >
        <Menu className="w-5 h-5 text-[#1F2937]" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-[100dvh] flex flex-col z-[80] bg-white/95 backdrop-blur-2xl border-r border-[#ECE8DF] shadow-[0_8px_30px_rgba(0,0,0,0.06)]
          transition-all duration-300 ease-in-out
          w-[280px] lg:w-72
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:!w-[80px]' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#ECE8DF] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C89B3C] to-[#DDB35A] flex items-center justify-center shrink-0 shadow-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <h1 className="text-xl font-bold text-[#1F2937] whitespace-nowrap">
                Marquee<span className="text-[#C89B3C]">ERP</span>
              </h1>
              <p className="text-[10px] font-medium text-[#6B7280] tracking-widest uppercase whitespace-nowrap">Premium</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-[#F7F2E8] text-[#6B7280]">
            <X size={18} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-2 rounded-xl hover:bg-[#F7F2E8] text-[#6B7280]">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-[#ECE8DF]">
          {!collapsed && (
            <p className="px-3 text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.15em] mb-3">
              Navigation
            </p>
          )}

                    {permLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#A97A1F]" />
            </div>
          ) : visibleMenuItems === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#A97A1F]" />
            </div>
          ) : visibleMenuItems.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Shield size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 mb-1">No modules accessible</p>
              <p className="text-[10px] text-gray-400">Role: {userRole || 'N/A'}</p>
              <p className="text-[10px] text-gray-400">Perms: {permissions.length}</p>
            </div>
          ) : (
            visibleMenuItems.map(renderMenuItem)
          )}
        </nav>

        {/* Footer Profile */}
        <div className="mx-4 mb-2 p-3 rounded-2xl bg-[#FAF8F4] border border-[#ECE8DF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C89B3C] to-[#DDB35A] flex items-center justify-center text-white font-bold text-sm shrink-0">
              AM
            </div>
            <div className={`overflow-hidden transition-all ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <p className="text-sm font-semibold text-[#1F2937] truncate">Admin User</p>
              <p className="text-xs text-[#6B7280] truncate capitalize">{userRole || 'Staff'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#ECE8DF] shrink-0">
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-[#2E7D32] shadow-[0_0_8px_rgba(46,125,50,0.4)] animate-pulse shrink-0" />
            <div className={`overflow-hidden transition-all ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <p className="text-xs text-[#6B7280] truncate">System Online</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;