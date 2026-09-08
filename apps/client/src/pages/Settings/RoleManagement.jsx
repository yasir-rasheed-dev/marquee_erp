// src/pages/Security/RolePermissionManager.jsx
// COMPLETE FIXED - With proper response handling

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Plus, X, RefreshCw, Search, Check, ChevronDown,
  Eye, Edit3, Trash2, PlusCircle, Lock, Unlock, Crown, UserCheck,
  LayoutGrid, Save, AlertCircle, Coffee, Utensils, Package,
  ChefHat, Truck, Briefcase, BookOpen, Activity, Settings,
  Calendar, LayoutDashboard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import roleApi from '../../services/rolePermissionApi';
import employeeApi from '../../services/employeeApi';

// ── Module Definitions (Without Icons - SAFE) ──
const ALL_MODULES = [
  // Dashboard
  { key: 'dashboard', label: 'Dashboard', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  
  // Bookings
  { key: 'bookings_list', label: 'All Bookings', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'bookings_create', label: 'Create Booking', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'bookings_calendar', label: 'Booking Calendar', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  
  // Customers
  { key: 'customers', label: 'Guests', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'customers_add', label: 'Add Guest', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  
  // Events
  { key: 'events', label: 'Events', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'events_add', label: 'Add Event', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  
  // Services
  { key: 'services', label: 'Services', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'services_list', label: 'Services List', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  
  // Menu & Packages
  { key: 'menus', label: 'Menu', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'menus_add', label: 'Add Menu', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'menu_packages', label: 'Packages', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'menu_items', label: 'Menu Items', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'menu_categories', label: 'Categories', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'menu_units', label: 'Units', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // POS
  { key: 'pos', label: 'POS Terminal', color: 'bg-green-50 text-green-700 border-green-200' },
  
  // Inventory
  { key: 'inventory', label: 'Inventory', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'inventory_item_master', label: 'Item Master', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'inventory_stock_transfer', label: 'Stock Transfer', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'inventory_stock_adjustment', label: 'Stock Adjustment', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  
  // Kitchen
  { key: 'kitchen', label: 'Kitchen', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'kitchen_sheet', label: 'Kitchen Sheet', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'kds', label: 'KDS', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'production_plan', label: 'Production Plan', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'recipe_manager', label: 'Recipe Manager', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'wastage_log', label: 'Wastage Log', color: 'bg-red-50 text-red-700 border-red-200' },
  
  // Accounts
  { key: 'accounts', label: 'Accounts', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'accounts_list', label: 'Accounts List', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'payment_voucher', label: 'Payment Voucher', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'expense_voucher', label: 'Expense Voucher', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'voucher_list', label: 'Voucher List', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'ledger', label: 'Ledger', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'day_book', label: 'Day Book', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  
  // Fixed Assets
  { key: 'fixed_assets', label: 'Fixed Assets', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'fixed_assets_add', label: 'Add Asset', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'fixed_assets_adjustments', label: 'Asset Adjustments', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  
  // Procurement
  { key: 'procurement', label: 'Procurement', color: 'bg-slate-50 text-slate-700 border-slate-300' },
  { key: 'suppliers', label: 'Suppliers', color: 'bg-slate-50 text-slate-700 border-slate-300' },
  { key: 'purchase_orders', label: 'Purchase Orders', color: 'bg-slate-50 text-slate-700 border-slate-300' },
  { key: 'purchase_orders_create', label: 'Create PO', color: 'bg-slate-50 text-slate-700 border-slate-300' },
  { key: 'grn', label: 'GRN (Bills)', color: 'bg-slate-50 text-slate-700 border-slate-300' },
  { key: 'purchase_return', label: 'Purchase Return', color: 'bg-slate-50 text-slate-700 border-slate-300' },
  
  // HR
  { key: 'hr', label: 'HRM', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'staff_list', label: 'Staff List', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'employees_add', label: 'Add Employee', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'attendance', label: 'Attendance', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'payroll', label: 'Payroll', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'leave', label: 'Leave', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'advance_loan', label: 'Advance & Loan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'event_staff', label: 'Event Staff', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'hr_setup', label: 'HR Setup', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  
  // Reports
  { key: 'reports', label: 'Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_dashboard', label: 'Reports Dashboard', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'profit_loss', label: 'Profit & Loss', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_bookings', label: 'Booking & Event Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_inventory', label: 'Inventory & Stock Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_hr', label: 'HR & Payroll Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_finance', label: 'Financial Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_kitchen', label: 'Kitchen & Production Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_purchases', label: 'Supplier & Purchase Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'reports_customers', label: 'Customer & Sale Reports', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  
  // Settings
  { key: 'settings', label: 'Settings', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'settings_branches', label: 'Branch Settings', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'settings_halls', label: 'Hall Settings', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'settings_receipt', label: 'Receipt Settings', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'settings_tax', label: 'Tax Config', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'settings_roles', label: 'Roles', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'settings_backup', label: 'Backup', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

const ACTION_DEFS = [
  { key: 'view', label: 'View', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'create', label: 'Add', icon: PlusCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'edit', label: 'Edit', icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'delete', label: 'Delete', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'export', label: 'Export', icon: Unlock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'print', label: 'Print', icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
];

// ── Helper to safely extract array ──
const safeArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

// ✅ Helper to check if response is success
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

  const openCreateModal = () => {
    setNewRoleName('');
    setNewRoleDesc('');
    setRoleMatrix(initMatrix());
    setShowRoleModal(true);
  };

  const openDetailModal = (role) => {
    setSelectedRole(role);
    const matrix = initMatrix();
    permissions.filter(p => p.roleId === role.id).forEach(p => {
      if (matrix[p.resource]) matrix[p.resource][p.action] = p.allowed;
    });
    setRoleMatrix(matrix);
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

      console.log('📦 Create Role Response:', result);

      // ✅ FIX: Use isSuccessResponse helper
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

  // ── Check Permission ──
  const hasPerm = (roleId, resource, action) => {
    return permissions.some(p => p.roleId === roleId && p.resource === resource && p.action === action && p.allowed);
  };

  const getPermissionCount = (roleId) => {
    return permissions.filter(p => p.roleId === roleId && p.allowed).length;
  };

  const filteredModules = ALL_MODULES.filter(m => m.label.toLowerCase().includes(searchTerm.toLowerCase()));

  // ── Render ──
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-md text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Role & Permission Matrix</h1>
              <p className="text-sm text-gray-600">Define roles, set granular permissions, and assign to staff</p>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:scale-[1.02] transition-all"
            >
              <Plus size={16} /> Create Role
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white border border-slate-300 text-gray-500 hover:text-[#2563EB] shadow-sm transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Roles', value: roles.length, icon: Shield, color: 'from-[#2563EB] to-[#2563EB]' },
            { label: 'Active Permissions', value: permissions.filter(p => p.allowed).length, icon: Lock, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Staff with Roles', value: employees.length, icon: Users, color: 'from-blue-500 to-blue-600' },
            { label: 'Modules', value: ALL_MODULES.length, icon: LayoutGrid, color: 'from-purple-500 to-purple-600' }
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

        {/* ── ROLES LIST ── */}
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
                        ? 'bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white border-[#2563EB] shadow-md'
                        : 'bg-white border-slate-300 hover:border-[#2563EB] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-amber-100/80'}`}>
                          <Shield size={18} className={isActive ? 'text-white' : 'text-[#2563EB]'} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{role.name}</h4>
                          <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{role.slug}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          isActive ? 'bg-white/20' : 'bg-amber-100/80 text-[#8B6914]'
                        }`}>
                          {permCount} perms
                        </span>
                      </div>
                    </div>
                    {role.description && (
                      <p className={`text-xs mt-2 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                        {role.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetailModal(role); }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                          isActive ? 'bg-white text-[#2563EB]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Edit Matrix
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Permission Matrix */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Lock size={18} className="text-[#2563EB]" />
                  {activeRoleTab ? `Permissions: ${roles.find(r => r.id === activeRoleTab)?.name}` : 'Permission Matrix'}
                </h3>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-48"
                  />
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {activeRoleTab ? (
                  filteredModules.map(mod => {
                    const perms = {};
                    ACTION_DEFS.forEach(a => {
                      perms[a.key] = hasPerm(activeRoleTab, mod.key, a.key);
                    });

                    return (
                      <div key={mod.key} className="border border-slate-300 rounded-xl p-4 bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-gray-500">{mod.label.charAt(0)}</span>
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm">{mod.label}</h4>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{mod.key}</p>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={perms.view}
                              onChange={async () => {
                                const newVal = !perms.view;
                                try {
                                  if (!newVal) {
                                    const updates = [];
                                    ACTION_DEFS.forEach(a => {
                                      const existing = permissions.find(p =>
                                        p.roleId === activeRoleTab && p.resource === mod.key && p.action === a.key
                                      );
                                      if (existing && existing.allowed) {
                                        updates.push(roleApi.updatePermission(existing.id, { allowed: false }));
                                      }
                                    });
                                    if (updates.length > 0) await Promise.all(updates);
                                  } else {
                                    const existing = permissions.find(p =>
                                      p.roleId === activeRoleTab && p.resource === mod.key && p.action === 'view'
                                    );
                                    if (existing) {
                                      await roleApi.updatePermission(existing.id, { allowed: true });
                                    } else {
                                      await roleApi.savePermission({
                                        roleId: activeRoleTab, resource: mod.key, action: 'view', allowed: true
                                      });
                                    }
                                  }
                                  await fetchData();
                                  toast.success(newVal ? 'Module access granted' : 'Module access revoked');
                                } catch (err) {
                                  toast.error('Failed to update permission');
                                  console.error(err);
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <span className="text-xs font-semibold text-gray-600">Access</span>
                          </label>
                        </div>

                        {perms.view && (
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3 pt-3 border-t border-gray-100">
                            {ACTION_DEFS.map(action => (
                              <button
                                key={action.key}
                                onClick={async () => {
                                  const existing = permissions.find(p =>
                                    p.roleId === activeRoleTab && p.resource === mod.key && p.action === action.key
                                  );
                                  try {
                                    if (existing) {
                                      await roleApi.updatePermission(existing.id, { allowed: !existing.allowed });
                                    } else {
                                      await roleApi.savePermission({
                                        roleId: activeRoleTab, resource: mod.key, action: action.key, allowed: true
                                      });
                                    }
                                    await fetchData();
                                    toast.success(`${action.label} ${existing?.allowed ? 'removed' : 'granted'}`);
                                  } catch (err) {
                                    toast.error('Failed to update');
                                  }
                                }}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                                  perms[action.key]
                                    ? `${action.bg} ${action.border} ${action.color}`
                                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                <action.icon size={16} />
                                <span className="text-[10px] font-bold">{action.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <LayoutGrid size={48} className="mx-auto mb-3 opacity-30" />
                    <p>Select a role to view/edit permissions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CREATE ROLE MODAL ── */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-300 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Crown size={20} className="text-[#2563EB]" /> Create New Role
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Define role name and configure module permissions</p>
                </div>
                <button onClick={() => setShowRoleModal(false)} className="p-2 rounded-xl hover:bg-gray-200 text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">Role Name *</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="e.g. Senior Receptionist"
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
                      placeholder="Brief description..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800">Module Permissions</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleSelectAllGlobal(true)} className="text-xs font-bold text-[#2563EB] hover:text-[#8B6914]">
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={() => handleSelectAllGlobal(false)} className="text-xs font-bold text-gray-500 hover:text-gray-700">
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {ALL_MODULES.map(mod => {
                    const modPerms = roleMatrix[mod.key] || {};
                    const allSelected = Object.values(modPerms).every(Boolean);
                    const someSelected = Object.values(modPerms).some(Boolean) && !allSelected;

                    return (
                      <div key={mod.key} className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-500">{mod.label.charAt(0)}</span>
                            <div>
                              <h5 className="font-bold text-sm text-gray-800">{mod.label}</h5>
                              <p className="text-[10px] text-gray-400 uppercase">{mod.key}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectAllModule(mod.key, !allSelected)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                              allSelected ? 'bg-[#2563EB] text-white' : someSelected ? 'bg-amber-100/80 text-[#8B6914]' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {allSelected ? 'All Granted' : someSelected ? 'Partial' : 'Grant All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {ACTION_DEFS.map(action => (
                            <button
                              type="button"
                              key={action.key}
                              onClick={() => handleModuleToggle(mod.key, action.key)}
                              className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                modPerms[action.key]
                                  ? `${action.bg} ${action.border} ${action.color}`
                                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <action.icon size={14} />
                              <span className="text-[10px] font-bold">{action.label}</span>
                            </button>
                          ))}
                        </div>
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
                    className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
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

        {/* ── EDIT ROLE DETAIL MODAL ── */}
        {showDetailModal && selectedRole && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-300 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-[#2563EB] to-[#2563EB] flex items-center justify-between text-white">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Shield size={20} /> {selectedRole.name}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">{selectedRole.description || 'No description'}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-xl hover:bg-white/20 text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
                {ALL_MODULES.map(mod => {
                  const modPerms = roleMatrix[mod.key] || {};
                  return (
                    <div key={mod.key} className="border border-slate-300 rounded-xl p-4 bg-slate-50/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-gray-500">{mod.label.charAt(0)}</span>
                          <h5 className="font-bold text-sm text-gray-800">{mod.label}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectAllModule(mod.key, !Object.values(modPerms).every(Boolean))}
                          className="text-xs font-bold px-3 py-1 rounded-lg bg-white border border-slate-300 text-gray-600 hover:border-[#2563EB]"
                        >
                          Toggle All
                        </button>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {ACTION_DEFS.map(action => (
                          <button
                            type="button"
                            key={action.key}
                            onClick={() => handleModuleToggle(mod.key, action.key)}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                              modPerms[action.key]
                                ? `${action.bg} ${action.border} ${action.color}`
                                : 'bg-white border-gray-200 text-gray-400'
                            }`}
                          >
                            <action.icon size={14} />
                            <span className="text-[10px] font-bold">{action.label}</span>
                          </button>
                        ))}
                      </div>
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
                  className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
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