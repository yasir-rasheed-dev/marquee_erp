// src/pages/hr/EmployeeDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Briefcase, DollarSign, Calendar, Clock,
  Phone, Mail, MapPin, BadgeCheck, Edit, Trash2,
  UserCheck, UserX, Users, CreditCard, FileText,
  CheckCircle, XCircle, AlertCircle, RefreshCw,
  Download, Printer, Eye, Plus, Building2, Award
} from 'lucide-react';

// ── API Client ──
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = {
  get: async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(options.params).toString();
    const url = `${API_URL}${endpoint}${params ? '?' + params : ''}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  put: async (endpoint, data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  delete: async (endpoint) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// ── Helpers ──
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount) => {
  if (!amount) return '0';
  return amount.toLocaleString('en-PK', { minimumFractionDigits: 0 });
};

const getStatusBadge = (status) => {
  const map = {
    active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
    on_leave: { label: 'On Leave', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    terminated: { label: 'Terminated', color: 'bg-red-100 text-red-800 border-red-200' },
    suspended: { label: 'Suspended', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };
  const s = map[status?.toLowerCase()] || map.inactive;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>{s.label}</span>;
};

const getSalaryTypeLabel = (type) => {
  const map = {
    fixed_monthly: 'Fixed Monthly',
    hourly: 'Hourly',
    daily: 'Daily',
    per_event: 'Per Event'
  };
  return map[type] || type || '-';
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ── State ──
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [deleting, setDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // ── Fetch Employee ──
  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get(`/employee/employees/${id}`);
      if (data.success) {
        setEmployee(data.data);
      } else {
        setError(data.message || 'Employee not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load employee details');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  // ── Delete Employee ──
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      const result = await apiClient.delete(`/employee/employees/${id}`);
      if (result.success) {
        alert('Employee deleted successfully');
        navigate('/hr/employees');
      } else {
        alert(result.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee details...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Employee Not Found</h2>
          <p className="text-gray-500 mt-2">{error || 'The employee you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/hr/employees')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={16} />
            Back to Staff List
          </button>
        </div>
      </div>
    );
  }

  // ── Tabs ──
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'loans', label: 'Loans', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  // ═══════════════════════════════════════════════════════════
  // ── RENDER ──
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hr/employees')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              {employee.name}
              {getStatusBadge(employee.status)}
            </h1>
            <p className="text-sm text-gray-500">{employee.employeeCode} • {employee.designation?.name || 'No Designation'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/hr/employees/edit/${employee.id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Trash2 size={16} />
            )}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={fetchEmployee}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Attendance</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{employee._count?.attendances || 0}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-full">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Taken</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{employee._count?.leaves || 0}</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-full">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Loans</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{employee._count?.loans || 0}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-full">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">Rs. {formatCurrency(employee.basicSalary)}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-full">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-800">{employee.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Father/Husband</p>
                    <p className="font-medium text-gray-800">{employee.fatherName || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="font-medium text-gray-800">{formatDate(employee.dateOfBirth)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-medium text-gray-800 capitalize">{employee.gender || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Marital Status</p>
                    <p className="font-medium text-gray-800 capitalize">{employee.maritalStatus || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">CNIC</p>
                    <p className="font-medium text-gray-800">{employee.cnic || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Phone size={16} className="text-green-600" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-gray-800">{employee.phone}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-800">{employee.email || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">City</p>
                    <p className="font-medium text-gray-800">{employee.city || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-medium text-gray-800">{employee.address || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Emergency Contact</p>
                    <p className="font-medium text-gray-800">{employee.emergencyName || '-'} ({employee.emergencyContact || '-'})</p>
                  </div>
                </div>
              </div>

              {/* Employment Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Briefcase size={16} className="text-purple-600" />
                  Employment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium text-gray-800">{employee.department?.name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Designation</p>
                    <p className="font-medium text-gray-800">{employee.designation?.name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Join Date</p>
                    <p className="font-medium text-gray-800">{formatDate(employee.joinDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Resign Date</p>
                    <p className="font-medium text-gray-800">{formatDate(employee.resignDate) || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Salary Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-green-600" />
                  Salary Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Salary Type</p>
                    <p className="font-medium text-gray-800">{getSalaryTypeLabel(employee.salaryType)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Basic Salary</p>
                    <p className="font-medium text-gray-800">Rs. {formatCurrency(employee.basicSalary)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Per Event Rate</p>
                    <p className="font-medium text-gray-800">{employee.perEventRate ? `Rs. ${formatCurrency(employee.perEventRate)}` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Hourly Rate</p>
                    <p className="font-medium text-gray-800">{employee.hourlyRate ? `Rs. ${formatCurrency(employee.hourlyRate)}` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Daily Rate</p>
                    <p className="font-medium text-gray-800">{employee.dailyRate ? `Rs. ${formatCurrency(employee.dailyRate)}` : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-600" />
                  Financials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Opening Balance</p>
                    <p className="font-medium text-gray-800">Rs. {formatCurrency(employee.openingBalance)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Current Balance</p>
                    <p className="font-medium text-gray-800">Rs. {formatCurrency(employee.currentBalance)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">User Account</p>
                    <p className="font-medium text-gray-800">{employee.user?.email || 'No user linked'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {employee.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{employee.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Attendance Tab ── */}
          {activeTab === 'attendance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Attendance Records
                </h3>
                <span className="text-sm text-gray-500">Total: {employee._count?.attendances || 0} records</span>
              </div>
              {employee._count?.attendances > 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Attendance records will be displayed here</p>
                  <p className="text-sm text-gray-400 mt-1">Coming soon with full attendance module</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No attendance records found</p>
                </div>
              )}
            </div>
          )}

          {/* ── Payroll Tab ── */}
          {activeTab === 'payroll' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Payroll History
                </h3>
                <span className="text-sm text-gray-500">Total: {employee._count?.payrolls || 0} records</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Payroll records will be displayed here</p>
                <p className="text-sm text-gray-400 mt-1">Coming soon with full payroll module</p>
              </div>
            </div>
          )}

          {/* ── Leave Tab ── */}
          {activeTab === 'leave' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Leave Records
                </h3>
                <span className="text-sm text-gray-500">Total: {employee._count?.leaves || 0} records</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Leave records will be displayed here</p>
                <p className="text-sm text-gray-400 mt-1">Coming soon with full leave management module</p>
              </div>
            </div>
          )}

          {/* ── Loans Tab ── */}
          {activeTab === 'loans' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Loan Records
                </h3>
                <span className="text-sm text-gray-500">Total: {employee._count?.loans || 0} records</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Loan records will be displayed here</p>
                <p className="text-sm text-gray-400 mt-1">Coming soon with full loan management module</p>
              </div>
            </div>
          )}

          {/* ── Documents Tab ── */}
          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Documents
                </h3>
                <span className="text-sm text-gray-500">Total: {employee.documents?.length || 0} documents</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Documents will be displayed here</p>
                <p className="text-sm text-gray-400 mt-1">Coming soon with full document management</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;