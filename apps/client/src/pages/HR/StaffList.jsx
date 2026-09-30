// src/pages/HR/StaffList.jsx

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, X, RefreshCw, Eye, Edit, Trash2,
  Users, UserCheck, UserX, Calendar, Briefcase, UserMinus,
  Phone, Mail, BadgeCheck, DollarSign, User, Save,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import employeeApi from '../../services/employeeApi';
import { useBranch } from '../../context/BranchContext';
import { formatPhone, formatCnic, validateEmail, isEmailInvalid } from '../../utils/validators';


// ── Helpers ──
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const formatCurrency = (amount) => {
  if (!amount) return '0';
  return amount.toLocaleString('en-PK', { minimumFractionDigits: 0 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getStatusBadge = (status) => {
  const map = {
    active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
    on_leave: { label: 'On Leave', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    terminated: { label: 'Terminated', color: 'bg-red-100 text-red-800 border-red-200' },
    suspended: { label: 'Suspended', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };
  return map[status?.toLowerCase()] || map.inactive;
};

const getSalaryTypeLabel = (type) => {
  const map = {
    fixed_monthly: 'Monthly',
    hourly: 'Hourly',
    daily: 'Daily',
    per_event: 'Per Event'
  };
  return map[type] || type || '-';
};

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const StaffList = () => {
  // ── State ──
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    departmentId: '',
    designationId: '',
    salaryType: ''
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // ── Form State ──
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cnic: '',
    fatherName: '',
    dateOfBirth: '',
    gender: 'male',
    maritalStatus: 'single',
    address: '',
    city: '',
    emergencyContact: '',
    emergencyName: '',
    designationId: '',
    departmentId: '',
    joinDate: new Date().toISOString().split('T')[0],
    salaryType: 'fixed_monthly',
    basicSalary: '0',
    perEventRate: '',
    hourlyRate: '',
    dailyRate: '',
    openingBalance: '0',
    notes: '',
    status: 'active'
  });

  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch Employees ──
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        departmentId: filters.departmentId || undefined,
        designationId: filters.designationId || undefined,
        salaryType: filters.salaryType || undefined,
        page: page,
        limit: pageSize
      };

      console.log('📥 Fetching employees with params:', params);

      const response = await employeeApi.getAll(params);

      console.log('📥 Employee API Response:', response);

      // ✅ FIXED: Handle response properly
      let employeesData = [];
      let total = 0;

      // ✅ API returns: { success: true, count: 1, data: [{...}] }
      if (response && response.success) {
        // ✅ Direct data array - FIXED
        employeesData = response.data || [];
        total = response.count || employeesData.length || 0;
      } 
      // Fallback for other response formats
      else if (response && response.data) {
        if (Array.isArray(response.data)) {
          employeesData = response.data;
          total = employeesData.length;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
          total = response.data.count || response.data.total || 0;
        }
      }

      console.log('✅ Setting employees:', employeesData.length, 'records');
      if (employeesData.length > 0) {
        console.log('✅ Sample employee:', employeesData[0]);
      }

      setEmployees(employeesData);
      setTotalCount(total);

    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message || 'Failed to load employees');
      setEmployees([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Departments & Designations ──
  const fetchDepartments = async () => {
    try {
      const response = await employeeApi.getAllDepartments();
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (err) {
      console.error('Departments fetch error:', err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await employeeApi.getAllDesignations();
      if (response.success) {
        setDesignations(response.data || []);
      }
    } catch (err) {
      console.error('Designations fetch error:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [filters, page]);

  useEffect(() => {
    fetchDepartments();
    fetchDesignations();
  }, []);

  // ── Handlers ──
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      departmentId: '',
      designationId: '',
      salaryType: ''
    });
    setPage(1);
  };

  const hasFilters = filters.search || filters.status ||
    filters.departmentId || filters.designationId ||
    filters.salaryType;

  // ── Open Add Modal ──
  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      cnic: '',
      fatherName: '',
      dateOfBirth: '',
      gender: 'male',
      maritalStatus: 'single',
      address: '',
      city: '',
      emergencyContact: '',
      emergencyName: '',
      designationId: '',
      departmentId: '',
      joinDate: new Date().toISOString().split('T')[0],
      salaryType: 'fixed_monthly',
      basicSalary: '0',
      perEventRate: '',
      hourlyRate: '',
      dailyRate: '',
      openingBalance: '0',
      notes: '',
      status: 'active'
    });
    setModalOpen(true);
  };

  // ── Open Edit Modal ──
  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      phone: employee.phone || '',
      email: employee.email || '',
      cnic: employee.cnic || '',
      fatherName: employee.fatherName || '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      gender: employee.gender || 'male',
      maritalStatus: employee.maritalStatus || 'single',
      address: employee.address || '',
      city: employee.city || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyName: employee.emergencyName || '',
      designationId: employee.designationId || '',
      departmentId: employee.departmentId || '',
      joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      salaryType: employee.salaryType || 'fixed_monthly',
      basicSalary: employee.basicSalary?.toString() || '0',
      perEventRate: employee.perEventRate?.toString() || '',
      hourlyRate: employee.hourlyRate?.toString() || '',
      dailyRate: employee.dailyRate?.toString() || '',
      openingBalance: employee.openingBalance?.toString() || '0',
      notes: employee.notes || '',
      status: employee.status || 'active'
    });
    setModalOpen(true);
  };

  // ── Form Change ──
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === 'phone' || name === 'emergencyContact') {
      val = formatPhone(value);
    } else if (name === 'cnic') {
      val = formatCnic(value);
    }
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  // ── Submit Form ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      alert('Phone is required');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 0300-1234567 or 042-12345678)');
      return;
    }
    if (formData.emergencyContact && formData.emergencyContact.replace(/\D/g, '').length !== 11) {
      alert('Emergency contact must be exactly 11 digits');
      return;
    }
    if (formData.cnic && formData.cnic.replace(/\D/g, '').length !== 13) {
      alert('CNIC must be 13 digits (e.g. 31203-4256351-7)');
      return;
    }
    if (formData.email && formData.email.trim() && !validateEmail(formData.email.trim())) {
      alert('Please enter a valid email address (e.g. employee@gmail.com, name@company.com)');
      return;
    }
    if (!formData.designationId) {
      alert('Designation is required');
      return;
    }

    try {
      setFormLoading(true);

      const payload = {
        ...formData,
        basicSalary: parseFloat(formData.basicSalary) || 0,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        perEventRate: formData.perEventRate ? parseFloat(formData.perEventRate) : undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
        designationId: parseInt(formData.designationId),
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
      };

      console.log('📤 Submitting payload:', payload);

      let result;
      if (editingEmployee) {
        result = await employeeApi.update(editingEmployee.id, payload);
      } else {
        result = await employeeApi.create(payload);
      }

      console.log('✅ Submit response:', result);

      if (result && result.success) {
        alert(editingEmployee ? 'Employee updated successfully!' : 'Employee created successfully!');
        setModalOpen(false);
        setPage(1);
        await fetchEmployees();
      } else {
        alert(result?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('❌ Submit error:', err);
      alert(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete Employee ──
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      setDeletingId(id);
      const result = await employeeApi.delete(id);
      if (result && result.success) {
        alert('Employee deleted successfully');
        await fetchEmployees();
      } else {
        alert(result?.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── View Employee ──
  const openViewModal = (employee) => {
    setViewingEmployee(employee);
    setViewModalOpen(true);
  };

  // ── Stats ──
  const stats = {
    total: totalCount,
    active: employees.filter(e => e.status === 'active').length,
    onLeave: employees.filter(e => e.status === 'on_leave').length,
    terminated: employees.filter(e => e.status === 'terminated').length,
    departments: new Set(employees.map(e => e.department?.name)).size,
    designations: new Set(employees.map(e => e.designation?.name)).size
  };

  // ── Status Options ──
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const salaryTypeOptions = [
    { value: '', label: 'All Salary Types' },
    { value: 'fixed_monthly', label: 'Fixed Monthly' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'per_event', label: 'Per Event' }
  ];

  // ── Loading ──
  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  // ── RENDER ──
  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Staff Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all employees across branches • <span className="font-medium">{totalCount}</span> total records
          </p>
        </div>
        {/* <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Add Employee
        </button> */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Active', value: stats.active, icon: UserCheck, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'On Leave', value: stats.onLeave, icon: Calendar, bg: 'bg-yellow-50', text: 'text-yellow-600' },
          { label: 'Terminated', value: stats.terminated, icon: UserX, bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'Departments', value: stats.departments, icon: Briefcase, bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Designations', value: stats.designations, icon: UserMinus, bg: 'bg-indigo-50', text: 'text-indigo-600' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.text}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, code, phone, CNIC..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="min-w-[130px]">
            <ReactSelect
              value={filters.status}
              onChange={(val) => handleFilterChange('status', val || '')}
              options={statusOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              placeholder="All Status"
              isSearchable={false}
              isClearable={false}
            />
          </div>
          <div className="min-w-[150px]">
            <ReactSelect
              value={filters.departmentId}
              onChange={(val) => handleFilterChange('departmentId', val || '')}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map(dept => ({ value: String(dept.id), label: dept.name }))
              ]}
              placeholder="All Departments"
              isSearchable={true}
              isClearable={false}
            />
          </div>
          <div className="min-w-[150px]">
            <ReactSelect
              value={filters.designationId}
              onChange={(val) => handleFilterChange('designationId', val || '')}
              options={[
                { value: '', label: 'All Designations' },
                ...designations.map(desig => ({ value: String(desig.id), label: desig.name }))
              ]}
              placeholder="All Designations"
              isSearchable={true}
              isClearable={false}
            />
          </div>
          <div className="min-w-[140px]">
            <ReactSelect
              value={filters.salaryType}
              onChange={(val) => handleFilterChange('salaryType', val || '')}
              options={salaryTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              placeholder="All Salary Types"
              isSearchable={false}
              isClearable={false}
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <X size={16} />
              Clear
            </button>
          )}
          <button
            onClick={fetchEmployees}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Designation</th>
                <th className="px-4 py-3 text-left">Salary</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No employees found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters</p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const statusBadge = getStatusBadge(emp.status);
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openViewModal(emp)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{emp.name}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <BadgeCheck size={11} />
                              {emp.employeeCode || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={13} className="text-gray-400" />
                            {emp.phone}
                          </div>
                          {emp.email && (
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                              <Mail size={13} />
                              <span className="truncate max-w-[140px]">{emp.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {emp.department ? (
                          <span className="text-gray-700">{emp.department.name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {emp.designation ? (
                          <span className="text-gray-700">{emp.designation.name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-700 text-sm">
                            Rs. {formatCurrency(emp.basicSalary || 0)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {getSalaryTypeLabel(emp.salaryType)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {emp.joinDate && (
                            <div className="text-xs text-gray-400">
                              Joined: {formatDate(emp.joinDate)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openViewModal(emp); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(emp); }}
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(emp.id); }}
                            disabled={deletingId === emp.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === emp.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <div className="text-gray-500">
            Showing {employees.length} of {totalCount} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              <ChevronLeft size={15} />
              Previous
            </button>
            <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
              {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={employees.length < pageSize}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <User size={22} className="text-blue-600" />
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <User size={15} />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Father/Husband Name</label>
                      <input
                        type="text"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <ReactSelect
                        value={formData.gender}
                        onChange={(val) => setFormData(prev => ({ ...prev, gender: val || 'male' }))}
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' }
                        ]}
                        placeholder="Select Gender"
                        isSearchable={false}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                      <ReactSelect
                        value={formData.maritalStatus}
                        onChange={(val) => setFormData(prev => ({ ...prev, maritalStatus: val || 'single' }))}
                        options={[
                          { value: 'single', label: 'Single' },
                          { value: 'married', label: 'Married' },
                          { value: 'divorced', label: 'Divorced' },
                          { value: 'widowed', label: 'Widowed' }
                        ]}
                        placeholder="Select Marital Status"
                        isSearchable={false}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                      <input
                        type="text"
                        name="cnic"
                        value={formData.cnic}
                        onChange={handleFormChange}
                        maxLength={15}
                        placeholder="31203-4256351-7"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Phone size={15} />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleFormChange}
                        maxLength={12}
                        inputMode="numeric"
                        placeholder="0300-1234567 / 042-12345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="employee@gmail.com"
                        className={`w-full px-3 py-2 border rounded-lg outline-none text-sm transition-colors ${
                          isEmailInvalid(formData.email)
                            ? 'border-red-500 bg-red-50/30 text-red-900 focus:ring-2 focus:ring-red-400 focus:border-red-500'
                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      />
                      {isEmailInvalid(formData.email) && (
                        <p className="text-[11px] text-red-500 font-medium mt-1">
                          Invalid email format (e.g. name@gmail.com, user@domain.com)
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        name="emergencyName"
                        value={formData.emergencyName}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number</label>
                      <input
                        type="tel"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleFormChange}
                        maxLength={12}
                        inputMode="numeric"
                        placeholder="0300-1234567 / 042-12345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={15} />
                    Employment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <ReactSelect
                        value={formData.departmentId}
                        onChange={(val) => setFormData(prev => ({ ...prev, departmentId: val || '' }))}
                        options={[
                          { value: '', label: 'Select Department' },
                          ...departments.map(dept => ({ value: String(dept.id), label: dept.name }))
                        ]}
                        placeholder="Select Department"
                        isSearchable={true}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <ReactSelect
                        value={formData.designationId}
                        onChange={(val) => setFormData(prev => ({ ...prev, designationId: val || '' }))}
                        options={[
                          { value: '', label: 'Select Designation' },
                          ...designations.map(desig => ({ value: String(desig.id), label: desig.name }))
                        ]}
                        placeholder="Select Designation"
                        isSearchable={true}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                      <input
                        type="date"
                        name="joinDate"
                        value={formData.joinDate}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <ReactSelect
                      value={formData.status}
                      onChange={(val) => setFormData(prev => ({ ...prev, status: val || 'active' }))}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'on_leave', label: 'On Leave' },
                        { value: 'suspended', label: 'Suspended' },
                        { value: 'terminated', label: 'Terminated' }
                      ]}
                      placeholder="Select Status"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                </div>

                {/* Salary Details */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={15} />
                    Salary Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                      <ReactSelect
                        value={formData.salaryType}
                        onChange={(val) => setFormData(prev => ({ ...prev, salaryType: val || 'fixed_monthly' }))}
                        options={[
                          { value: 'fixed_monthly', label: 'Fixed Monthly' },
                          { value: 'hourly', label: 'Hourly' },
                          { value: 'daily', label: 'Daily' },
                          { value: 'per_event', label: 'Per Event' }
                        ]}
                        placeholder="Select Salary Type"
                        isSearchable={false}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                      <input
                        type="number"
                        name="basicSalary"
                        value={formData.basicSalary}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per Event Rate</label>
                      <input
                        type="number"
                        name="perEventRate"
                        value={formData.perEventRate}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                      <input
                        type="number"
                        name="openingBalance"
                        value={formData.openingBalance}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
                      <input
                        type="number"
                        name="dailyRate"
                        value={formData.dailyRate}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Additional notes about the employee..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {formLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save size={16} />
                    )}
                    {formLoading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {viewModalOpen && viewingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {getInitials(viewingEmployee.name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{viewingEmployee.name}</h2>
                    <p className="text-sm text-gray-500">{viewingEmployee.employeeCode}</p>
                  </div>
                </div>
                <button onClick={() => setViewModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Info</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Father:</span> {viewingEmployee.fatherName || '-'}</div>
                      <div><span className="text-gray-500">DOB:</span> {formatDate(viewingEmployee.dateOfBirth)}</div>
                      <div><span className="text-gray-500">Gender:</span> {viewingEmployee.gender || '-'}</div>
                      <div><span className="text-gray-500">Marital Status:</span> {viewingEmployee.maritalStatus || '-'}</div>
                      <div><span className="text-gray-500">CNIC:</span> {viewingEmployee.cnic || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Phone:</span> {viewingEmployee.phone}</div>
                      <div><span className="text-gray-500">Email:</span> {viewingEmployee.email || '-'}</div>
                      <div><span className="text-gray-500">City:</span> {viewingEmployee.city || '-'}</div>
                      <div><span className="text-gray-500">Address:</span> {viewingEmployee.address || '-'}</div>
                      <div><span className="text-gray-500">Emergency:</span> {viewingEmployee.emergencyName || '-'} ({viewingEmployee.emergencyContact || '-'})</div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">Department:</span> {viewingEmployee.department?.name || '-'}</div>
                    <div><span className="text-gray-500">Designation:</span> {viewingEmployee.designation?.name || '-'}</div>
                    <div><span className="text-gray-500">Join Date:</span> {formatDate(viewingEmployee.joinDate)}</div>
                    <div>
                      <span className="text-gray-500">Status:</span>{' '}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(viewingEmployee.status).color}`}>
                        {getStatusBadge(viewingEmployee.status).label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Salary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">Type:</span> {getSalaryTypeLabel(viewingEmployee.salaryType)}</div>
                    <div><span className="text-gray-500">Basic:</span> Rs. {formatCurrency(viewingEmployee.basicSalary || 0)}</div>
                    {viewingEmployee.perEventRate && <div><span className="text-gray-500">Per Event:</span> Rs. {formatCurrency(viewingEmployee.perEventRate)}</div>}
                    {viewingEmployee.hourlyRate && <div><span className="text-gray-500">Hourly:</span> Rs. {formatCurrency(viewingEmployee.hourlyRate)}</div>}
                    {viewingEmployee.dailyRate && <div><span className="text-gray-500">Daily:</span> Rs. {formatCurrency(viewingEmployee.dailyRate)}</div>}
                    <div><span className="text-gray-500">Opening Balance:</span> Rs. {formatCurrency(viewingEmployee.openingBalance || 0)}</div>
                  </div>
                </div>

                {viewingEmployee.notes && (
                  <div className="border-t pt-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingEmployee.notes}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      openEditModal(viewingEmployee);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
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

export default StaffList;