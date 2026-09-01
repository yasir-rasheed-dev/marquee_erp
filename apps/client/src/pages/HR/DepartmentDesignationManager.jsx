// src/pages/HR/DepartmentDesignationManager.jsx
import React, { useState, useEffect } from 'react';
import {
  Building2, Briefcase, Plus, Edit, Trash2, X,
  Search, RefreshCw, Save, AlertCircle, Check
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

// ✅ Get selected branch from localStorage
const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
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

  // ── Get Branch ID on mount ──
  useEffect(() => {
    const id = getSelectedBranchId();
    setBranchId(id);
    console.log('🔍 Selected Branch ID:', id);
  }, []);

  // ── Fetch Data ──
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ Pass branchId in params
      const params = {};
      if (branchId) {
        params.branchId = branchId;
      }
      
      console.log('📥 Fetching departments with params:', params);
      const response = await employeeApi.getAllDepartments(params);
      console.log('✅ Departments response:', response.data);
      
      // ✅ Handle both response formats
      const data = response.data.data || response.data || [];
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
      
      // ✅ Pass branchId in params
      const params = {};
      if (branchId) {
        params.branchId = branchId;
      }
      
      console.log('📥 Fetching designations with params:', params);
      const response = await employeeApi.getAllDesignations(params);
      console.log('✅ Designations response:', response.data);
      
      // ✅ Handle both response formats
      const data = response.data.data || response.data || [];
      setDesignations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Fetch designations error:', err);
      setError('Failed to load designations: ' + (err.message || ''));
      setDesignations([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch when branchId changes or tab changes
  useEffect(() => {
    if (branchId) {
      if (activeTab === 'departments') {
        fetchDepartments();
      } else {
        fetchDesignations();
      }
    }
  }, [activeTab, branchId]);

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
      alert('Department name is required');
      return;
    }

    try {
      setDeptLoading(true);
      
      // ✅ Add branchId to payload
      const payload = {
        ...deptForm,
        branchId: branchId
      };
      
      console.log('📤 Creating department with payload:', payload);
      
      let result;
      if (editingDept) {
        result = await employeeApi.updateDepartment(editingDept.id, payload);
      } else {
        result = await employeeApi.createDepartment(payload);
      }

      console.log('✅ Department save response:', result.data);

      if (result.data.success) {
        alert(editingDept ? 'Department updated!' : 'Department created!');
        setDeptFormOpen(false);
        fetchDepartments(); // ✅ Refresh list
      } else {
        alert(result.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('❌ Department save error:', err);
      alert(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleDeptDelete = async () => {
    try {
      setDeleteLoading(true);
      const result = await employeeApi.deleteDepartment(deleteItem.id);
      if (result.data.success) {
        alert('Department deleted successfully');
        setDeleteModalOpen(false);
        fetchDepartments(); // ✅ Refresh list
      } else {
        alert(result.data.message || 'Cannot delete department with linked employees');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error(err);
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
      alert('Designation name is required');
      return;
    }

    try {
      setDesigLoading(true);
      
      // ✅ Add branchId to payload
      const payload = {
        ...desigForm,
        defaultSalary: parseFloat(desigForm.defaultSalary) || 0,
        branchId: branchId
      };
      
      console.log('📤 Creating designation with payload:', payload);
      
      let result;
      if (editingDesig) {
        result = await employeeApi.updateDesignation(editingDesig.id, payload);
      } else {
        result = await employeeApi.createDesignation(payload);
      }

      console.log('✅ Designation save response:', result.data);

      if (result.data.success) {
        alert(editingDesig ? 'Designation updated!' : 'Designation created!');
        setDesigFormOpen(false);
        fetchDesignations(); // ✅ Refresh list
      } else {
        alert(result.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('❌ Designation save error:', err);
      alert(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setDesigLoading(false);
    }
  };

  const handleDesigDelete = async () => {
    try {
      setDeleteLoading(true);
      const result = await employeeApi.deleteDesignation(deleteItem.id);
      if (result.data.success) {
        alert('Designation deleted successfully');
        setDeleteModalOpen(false);
        fetchDesignations(); // ✅ Refresh list
      } else {
        alert(result.data.message || 'Cannot delete designation with linked employees');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Open Delete Modal ──
  const openDeleteModal = (item, type) => {
    setDeleteItem(item);
    setDeleteType(type);
    setDeleteModalOpen(true);
  };

  // ── Loading ──
  if (loading && departments.length === 0 && designations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
        <div className="flex gap-2">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
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
          
          {activeTab === 'departments' ? (
            // ── Departments Table ──
            departments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No departments found</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Department" to create one</p>
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
                    {departments.map((dept, index) => (
                      <tr key={dept.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
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
            // ── Designations Table ──
            designations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No designations found</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Designation" to create one</p>
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
                    {designations.map((desig, index) => (
                      <tr key={desig.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
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
                            {desig.defaultSalaryType?.replace('_', ' ') || '-'}
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
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                  <h3 className="text-xl font-bold text-gray-800">Delete {deleteType}</h3>
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
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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