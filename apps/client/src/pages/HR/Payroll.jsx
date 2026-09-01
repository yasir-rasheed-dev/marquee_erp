// src/pages/HR/Payroll.jsx

import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, Users, FileText, Clock, CheckCircle,
  XCircle, AlertCircle, Search, ChevronLeft, ChevronRight,
  RefreshCw, Eye, Edit, Trash2, Plus, Printer, Download,
  Filter, Wallet, Banknote, ArrowUpRight, ArrowDownRight,
  X, Check, AlertTriangle, Briefcase, User, Building2,
  Calendar as CalendarIcon, List, Grid, Layers
} from 'lucide-react';
import payrollApi from '../../services/payrollApi';
import ReactSelect from '../../components/ui/ReactSelect';
import employeeApi from '../../services/employeeApi';
import eventApi from '../../services/eventApi';

// ── Helpers ──
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
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
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    generated: { label: 'Generated', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    processed: { label: 'Processed', color: 'bg-green-100 text-green-800 border-green-200' },
    paid: { label: 'Paid', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' }
  };
  return map[status?.toLowerCase()] || map.draft;
};

const getPaymentStatusBadge = (status) => {
  const map = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200' },
    partial: { label: 'Partial', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200' }
  };
  return map[status?.toLowerCase()] || map.pending;
};

// ── Month Options ──
const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

// ── Status Options ──
const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'generated', label: 'Generated' },
  { value: 'processed', label: 'Processed' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' }
];

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const Payroll = () => {
  // ── State ──
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState({});

  // ── Filters ──
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: '',
    search: ''
  });

  // ── Modal States ──
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // ── Generate Payroll Modal ──
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateType, setGenerateType] = useState('monthly'); // 'monthly' or 'event'
  const [generateForm, setGenerateForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    eventId: '',
    employeeIds: []
  });
  const [generateLoading, setGenerateLoading] = useState(false);

  // ── Payment Modal ──
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    bankAccountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // ── Process Modal ──
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processId, setProcessId] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    paid: 0,
    pending: 0,
    employees: 0
  });

  // ── Fetch Data ──
  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await payrollApi.getAllPayrolls({
        month: filters.month || undefined,
        year: filters.year || undefined,
        status: filters.status || undefined,
        page,
        limit: pageSize
      });

      // ✅ FIXED: Handle response properly
      let payrollData = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          payrollData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          payrollData = response.data.data;
        } else {
          payrollData = response.data.data || [];
        }
      }

      setPayrolls(payrollData);
      setTotalCount(response.data?.meta?.total || payrollData.length || 0);
      setMeta(response.data?.meta || {});

      // Calculate stats
      const totalAmount = payrollData.reduce((sum, p) => sum + parseFloat(p.totalNetSalary || 0), 0);
      const paid = payrollData.filter(p => p.status === 'paid').length;
      const pending = payrollData.filter(p => p.status === 'generated' || p.status === 'processed').length;
      const employees = payrollData.reduce((sum, p) => sum + (p.totalEmployees || 0), 0);

      setStats({
        total: payrollData.length,
        totalAmount,
        paid,
        pending,
        employees
      });
    } catch (err) {
      setError(err.message || 'Failed to load payrolls');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll({ status: 'active' });
      let empData = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          empData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          empData = response.data.data;
        } else {
          empData = response.data.data || [];
        }
      }
      setEmployees(empData);
    } catch (err) {
      console.error('Employees fetch error:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await eventApi.getAll({ status: 'upcoming' });
      let eventData = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          eventData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          eventData = response.data.data;
        } else {
          eventData = response.data.data || [];
        }
      }
      setEvents(eventData);
    } catch (err) {
      console.error('Events fetch error:', err);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [filters, page]);

  useEffect(() => {
    fetchEmployees();
    fetchEvents();
  }, []);

  // ── Handlers ──
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: '',
      search: ''
    });
    setPage(1);
  };

  const hasFilters = filters.status || filters.search;

  // ── View Payroll ──
  const openViewModal = async (payroll) => {
    try {
      const response = await payrollApi.getPayrollById(payroll.id);
      setSelectedPayroll(response.data.data);
      setViewModalOpen(true);
    } catch (err) {
      alert('Failed to load payroll details');
      console.error(err);
    }
  };

  // ── Generate Payroll ──
  const openGenerateModal = () => {
    const now = new Date();
    setGenerateForm({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      eventId: '',
      employeeIds: []
    });
    setGenerateType('monthly');
    setGenerateModalOpen(true);
  };

  const handleGenerateChange = (e) => {
    const { name, value } = e.target;
    setGenerateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(parseInt(options[i].value));
      }
    }
    setGenerateForm(prev => ({ ...prev, employeeIds: selected }));
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();

    try {
      setGenerateLoading(true);

      let payload = {};
      let endpoint = '';

      if (generateType === 'monthly') {
        // ✅ Monthly Payroll - For fixed salary employees
        endpoint = 'payrolls/generate/monthly';
        payload = {
          month: parseInt(generateForm.month),
          year: parseInt(generateForm.year),
          startDate: generateForm.startDate,
          endDate: generateForm.endDate,
          employeeIds: generateForm.employeeIds.length > 0 ? generateForm.employeeIds : undefined
        };
      } else {
        // ✅ Event-Based Payroll - For per-event employees
        endpoint = 'payrolls/generate/event';
        payload = {
          eventId: parseInt(generateForm.eventId),
          employeeIds: generateForm.employeeIds.length > 0 ? generateForm.employeeIds : undefined
        };
      }

      console.log('📤 Generating payroll:', { type: generateType, payload });

      const result = await payrollApi.generatePayroll(endpoint, payload);

      if (result.data.success) {
        alert(generateType === 'monthly' 
          ? `Monthly payroll generated successfully for ${monthOptions[generateForm.month - 1].label} ${generateForm.year}`
          : 'Event-based payroll generated successfully!'
        );
        setGenerateModalOpen(false);
        fetchPayrolls();
      } else {
        alert(result.data.message || 'Failed to generate payroll');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Generate error:', err);
    } finally {
      setGenerateLoading(false);
    }
  };

  // ── Process Payroll ──
  const handleProcessPayroll = async (id) => {
    if (!window.confirm('Process this payroll? This will mark all salary calculations as final.')) return;

    try {
      setProcessLoading(true);
      const result = await payrollApi.processPayroll(id);
      if (result.data.success) {
        alert('Payroll processed successfully!');
        setProcessModalOpen(false);
        fetchPayrolls();
      } else {
        alert(result.data.message || 'Failed to process payroll');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Process error:', err);
    } finally {
      setProcessLoading(false);
    }
  };

  // ── Pay Employee ──
  const openPaymentModal = (item) => {
    setPaymentItem(item);
    setPaymentForm({
      bankAccountId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!window.confirm(`Pay ${formatCurrency(paymentItem.netSalary)} to ${paymentItem.employee?.name}?`)) return;

    try {
      setPaymentLoading(true);
      const result = await payrollApi.payPayrollItem(paymentItem.id, paymentForm);
      if (result.data.success) {
        alert('Salary paid successfully!');
        setPaymentModalOpen(false);
        fetchPayrolls();
        if (selectedPayroll) {
          const updated = await payrollApi.getPayrollById(selectedPayroll.id);
          setSelectedPayroll(updated.data.data);
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

  // ── Loading ──
  if (loading && payrolls.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payroll records...</p>
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
            <DollarSign className="w-7 h-7 text-blue-600" />
            Payroll Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee salaries • Monthly & Event-Based • <span className="font-medium">{totalCount}</span> payrolls
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openGenerateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus size={18} />
            Generate Payroll
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Payrolls', value: stats.total, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Total Amount', value: `Rs. ${formatCurrency(stats.totalAmount)}`, icon: DollarSign, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Employees', value: stats.employees, icon: Users, bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Paid', value: stats.paid, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600' },
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
              placeholder="Search payroll #..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="min-w-[150px]">
            <ReactSelect
              value={String(filters.month)}
              onChange={(val) => handleFilterChange('month', parseInt(val || '1'))}
              options={monthOptions.map(opt => ({ value: String(opt.value), label: opt.label }))}
              placeholder="Select Month"
              isSearchable={false}
              isClearable={false}
            />
          </div>
          <div className="min-w-[120px]">
            <ReactSelect
              value={String(filters.year)}
              onChange={(val) => handleFilterChange('year', parseInt(val || String(new Date().getFullYear())))}
              options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => ({
                value: String(y),
                label: String(y)
              }))}
              placeholder="Select Year"
              isSearchable={false}
              isClearable={false}
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
            onClick={fetchPayrolls}
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
                <th className="px-4 py-3 text-left">Payroll #</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Month/Event</th>
                <th className="px-4 py-3 text-center">Employees</th>
                <th className="px-4 py-3 text-right">Total Salary</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No payroll records found</p>
                    <p className="text-sm text-gray-400 mt-1">Generate payroll for monthly or event-based</p>
                  </td>
                </tr>
              ) : (
                payrolls.map((payroll) => {
                  const statusBadge = getStatusBadge(payroll.status);
                  return (
                    <tr
                      key={payroll.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openViewModal(payroll)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 text-sm">{payroll.payrollNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          payroll.type === 'event' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {payroll.type === 'event' ? 'Event' : 'Monthly'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {payroll.type === 'event' 
                          ? payroll.eventName || `Event #${payroll.eventId}`
                          : `${monthOptions[payroll.month - 1]?.label} ${payroll.year}`
                        }
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">
                        {payroll.totalEmployees || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        Rs. {formatCurrency(payroll.totalNetSalary || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openViewModal(payroll); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          {payroll.status === 'generated' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProcessId(payroll.id);
                                setProcessModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                              title="Process"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {payroll.status === 'processed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (payroll.items?.length > 0) {
                                  const unpaid = payroll.items.find(i => i.paymentStatus === 'pending');
                                  if (unpaid) {
                                    openPaymentModal(unpaid);
                                  } else {
                                    alert('All employees have been paid');
                                  }
                                }
                              }}
                              className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"
                              title="Pay"
                            >
                              <Wallet size={15} />
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
            Showing {payrolls.length} of {totalCount} entries
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
              disabled={payrolls.length < pageSize}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── GENERATE PAYROLL MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setGenerateModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Plus size={22} className="text-blue-600" />
                  Generate Payroll
                </h2>
                <button onClick={() => setGenerateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="p-6 space-y-6">
                {/* ── Payroll Type Selection ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payroll Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGenerateType('monthly')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        generateType === 'monthly'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CalendarIcon className={`w-6 h-6 ${generateType === 'monthly' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className="font-semibold mt-1">Monthly Payroll</p>
                      <p className="text-xs text-gray-500">For fixed salary employees</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerateType('event')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        generateType === 'event'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CalendarIcon className={`w-6 h-6 ${generateType === 'event' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <p className="font-semibold mt-1">Event-Based Payroll</p>
                      <p className="text-xs text-gray-500">For per-event employees</p>
                    </button>
                  </div>
                </div>

                {/* ── Monthly Payroll Fields ── */}
                {generateType === 'monthly' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Month <span className="text-red-500">*</span>
                        </label>
                        <ReactSelect
                          value={String(generateForm.month)}
                          onChange={(val) => setGenerateForm(prev => ({ ...prev, month: parseInt(val || '1') }))}
                          options={monthOptions.map(opt => ({ value: String(opt.value), label: opt.label }))}
                          placeholder="Select Month"
                          isSearchable={false}
                          isClearable={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Year <span className="text-red-500">*</span>
                        </label>
                        <ReactSelect
                          value={String(generateForm.year)}
                          onChange={(val) => setGenerateForm(prev => ({ ...prev, year: parseInt(val || String(new Date().getFullYear())) }))}
                          options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => ({
                            value: String(y),
                            label: String(y)
                          }))}
                          placeholder="Select Year"
                          isSearchable={false}
                          isClearable={false}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={generateForm.startDate}
                          onChange={handleGenerateChange}
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
                          value={generateForm.endDate}
                          onChange={handleGenerateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Event-Based Payroll Fields ── */}
                {generateType === 'event' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event <span className="text-red-500">*</span>
                    </label>
                    <ReactSelect
                      value={generateForm.eventId}
                      onChange={(val) => setGenerateForm(prev => ({ ...prev, eventId: val || '' }))}
                      options={[
                        { value: '', label: 'Select Event' },
                        ...events.map(event => ({
                          value: String(event.id),
                          label: `${event.name} - ${formatDate(event.date)}`
                        }))
                      ]}
                      placeholder="Select Event"
                      isSearchable={true}
                      isClearable={false}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Payroll will be generated for employees assigned to this event
                    </p>
                  </div>
                )}

                {/* ── Employee Selection ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Employees (Optional)
                  </label>
                  <ReactSelect
                    isMulti={true}
                    value={generateForm.employeeIds.map(id => String(id))}
                    onChange={(vals) => setGenerateForm(prev => ({ ...prev, employeeIds: (vals || []).map(v => parseInt(v)) }))}
                    options={employees.map(emp => ({
                      value: String(emp.id),
                      label: `${emp.name} (${emp.employeeCode}) - ${emp.designation?.name || 'N/A'}`
                    }))}
                    placeholder="Select Employees"
                    isSearchable={true}
                    isClearable={true}
                    closeMenuOnSelect={false}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to include all active employees.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                  {generateType === 'monthly' 
                    ? 'Payroll will be generated for selected employees based on monthly salary. Salaries will be calculated from attendance, leaves, and loans.'
                    : 'Payroll will be generated for selected employees based on event assignments. Event staff payments will be calculated.'
                  }
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setGenerateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generateLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {generateLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check size={16} />
                    )}
                    {generateLoading ? 'Generating...' : 'Generate Payroll'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW PAYROLL MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewModalOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText size={22} className="text-blue-600" />
                    Payroll Details
                  </h2>
                  <p className="text-sm text-gray-500">{selectedPayroll.payrollNo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPayroll.status === 'generated' && (
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        setProcessId(selectedPayroll.id);
                        setProcessModalOpen(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Process
                    </button>
                  )}
                  <button onClick={() => setViewModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Type</p>
                    <p className={`font-semibold ${selectedPayroll.type === 'event' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {selectedPayroll.type === 'event' ? 'Event-Based' : 'Monthly'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Period</p>
                    <p className="font-semibold">
                      {selectedPayroll.type === 'event' 
                        ? selectedPayroll.eventName || `Event #${selectedPayroll.eventId}`
                        : `${monthOptions[selectedPayroll.month - 1]?.label} ${selectedPayroll.year}`
                      }
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Employees</p>
                    <p className="font-semibold">{selectedPayroll.totalEmployees}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Total Salary</p>
                    <p className="font-semibold text-green-600">Rs. {formatCurrency(selectedPayroll.totalNetSalary)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedPayroll.status).color}`}>
                      {getStatusBadge(selectedPayroll.status).label}
                    </span>
                  </div>
                </div>

                {/* Employee Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Employee Salary Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-xs font-medium text-gray-500 uppercase">
                          <th className="px-3 py-2 text-left">Employee</th>
                          <th className="px-3 py-2 text-right">Basic</th>
                          <th className="px-3 py-2 text-right">Allowances</th>
                          <th className="px-3 py-2 text-right">Overtime</th>
                          <th className="px-3 py-2 text-right">Deductions</th>
                          <th className="px-3 py-2 text-right">Net Salary</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedPayroll.items?.map((item) => {
                          const paymentStatus = getPaymentStatusBadge(item.paymentStatus);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                    {getInitials(item.employee?.name)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-800">{item.employee?.name}</div>
                                    <div className="text-xs text-gray-400">{item.employee?.employeeCode}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">Rs. {formatCurrency(item.basicSalary)}</td>
                              <td className="px-3 py-2 text-right">Rs. {formatCurrency((item.houseRent || 0) + (item.medicalAllowance || 0) + (item.conveyance || 0))}</td>
                              <td className="px-3 py-2 text-right">Rs. {formatCurrency(item.overtimeAmount)}</td>
                              <td className="px-3 py-2 text-right text-red-600">Rs. {formatCurrency(item.totalDeductions)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-green-600">Rs. {formatCurrency(item.netSalary)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${paymentStatus.color}`}>
                                  {paymentStatus.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.paymentStatus !== 'paid' && selectedPayroll.status === 'processed' && (
                                  <button
                                    onClick={() => {
                                      setViewModalOpen(false);
                                      openPaymentModal(item);
                                    }}
                                    className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                                  >
                                    Pay Now
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── PROCESS PAYROLL MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {processModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setProcessModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800">Process Payroll</h3>
                  <p className="text-gray-500 mt-2">
                    This will mark all salary calculations as final. Once processed, you can start making payments to employees.
                  </p>
                  <p className="text-sm text-yellow-600 mt-2 font-medium">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  <button
                    onClick={() => setProcessModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setProcessModalOpen(false);
                      handleProcessPayroll(processId);
                    }}
                    disabled={processLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {processLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {processLoading ? 'Processing...' : 'Yes, Process Payroll'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── PAYMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {paymentModalOpen && paymentItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setPaymentModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Wallet size={22} className="text-purple-600" />
                  Pay Employee
                </h2>
                <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {getInitials(paymentItem.employee?.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{paymentItem.employee?.name}</p>
                      <p className="text-sm text-gray-500">{paymentItem.employee?.employeeCode}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Net Salary</p>
                    <p className="text-2xl font-bold text-green-600">Rs. {formatCurrency(paymentItem.netSalary)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPaymentStatusBadge(paymentItem.paymentStatus).color}`}>
                      {getPaymentStatusBadge(paymentItem.paymentStatus).label}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
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
    </div>
  );
};

export default Payroll;