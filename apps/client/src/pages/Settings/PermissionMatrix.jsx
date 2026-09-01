import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  ChevronUp,
  Crown,
  Users,
  Briefcase,
  Zap,
  User,
  Lock,
  Unlock,
  Grid3x3,
  List,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import rolePermissionApi from '../../services/rolePermissionApi';

// ── 📌 ALL RESOURCES (Har ek page jo software mein hai) ──
const RESOURCES = [
  // Dashboard
  { key: 'dashboard', label: 'Dashboard', icon: '📊', category: 'Core' },
  
  // Operations
  { key: 'pos', label: 'POS Terminal', icon: '💳', category: 'Operations' },
  { key: 'pos_cart', label: 'POS Cart', icon: '🛒', category: 'Operations' },
  { key: 'pos_suspended', label: 'Suspended Tickets', icon: '⏸️', category: 'Operations' },
  { key: 'pos_refund', label: 'POS Refund', icon: '↩️', category: 'Operations' },
  { key: 'pos_cash_drawer', label: 'Cash Drawer', icon: '💰', category: 'Operations' },
  { key: 'pos_reports', label: 'POS Reports', icon: '📊', category: 'Operations' },
  
  // Bookings
  { key: 'bookings', label: 'Bookings', icon: '📅', category: 'Operations' },
  { key: 'bookings_create', label: 'Create Booking', icon: '➕', category: 'Operations' },
  { key: 'bookings_calendar', label: 'Booking Calendar', icon: '📆', category: 'Operations' },
  { key: 'bookings_contract', label: 'Booking Contract', icon: '📄', category: 'Operations' },
  { key: 'bookings_quotation', label: 'Booking Quotation', icon: '📋', category: 'Operations' },
  
  // Customers
  { key: 'customers', label: 'Customers', icon: '👥', category: 'Operations' },
  { key: 'customers_add', label: 'Add Customer', icon: '➕', category: 'Operations' },
  
  // Events
  { key: 'events', label: 'Events', icon: '🎪', category: 'Operations' },
  { key: 'events_add', label: 'Add Event', icon: '➕', category: 'Operations' },
  { key: 'events_costing', label: 'Event Costing', icon: '💰', category: 'Operations' },
  { key: 'events_inventory', label: 'Event Inventory', icon: '📦', category: 'Operations' },
  { key: 'events_staffing', label: 'Event Staffing', icon: '👤', category: 'Operations' },
  { key: 'events_timeline', label: 'Event Timeline', icon: '⏳', category: 'Operations' },
  
  // Services
  { key: 'services', label: 'Services', icon: '🛎️', category: 'Operations' },
  
  // Menu & Packages
  { key: 'menus', label: 'Menus', icon: '🍽️', category: 'Management' },
  { key: 'menus_add', label: 'Add Menu', icon: '➕', category: 'Management' },
  { key: 'menus_units', label: 'Units', icon: '📏', category: 'Management' },
  { key: 'menus_categories', label: 'Categories', icon: '📂', category: 'Management' },
  { key: 'menus_items', label: 'Items', icon: '📦', category: 'Management' },
  { key: 'menus_packages', label: 'Packages', icon: '📦', category: 'Management' },
  
  // Inventory
  { key: 'inventory', label: 'Inventory', icon: '📦', category: 'Management' },
  { key: 'inventory_item_master', label: 'Item Master', icon: '📋', category: 'Management' },
  { key: 'inventory_stock_transfer', label: 'Stock Transfer', icon: '🔄', category: 'Management' },
  { key: 'inventory_stock_adjustment', label: 'Stock Adjustment', icon: '⚖️', category: 'Management' },
  { key: 'inventory_central_kitchen', label: 'Central Kitchen Transfer', icon: '🏭', category: 'Management' },
  { key: 'inventory_wastage_report', label: 'Wastage Report', icon: '🗑️', category: 'Management' },
  
  // Kitchen
  { key: 'kitchen', label: 'Kitchen', icon: '🍳', category: 'Management' },
  { key: 'kds', label: 'KDS', icon: '🖥️', category: 'Management' },
  { key: 'kitchen_sheet', label: 'Kitchen Sheet', icon: '📋', category: 'Management' },
  { key: 'production_plan', label: 'Production Plan', icon: '📝', category: 'Management' },
  { key: 'recipe_manager', label: 'Recipe Manager', icon: '📖', category: 'Management' },
  { key: 'wastage_log', label: 'Wastage Log', icon: '🗑️', category: 'Management' },
  
  // Accounts
  { key: 'accounts', label: 'Accounts', icon: '💰', category: 'Finance' },
  { key: 'accounts_list', label: 'Accounts List', icon: '📋', category: 'Finance' },
  { key: 'payment_voucher', label: 'Payment Voucher', icon: '💵', category: 'Finance' },
  { key: 'expense_voucher', label: 'Expense Voucher', icon: '💸', category: 'Finance' },
  { key: 'ledger', label: 'Ledger', icon: '📒', category: 'Finance' },
  { key: 'day_book', label: 'Day Book', icon: '📖', category: 'Finance' },
  { key: 'vouchers', label: 'Vouchers', icon: '📄', category: 'Finance' },
  
  // Fixed Assets
  { key: 'fixed_assets', label: 'Fixed Assets', icon: '🏗️', category: 'Finance' },
  { key: 'fixed_assets_adjustments', label: 'Asset Adjustments', icon: '⚖️', category: 'Finance' },
  
  // Procurement
  { key: 'procurement_suppliers', label: 'Suppliers', icon: '🏪', category: 'Procurement' },
  { key: 'procurement_supplier_ledger', label: 'Supplier Ledger', icon: '📒', category: 'Procurement' },
  { key: 'procurement_purchase_orders', label: 'Purchase Orders', icon: '📋', category: 'Procurement' },
  { key: 'procurement_grn', label: 'Goods Received', icon: '📦', category: 'Procurement' },
  { key: 'procurement_purchase_return', label: 'Purchase Return', icon: '↩️', category: 'Procurement' },
  
  // HR
  { key: 'hr', label: 'HR', icon: '👔', category: 'HR' },
  { key: 'hr_employees_add', label: 'Add Employee', icon: '➕', category: 'HR' },
  { key: 'hr_attendance', label: 'Attendance', icon: '⏰', category: 'HR' },
  { key: 'hr_payroll', label: 'Payroll', icon: '💵', category: 'HR' },
  { key: 'hr_leave', label: 'Leave Management', icon: '🏖️', category: 'HR' },
  { key: 'hr_advance_loan', label: 'Advance & Loan', icon: '🏦', category: 'HR' },
  { key: 'hr_event_staff', label: 'Event Staff Allocation', icon: '👤', category: 'HR' },
  { key: 'hr_setup', label: 'HR Setup', icon: '⚙️', category: 'HR' },
  
  // Reports
  { key: 'reports', label: 'Reports Dashboard', icon: '📊', category: 'Reports' },
  { key: 'reports_bookings', label: 'Booking Reports', icon: '📅', category: 'Reports' },
  { key: 'reports_inventory', label: 'Inventory Reports', icon: '📦', category: 'Reports' },
  { key: 'reports_hr', label: 'HR Reports', icon: '👔', category: 'Reports' },
  { key: 'reports_finance', label: 'Finance Reports', icon: '💰', category: 'Reports' },
  { key: 'reports_events', label: 'Event Reports', icon: '🎪', category: 'Reports' },
  { key: 'reports_purchases', label: 'Purchase Reports', icon: '🛒', category: 'Reports' },
  { key: 'reports_attendance', label: 'Attendance Reports', icon: '⏰', category: 'Reports' },
  
  // Settings
  { key: 'settings_company', label: 'Company Profile', icon: '🏛️', category: 'Settings' },
  { key: 'settings_branches', label: 'Branch Settings', icon: '🏢', category: 'Settings' },
  { key: 'settings_halls', label: 'Hall Settings', icon: '🏠', category: 'Settings' },
  { key: 'settings_currency', label: 'Currency Settings', icon: '💱', category: 'Settings' },
  { key: 'settings_tax', label: 'Tax Configuration', icon: '🧾', category: 'Settings' },
  { key: 'settings_pos', label: 'POS Configuration', icon: '💳', category: 'Settings' },
  { key: 'settings_roles', label: 'Role Management', icon: '🛡️', category: 'Settings' },
  { key: 'settings_permissions', label: 'Permission Matrix', icon: '🔐', category: 'Settings' },
  { key: 'settings_backup', label: 'Backup & Restore', icon: '💾', category: 'Settings' },
];

// ── ALL ROLES ──
const ROLES = ['super_admin', 'admin', 'manager', 'cashier', 'staff'];

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  staff: 'Staff'
};

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
  admin: 'bg-blue-100 text-blue-800 border-blue-300',
  manager: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cashier: 'bg-amber-100 text-amber-800 border-amber-300',
  staff: 'bg-gray-100 text-gray-800 border-gray-300'
};

const ROLE_ICONS = {
  super_admin: <Crown className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />,
  manager: <Briefcase className="w-4 h-4" />,
  cashier: <Zap className="w-4 h-4" />,
  staff: <Users className="w-4 h-4" />
};

const ROLE_DESCRIPTIONS = {
  super_admin: 'Full system access with all permissions',
  admin: 'Manage company settings and all modules',
  manager: 'Manage operations and staff',
  cashier: 'Handle POS, payments and bookings',
  staff: 'Basic view and limited access'
};

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  import: 'Import',
  print: 'Print',
  approve: 'Approve',
  execute: 'Execute'
};

const ACTION_ICONS = {
  view: '👁️',
  create: '➕',
  edit: '✏️',
  delete: '🗑️',
  export: '📤',
  import: '📥',
  print: '🖨️',
  approve: '✅',
  execute: '⚡'
};

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'import', 'print', 'approve', 'execute'];

// ── Group Resources by Category ──
const groupedResources = RESOURCES.reduce((acc, r) => {
  if (!acc[r.category]) acc[r.category] = [];
  acc[r.category].push(r);
  return acc;
}, {});

const PermissionMatrix = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');

  // ── Fetch Permissions ──
  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await rolePermissionApi.getAll();
      let data = [];
      if (response?.success && Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      setPermissions(data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // ── Filter Permissions ──
  const filteredPermissions = permissions.filter(p => {
    if (selectedRole !== 'all' && p.role !== selectedRole) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.resource?.toLowerCase().includes(term) ||
        p.action?.toLowerCase().includes(term) ||
        p.role?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // ── Check if permission exists ──
  const hasPermission = (role, resource, action) => {
    return permissions.some(p => 
      p.role === role && 
      p.resource === resource && 
      p.action === action &&
      p.allowed === true
    );
  };

  // ── Get permission status ──
  const getPermission = (role, resource, action) => {
    return permissions.find(p => 
      p.role === role && 
      p.resource === resource && 
      p.action === action
    );
  };

  // ── Toggle Permission ──
  const handleTogglePermission = async (role, resource, action, currentStatus) => {
    try {
      setIsSaving(true);
      const newStatus = !currentStatus;
      
      // Check if permission exists
      const existing = permissions.find(p => 
        p.role === role && 
        p.resource === resource && 
        p.action === action
      );

      if (existing) {
        await rolePermissionApi.update(existing.id, { allowed: newStatus });
      } else {
        await rolePermissionApi.create({
          role,
          resource,
          action,
          allowed: newStatus
        });
      }
      
      toast.success(`${newStatus ? '✅ Enabled' : '❌ Disabled'} ${ACTION_LABELS[action]} for ${ROLE_LABELS[role]}`);
      await fetchPermissions();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update permission');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Get role count ──
  const getRoleCount = (role) => {
    return permissions.filter(p => p.role === role && p.allowed).length;
  };

  // ── Render Matrix ──
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-purple-600" size={28} />
            Permission Matrix
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure role-based permissions for all system resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPermissions}
            disabled={loading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase font-semibold">Total</div>
          <div className="text-2xl font-bold text-gray-900">{permissions.length}</div>
        </div>
        {ROLES.map(role => (
          <div key={role} className={`p-4 rounded-xl border ${ROLE_COLORS[role]}`}>
            <div className="text-xs uppercase font-semibold flex items-center gap-1">
              {ROLE_ICONS[role]} {ROLE_LABELS[role]}
            </div>
            <div className="text-2xl font-bold">{getRoleCount(role)}</div>
            <div className="text-[10px] text-gray-400 mt-1">{ROLE_DESCRIPTIONS[role]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          <option value="all">All Roles</option>
          {ROLES.map(role => (
            <option key={role} value={role}>
              {ROLE_ICONS[role]} {ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <div className="text-xs text-gray-400">
          {filteredPermissions.length} permissions found
        </div>
      </div>

      {/* ── PERMISSION MATRIX TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin" />
            <span>Loading permissions...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F2EB] text-gray-700 font-semibold border-b sticky top-0 z-10">
                <tr>
                  <th className="p-4 min-w-[200px] sticky left-0 bg-[#F5F2EB]">Resource</th>
                  <th className="p-4 min-w-[120px]">Category</th>
                  {ROLES.map(role => (
                    <th key={role} className={`p-3 text-center min-w-[120px] ${ROLE_COLORS[role]}`}>
                      <div className="flex flex-col items-center">
                        <span className="text-lg">{ROLE_ICONS[role]}</span>
                        <span className="text-xs font-bold">{ROLE_LABELS[role]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.keys(groupedResources).map(category => {
                  const resources = groupedResources[category].filter(r => 
                    !searchTerm || r.label.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  
                  if (resources.length === 0) return null;

                  return (
                    <React.Fragment key={category}>
                      {/* Category Header */}
                      <tr className="bg-gray-50">
                        <td colSpan="8" className="p-3 font-semibold text-gray-700 uppercase text-xs tracking-wider">
                          {category}
                        </td>
                      </tr>

                      {/* Resources */}
                      {resources.map(resource => {
                        return (
                          <tr key={resource.key} className="hover:bg-gray-50/50 transition">
                            <td className="p-4 sticky left-0 bg-white font-medium text-gray-800">
                              <span className="mr-2">{resource.icon}</span>
                              {resource.label}
                            </td>
                            <td className="p-4 text-xs text-gray-400">
                              {category}
                            </td>
                            {ROLES.map(role => {
                              // Get all permissions for this role+resource
                              const rolePermissions = permissions.filter(p => 
                                p.role === role && p.resource === resource.key
                              );
                              
                              // Check if view permission exists
                              const hasView = hasPermission(role, resource.key, 'view');
                              const isSuperAdmin = role === 'super_admin';
                              
                              // If no permissions exist and not super admin
                              if (rolePermissions.length === 0 && !isSuperAdmin) {
                                return (
                                  <td key={role} className="p-3 text-center">
                                    <span className="text-gray-200 text-xs">—</span>
                                  </td>
                                );
                              }

                              return (
                                <td key={role} className="p-3">
                                  <div className="flex flex-wrap items-center justify-center gap-1">
                                    {ACTIONS.map(action => {
                                      const isAllowed = hasPermission(role, resource.key, action);
                                      const perm = getPermission(role, resource.key, action);
                                      
                                      // For non-super-admin, only show if permission exists or if it's view
                                      if (!isSuperAdmin && !perm && action !== 'view') {
                                        return null;
                                      }

                                      // For super admin, show all actions with green check
                                      if (isSuperAdmin) {
                                        return (
                                          <div
                                            key={action}
                                            className="p-1 rounded bg-green-50 text-green-600"
                                            title={`${ACTION_ICONS[action]} ${ACTION_LABELS[action]}`}
                                          >
                                            <CheckCircle size={14} className="text-green-500" />
                                          </div>
                                        );
                                      }

                                      return (
                                        <button
                                          key={action}
                                          onClick={() => handleTogglePermission(
                                            role, 
                                            resource.key, 
                                            action, 
                                            isAllowed
                                          )}
                                          disabled={isSaving}
                                          className={`p-1 rounded transition-all ${
                                            isAllowed 
                                              ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                              : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                                          } ${action === 'view' ? 'border border-gray-200' : ''}`}
                                          title={`${isAllowed ? '✅' : '❌'} ${ACTION_ICONS[action]} ${ACTION_LABELS[action]}`}
                                        >
                                          {isAllowed ? (
                                            <CheckCircle size={14} className="text-green-500" />
                                          ) : (
                                            <XCircle size={14} className="text-gray-300" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionMatrix;