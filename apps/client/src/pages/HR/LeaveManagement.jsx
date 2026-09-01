// src/pages/HR/LeaveManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, UserCheck, UserX, Search,
  ChevronLeft, ChevronRight, RefreshCw,
  Eye, Edit, Trash2, Plus, Users, Filter,
  Check, X, AlertCircle, FileText, Printer,
  CheckCircle, XCircle, Clock as ClockIcon,
  User, Mail, Phone, Briefcase, DollarSign
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

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusBadge = (status) => {
  const map = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ClockIcon },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: X }
  };
  return map[status?.toLowerCase()] || map.pending;
};

const getLeaveTypeLabel = (type) => {
  const map = {
    casual: 'Casual Leave',
    sick: 'Sick Leave',
    annual: 'Annual Leave',
    unpaid: 'Unpaid Leave',
    other: 'Other'
  };
  return map[type] || type || '-';
};

const getLeaveTypeColor = (type) => {
  const map = {
    casual: 'bg-blue-100 text-blue-800',
    sick: 'bg-red-100 text-red-800',
    annual: 'bg-purple-100 text-purple-800',
    unpaid: 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-800'
  };
  return map[type] || 'bg-gray-100 text-gray-800';
};

// ── Status Options ──
const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
];

const leaveTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' }
];

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const LeaveManagement = () => {
  // ── State ──
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState({});

  // ── Filters ──
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    employeeId: '',
    search: '',
    from: '',
    to: ''
  });

  // ── Modal States ──
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Apply Leave Modal ──
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    employeeId: '',
    type: 'casual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    days: 1
  });
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);

  // ── Balance Modal ──
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [balanceEmployee, setBalanceEmployee] = useState(null);
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [balanceLoading, setBalanceLoading] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });

  // ── Fetch Data ──
  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceApi.getAllLeaves({
        status: filters.status || undefined,
        type: filters.type || undefined,
        employeeId: filters.employeeId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit: pageSize
      });

      setLeaves(response.data.data || []);
      setTotalCount(response.data.meta?.total || 0);
      setMeta(response.data.meta || {});

      // Calculate stats
      const leaveData = response.data.data || [];
      setStats({
        total: leaveData.length,
        pending: leaveData.filter(l => l.status === 'pending').length,
        approved: leaveData.filter(l => l.status === 'approved').length,
        rejected: leaveData.filter(l => l.status === 'rejected').length,
        cancelled: leaveData.filter(l => l.status === 'cancelled').length
      });
    } catch (err) {
      setError(err.message || 'Failed to load leaves');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll({ status: 'active' });
      setEmployees(response.data.data || []);
    } catch (err) {
      console.error('Employees fetch error:', err);
    }
  };

  useEffect(() => {
    fetchLeaves();
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
      status: '',
      type: '',
      employeeId: '',
      search: '',
      from: '',
      to: ''
    });
    setPage(1);
  };

  const hasFilters = filters.status || filters.type || filters.employeeId || 
                     filters.search || filters.from || filters.to;

  // ── View Leave ──
  const openViewModal = (leave) => {
    setSelectedLeave(leave);
    setViewModalOpen(true);
  };

  // ── Apply Leave ──
  const openApplyModal = () => {
    setLeaveFormData({
      employeeId: '',
      type: 'casual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
      days: 1
    });
    setApplyModalOpen(true);
  };

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setLeaveFormData(prev => ({ ...prev, days: diffDays }));
  };

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
        setApplyModalOpen(false);
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
  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      setActionLoading(true);
      const result = await attendanceApi.approveLeave(id);
      if (result.data.success) {
        alert('Leave approved successfully!');
        fetchLeaves();
        setViewModalOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject Leave ──
  const handleReject = async (id) => {
    if (!window.confirm('Reject this leave request?')) return;
    try {
      setActionLoading(true);
      const result = await attendanceApi.rejectLeave(id);
      if (result.data.success) {
        alert('Leave rejected!');
        fetchLeaves();
        setViewModalOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete Leave ──
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    try {
      setDeleteId(id);
      const result = await attendanceApi.deleteLeave(id);
      if (result.data.success) {
        alert('Leave request deleted successfully');
        fetchLeaves();
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
    } finally {
      setDeleteId(null);
    }
  };

  // ── View Balance ──
  const openBalanceModal = async (employee) => {
    try {
      setBalanceLoading(true);
      setBalanceEmployee(employee);
      const response = await attendanceApi.getLeaveBalance(employee.id, balanceYear);
      setBalanceData(response.data.data);
      setBalanceModalOpen(true);
    } catch (err) {
      alert('Failed to load leave balance');
      console.error(err);
    } finally {
      setBalanceLoading(false);
    }
  };

  // ── Loading ──
  if (loading && leaves.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave requests...</p>
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
            Leave Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee leave requests • <span className="font-medium">{totalCount}</span> total requests
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilters({ ...filters, status: 'pending' });
              setPage(1);
            }}
            className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm flex items-center gap-1"
          >
            <ClockIcon size={16} />
            Pending
          </button>
          <button
            onClick={openBalanceModal}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
          >
            <Users size={16} />
            Balance
          </button>
          <button
            onClick={openApplyModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus size={18} />
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Pending', value: stats.pending, icon: ClockIcon, bg: 'bg-yellow-50', text: 'text-yellow-600' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'Cancelled', value: stats.cancelled, icon: X, bg: 'bg-gray-50', text: 'text-gray-600' }
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
              value={filters.type}
              onChange={(val) => handleFilterChange('type', val || '')}
              options={leaveTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              placeholder="All Types"
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
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm min-w-[150px]"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm min-w-[150px]"
            placeholder="To"
          />
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
            onClick={fetchLeaves}
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
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No leave requests found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or apply for leave</p>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const statusBadge = getStatusBadge(leave.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <tr
                      key={leave.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openViewModal(leave)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                            {getInitials(leave.employee?.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{leave.employee?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{leave.employee?.employeeCode || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.type)}`}>
                          {getLeaveTypeLabel(leave.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(leave.startDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(leave.endDate)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">
                        {leave.days}
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
                            onClick={(e) => { e.stopPropagation(); openViewModal(leave); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          {leave.status === 'pending' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApprove(leave.id); }}
                                disabled={actionLoading}
                                className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReject(leave.id); }}
                                disabled={actionLoading}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(leave.id); }}
                            disabled={deleteId === leave.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deleteId === leave.id ? (
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
            Showing {leaves.length} of {totalCount} entries
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
              disabled={leaves.length < pageSize}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW LEAVE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {getInitials(selectedLeave.employee?.name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedLeave.employee?.name}</h2>
                    <p className="text-sm text-gray-500">{selectedLeave.employee?.employeeCode}</p>
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
                    const statusBadge = getStatusBadge(selectedLeave.status);
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
                    <p className="text-xs text-gray-500">Leave Type</p>
                    <p className="font-medium text-gray-800">{getLeaveTypeLabel(selectedLeave.type)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total Days</p>
                    <p className="font-medium text-gray-800">{selectedLeave.days} days</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-800">{formatDate(selectedLeave.startDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="font-medium text-gray-800">{formatDate(selectedLeave.endDate)}</p>
                  </div>
                  {selectedLeave.reason && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Reason</p>
                      <p className="font-medium text-gray-800">{selectedLeave.reason}</p>
                    </div>
                  )}
                  {selectedLeave.rejectionReason && (
                    <div className="bg-red-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-red-500">Rejection Reason</p>
                      <p className="font-medium text-red-700">{selectedLeave.rejectionReason}</p>
                    </div>
                  )}
                  {selectedLeave.approvedAt && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500">Approved At</p>
                      <p className="font-medium text-gray-800">{new Date(selectedLeave.approvedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                  {selectedLeave.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedLeave.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(selectedLeave.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── APPLY LEAVE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setApplyModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar size={22} className="text-blue-600" />
                  Apply Leave
                </h2>
                <button onClick={() => setApplyModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
                      { value: 'annual', label: 'Annual Leave' },
                      { value: 'unpaid', label: 'Unpaid Leave' },
                      { value: 'other', label: 'Other' }
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
                    onClick={() => setApplyModalOpen(false)}
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── LEAVE BALANCE MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {balanceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setBalanceModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users size={22} className="text-purple-600" />
                  Leave Balance
                </h2>
                <button onClick={() => setBalanceModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Employee Info */}
                {balanceEmployee && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {getInitials(balanceEmployee.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{balanceEmployee.name}</p>
                      <p className="text-sm text-gray-500">{balanceEmployee.employeeCode}</p>
                    </div>
                  </div>
                )}

                {/* Year Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Year:</label>
                  <ReactSelect
                    value={String(balanceYear)}
                    onChange={(val) => setBalanceYear(parseInt(val || String(new Date().getFullYear())))}
                    options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => ({
                      value: String(y),
                      label: String(y)
                    }))}
                    placeholder="Select Year"
                    isSearchable={false}
                    isClearable={false}
                  />
                  <button
                    onClick={() => {
                      if (balanceEmployee) {
                        openBalanceModal(balanceEmployee);
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Refresh
                  </button>
                </div>

                {/* Balance Display */}
                {balanceLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading balance...</p>
                  </div>
                ) : balanceData ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 uppercase">Casual Leave</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {balanceData.casualTotal - (balanceData.casualUsed || 0)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Used: {balanceData.casualUsed || 0} / Total: {balanceData.casualTotal}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 uppercase">Sick Leave</p>
                      <p className="text-2xl font-bold text-red-600">
                        {balanceData.sickTotal - (balanceData.sickUsed || 0)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Used: {balanceData.sickUsed || 0} / Total: {balanceData.sickTotal}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 uppercase">Annual Leave</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {balanceData.annualTotal - (balanceData.annualUsed || 0)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Used: {balanceData.annualUsed || 0} / Total: {balanceData.annualTotal}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No leave balance found for this employee</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;