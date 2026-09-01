// src/pages/HR/EventStaffAllocation.jsx

import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, Clock, CheckCircle, XCircle,
  AlertCircle, Search, ChevronLeft, ChevronRight,
  RefreshCw, Eye, Edit, Trash2, Plus, UserPlus,
  DollarSign, Wallet, Check, X, FileText, User,
  MapPin, Briefcase, Award, TrendingUp, TrendingDown,
  UserCheck, UserX, Clock as ClockIcon
} from 'lucide-react';
import payrollApi from '../../services/payrollApi';
import employeeApi from '../../services/employeeApi';
import bookingApi from '../../services/bookingApi';
import ReactSelect from '../../components/ui/ReactSelect';

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

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusBadge = (status) => {
  const map = {
    assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800 border-green-200' },
    present: { label: 'Present', color: 'bg-green-100 text-green-800 border-green-200' },
    absent: { label: 'Absent', color: 'bg-red-100 text-red-800 border-red-200' },
    paid: { label: 'Paid', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };
  return map[status?.toLowerCase()] || map.assigned;
};

const getPaymentStatusBadge = (status) => {
  const map = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200' },
    partial: { label: 'Partial', color: 'bg-orange-100 text-orange-800 border-orange-200' }
  };
  return map[status?.toLowerCase()] || map.pending;
};

// ── Status Options ──
const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' }
];

const paymentStatusOptions = [
  { value: '', label: 'All Payment Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' }
];

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const EventStaffAllocation = () => {
  // ── State ──
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState({});

  // ── Filters ──
  const [filters, setFilters] = useState({
    status: '',
    isPaid: '',
    employeeId: '',
    search: ''
  });

  // ── Modal States ──
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // ── Create/Edit Modal ──
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    bookingId: '',
    role: '',
    paymentType: 'auto',
    agreedAmount: '',
    hoursWorked: '',
    autoPayOnEventStart: true,
    notes: ''
  });

  // ── Attendance Modal ──
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceAssignment, setAttendanceAssignment] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    isPresent: true,
    checkInTime: '',
    checkOutTime: '',
    hoursWorked: ''
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // ── Payment Modal ──
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAssignment, setPaymentAssignment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    bankAccountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // ── Delete Modal ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    present: 0,
    absent: 0,
    paid: 0,
    pending: 0
  });

  // ── Fetch Assignments ──
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await payrollApi.getAllEventAssignments({
        status: filters.status || undefined,
        employeeId: filters.employeeId || undefined,
        isPaid: filters.isPaid || undefined,
        page,
        limit: pageSize
      });

      console.log('📥 Assignments API Response:', response);

      let assignmentData = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          assignmentData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          assignmentData = response.data.data;
        } else {
          assignmentData = response.data.data || [];
        }
      }

      console.log('✅ Setting assignments:', assignmentData.length, 'records');
      setAssignments(assignmentData);
      setTotalCount(response.data?.meta?.total || assignmentData.length || 0);
      setMeta(response.data?.meta || {});

      // Calculate stats
      const totalAmount = assignmentData.reduce((sum, a) => sum + parseFloat(a.agreedAmount || 0), 0);
      const present = assignmentData.filter(a => a.isPresent === true).length;
      const absent = assignmentData.filter(a => a.isPresent === false).length;
      const paid = assignmentData.filter(a => a.isPaid === true).length;
      const pending = assignmentData.filter(a => a.isPaid === false).length;

      setStats({
        total: assignmentData.length,
        totalAmount,
        present,
        absent,
        paid,
        pending
      });
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
      console.error('❌ Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Employees ──
  const fetchEmployees = async () => {
    try {
      console.log('🔍 Fetching employees...');
      const response = await employeeApi.getAll({ status: 'active' });
      console.log('📥 Employees API Response:', response);

      let employeesData = [];

      if (response) {
        if (response.success && Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.success && response.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (Array.isArray(response)) {
          employeesData = response;
        } else {
          employeesData = response.data?.data || response.data || [];
        }
      }

      console.log('✅ Setting employees:', employeesData.length, 'records');
      setEmployees(employeesData);
    } catch (err) {
      console.error('❌ Employees fetch error:', err);
      setEmployees([]);
    }
  };

  // ── Fetch Bookings ──
  const fetchBookings = async () => {
    try {
      console.log('🔍 Fetching bookings...');
      
      const response = await bookingApi.getAll({ 
        limit: 100
      });
      console.log('📥 Bookings API Response:', response);

      let bookingsData = [];

      if (response) {
        if (response.success && Array.isArray(response.data)) {
          bookingsData = response.data;
        } else if (response.success && response.data && Array.isArray(response.data.data)) {
          bookingsData = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          bookingsData = response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          bookingsData = response.data.data;
        } else if (Array.isArray(response)) {
          bookingsData = response;
        } else {
          bookingsData = response.data?.data || response.data || [];
        }
      }

      console.log('✅ Setting bookings:', bookingsData.length, 'records');
      if (bookingsData.length > 0) {
        console.log('✅ Sample booking:', bookingsData[0]);
      }
      setBookings(bookingsData);
    } catch (err) {
      console.error('❌ Bookings fetch error:', err);
      setBookings([]);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [filters, page]);

  useEffect(() => {
    fetchEmployees();
    fetchBookings();
  }, []);

  // ── Handlers ──
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      isPaid: '',
      employeeId: '',
      search: ''
    });
    setPage(1);
  };

  const hasFilters = filters.status || filters.isPaid || filters.employeeId || filters.search;

  // ── View Assignment ──
  const openViewModal = async (assignment) => {
    try {
      const response = await payrollApi.getEventAssignmentById(assignment.id);
      setSelectedAssignment(response.data.data);
      setViewModalOpen(true);
    } catch (err) {
      alert('Failed to load assignment details');
      console.error(err);
    }
  };

  // ── Open Create/Edit Modal ──
  const openFormModal = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setFormData({
        employeeId: assignment.employeeId || '',
        bookingId: assignment.bookingId || '',
        role: assignment.role || '',
        paymentType: assignment.paymentType || 'auto',
        agreedAmount: assignment.agreedAmount?.toString() || '',
        hoursWorked: assignment.hoursWorked?.toString() || '',
        autoPayOnEventStart: assignment.autoPayOnEventStart !== false,
        notes: assignment.notes || ''
      });
    } else {
      setEditingAssignment(null);
      setFormData({
        employeeId: '',
        bookingId: '',
        role: '',
        paymentType: 'auto',
        agreedAmount: '',
        hoursWorked: '',
        autoPayOnEventStart: true,
        notes: ''
      });
    }
    setFormModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      alert('Please select an employee');
      return;
    }
    if (!formData.bookingId) {
      alert('Please select a booking/event');
      return;
    }
    if (!formData.agreedAmount || parseFloat(formData.agreedAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        employeeId: parseInt(formData.employeeId),
        bookingId: parseInt(formData.bookingId),
        role: formData.role || null,
        paymentType: formData.paymentType,
        agreedAmount: parseFloat(formData.agreedAmount),
        hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : null,
        autoPayOnEventStart: formData.autoPayOnEventStart,
        notes: formData.notes || null
      };

      let result;
      if (editingAssignment) {
        result = await payrollApi.updateEventAssignment(editingAssignment.id, payload);
      } else {
        result = await payrollApi.createEventAssignment(payload);
      }

      if (result.data.success) {
        alert(editingAssignment ? 'Assignment updated successfully!' : 'Staff assigned to event successfully!');
        setFormModalOpen(false);
        fetchAssignments();
      } else {
        alert(result.data.message || 'Operation failed');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Submit error:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Open Attendance Modal ──
  const openAttendanceModal = (assignment) => {
    setAttendanceAssignment(assignment);
    setAttendanceForm({
      isPresent: assignment.isPresent !== false,
      checkInTime: assignment.checkInTime ? new Date(assignment.checkInTime).toTimeString().slice(0, 5) : '',
      checkOutTime: assignment.checkOutTime ? new Date(assignment.checkOutTime).toTimeString().slice(0, 5) : '',
      hoursWorked: assignment.hoursWorked?.toString() || ''
    });
    setAttendanceModalOpen(true);
  };

  const handleAttendanceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAttendanceForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();

    try {
      setAttendanceLoading(true);
      const payload = {
        isPresent: attendanceForm.isPresent,
        checkInTime: attendanceForm.checkInTime ? new Date(`${new Date().toISOString().split('T')[0]}T${attendanceForm.checkInTime}`).toISOString() : null,
        checkOutTime: attendanceForm.checkOutTime ? new Date(`${new Date().toISOString().split('T')[0]}T${attendanceForm.checkOutTime}`).toISOString() : null,
        hoursWorked: attendanceForm.hoursWorked ? parseFloat(attendanceForm.hoursWorked) : null
      };

      const result = await payrollApi.markEventAttendance(attendanceAssignment.id, payload);

      if (result.data.success) {
        alert('Attendance marked successfully!');
        setAttendanceModalOpen(false);
        fetchAssignments();
        if (selectedAssignment) {
          const updated = await payrollApi.getEventAssignmentById(selectedAssignment.id);
          setSelectedAssignment(updated.data.data);
        }
      } else {
        alert(result.data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Attendance error:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ── Open Payment Modal ──
  const openPaymentModal = (assignment) => {
    setPaymentAssignment(assignment);
    setPaymentForm({
      bankAccountId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!window.confirm(`Pay ${formatCurrency(paymentAssignment.agreedAmount)} to ${paymentAssignment.employee?.name}?`)) return;

    try {
      setPaymentLoading(true);
      const result = await payrollApi.payEventAssignment(paymentAssignment.id, paymentForm);

      if (result.data.success) {
        alert('Payment processed successfully!');
        setPaymentModalOpen(false);
        fetchAssignments();
        if (selectedAssignment) {
          const updated = await payrollApi.getEventAssignmentById(selectedAssignment.id);
          setSelectedAssignment(updated.data.data);
        }
      } else {
        alert(result.data.message || 'Failed to process payment');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Payment error:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Delete Assignment ──
  const openDeleteModal = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const result = await payrollApi.deleteEventAssignment(deleteId);
      if (result.data.success) {
        alert('Assignment deleted successfully');
        setDeleteModalOpen(false);
        fetchAssignments();
      } else {
        alert(result.data.message || 'Failed to delete');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Loading ──
  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event staff assignments...</p>
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
            <UserPlus className="w-7 h-7 text-blue-600" />
            Event Staff Allocation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage staff assignments for events • <span className="font-medium">{totalCount}</span> assignments
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilters({ ...filters, status: 'present' });
              setPage(1);
            }}
            className="px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center gap-1"
          >
            <UserCheck size={16} />
            Present
          </button>
          <button
            onClick={() => {
              setFilters({ ...filters, isPaid: 'false' });
              setPage(1);
            }}
            className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm flex items-center gap-1"
          >
            <Wallet size={16} />
            Pending Payment
          </button>
          <button
            onClick={() => openFormModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus size={18} />
            Assign Staff
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Total Amount', value: `Rs. ${formatCurrency(stats.totalAmount)}`, icon: DollarSign, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Present', value: stats.present, icon: UserCheck, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Absent', value: stats.absent, icon: UserX, bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'Paid', value: stats.paid, icon: CheckCircle, bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, bg: 'bg-yellow-50', text: 'text-yellow-600' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-1 truncate">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.text}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employee or event..."
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
              value={filters.isPaid}
              onChange={(val) => handleFilterChange('isPaid', val || '')}
              options={paymentStatusOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              placeholder="All Payment Status"
              isSearchable={false}
              isClearable={false}
            />
          </div>
          <div className="min-w-[160px]">
            <ReactSelect
              value={filters.employeeId}
              onChange={(val) => handleFilterChange('employeeId', val || '')}
              options={[
                { value: '', label: 'All Employees' },
                ...employees.map(emp => ({ value: String(emp.id), label: emp.name }))
              ]}
              placeholder="All Employees"
              isSearchable={true}
              isClearable={false}
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <XCircle size={16} />
              Clear
            </button>
          )}
          <button
            onClick={fetchAssignments}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Attendance</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No staff assignments found</p>
                    <p className="text-sm text-gray-400 mt-1">Assign staff to events</p>
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const statusBadge = getStatusBadge(assignment.isPresent ? 'present' : assignment.status || 'assigned');
                  const paymentBadge = getPaymentStatusBadge(assignment.isPaid ? 'paid' : 'pending');
                  return (
                    <tr
                      key={assignment.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openViewModal(assignment)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                            {getInitials(assignment.employee?.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{assignment.employee?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{assignment.employee?.employeeCode || ''}</div>
                          </div>
                        </div>
                      </td>
                      {/* ✅ FIXED: eventName → title */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-700">{assignment.booking?.title || 'N/A'}</div>
                          <div className="text-xs text-gray-400">
                            {formatDate(assignment.booking?.eventDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{assignment.role || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        Rs. {formatCurrency(assignment.agreedAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        {assignment.hoursWorked && (
                          <div className="text-xs text-gray-400 mt-1">
                            {assignment.hoursWorked}h worked
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${paymentBadge.color}`}>
                          {paymentBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openViewModal(assignment); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          {!assignment.isPaid && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openAttendanceModal(assignment); }}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                              title="Mark Attendance"
                            >
                              <UserCheck size={15} />
                            </button>
                          )}
                          {!assignment.isPaid && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openPaymentModal(assignment); }}
                              className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"
                              title="Pay"
                            >
                              <Wallet size={15} />
                            </button>
                          )}
                          {!assignment.isPaid && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openFormModal(assignment); }}
                              className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                          )}
                          {!assignment.isPaid && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openDeleteModal(assignment.id); }}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <div className="text-gray-500">
            Showing {assignments.length} of {totalCount} entries
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
              disabled={assignments.length < pageSize}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW ASSIGNMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {getInitials(selectedAssignment.employee?.name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedAssignment.employee?.name}</h2>
                    {/* ✅ FIXED: eventName → title */}
                    <p className="text-sm text-gray-500">{selectedAssignment.booking?.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedAssignment.isPaid && (
                    <>
                      <button
                        onClick={() => {
                          setViewModalOpen(false);
                          openAttendanceModal(selectedAssignment);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                      >
                        <UserCheck size={14} />
                        Attendance
                      </button>
                      <button
                        onClick={() => {
                          setViewModalOpen(false);
                          openPaymentModal(selectedAssignment);
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                      >
                        <Wallet size={14} />
                        Pay
                      </button>
                    </>
                  )}
                  <button onClick={() => setViewModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Agreed Amount</p>
                    <p className="font-semibold text-lg text-blue-600">Rs. {formatCurrency(selectedAssignment.agreedAmount)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Hours Worked</p>
                    <p className="font-semibold text-lg">{selectedAssignment.hoursWorked || '-'}h</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Attendance</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedAssignment.isPresent ? 'present' : 'absent').color}`}>
                      {selectedAssignment.isPresent ? 'Present' : 'Absent'}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Payment</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusBadge(selectedAssignment.isPaid ? 'paid' : 'pending').color}`}>
                      {selectedAssignment.isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Event</p>
                    {/* ✅ FIXED: eventName → title */}
                    <p className="font-medium">{selectedAssignment.booking?.title || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Event Date</p>
                    <p className="font-medium">{formatDate(selectedAssignment.booking?.eventDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="font-medium">{selectedAssignment.role || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Payment Type</p>
                    <p className="font-medium capitalize">{selectedAssignment.paymentType || 'Auto'}</p>
                  </div>
                  {selectedAssignment.checkInTime && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Check In</p>
                      <p className="font-medium">{formatDateTime(selectedAssignment.checkInTime)}</p>
                    </div>
                  )}
                  {selectedAssignment.checkOutTime && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Check Out</p>
                      <p className="font-medium">{formatDateTime(selectedAssignment.checkOutTime)}</p>
                    </div>
                  )}
                  {selectedAssignment.paidAt && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Paid At</p>
                      <p className="font-medium">{formatDateTime(selectedAssignment.paidAt)}</p>
                    </div>
                  )}
                  {selectedAssignment.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="font-medium">{selectedAssignment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── CREATE/EDIT ASSIGNMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setFormModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <UserPlus size={22} className="text-blue-600" />
                  {editingAssignment ? 'Edit Assignment' : 'Assign Staff to Event'}
                </h2>
                <button onClick={() => setFormModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee <span className="text-red-500">*</span>
                    </label>
                    <ReactSelect
                      value={formData.employeeId}
                      onChange={(val) => setFormData(prev => ({ ...prev, employeeId: val || '' }))}
                      options={[
                        { value: '', label: 'Select Employee' },
                        ...employees.map(emp => ({
                          value: String(emp.id),
                          label: `${emp.name} (${emp.employeeCode})`
                        }))
                      ]}
                      placeholder="Select Employee"
                      isSearchable={true}
                      isClearable={false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event/Booking <span className="text-red-500">*</span>
                    </label>
                    <ReactSelect
                      value={formData.bookingId}
                      onChange={(val) => setFormData(prev => ({ ...prev, bookingId: val || '' }))}
                      options={[
                        { value: '', label: 'Select Booking/Event' },
                        ...bookings.map(booking => ({
                          value: String(booking.id),
                          label: `${booking.title || `Booking #${booking.id}`}${booking.eventDate ? ` - ${formatDate(booking.eventDate)}` : ''}${booking.status ? ` (${booking.status})` : ''}`
                        }))
                      ]}
                      placeholder="Select Booking/Event"
                      isSearchable={true}
                      isClearable={false}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      placeholder="e.g., Chef, Waiter, Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agreed Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="agreedAmount"
                      value={formData.agreedAmount}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                      min="1"
                      step="any"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                    <input
                      type="number"
                      name="hoursWorked"
                      value={formData.hoursWorked}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      step="0.5"
                      placeholder="e.g., 8.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                    <ReactSelect
                      value={formData.paymentType}
                      onChange={(val) => setFormData(prev => ({ ...prev, paymentType: val || 'auto' }))}
                      options={[
                        { value: 'auto', label: 'Auto (Event Start)' },
                        { value: 'manual', label: 'Manual' }
                      ]}
                      placeholder="Select Payment Type"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="autoPayOnEventStart"
                    checked={formData.autoPayOnEventStart}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Auto-pay when event starts
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
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
                      <Check size={16} />
                    )}
                    {formLoading ? 'Saving...' : editingAssignment ? 'Update' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── ATTENDANCE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {attendanceModalOpen && attendanceAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setAttendanceModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <UserCheck size={22} className="text-green-600" />
                  Mark Attendance
                </h2>
                <button onClick={() => setAttendanceModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAttendanceSubmit} className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {getInitials(attendanceAssignment.employee?.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{attendanceAssignment.employee?.name}</p>
                      {/* ✅ FIXED: eventName → title */}
                      <p className="text-sm text-gray-500">{attendanceAssignment.booking?.title}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isPresent"
                    checked={attendanceForm.isPresent}
                    onChange={handleAttendanceChange}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Present</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                    <input
                      type="time"
                      name="checkInTime"
                      value={attendanceForm.checkInTime}
                      onChange={handleAttendanceChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                    <input
                      type="time"
                      name="checkOutTime"
                      value={attendanceForm.checkOutTime}
                      onChange={handleAttendanceChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                  <input
                    type="number"
                    name="hoursWorked"
                    value={attendanceForm.hoursWorked}
                    onChange={handleAttendanceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    step="0.5"
                    placeholder="e.g., 8.5"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setAttendanceModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={attendanceLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {attendanceLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check size={16} />
                    )}
                    {attendanceLoading ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── PAYMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {paymentModalOpen && paymentAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setPaymentModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Wallet size={22} className="text-purple-600" />
                  Process Payment
                </h2>
                <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {getInitials(paymentAssignment.employee?.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{paymentAssignment.employee?.name}</p>
                      {/* ✅ FIXED: eventName → title */}
                      <p className="text-sm text-gray-500">{paymentAssignment.booking?.title}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Amount to Pay</p>
                  <p className="text-2xl font-bold text-green-600">Rs. {formatCurrency(paymentAssignment.agreedAmount)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={paymentForm.paymentDate}
                    onChange={handlePaymentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={paymentForm.notes}
                    onChange={handlePaymentChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Payment remarks..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {paymentLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Wallet size={16} />
                    )}
                    {paymentLoading ? 'Processing...' : 'Pay Now'}
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
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800">Delete Assignment</h3>
                  <p className="text-gray-500 mt-2">
                    Are you sure you want to delete this staff assignment? This action cannot be undone.
                  </p>
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    ⚠️ Paid assignments cannot be deleted.
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
                    onClick={handleDelete}
                    disabled={deleteLoading}
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

export default EventStaffAllocation;