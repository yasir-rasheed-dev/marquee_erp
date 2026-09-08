// src/pages/HR/DepartmentDesignationManager.jsx
// COMPLETE - With React Hot Toast + Pagination + Cards/Table View

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, Briefcase, Plus, Edit, Trash2, X,
  Search, RefreshCw, Save, AlertCircle, Check,
  LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import employeeApi from '../../services/employeeApi';

// ── Helpers ──
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const capitalize = (str) => {
  if (!str) return '-';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

const PAGE_SIZE = 6;

// ── Response Check Helper ──
const isSuccessResponse = (response) => {
  if (!response) return false;
  
  return (
    response?.data?.success === true ||
    response?.data?.status === 'success' ||
    response?.status === 200 ||
    response?.status === 201 ||
    response?.data?.id !== undefined ||
    response?.data?.data?.id !== undefined ||
    response?.data?.data !== undefined
  );
};

const getErrorMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return 'Something went wrong';
};

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const DepartmentDesignationManager = () => {
  // ── State ──
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [branchId, setBranchId] = useState(null);

  // ── Pagination States ──
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('cards');

  // ── Search States ──
  const [search, setSearch] = useState('');

  // ── Department Form ──
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [deptLoading, setDeptLoading] = useState(false);

  // ── Designation Form ──
  const [desigFormOpen, setDesigFormOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);
  const [desigForm, setDesigForm] = useState({
    name: '',
    code: '',
    description: '',
    defaultSalary: '',
    defaultSalaryType: 'fixed_monthly'
  });
  const [desigLoading, setDesigLoading] = useState(false);

  // ── Delete Modal ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Toast Helpers ──
  const showSuccess = (msg) => toast.success(msg, { icon: '✅' });
  const showError = (msg) => toast.error(msg, { icon: '❌' });
  const showLoading = (msg) => toast.loading(msg);

  // ── Get Branch ID on mount ──
  useEffect(() => {
    const id = getSelectedBranchId();
    setBranchId(id);
  }, []);

  // ── Fetch Data ──
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (branchId) params.branchId = branchId;
      if (search) params.search = search;
      
      const response = await employeeApi.getAllDepartments(params);
      const data = response?.data?.data || response?.data || [];
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Fetch departments error:', err);
      setError('Failed to load departments: ' + (err.message || ''));
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (branchId) params.branchId = branchId;
      if (search) params.search = search;
      
      const response = await employeeApi.getAllDesignations(params);
      const data = response?.data?.data || response?.data || [];
      setDesignations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Fetch designations error:', err);
      setError('Failed to load designations: ' + (err.message || ''));
      setDesignations([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch when branchId, tab, or search changes
  useEffect(() => {
    if (branchId) {
      setCurrentPage(1);
      if (activeTab === 'departments') {
        fetchDepartments();
      } else {
        fetchDesignations();
      }
    }
  }, [activeTab, branchId, search]);

  // ── Pagination Calculations ──
  const currentItems = activeTab === 'departments' ? departments : designations;
  const totalCount = currentItems.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);
  const paginatedItems = currentItems.slice(startIndex, endIndex);

  // ── Department Handlers ──
  const openDeptForm = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        name: dept.name || '',
        code: dept.code || '',
        description: dept.description || ''
      });
    } else {
      setEditingDept(null);
      setDeptForm({ name: '', code: '', description: '' });
    }
    setDeptFormOpen(true);
  };

  const handleDeptChange = (e) => {
    const { name, value } = e.target;
    setDeptForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      showError('Department name is required');
      return;
    }

    const toastId = showLoading(editingDept ? 'Updating department...' : 'Creating department...');
    
    try {
      setDeptLoading(true);
      const payload = { ...deptForm, branchId };
      
      let result;
      if (editingDept) {
        result = await employeeApi.updateDepartment(editingDept.id, payload);
      } else {
        result = await employeeApi.createDepartment(payload);
      }

      console.log('📦 Dept Response:', result);
      console.log('📦 Dept Data:', result.data);

      if (isSuccessResponse(result)) {
        toast.dismiss(toastId);
        showSuccess(editingDept ? 'Department updated successfully!' : 'Department created successfully!');
        setDeptFormOpen(false);
        fetchDepartments();
      } else {
        toast.dismiss(toastId);
        const msg = result?.data?.message || result?.data?.error || 'Operation failed';
        showError(msg);
      }
    } catch (err) {
      console.error('❌ Department save error:', err);
      toast.dismiss(toastId);
      showError(getErrorMessage(err));
    } finally {
      setDeptLoading(false);
    }
  };

  const handleDeptDelete = async () => {
    const toastId = showLoading('Deleting department...');
    
    try {
      setDeleteLoading(true);
      const result = await employeeApi.deleteDepartment(deleteItem.id);
      
      if (isSuccessResponse(result) || result?.data?.message) {
        toast.dismiss(toastId);
        showSuccess('Department deleted successfully!');
        setDeleteModalOpen(false);
        fetchDepartments();
      } else {
        toast.dismiss(toastId);
        showError(result?.data?.message || 'Cannot delete department');
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
      toast.dismiss(toastId);
      showError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Designation Handlers ──
  const openDesigForm = (desig = null) => {
    if (desig) {
      setEditingDesig(desig);
      setDesigForm({
        name: desig.name || '',
        code: desig.code || '',
        description: desig.description || '',
        defaultSalary: desig.defaultSalary?.toString() || '',
        defaultSalaryType: desig.defaultSalaryType || 'fixed_monthly'
      });
    } else {
      setEditingDesig(null);
      setDesigForm({
        name: '',
        code: '',
        description: '',
        defaultSalary: '',
        defaultSalaryType: 'fixed_monthly'
      });
    }
    setDesigFormOpen(true);
  };

  const handleDesigChange = (e) => {
    const { name, value } = e.target;
    setDesigForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDesigSubmit = async (e) => {
    e.preventDefault();
    if (!desigForm.name.trim()) {
      showError('Designation name is required');
      return;
    }

    const toastId = showLoading(editingDesig ? 'Updating designation...' : 'Creating designation...');
    
    try {
      setDesigLoading(true);
      const payload = {
        ...desigForm,
        defaultSalary: parseFloat(desigForm.defaultSalary) || 0,
        branchId
      };
      
      let result;
      if (editingDesig) {
        result = await employeeApi.updateDesignation(editingDesig.id, payload);
      } else {
        result = await employeeApi.createDesignation(payload);
      }

      console.log('📦 Desig Response:', result);
      console.log('📦 Desig Data:', result.data);

      if (isSuccessResponse(result)) {
        toast.dismiss(toastId);
        showSuccess(editingDesig ? 'Designation updated successfully!' : 'Designation created successfully!');
        setDesigFormOpen(false);
        fetchDesignations();
      } else {
        toast.dismiss(toastId);
        const msg = result?.data?.message || result?.data?.error || 'Operation failed';
        showError(msg);
      }
    } catch (err) {
      console.error('❌ Designation save error:', err);
      toast.dismiss(toastId);
      showError(getErrorMessage(err));
    } finally {
      setDesigLoading(false);
    }
  };

  const handleDesigDelete = async () => {
    const toastId = showLoading('Deleting designation...');
    
    try {
      setDeleteLoading(true);
      const result = await employeeApi.deleteDesignation(deleteItem.id);
      
      if (isSuccessResponse(result) || result?.data?.message) {
        toast.dismiss(toastId);
        showSuccess('Designation deleted successfully!');
        setDeleteModalOpen(false);
        fetchDesignations();
      } else {
        toast.dismiss(toastId);
        showError(result?.data?.message || 'Cannot delete designation');
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
      toast.dismiss(toastId);
      showError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteModal = (item, type) => {
    setDeleteItem(item);
    setDeleteType(type);
    setDeleteModalOpen(true);
  };

  // ── Render Department Card ──
  const renderDeptCard = (dept) => (
    <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-800 truncate">{dept.name}</h3>
          </div>
          {dept.code && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600">
              {dept.code}
            </span>
          )}
          {dept.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dept.description}</p>
          )}
        </div>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
          {dept._count?.employees || 0} employees
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">{formatDate(dept.createdAt)}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openDeptForm(dept)}
            className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
            title="Edit"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => openDeleteModal(dept, 'department')}
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render Designation Card ──
  const renderDesigCard = (desig) => (
    <div key={desig.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-800 truncate">{desig.name}</h3>
          </div>
          {desig.code && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600">
              {desig.code}
            </span>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-green-600">Rs. {desig.defaultSalary?.toLocaleString() || '0'}</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
              {desig.defaultSalaryType?.replace(/_/g, ' ') || '-'}
            </span>
          </div>
          {desig.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{desig.description}</p>
          )}
        </div>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
          {desig._count?.employees || 0} employees
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">{formatDate(desig.createdAt)}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openDesigForm(desig)}
            className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
            title="Edit"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => openDeleteModal(desig, 'designation')}
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Loading ──
  if (loading && departments.length === 0 && designations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ── RENDER ──
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Department & Designation Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage departments and designations for employee setup
            {branchId && <span className="ml-2 text-blue-600">• Branch ID: {branchId}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              if (activeTab === 'departments') {
                openDeptForm();
              } else {
                openDesigForm();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus size={18} />
            Add {activeTab === 'departments' ? 'Department' : 'Designation'}
          </button>
          <button
            onClick={() => {
              if (activeTab === 'departments') {
                fetchDepartments();
              } else {
                fetchDesignations();
              }
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'departments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 size={16} />
              Departments ({departments.length})
            </button>
            <button
              onClick={() => setActiveTab('designations')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'designations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase size={16} />
              Designations ({designations.length})
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* ── Search Bar + View Toggle ── */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeTab === 'departments' ? 'departments' : 'designations'} by name or code...`}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="Card View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="Table View"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {activeTab === 'departments' ? (
            // ── Departments Content ──
            paginatedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No departments found</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Department" to create one</p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map(renderDeptCard)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-center">Employees</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedItems.map((dept, index) => (
                      <tr key={dept.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{startIndex + index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{dept.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {dept.code ? (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{dept.code}</span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{dept.description || '-'}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {dept._count?.employees || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(dept.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDeptForm(dept)}
                              className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(dept, 'department')}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // ── Designations Content ──
            paginatedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No designations found</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Designation" to create one</p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map(renderDesigCard)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Default Salary</th>
                      <th className="px-4 py-3 text-left">Salary Type</th>
                      <th className="px-4 py-3 text-center">Employees</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedItems.map((desig, index) => (
                      <tr key={desig.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{startIndex + index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{desig.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {desig.code ? (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{desig.code}</span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          Rs. {desig.defaultSalary?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
                            {desig.defaultSalaryType?.replace(/_/g, ' ') || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {desig._count?.employees || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(desig.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDesigForm(desig)}
                              className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(desig, 'designation')}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Pagination ── */}
          {totalCount > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-700">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-gray-700">{endIndex}</span> of{' '}
                <span className="font-semibold text-gray-700">{totalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 10) {
                      pageNum = i + 1;
                    } else if (currentPage <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 4) {
                      pageNum = totalPages - 9 + i;
                    } else {
                      pageNum = currentPage - 5 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── DEPARTMENT FORM MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {deptFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeptFormOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Building2 size={22} className="text-blue-600" />
                  {editingDept ? 'Edit Department' : 'Add Department'}
                </h2>
                <button onClick={() => setDeptFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDeptSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={deptForm.name}
                    onChange={handleDeptChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    required
                    placeholder="e.g., Human Resources"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    name="code"
                    value={deptForm.code}
                    onChange={handleDeptChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="e.g., HR"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={deptForm.description}
                    onChange={handleDeptChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Department description..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setDeptFormOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deptLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {deptLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {deptLoading ? 'Saving...' : editingDept ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── DESIGNATION FORM MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {desigFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDesigFormOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Briefcase size={22} className="text-blue-600" />
                  {editingDesig ? 'Edit Designation' : 'Add Designation'}
                </h2>
                <button onClick={() => setDesigFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDesigSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={desigForm.name}
                    onChange={handleDesigChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    required
                    placeholder="e.g., HR Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    name="code"
                    value={desigForm.code}
                    onChange={handleDesigChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="e.g., HRM"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Salary</label>
                    <input
                      type="number"
                      name="defaultSalary"
                      value={desigForm.defaultSalary}
                      onChange={handleDesigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                    <select
                      name="defaultSalaryType"
                      value={desigForm.defaultSalaryType}
                      onChange={handleDesigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="fixed_monthly">Fixed Monthly</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="per_event">Per Event</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={desigForm.description}
                    onChange={handleDesigChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Designation description..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setDesigFormOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={desigLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {desigLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {desigLoading ? 'Saving...' : editingDesig ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── DELETE CONFIRMATION MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {deleteModalOpen && deleteItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800">Delete {capitalize(deleteType)}</h3>
                  <p className="text-gray-500 mt-2">
                    Are you sure you want to delete <span className="font-semibold">{deleteItem.name}</span>?
                  </p>
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    ⚠️ This action cannot be undone.
                    {deleteItem._count?.employees > 0 && ` This ${deleteType} has ${deleteItem._count.employees} employee(s) linked.`}
                  </p>
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteType === 'department' ? handleDeptDelete : handleDesigDelete}
                    disabled={deleteLoading || deleteItem._count?.employees > 0}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {deleteLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDesignationManager;