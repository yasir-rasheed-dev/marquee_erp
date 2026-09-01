// src/pages/HR/Attendance.jsx

import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, UserCheck, UserX, UserMinus,
  Search, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Clock as ClockIcon, AlertCircle, RefreshCw,
  Eye, Edit, Trash2, Plus, Users, Filter,
  Check, X, AlertTriangle, FileText, Printer
} from 'lucide-react';
import attendanceApi from '../../services/attendanceApi';
import ReactSelect from '../../components/ui/ReactSelect';
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

const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  return new Date(timeStr).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusBadge = (status) => {
  const map = {
    present: { label: 'Present', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    absent: { label: 'Absent', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    late: { label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle },
    half_day: { label: 'Half Day', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ClockIcon },
    leave: { label: 'Leave', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar },
    holiday: { label: 'Holiday', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Calendar }
  };
  return map[status?.toLowerCase()] || map.absent;
};

// ── Status Options ──
const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' }
];

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const Attendance = () => {
  // ── State ──
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState({});

  // ── Filters ──
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    status: '',
    employeeId: '',
    search: ''
  });

  // ── Modal States ──
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // ── Form State ──
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    status: 'present',
    overtimeHours: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0
  });

  // ── Summary Modal ──
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFilters, setSummaryFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employeeId: ''
  });

  // ── Leave Modal ──
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    employeeId: '',
    type: 'casual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    days: 1
  });
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);

  // ── Fetch Attendances ──
  const fetchAttendances = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceApi.getAll({
        date: filters.date || undefined,
        status: filters.status || undefined,
        employeeId: filters.employeeId || undefined,
        page,
        limit: pageSize
      });

      console.log('📥 Attendance API Response:', response);

      // ✅ FIXED: Handle response properly
      let attendanceData = [];
      let total = 0;

      if (response && response.data) {
        // ✅ Case 1: Direct array { success, count, data: [...] }
        if (Array.isArray(response.data)) {
          attendanceData = response.data;
          total = response.count || response.data.length || 0;
        }
        // ✅ Case 2: Nested { success, data: { data: [...], count } }
        else if (response.data.data && Array.isArray(response.data.data)) {
          attendanceData = response.data.data;
          total = response.data.count || response.data.total || 0;
        }
        // ✅ Case 3: Fallback
        else {
          attendanceData = response.data.data || [];
          total = response.data.count || response.data.total || 0;
        }
      }

      console.log('✅ Setting attendances:', attendanceData.length, 'records');

      setAttendances(attendanceData);
      setTotalCount(total);
      setMeta(response?.data?.meta || {});

      // Calculate stats
      setStats({
        total: attendanceData.length,
        present: attendanceData.filter(a => a.status === 'present').length,
        absent: attendanceData.filter(a => a.status === 'absent').length,
        late: attendanceData.filter(a => a.status === 'late').length,
        halfDay: attendanceData.filter(a => a.status === 'half_day').length,
        leave: attendanceData.filter(a => a.status === 'leave').length,
        holiday: attendanceData.filter(a => a.status === 'holiday').length
      });
    } catch (err) {
      setError(err.message || 'Failed to load attendance');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Employees ──
  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll({ status: 'active' });
      console.log('📥 Employees API Response:', response);

      // ✅ FIXED: Handle response properly
      let employeesData = [];

      if (response && response.success) {
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else {
          employeesData = response.data?.data || [];
        }
      }

      console.log('✅ Setting employees:', employeesData.length, 'records');
      setEmployees(employeesData);
    } catch (err) {
      console.error('Employees fetch error:', err);
    }
  };

  // ── Fetch Leaves ──
  const fetchLeaves = async () => {
    try {
      setLeavesLoading(true);
      const response = await attendanceApi.getAllLeaves({
        employeeId: filters.employeeId || undefined,
        status: filters.status || undefined
      });

      console.log('📥 Leaves API Response:', response);

      let leavesData = [];

      if (response && response.data) {
        if (Array.isArray(response.data)) {
          leavesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          leavesData = response.data.data;
        } else {
          leavesData = response.data.data || [];
        }
      }

      console.log('✅ Setting leaves:', leavesData.length, 'records');
      setLeaves(leavesData);
    } catch (err) {
      console.error('Leaves fetch error:', err);
    } finally {
      setLeavesLoading(false);
    }
  };

  // ── Fetch Summary ──
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await attendanceApi.getSummary({
        month: summaryFilters.month,
        year: summaryFilters.year,
        employeeId: summaryFilters.employeeId || undefined
      });

      console.log('📥 Summary API Response:', response);

      let summaryData = [];

      if (response && response.data) {
        if (Array.isArray(response.data)) {
          summaryData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          summaryData = response.data.data;
        } else {
          summaryData = response.data.data || [];
        }
      }

      console.log('✅ Setting summary:', summaryData.length, 'records');
      setSummaryData(summaryData);
    } catch (err) {
      console.error('Summary fetch error:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [filters, page]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ── Handlers ──
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      date: new Date().toISOString().split('T')[0],
      status: '',
      employeeId: '',
      search: ''
    });
    setPage(1);
  };

  const hasFilters = filters.status || filters.employeeId || filters.search;

  // ── Open Add Modal ──
  const openAddModal = () => {
    setFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      checkIn: new Date().toTimeString().slice(0, 5),
      checkOut: '',
      status: 'present',
      overtimeHours: '',
      notes: ''
    });
    setModalOpen(true);
  };

  // ── Form Change ──
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Submit Attendance ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      alert('Please select an employee');
      return;
    }
    if (!formData.date) {
      alert('Please select a date');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        ...formData,
        employeeId: parseInt(formData.employeeId),
        checkIn: new Date(`${formData.date}T${formData.checkIn}`).toISOString(),
        checkOut: formData.checkOut ? new Date(`${formData.date}T${formData.checkOut}`).toISOString() : null,
        overtimeHours: formData.overtimeHours ? parseFloat(formData.overtimeHours) : 0
      };

      const result = await attendanceApi.create(payload);

      if (result.data.success) {
        alert('Attendance marked successfully!');
        setModalOpen(false);
        fetchAttendances();
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

  // ── Delete Attendance ──
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      setDeletingId(id);
      const result = await attendanceApi.delete(id);
      if (result.data.success) {
        alert('Attendance record deleted successfully');
        fetchAttendances();
      } else {
        alert(result.data.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── View Attendance ──
  const openViewModal = (attendance) => {
    setSelectedAttendance(attendance);
    setViewModalOpen(true);
  };

  // ── Open Summary Modal ──
  const openSummaryModal = async () => {
    setSummaryModalOpen(true);
    await fetchSummary();
  };

  // ── Handle Summary Filter Change ──
  const handleSummaryFilterChange = (key, value) => {
    setSummaryFilters(prev => ({ ...prev, [key]: value }));
  };

  // ── Apply Summary Filters ──
  const applySummaryFilters = async () => {
    await fetchSummary();
  };

  // ── Open Leave Modal ──
  const openLeaveModal = () => {
    setLeaveFormData({
      employeeId: '',
      type: 'casual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
      days: 1
    });
    setLeaveModalOpen(true);
  };

  // ── Handle Leave Form Change ──
  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Calculate Leave Days ──
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setLeaveFormData(prev => ({ ...prev, days: diffDays }));
  };

  // ── Submit Leave ──
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();

    if (!leaveFormData.employeeId) {
      alert('Please select an employee');
      return;
    }

    try {
      setLeaveFormLoading(true);
      const result = await attendanceApi.createLeave({
        ...leaveFormData,
        employeeId: parseInt(leaveFormData.employeeId),
        days: parseInt(leaveFormData.days)
      });

      if (result.data.success) {
        alert('Leave request submitted successfully!');
        setLeaveModalOpen(false);
        fetchLeaves();
      } else {
        alert(result.data.message || 'Operation failed');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Submit error:', err);
    } finally {
      setLeaveFormLoading(false);
    }
  };

  // ── Approve Leave ──
  const handleApproveLeave = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      const result = await attendanceApi.approveLeave(id);
      if (result.data.success) {
        alert('Leave approved successfully!');
        fetchLeaves();
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
    }
  };

  // ── Reject Leave ──
  const handleRejectLeave = async (id) => {
    if (!window.confirm('Reject this leave request?')) return;
    try {
      const result = await attendanceApi.rejectLeave(id);
      if (result.data.success) {
        alert('Leave rejected!');
        fetchLeaves();
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
    }
  };

  // ── Loading ──
  if (loading && attendances.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance records...</p>
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
            <Calendar className="w-7 h-7 text-blue-600" />
            Attendance Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track daily attendance • <span className="font-medium">{totalCount}</span> records
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilters({ ...filters, date: new Date().toISOString().split('T')[0] });
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-1"
          >
            <Calendar size={16} />
            Today
          </button>
          <button
            onClick={openSummaryModal}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
          >
            <FileText size={16} />
            Summary
          </button>
          <button
            onClick={openLeaveModal}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
          >
            <Calendar size={16} />
            Apply Leave
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus size={18} />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Present', value: stats.present, icon: UserCheck, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Absent', value: stats.absent, icon: UserX, bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'Late', value: stats.late, icon: ClockIcon, bg: 'bg-yellow-50', text: 'text-yellow-600' },
          { label: 'Half Day', value: stats.halfDay, icon: UserMinus, bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Leave', value: stats.leave, icon: Calendar, bg: 'bg-purple-50', text: 'text-purple-600' }
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

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employee name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm min-w-[160px]"
          />
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
            onClick={fetchAttendances}
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
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Check In</th>
                <th className="px-4 py-3 text-left">Check Out</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No attendance records found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or mark attendance</p>
                  </td>
                </tr>
              ) : (
                attendances.map((att) => {
                  const statusBadge = getStatusBadge(att.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <tr
                      key={att.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openViewModal(att)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                            {getInitials(att.employee?.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{att.employee?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{att.employee?.employeeCode || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(att.date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {att.checkIn ? (
                          <div className="flex items-center gap-1">
                            <ClockIcon size={13} className="text-green-600" />
                            <span className="font-medium text-gray-700">{formatTime(att.checkIn)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {att.checkOut ? (
                          <div className="flex items-center gap-1">
                            <ClockIcon size={13} className="text-red-600" />
                            <span className="font-medium text-gray-700">{formatTime(att.checkOut)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {att.workingHours ? (
                          <span className="font-medium text-gray-700">{att.workingHours.toFixed(1)}h</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusBadge.color}`}>
                          <StatusIcon size={12} />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openViewModal(att); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(att.id); }}
                            disabled={deletingId === att.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === att.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={15} />
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

        {/* ── Pagination ── */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <div className="text-gray-500">
            Showing {attendances.length} of {totalCount} entries
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
              disabled={attendances.length < pageSize}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MARK ATTENDANCE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <ClockIcon size={22} className="text-green-600" />
                  Mark Attendance
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Employee Selection */}
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

                {/* Date and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <ReactSelect
                      value={formData.status}
                      onChange={(val) => setFormData(prev => ({ ...prev, status: val || 'present' }))}
                      options={[
                        { value: 'present', label: 'Present' },
                        { value: 'absent', label: 'Absent' },
                        { value: 'late', label: 'Late' },
                        { value: 'half_day', label: 'Half Day' },
                        { value: 'leave', label: 'Leave' },
                        { value: 'holiday', label: 'Holiday' }
                      ]}
                      placeholder="Select Status"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                </div>

                {/* Check In/Out */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check In <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check Out
                    </label>
                    <input
                      type="time"
                      name="checkOut"
                      value={formData.checkOut}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Overtime */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    name="overtimeHours"
                    value={formData.overtimeHours}
                    onChange={handleFormChange}
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="e.g., 2.5"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Any remarks..."
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
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {formLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check size={16} />
                    )}
                    {formLoading ? 'Saving...' : 'Mark Attendance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW ATTENDANCE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewModalOpen && selectedAttendance && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {getInitials(selectedAttendance.employee?.name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedAttendance.employee?.name}</h2>
                    <p className="text-sm text-gray-500">{selectedAttendance.employee?.employeeCode}</p>
                  </div>
                </div>
                <button onClick={() => setViewModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  {(() => {
                    const statusBadge = getStatusBadge(selectedAttendance.status);
                    const StatusIcon = statusBadge.icon;
                    return (
                      <>
                        <div className={`p-3 rounded-full ${statusBadge.color.replace('text-', 'bg-').replace('border-', '')}`}>
                          <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className={`text-lg font-semibold ${statusBadge.color.replace('border-', '')}`}>
                            {statusBadge.label}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-gray-800">{formatDate(selectedAttendance.date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Check In</p>
                    <p className="font-medium text-gray-800">{formatTime(selectedAttendance.checkIn) || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Check Out</p>
                    <p className="font-medium text-gray-800">{formatTime(selectedAttendance.checkOut) || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Working Hours</p>
                    <p className="font-medium text-gray-800">{selectedAttendance.workingHours?.toFixed(1) || '-'}h</p>
                  </div>
                  {selectedAttendance.overtimeHours > 0 && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Overtime Hours</p>
                        <p className="font-medium text-gray-800">{selectedAttendance.overtimeHours?.toFixed(1) || '-'}h</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Overtime Amount</p>
                        <p className="font-medium text-gray-800">Rs. {selectedAttendance.overtimeAmount?.toFixed(0) || '0'}</p>
                      </div>
                    </>
                  )}
                  {selectedAttendance.location && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-medium text-gray-800">{selectedAttendance.location}</p>
                    </div>
                  )}
                  {selectedAttendance.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="font-medium text-gray-800">{selectedAttendance.notes}</p>
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
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      handleDelete(selectedAttendance.id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── SUMMARY MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSummaryModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={22} className="text-purple-600" />
                  Attendance Summary
                </h2>
                <button onClick={() => setSummaryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                    <ReactSelect
                      value={String(summaryFilters.month)}
                      onChange={(val) => handleSummaryFilterChange('month', parseInt(val || '1'))}
                      options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                        value: String(m),
                        label: new Date(2000, m - 1).toLocaleString('default', { month: 'long' })
                      }))}
                      placeholder="Select Month"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                    <ReactSelect
                      value={String(summaryFilters.year)}
                      onChange={(val) => handleSummaryFilterChange('year', parseInt(val || String(new Date().getFullYear())))}
                      options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => ({
                        value: String(y),
                        label: String(y)
                      }))}
                      placeholder="Select Year"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                  <div className="min-w-[180px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
                    <ReactSelect
                      value={summaryFilters.employeeId}
                      onChange={(val) => handleSummaryFilterChange('employeeId', val || '')}
                      options={[
                        { value: '', label: 'All Employees' },
                        ...employees.map(emp => ({ value: String(emp.id), label: emp.name }))
                      ]}
                      placeholder="All Employees"
                      isSearchable={true}
                      isClearable={false}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={applySummaryFilters}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Apply
                    </button>
                  </div>
                </div>

                {/* Summary Table */}
                {summaryLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading summary...</p>
                  </div>
                ) : summaryData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No data found for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-3 py-2 text-left">Employee</th>
                          <th className="px-3 py-2 text-center">Present</th>
                          <th className="px-3 py-2 text-center">Absent</th>
                          <th className="px-3 py-2 text-center">Late</th>
                          <th className="px-3 py-2 text-center">Half Day</th>
                          <th className="px-3 py-2 text-center">Leave</th>
                          <th className="px-3 py-2 text-center">OT Hours</th>
                          <th className="px-3 py-2 text-center">OT Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {summaryData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div>
                                <div className="font-medium text-gray-800 text-sm">{item.employee?.name}</div>
                                <div className="text-xs text-gray-400">{item.employee?.employeeCode}</div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center text-green-600 font-medium">{item.present || 0}</td>
                            <td className="px-3 py-2 text-center text-red-600 font-medium">{item.absent || 0}</td>
                            <td className="px-3 py-2 text-center text-yellow-600 font-medium">{item.late || 0}</td>
                            <td className="px-3 py-2 text-center text-orange-600 font-medium">{item.halfDay || 0}</td>
                            <td className="px-3 py-2 text-center text-blue-600 font-medium">{item.onLeave || 0}</td>
                            <td className="px-3 py-2 text-center font-medium">{item.totalOvertimeHours?.toFixed(1) || '0'}</td>
                            <td className="px-3 py-2 text-center font-medium">Rs. {item.totalOvertimeAmount?.toFixed(0) || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── APPLY LEAVE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setLeaveModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar size={22} className="text-blue-600" />
                  Apply Leave
                </h2>
                <button onClick={() => setLeaveModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLeaveSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <ReactSelect
                    value={leaveFormData.employeeId}
                    onChange={(val) => setLeaveFormData(prev => ({ ...prev, employeeId: val || '' }))}
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
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <ReactSelect
                    value={leaveFormData.type}
                    onChange={(val) => setLeaveFormData(prev => ({ ...prev, type: val || 'casual' }))}
                    options={[
                      { value: 'casual', label: 'Casual Leave' },
                      { value: 'sick', label: 'Sick Leave' },
                      { value: 'annual', label: 'Annual Leave' }
                    ]}
                    placeholder="Select Leave Type"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={leaveFormData.startDate}
                      onChange={(e) => {
                        handleLeaveFormChange(e);
                        calculateDays(e.target.value, leaveFormData.endDate);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={leaveFormData.endDate}
                      onChange={(e) => {
                        handleLeaveFormChange(e);
                        calculateDays(leaveFormData.startDate, e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Days <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="days"
                    value={leaveFormData.days}
                    onChange={handleLeaveFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    name="reason"
                    value={leaveFormData.reason}
                    onChange={handleLeaveFormChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Reason for leave..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setLeaveModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={leaveFormLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {leaveFormLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check size={16} />
                    )}
                    {leaveFormLoading ? 'Submitting...' : 'Apply Leave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;