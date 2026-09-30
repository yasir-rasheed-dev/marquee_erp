// src/pages/Security/RolePermissionManager.jsx
// Grouped sidebar-style accordion for modular & fast permission management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, Users, Plus, X, RefreshCw, Search, Check, ChevronDown, ChevronUp,
  Eye, Edit3, Trash2, PlusCircle, Lock, Unlock, Crown, UserCheck,
  LayoutGrid, Save, AlertCircle, Coffee, Utensils, Package,
  ChefHat, Truck, Briefcase, BookOpen, Activity, Settings,
  Calendar, LayoutDashboard, PartyPopper, ConciergeBell, CheckCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import roleApi from '../../services/rolePermissionApi';
import employeeApi from '../../services/employeeApi';

// ── MODULE GROUPS (Sidebar-aligned hierarchy) ──
const MODULE_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    modules: [
      { key: 'dashboard', label: 'Dashboard Overview' }
    ]
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    modules: [
      { key: 'bookings_list', label: 'All Bookings' },
      { key: 'bookings_create', label: 'Create Booking' },
      { key: 'bookings_calendar', label: 'Booking Calendar' }
    ]
  },
  {
    id: 'customers',
    label: 'Customer',
    icon: Users,
    color: 'text-pink-600 bg-pink-50 border-pink-200',
    modules: [
      { key: 'customers', label: 'All Customers' },
      { key: 'customers_add', label: 'Add Customer' }
    ]
  },
  {
    id: 'events',
    label: 'Events',
    icon: PartyPopper,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    modules: [
      { key: 'events', label: 'Events Overview' },
      { key: 'events_add', label: 'Add Event' }
    ]
  },
  {
    id: 'services',
    label: 'Services',
    icon: ConciergeBell,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    modules: [
      { key: 'services', label: 'Services Overview' },
      { key: 'services_list', label: 'Services List' }
    ]
  },
  {
    id: 'menus',
    label: 'Menu & Packages',
    icon: Utensils,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    modules: [
      { key: 'menus', label: 'Menu List' },
      { key: 'menus_add', label: 'Add Menu' },
      { key: 'menu_packages', label: 'Packages' },
      { key: 'menu_items', label: 'Menu Items' },
      { key: 'menu_categories', label: 'Categories' },
      { key: 'menu_units', label: 'Units' }
    ]
  },
  {
    id: 'pos',
    label: 'POS',
    icon: LayoutGrid,
    color: 'text-green-600 bg-green-50 border-green-200',
    modules: [
      { key: 'pos', label: 'POS Terminal' }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    modules: [
      { key: 'inventory', label: 'Inventory Overview' },
      { key: 'inventory_item_master', label: 'Item Master' },
      { key: 'inventory_stock_transfer', label: 'Stock Transfer' },
      { key: 'inventory_stock_adjustment', label: 'Stock Adjustment' }
    ]
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: ChefHat,
    color: 'text-red-600 bg-red-50 border-red-200',
    modules: [
      { key: 'kitchen', label: 'Kitchen Overview' },
      { key: 'kitchen_sheet', label: 'Kitchen Sheet' },
      { key: 'kds', label: 'KDS' },
      { key: 'production_plan', label: 'Production Plan' },
      { key: 'recipe_manager', label: 'Recipe Manager' },
      { key: 'wastage_log', label: 'Wastage Log' }
    ]
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: BookOpen,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    modules: [
      { key: 'accounts', label: 'Accounts Overview' },
      { key: 'accounts_list', label: 'Accounts List' },
      { key: 'payment_voucher', label: 'Payment Voucher' },
      { key: 'expense_voucher', label: 'Expense Voucher' },
      { key: 'voucher_list', label: 'Voucher List' },
      { key: 'ledger', label: 'Ledger' },
      { key: 'day_book', label: 'Day Book' }
    ]
  },
  {
    id: 'fixed_assets',
    label: 'Fixed Assets',
    icon: Briefcase,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    modules: [
      { key: 'fixed_assets', label: 'Assets List' },
      { key: 'fixed_assets_add', label: 'Add Asset' },
      { key: 'fixed_assets_adjustments', label: 'Asset Adjustments' }
    ]
  },
  {
    id: 'procurement',
    label: 'Procurement',
    icon: Truck,
    color: 'text-slate-600 bg-slate-100 border-slate-300',
    modules: [
      { key: 'procurement', label: 'Procurement Overview' },
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'purchase_orders', label: 'Purchase Orders' },
      { key: 'purchase_orders_create', label: 'Create PO' },
      { key: 'grn', label: 'GRN (Bills)' },
      { key: 'purchase_return', label: 'Purchase Return' }
    ]
  },
  {
    id: 'hr',
    label: 'HR (Human Resources)',
    icon: Users,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    modules: [
      { key: 'hr', label: 'HRM Overview' },
      { key: 'staff_list', label: 'Staff List' },
      { key: 'employees_add', label: 'Add Employee' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'payroll', label: 'Payroll' },
      { key: 'leave', label: 'Leave' },
      { key: 'advance_loan', label: 'Advance & Loan' },
      { key: 'event_staff', label: 'Event Staff' },
      { key: 'hr_setup', label: 'HR Setup' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: Activity,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    modules: [
      { key: 'reports', label: 'Reports Overview' },
      { key: 'reports_dashboard', label: 'Dashboard Report' },
      { key: 'profit_loss', label: 'Profit & Loss' },
      { key: 'reports_bookings', label: 'Booking & Event Reports' },
      { key: 'reports_inventory', label: 'Inventory & Stock Reports' },
      { key: 'reports_hr', label: 'HR & Payroll Reports' },
      { key: 'reports_finance', label: 'Financial Reports' },
      { key: 'reports_kitchen', label: 'Kitchen & Production Reports' },
      { key: 'reports_purchases', label: 'Supplier & Purchase Reports' },
      { key: 'reports_customers', label: 'Customer & Sale Reports' }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    modules: [
      { key: 'settings', label: 'Settings Overview' },
      { key: 'settings_branches', label: 'Branch Settings' },
      { key: 'settings_halls', label: 'Hall Settings' },
      { key: 'settings_receipt', label: 'Receipt Settings' },
      { key: 'settings_tax', label: 'Tax Config' },
      { key: 'settings_roles', label: 'Roles' },
      { key: 'settings_backup', label: 'Backup' }
    ]
  }
];

// Flat list maintained for full backward compatibility
const ALL_MODULES = MODULE_GROUPS.flatMap(group =>
  group.modules.map(mod => ({
    ...mod,
    groupId: group.id,
    groupLabel: group.label,
    groupIcon: group.icon,
    color: group.color
  }))
);

const ACTION_DEFS = [
  { key: 'view', label: 'View', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'create', label: 'Add', icon: PlusCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'edit', label: 'Edit', icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'delete', label: 'Delete', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'export', label: 'Export', icon: Unlock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'print', label: 'Print', icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
];

// ── Safe Helpers ──
const safeArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

const isSuccessResponse = (response) => {
  if (!response) return false;
  return (
    response?.success === true ||
    response?.status === 'success' ||
    response?.status === 200 ||
    response?.status === 201 ||
    response?.data?.id !== undefined ||
    response?.data?.data?.id !== undefined
  );
};

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const RolePermissionManager = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Accordion States ──
  const [expandedGroups, setExpandedGroups] = useState({ bookings: true }); // Bookings open by default
  const [modalExpandedGroups, setModalExpandedGroups] = useState({ bookings: true });
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // ── Modals ──
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // ── Create Role Form ──
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [roleMatrix, setRoleMatrix] = useState({});

  // ── Assign Form ──
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roleRes, permRes, empRes] = await Promise.all([
        roleApi.getRoles().catch(() => ({ data: [] })),
        roleApi.getAllPermissions().catch(() => ({ data: [] })),
        employeeApi.getAll().catch(() => ({ data: [] }))
      ]);

      const roleList = safeArray(roleRes);
      setRoles(roleList);
      if (roleList.length > 0 && !activeRoleTab) setActiveRoleTab(roleList[0].id);

      const permList = safeArray(permRes);
      setPermissions(permList);

      const empList = safeArray(empRes);
      setEmployees(empList.filter(emp => emp.userId || emp.user));
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load permissions data');
    } finally {
      setLoading(false);
    }
  }, [activeRoleTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Matrix Helpers ──
  const initMatrix = () => {
    const matrix = {};
    ALL_MODULES.forEach(mod => {
      matrix[mod.key] = { view: true, create: false, edit: false, delete: false, export: false, print: false };
    });
    return matrix;
  };

  const handleModuleToggle = (modKey, action) => {
    setRoleMatrix(prev => ({
      ...prev,
      [modKey]: { ...prev[modKey], [action]: !prev[modKey]?.[action] }
    }));
  };

  const handleSelectAllModule = (modKey, checked) => {
    setRoleMatrix(prev => ({
      ...prev,
      [modKey]: {
        view: checked, create: checked, edit: checked,
        delete: checked, export: checked, print: checked
      }
    }));
  };

  // Group-level toggle inside Modal Matrix (One click gives or revokes access to all pages in this module)
  const handleSelectAllGroupInMatrix = (group, checked) => {
    setRoleMatrix(prev => {
      const next = { ...prev };
      group.modules.forEach(m => {
        next[m.key] = {
          view: checked, create: checked, edit: checked,
          delete: checked, export: checked, print: checked
        };
      });
      return next;
    });
    toast.success(`${group.label}: all permissions ${checked ? 'granted' : 'cleared'}`);
  };

  const handleSelectAllGlobal = (checked) => {
    const matrix = {};
    ALL_MODULES.forEach(mod => {
      matrix[mod.key] = {
        view: checked, create: checked, edit: checked,
        delete: checked, export: checked, print: checked
      };
    });
    setRoleMatrix(matrix);
  };

  // ── Accordion Toggles ──
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const expandAllGroups = (expand = true) => {
    const next = {};
    MODULE_GROUPS.forEach(g => { next[g.id] = expand; });
    setExpandedGroups(next);
  };

  const toggleModalGroup = (groupId) => {
    setModalExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const expandAllModalGroups = (expand = true) => {
    const next = {};
    MODULE_GROUPS.forEach(g => { next[g.id] = expand; });
    setModalExpandedGroups(next);
  };

  const openCreateModal = () => {
    setNewRoleName('');
    setNewRoleDesc('');
    setRoleMatrix(initMatrix());
    setModalExpandedGroups({ bookings: true });
    setModalSearchTerm('');
    setShowRoleModal(true);
  };

  const openDetailModal = (role) => {
    setSelectedRole(role);
    const matrix = initMatrix();
    permissions.filter(p => p.roleId === role.id).forEach(p => {
      if (matrix[p.resource]) matrix[p.resource][p.action] = p.allowed;
    });
    setRoleMatrix(matrix);
    setModalExpandedGroups({ bookings: true });
    setModalSearchTerm('');
    setShowDetailModal(true);
  };

  // ── Create Role ──
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return toast.error('Role name is required');

    try {
      setIsSaving(true);
      const permissionsToSave = [];
      Object.entries(roleMatrix).forEach(([resource, actions]) => {
        Object.entries(actions).forEach(([action, allowed]) => {
          if (allowed) permissionsToSave.push({ resource, action });
        });
      });

      if (permissionsToSave.length === 0) {
        return toast.error('Select at least one permission');
      }

      const result = await roleApi.createRoleWithPermissions({
        name: newRoleName,
        description: newRoleDesc,
        permissions: permissionsToSave
      });

      if (isSuccessResponse(result)) {
        toast.success('✅ Role created successfully!');
        setShowRoleModal(false);
        fetchData();
      } else {
        const errorMsg = result?.message || result?.error || 'Failed to create role';
        toast.error('❌ ' + errorMsg);
      }
    } catch (err) {
      console.error('❌ Create role error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to create role';
      toast.error('❌ ' + errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update Role Permissions ──
  const handleUpdateRolePerms = async () => {
    if (!selectedRole) return;
    try {
      setIsSaving(true);
      const promises = [];
      Object.entries(roleMatrix).forEach(([resource, actions]) => {
        Object.entries(actions).forEach(([action, allowed]) => {
          const existing = permissions.find(p =>
            p.roleId === selectedRole.id && p.resource === resource && p.action === action
          );
          if (existing) {
            promises.push(roleApi.updatePermission(existing.id, { allowed }));
          } else if (allowed) {
            promises.push(roleApi.savePermission({
              roleId: selectedRole.id, resource, action, allowed: true
            }));
          }
        });
      });
      await Promise.all(promises);
      toast.success('✅ Permissions updated!');
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      console.error('❌ Update permissions error:', err);
      toast.error('❌ Failed to update permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Assign Role ──
  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedRoleId) return toast.error('Select both employee and role');

    const emp = employees.find(e => e.id === parseInt(selectedEmpId));
    const userId = emp?.userId || emp?.user?.id;
    if (!userId) return toast.error('Employee has no login account!');

    try {
      const result = await roleApi.assignRole(userId, selectedRoleId);
      if (isSuccessResponse(result)) {
        toast.success('✅ Role assigned successfully!');
        setShowAssignModal(false);
        setSelectedEmpId('');
        setSelectedRoleId('');
        fetchData();
      } else {
        toast.error('❌ ' + (result?.message || 'Failed to assign role'));
      }
    } catch (err) {
      console.error('❌ Assign role error:', err);
      toast.error('❌ ' + (err?.response?.data?.message || err?.message || 'Failed to assign role'));
    }
  };

  // ── Live Permissions Helpers ──
  const hasPerm = (roleId, resource, action) => {
    return permissions.some(p => p.roleId === roleId && p.resource === resource && p.action === action && p.allowed);
  };

  const getPermissionCount = (roleId) => {
    return permissions.filter(p => p.roleId === roleId && p.allowed).length;
  };

  // Live toggle for a single action
  const handleLiveActionToggle = async (modKey, actionKey) => {
    if (!activeRoleTab) return;
    const existing = permissions.find(p =>
      p.roleId === activeRoleTab && p.resource === modKey && p.action === actionKey
    );
    try {
      if (existing) {
        await roleApi.updatePermission(existing.id, { allowed: !existing.allowed });
      } else {
        await roleApi.savePermission({
          roleId: activeRoleTab, resource: modKey, action: actionKey, allowed: true
        });
      }
      await fetchData();
      toast.success(`Permission updated`);
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  // Live toggle for entire module page
  const handleLiveModuleToggle = async (modKey, grant) => {
    if (!activeRoleTab) return;
    try {
      const updates = [];
      ACTION_DEFS.forEach(a => {
        const existing = permissions.find(p =>
          p.roleId === activeRoleTab && p.resource === modKey && p.action === a.key
        );
        if (existing) {
          if (existing.allowed !== grant) {
            updates.push(roleApi.updatePermission(existing.id, { allowed: grant }));
          }
        } else if (grant) {
          updates.push(roleApi.savePermission({
            roleId: activeRoleTab, resource: modKey, action: a.key, allowed: true
          }));
        }
      });
      if (updates.length > 0) await Promise.all(updates);
      await fetchData();
      toast.success(grant ? 'Full page access granted' : 'Page access revoked');
    } catch (err) {
      toast.error('Failed to update page');
    }
  };

  // Live toggle for whole group (e.g. all Bookings pages)
  const handleLiveGroupToggle = async (group, grant) => {
    if (!activeRoleTab) return;
    try {
      setIsSaving(true);
      const updates = [];
      group.modules.forEach(mod => {
        ACTION_DEFS.forEach(a => {
          const existing = permissions.find(p =>
            p.roleId === activeRoleTab && p.resource === mod.key && p.action === a.key
          );
          if (existing) {
            if (existing.allowed !== grant) {
              updates.push(roleApi.updatePermission(existing.id, { allowed: grant }));
            }
          } else if (grant) {
            updates.push(roleApi.savePermission({
              roleId: activeRoleTab, resource: mod.key, action: a.key, allowed: true
            }));
          }
        });
      });
      if (updates.length > 0) await Promise.all(updates);
      await fetchData();
      toast.success(`${group.label}: all pages ${grant ? 'granted' : 'revoked'}`);
    } catch (err) {
      toast.error('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups for search
  const filterGroupsBySearch = (query) => {
    if (!query || !query.trim()) return MODULE_GROUPS;
    const term = query.toLowerCase().trim();
    return MODULE_GROUPS.map(group => {
      const groupMatches = group.label.toLowerCase().includes(term);
      const matchedModules = group.modules.filter(m =>
        groupMatches ||
        m.label.toLowerCase().includes(term) ||
        m.key.toLowerCase().includes(term)
      );
      if (matchedModules.length === 0) return null;
      return { ...group, modules: matchedModules };
    }).filter(Boolean);
  };

  const filteredGroupsMain = useMemo(() => filterGroupsBySearch(searchTerm), [searchTerm]);
  const filteredGroupsModal = useMemo(() => filterGroupsBySearch(modalSearchTerm), [modalSearchTerm]);

  // ── Render ──
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-700 shadow-md text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Role & Permission Matrix</h1>
              <p className="text-sm text-gray-600">Define roles, group module permissions like sidebar, and assign to staff</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white border border-slate-300 text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <UserCheck size={16} /> Assign to Employee
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#2563EB] to-blue-700 text-white shadow-md hover:scale-[1.02] transition-all"
            >
              <Plus size={16} /> Create Role
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white border border-slate-300 text-gray-500 hover:text-[#2563EB] shadow-sm transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Roles', value: roles.length, icon: Shield, color: 'from-[#2563EB] to-blue-700' },
            { label: 'Active Permissions', value: permissions.filter(p => p.allowed).length, icon: Lock, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Staff with Roles', value: employees.length, icon: Users, color: 'from-blue-500 to-blue-600' },
            { label: 'Module Categories', value: MODULE_GROUPS.length, icon: LayoutGrid, color: 'from-purple-500 to-purple-600' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-300 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Role Cards */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Crown size={16} className="text-[#2563EB]" /> Available Roles
            </h3>
            {roles.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-300">
                <Shield className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No custom roles found</p>
              </div>
            ) : (
              roles.map(role => {
                const permCount = getPermissionCount(role.id);
                const isActive = activeRoleTab === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => setActiveRoleTab(role.id)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#2563EB] to-blue-700 text-white border-blue-600 shadow-md'
                        : 'bg-white border-slate-300 hover:border-[#2563EB] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-blue-50'}`}>
                          <Shield size={18} className={isActive ? 'text-white' : 'text-[#2563EB]'} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{role.name}</h4>
                          <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{role.slug}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {permCount} perms
                        </span>
                      </div>
                    </div>
                    {role.description && (
                      <p className={`text-xs mt-2 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                        {role.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3 pt-2 border-t border-white/20">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetailModal(role); }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                          isActive ? 'bg-white text-blue-700 shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Edit Permissions Matrix
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Grouped Accordion Permission Matrix */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
              {/* Header Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Lock size={18} className="text-[#2563EB]" />
                    {activeRoleTab ? `Permissions: ${roles.find(r => r.id === activeRoleTab)?.name}` : 'Permission Matrix'}
                  </h3>
                  <p className="text-xs text-gray-500">Grouped by module like the sidebar. Click group header to expand/collapse.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search pages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => expandAllGroups(true)}
                    className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-gray-600 hover:bg-slate-100"
                    title="Expand all groups"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={() => expandAllGroups(false)}
                    className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-gray-600 hover:bg-slate-100"
                    title="Collapse all groups"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Grouped Accordions */}
              <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
                {!activeRoleTab ? (
                  <div className="text-center py-12 text-gray-400">
                    <LayoutGrid size={48} className="mx-auto mb-3 opacity-30" />
                    <p>Select a role to view & configure permissions</p>
                  </div>
                ) : filteredGroupsMain.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No modules matching "{searchTerm}"</p>
                  </div>
                ) : (
                  filteredGroupsMain.map(group => {
                    const GroupIcon = group.icon || LayoutGrid;
                    const isExpanded = searchTerm ? true : !!expandedGroups[group.id];

                    // Calculate stats for this group
                    let groupPermCount = 0;
                    let groupTotalPossible = group.modules.length * ACTION_DEFS.length;
                    group.modules.forEach(mod => {
                      ACTION_DEFS.forEach(act => {
                        if (hasPerm(activeRoleTab, mod.key, act.key)) groupPermCount++;
                      });
                    });
                    const allGroupGranted = groupPermCount === groupTotalPossible && groupTotalPossible > 0;
                    const someGroupGranted = groupPermCount > 0 && !allGroupGranted;

                    return (
                      <div key={group.id} className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        {/* Group Header */}
                        <div
                          onClick={() => toggleGroup(group.id)}
                          className="flex items-center justify-between p-3.5 bg-slate-50/90 hover:bg-slate-100 cursor-pointer select-none transition-colors border-b border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${group.color} bg-white shadow-2xs`}>
                              <GroupIcon size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">{group.label}</h4>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                  {group.modules.length} {group.modules.length === 1 ? 'page' : 'pages'}
                                </span>
                                {groupPermCount > 0 && (
                                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                    {groupPermCount} perms
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {isExpanded ? 'Click to collapse' : 'Click to expand sub-pages'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {/* Fast Group-Level Toggle */}
                            <button
                              type="button"
                              onClick={() => handleLiveGroupToggle(group, !allGroupGranted)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                allGroupGranted
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : someGroupGranted
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                              }`}
                              title={allGroupGranted ? "Revoke all permissions in this group" : "Grant all permissions in this group"}
                            >
                              {allGroupGranted ? 'All Granted' : someGroupGranted ? 'Partial Access' : 'Grant Group'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleGroup(group.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                            >
                              <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Sub-pages Accordion Content */}
                        {isExpanded && (
                          <div className="p-3 space-y-2.5 bg-slate-50/40">
                            {group.modules.map(mod => {
                              const perms = {};
                              ACTION_DEFS.forEach(a => {
                                perms[a.key] = hasPerm(activeRoleTab, mod.key, a.key);
                              });
                              const allModGranted = ACTION_DEFS.every(a => perms[a.key]);

                              return (
                                <div key={mod.key} className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                      <div>
                                        <h5 className="font-bold text-slate-800 text-xs">{mod.label}</h5>
                                        <span className="text-[10px] text-slate-400 font-mono">{mod.key}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleLiveModuleToggle(mod.key, !allModGranted)}
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                        allModGranted
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {allModGranted ? 'Revoke Page' : 'Grant Page'}
                                    </button>
                                  </div>

                                  {/* Granular Action Buttons */}
                                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                    {ACTION_DEFS.map(action => (
                                      <button
                                        key={action.key}
                                        type="button"
                                        onClick={() => handleLiveActionToggle(mod.key, action.key)}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                          perms[action.key]
                                            ? `${action.bg} ${action.border} ${action.color} shadow-2xs`
                                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                        }`}
                                      >
                                        <action.icon size={13} />
                                        <span>{action.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CREATE ROLE MODAL (GROUPED ACCORDION) ── */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-300 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Crown size={20} className="text-[#2563EB]" /> Create New Role
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Define role and quickly grant permissions by module group</p>
                </div>
                <button onClick={() => setShowRoleModal(false)} className="p-2 rounded-xl hover:bg-gray-200 text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">Role Name *</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="e.g. Booking Manager"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">Description</label>
                    <input
                      type="text"
                      value={newRoleDesc}
                      onChange={e => setNewRoleDesc(e.target.value)}
                      placeholder="Brief role description..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Sub-Header & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Module Permissions (By Section)</h4>
                    <p className="text-xs text-slate-500">Click any section (e.g. Bookings) to expand its subpages, or use "Grant Group"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search sections..."
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        className="pl-7 pr-3 py-1 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-36"
                      />
                    </div>
                    <button type="button" onClick={() => expandAllModalGroups(true)} className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200">
                      Expand All
                    </button>
                    <button type="button" onClick={() => expandAllModalGroups(false)} className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200">
                      Collapse All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={() => handleSelectAllGlobal(true)} className="text-xs font-bold text-[#2563EB] hover:underline">
                      Grant All
                    </button>
                    <button type="button" onClick={() => handleSelectAllGlobal(false)} className="text-xs font-bold text-gray-500 hover:underline">
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Accordion List inside Create Modal */}
                <div className="space-y-3">
                  {filteredGroupsModal.map(group => {
                    const GroupIcon = group.icon || LayoutGrid;
                    const isExpanded = modalSearchTerm ? true : !!modalExpandedGroups[group.id];

                    let groupPermCount = 0;
                    const groupTotalPossible = group.modules.length * ACTION_DEFS.length;
                    group.modules.forEach(mod => {
                      const modPerms = roleMatrix[mod.key] || {};
                      ACTION_DEFS.forEach(act => {
                        if (modPerms[act.key]) groupPermCount++;
                      });
                    });
                    const allGroupGranted = groupPermCount === groupTotalPossible && groupTotalPossible > 0;
                    const someGroupGranted = groupPermCount > 0 && !allGroupGranted;

                    return (
                      <div key={group.id} className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        {/* Group Header */}
                        <div
                          onClick={() => toggleModalGroup(group.id)}
                          className="flex items-center justify-between p-3 bg-slate-50/90 hover:bg-slate-100 cursor-pointer select-none border-b border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${group.color} bg-white shadow-2xs`}>
                              <GroupIcon size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-800 text-sm">{group.label}</h5>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                  {group.modules.length} {group.modules.length === 1 ? 'page' : 'pages'}
                                </span>
                                {groupPermCount > 0 && (
                                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                    {groupPermCount} active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">Click to {isExpanded ? 'collapse' : 'expand'} subpages</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSelectAllGroupInMatrix(group, !allGroupGranted)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                allGroupGranted
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : someGroupGranted
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {allGroupGranted ? 'All Granted' : someGroupGranted ? 'Partial Access' : 'Grant Group'}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleModalGroup(group.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                            >
                              <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Sub-pages */}
                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-slate-50/30">
                            {group.modules.map(mod => {
                              const modPerms = roleMatrix[mod.key] || {};
                              const allSelected = ACTION_DEFS.every(a => modPerms[a.key]);

                              return (
                                <div key={mod.key} className="p-3 bg-white rounded-xl border border-slate-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <h6 className="font-bold text-xs text-slate-800">{mod.label}</h6>
                                      <span className="text-[10px] text-slate-400 font-mono">{mod.key}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllModule(mod.key, !allSelected)}
                                      className="text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                      {allSelected ? 'Clear Page' : 'Grant Page'}
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                    {ACTION_DEFS.map(action => (
                                      <button
                                        type="button"
                                        key={action.key}
                                        onClick={() => handleModuleToggle(mod.key, action.key)}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                          modPerms[action.key]
                                            ? `${action.bg} ${action.border} ${action.color} shadow-2xs`
                                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                        }`}
                                      >
                                        <action.icon size={13} />
                                        <span>{action.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-300">
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-blue-700 shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Creating...' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── ASSIGN ROLE MODAL ── */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-300 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <UserCheck size={20} className="text-emerald-600" /> Assign Role
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="p-2 rounded-xl hover:bg-gray-200 text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAssignRole} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">Login-Enabled Employee *</label>
                  <div className="relative">
                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={selectedEmpId}
                      onChange={e => setSelectedEmpId(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] appearance-none bg-white"
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} {emp.user?.email ? `(${emp.user.email})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {employees.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} /> No employees with login accounts found
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">Role *</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={selectedRoleId}
                      onChange={e => setSelectedRoleId(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] appearance-none bg-white"
                    >
                      <option value="">-- Select Role --</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-300">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm hover:opacity-95 flex items-center gap-2"
                  >
                    <Check size={16} /> Assign Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT ROLE DETAIL MODAL (GROUPED ACCORDION) ── */}
        {showDetailModal && selectedRole && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-300 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-[#2563EB] to-blue-700 flex items-center justify-between text-white">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Shield size={20} /> Permissions: {selectedRole.name}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">{selectedRole.description || 'Configure granular module permissions'}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-xl hover:bg-white/20 text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Sub-header controls */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Module Sections</span>
                  <span className="text-xs text-slate-500">({MODULE_GROUPS.length} total categories)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search section..."
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="pl-7 pr-3 py-1 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-36 bg-white"
                    />
                  </div>
                  <button type="button" onClick={() => expandAllModalGroups(true)} className="text-xs font-semibold px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100">
                    Expand All
                  </button>
                  <button type="button" onClick={() => expandAllModalGroups(false)} className="text-xs font-semibold px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100">
                    Collapse All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={() => handleSelectAllGlobal(true)} className="text-xs font-bold text-[#2563EB] hover:underline">
                    Grant All
                  </button>
                  <button type="button" onClick={() => handleSelectAllGlobal(false)} className="text-xs font-bold text-gray-500 hover:underline">
                    Clear All
                  </button>
                </div>
              </div>

              {/* Grouped Accordions inside Detail Modal */}
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {filteredGroupsModal.map(group => {
                  const GroupIcon = group.icon || LayoutGrid;
                  const isExpanded = modalSearchTerm ? true : !!modalExpandedGroups[group.id];

                  let groupPermCount = 0;
                  const groupTotalPossible = group.modules.length * ACTION_DEFS.length;
                  group.modules.forEach(mod => {
                    const modPerms = roleMatrix[mod.key] || {};
                    ACTION_DEFS.forEach(act => {
                      if (modPerms[act.key]) groupPermCount++;
                    });
                  });
                  const allGroupGranted = groupPermCount === groupTotalPossible && groupTotalPossible > 0;
                  const someGroupGranted = groupPermCount > 0 && !allGroupGranted;

                  return (
                    <div key={group.id} className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      {/* Group Header */}
                      <div
                        onClick={() => toggleModalGroup(group.id)}
                        className="flex items-center justify-between p-3.5 bg-slate-50/90 hover:bg-slate-100 cursor-pointer select-none border-b border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${group.color} bg-white shadow-2xs`}>
                            <GroupIcon size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{group.label}</h4>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                {group.modules.length} {group.modules.length === 1 ? 'page' : 'pages'}
                              </span>
                              {groupPermCount > 0 && (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                  {groupPermCount} active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {isExpanded ? 'Click to collapse' : 'Click to expand sub-pages'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroupInMatrix(group, !allGroupGranted)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                              allGroupGranted
                                ? 'bg-blue-600 text-white border-blue-600'
                                : someGroupGranted
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {allGroupGranted ? 'All Granted' : someGroupGranted ? 'Partial Access' : 'Grant Group'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleModalGroup(group.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                          >
                            <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Sub-pages */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 bg-slate-50/30">
                          {group.modules.map(mod => {
                            const modPerms = roleMatrix[mod.key] || {};
                            const allSelected = ACTION_DEFS.every(a => modPerms[a.key]);

                            return (
                              <div key={mod.key} className="p-3 bg-white rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h5 className="font-bold text-xs text-slate-800">{mod.label}</h5>
                                    <span className="text-[10px] text-slate-400 font-mono">{mod.key}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllModule(mod.key, !allSelected)}
                                    className="text-xs font-semibold text-blue-600 hover:underline"
                                  >
                                    {allSelected ? 'Clear Page' : 'Grant Page'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                  {ACTION_DEFS.map(action => (
                                    <button
                                      type="button"
                                      key={action.key}
                                      onClick={() => handleModuleToggle(mod.key, action.key)}
                                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                        modPerms[action.key]
                                          ? `${action.bg} ${action.border} ${action.color} shadow-2xs`
                                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                      }`}
                                    >
                                      <action.icon size={13} />
                                      <span>{action.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-300 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl font-bold text-sm text-gray-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRolePerms}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-blue-700 shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RolePermissionManager;