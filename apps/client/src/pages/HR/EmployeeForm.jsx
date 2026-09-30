// src/pages/hr/EmployeeForm.jsx
// WITH TOAST + NAVIGATION TO /hr

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, User, Briefcase, DollarSign, Phone, Mail,
  MapPin, CreditCard, XCircle, Calendar, Users, Key, Lock,
  Unlock, Eye, EyeOff, Shield, CheckCircle, XCircle as XIcon
} from 'lucide-react';
import roleApi from '../../services/rolePermissionApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { formatPhone, formatCnic, validateEmail, isEmailInvalid } from '../../utils/validators';

// ── API Client ──
const API_URL = (() => {
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'http://localhost:5000/api';
})();

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
  post: async (endpoint, data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
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

const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch {
    return null;
  }
};

// ✅ Toast Helpers
const showSuccess = (msg) => toast.success(msg, { icon: '✅' });
const showError = (msg) => toast.error(msg, { icon: '❌' });
const showLoading = (msg) => toast.loading(msg);

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);

  // ── User Account Toggle ──
  const [enableLogin, setEnableLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
    resignDate: '',
    salaryType: 'fixed_monthly',
    basicSalary: '0',
    perEventRate: '',
    hourlyRate: '',
    dailyRate: '',
    openingBalance: '0',
    notes: '',
    status: 'active',
    userId: null,
    userEmail: '',
    userRole: ''
  });

  // ── Fetch Data ──
  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
    fetchDepartments();
    fetchDesignations();
    fetchRoles();
  }, [id]);

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getRoles();
      const roleList = Array.isArray(res) ? res : (res.data || []);
      setAvailableRoles(roleList);
    } catch (err) {
      console.error('Roles fetch error:', err);
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/employee/employees/${id}`);
      if (data.success) {
        const emp = data.data;
        setFormData({
          name: emp.name || '',
          phone: emp.phone || '',
          email: emp.email || '',
          cnic: emp.cnic || '',
          fatherName: emp.fatherName || '',
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '',
          gender: emp.gender || 'male',
          maritalStatus: emp.maritalStatus || 'single',
          address: emp.address || '',
          city: emp.city || '',
          emergencyContact: emp.emergencyContact || '',
          emergencyName: emp.emergencyName || '',
          designationId: emp.designationId || '',
          departmentId: emp.departmentId || '',
          joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          resignDate: emp.resignDate ? new Date(emp.resignDate).toISOString().split('T')[0] : '',
          salaryType: emp.salaryType || 'fixed_monthly',
          basicSalary: emp.basicSalary?.toString() || '0',
          perEventRate: emp.perEventRate?.toString() || '',
          hourlyRate: emp.hourlyRate?.toString() || '',
          dailyRate: emp.dailyRate?.toString() || '',
          openingBalance: emp.openingBalance?.toString() || '0',
          notes: emp.notes || '',
          status: emp.status || 'active',
          userId: emp.userId || null,
          userEmail: emp.user?.email || emp.email || '',
          userRole: emp.user?.role || ''
        });

        if (emp.userId) {
          setEnableLogin(true);
          setUserRole(emp.user?.role || '');
        }
      }
    } catch (err) {
      showError('Failed to load employee data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const branchId = getSelectedBranchId();
      const data = await apiClient.get('/employee/departments', {
        params: { branchId: branchId || undefined }
      });
      setDepartments(data.data || []);
    } catch (err) {
      console.error('Departments fetch error:', err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const branchId = getSelectedBranchId();
      const data = await apiClient.get('/employee/designations', {
        params: { branchId: branchId || undefined }
      });
      setDesignations(data.data || []);
    } catch (err) {
      console.error('Designations fetch error:', err);
    }
  };

  // ── Handlers ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === 'phone' || name === 'emergencyContact') {
      val = formatPhone(value);
    } else if (name === 'cnic') {
      val = formatCnic(value);
    }
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleToggleLogin = (checked) => {
    setEnableLogin(checked);
    if (!checked) {
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setUserRole('');
      setFormData(prev => ({ ...prev, userRole: '' }));
    }
  };

  const handleRoleChange = (role) => {
    setUserRole(role);
    setFormData(prev => ({ ...prev, userRole: role }));
  };

  const validatePassword = () => {
    if (enableLogin) {
      if (!password && !formData.userId) {
        setPasswordError('Password is required');
        return false;
      }
      if (password && password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return false;
      }
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return false;
      }
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      showError('Phone is required');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length !== 11) {
      showError('Phone number must be exactly 11 digits (e.g. 0300-1234567 or 042-12345678)');
      return;
    }
    if (formData.emergencyContact && formData.emergencyContact.replace(/\D/g, '').length !== 11) {
      showError('Emergency contact must be exactly 11 digits');
      return;
    }
    if (formData.cnic && formData.cnic.replace(/\D/g, '').length !== 13) {
      showError('CNIC must be 13 digits (e.g. 31203-4256351-7)');
      return;
    }
    if (formData.email && formData.email.trim() && !validateEmail(formData.email.trim())) {
      showError('Please enter a valid email address (e.g. employee@gmail.com, name@company.com)');
      return;
    }
    if (!formData.designationId) {
      showError('Designation is required');
      return;
    }

    if (enableLogin) {
      if (!validatePassword()) {
        showError(passwordError);
        return;
      }
    }

    const toastId = showLoading(isEdit ? 'Updating employee...' : 'Creating employee...');

    try {
      setSubmitting(true);
      const branchId = getSelectedBranchId();

      const payload = {
        ...formData,
        branchId: branchId || undefined,
        basicSalary: parseFloat(formData.basicSalary) || 0,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        perEventRate: formData.perEventRate ? parseFloat(formData.perEventRate) : undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
        designationId: parseInt(formData.designationId),
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
        joinDate: new Date(formData.joinDate).toISOString(),
        resignDate: formData.resignDate ? new Date(formData.resignDate).toISOString() : undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,

        enableLogin: enableLogin,
        password: enableLogin ? password : undefined,
        userRole: enableLogin ? userRole : undefined,
        userEmail: enableLogin ? (formData.userEmail || formData.email) : undefined
      };

      let result;
      if (isEdit) {
        result = await apiClient.put(`/employee/employees/${id}`, payload);
      } else {
        result = await apiClient.post('/employee/employees', payload);
      }

      toast.dismiss(toastId);

      if (result.success) {
        showSuccess(isEdit ? 'Employee updated successfully!' : 'Employee created successfully!');
        // ✅ NAVIGATE TO /hr
        setTimeout(() => navigate('/hr'), 500);
      } else {
        showError(result.message || 'Operation failed');
      }
    } catch (err) {
      toast.dismiss(toastId);
      showError(err.message || 'Something went wrong');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/hr')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEdit ? 'Edit Employee' : 'Add New Employee'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Update employee information' : 'Enter employee details to add to system'}
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-blue-600" />
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
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
                  onChange={handleChange}
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
              <Phone size={16} className="text-green-600" />
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number</label>
                <input
                  type="tel"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  maxLength={12}
                  inputMode="numeric"
                  placeholder="0300-1234567 / 042-12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════ */}
          {/* 🔥 USER LOGIN TOGGLE SECTION */}
          {/* ════════════════════════════════════════ */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Key size={16} className="text-purple-600" />
              Login Access
            </h3>

            {/* Toggle Switch */}
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="enableLogin"
                    checked={enableLogin}
                    onChange={(e) => handleToggleLogin(e.target.checked)}
                    className="sr-only"
                  />
                  <label
                    htmlFor="enableLogin"
                    className={`w-12 h-7 rounded-full cursor-pointer transition-colors flex items-center ${
                      enableLogin ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        enableLogin ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </label>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {enableLogin ? '✅ Login Enabled' : '🔴 Login Disabled'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {enableLogin 
                      ? 'Employee can login to the system' 
                      : 'Employee cannot login to the system'}
                  </p>
                </div>
              </div>
              {enableLogin && formData.userId && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-auto">
                  User Account Exists
                </span>
              )}
            </div>

            {/* Login Credentials */}
            {enableLogin && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Login Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.userEmail || formData.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, userEmail: val }));
                      }}
                      placeholder="employee@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      required={enableLogin}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.email && formData.email !== formData.userEmail 
                        ? `📧 Using email: ${formData.email}` 
                        : 'Use employee email or enter custom login email'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <ReactSelect
                      value={userRole}
                      onChange={(val) => handleRoleChange(val || '')}
                      options={[
                        { value: '', label: '-- Select Role --' },
                        ...availableRoles.map(role => ({
                          value: role.name,
                          label: role.name
                        }))
                      ]}
                      placeholder="Select Role"
                      isSearchable={true}
                      isClearable={false}
                    />
                    {availableRoles.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No roles found. Create roles in Settings → Role & Permissions.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {!formData.userId && <span className="text-red-500">*</span>}
                      {formData.userId && <span className="text-xs text-gray-400 ml-2">(Leave blank to keep current)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={formData.userId ? 'New password (optional)' : 'Enter password'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                        required={!formData.userId && enableLogin}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password {!formData.userId && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm ${
                        passwordError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required={!formData.userId && enableLogin}
                    />
                    {passwordError && (
                      <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Shield size={16} className="text-blue-500" />
                  <p className="text-xs text-blue-700">
                    {formData.userId 
                      ? '🔄 Updating login credentials will change user access.' 
                      : '🆕 A new user account will be created with these credentials.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Employment Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={16} className="text-purple-600" />
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resign Date</label>
                <input
                  type="date"
                  name="resignDate"
                  value={formData.resignDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Salary Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-green-600" />
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per Event Rate</label>
                <input
                  type="number"
                  name="perEventRate"
                  value={formData.perEventRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                <input
                  type="number"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleChange}
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
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
                <input
                  type="number"
                  name="dailyRate"
                  value={formData.dailyRate}
                  onChange={handleChange}
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
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              placeholder="Additional notes about the employee..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => navigate('/hr')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save size={16} />
              )}
              {submitting ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;