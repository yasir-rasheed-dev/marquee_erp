// src/pages/HR/AdvanceLoan.jsx

import React, { useState, useEffect } from 'react';
import {
  Wallet, Users, Calendar, FileText, Clock, CheckCircle,
  XCircle, AlertCircle, Search, ChevronLeft, ChevronRight,
  RefreshCw, Eye, Edit, Trash2, Plus, Printer, Download,
  Filter, Banknote, ArrowUpRight, ArrowDownRight,
  X, Check, AlertTriangle, Briefcase, User, Building2,
  DollarSign, CreditCard, TrendingUp, TrendingDown
} from 'lucide-react';
import payrollApi from '../../services/payrollApi';
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
    active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
    paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    defaulted: { label: 'Defaulted', color: 'bg-red-100 text-red-800 border-red-200' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    approved: { label: 'Approved', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' }
  };
  return map[status?.toLowerCase()] || map.pending;
};

const getLoanTypeBadge = (type) => {
  const map = {
    loan: { label: 'Loan', color: 'bg-blue-100 text-blue-800' },
    advance: { label: 'Advance', color: 'bg-purple-100 text-purple-800' },
    bonus: { label: 'Bonus', color: 'bg-green-100 text-green-800' },
    reimbursement: { label: 'Reimbursement', color: 'bg-orange-100 text-orange-800' }
  };
  return map[type?.toLowerCase()] || map.loan;
};

// ── Status Options ──
const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'defaulted', label: 'Defaulted' }
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'loan', label: 'Loan' },
  { value: 'advance', label: 'Advance' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'reimbursement', label: 'Reimbursement' }
];

// ═══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════

const AdvanceLoan = () => {
  // ── State ──
  const [loans, setLoans] = useState([]);
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
    search: ''
  });

  // ── Modal States ──
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // ── Create/Edit Loan Modal ──
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'loan',
    amount: '',
    totalInstallments: '1',
    installmentAmount: '',
    deductFromSalary: true,
    purpose: ''
  });

  // ── Installment Modal ──
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [installmentLoanId, setInstallmentLoanId] = useState(null);
  const [installmentForm, setInstallmentForm] = useState({
    amount: '',
    notes: ''
  });
  const [installmentLoading, setInstallmentLoading] = useState(false);

  // ── Delete Modal ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    active: 0,
    paid: 0,
    activeEmployees: 0
  });

  // ── Fetch Loans ──
  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await payrollApi.getAllLoans({
        status: filters.status || undefined,
        employeeId: filters.employeeId || undefined,
        page,
        limit: pageSize
      });

      // ✅ FIXED: Handle response properly
      let loanData = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          loanData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          loanData = response.data.data;
        } else {
          loanData = response.data.data || [];
        }
      }

      setLoans(loanData);
      setTotalCount(response.data?.meta?.total || loanData.length || 0);
      setMeta(response.data?.meta || {});

      // Calculate stats
      const totalAmount = loanData.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
      const active = loanData.filter(l => l.status === 'active').length;
      const paid = loanData.filter(l => l.status === 'paid').length;
      const activeEmployees = new Set(loanData.map(l => l.employeeId)).size;

      setStats({
        total: loanData.length,
        totalAmount,
        active,
        paid,
        activeEmployees
      });
    } catch (err) {
      setError(err.message || 'Failed to load loans');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Employees ── (FIXED)
  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll({ status: 'active' });
      console.log('📥 Employees API Response:', response);

      // ✅ FIXED: Handle response properly
      let employeesData = [];

      if (response && response.success) {
        // ✅ Direct data array
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        }
        // ✅ Nested data
        else if (response.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        }
        // ✅ Fallback
        else {
          employeesData = response.data?.data || [];
        }
      } else if (response && response.data) {
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else {
          employeesData = response.data.data || [];
        }
      }

      console.log('✅ Setting employees:', employeesData.length, 'records');
      setEmployees(employeesData);
    } catch (err) {
      console.error('Employees fetch error:', err);
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchLoans();
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
      search: ''
    });
    setPage(1);
  };

  const hasFilters = filters.status || filters.type || filters.employeeId || filters.search;

  // ── View Loan ──
  const openViewModal = async (loan) => {
    try {
      const response = await payrollApi.getLoanById(loan.id);
      setSelectedLoan(response.data.data);
      setViewModalOpen(true);
    } catch (err) {
      alert('Failed to load loan details');
      console.error(err);
    }
  };

  // ── Open Create/Edit Modal ──
  const openFormModal = (loan = null) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        employeeId: loan.employeeId || '',
        type: loan.type || 'loan',
        amount: loan.amount?.toString() || '',
        totalInstallments: loan.totalInstallments?.toString() || '1',
        installmentAmount: loan.installmentAmount?.toString() || '',
        deductFromSalary: loan.deductFromSalary !== false,
        purpose: loan.purpose || ''
      });
    } else {
      setEditingLoan(null);
      setFormData({
        employeeId: '',
        type: 'loan',
        amount: '',
        totalInstallments: '1',
        installmentAmount: '',
        deductFromSalary: true,
        purpose: ''
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
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        employeeId: parseInt(formData.employeeId),
        type: formData.type,
        amount: parseFloat(formData.amount),
        totalInstallments: parseInt(formData.totalInstallments) || 1,
        installmentAmount: formData.installmentAmount ? parseFloat(formData.installmentAmount) : parseFloat(formData.amount) / parseInt(formData.totalInstallments),
        deductFromSalary: formData.deductFromSalary,
        purpose: formData.purpose
      };

      let result;
      if (editingLoan) {
        result = await payrollApi.updateLoan(editingLoan.id, payload);
      } else {
        result = await payrollApi.createLoan(payload);
      }

      if (result.data.success) {
        alert(editingLoan ? 'Loan updated successfully!' : 'Loan created successfully!');
        setFormModalOpen(false);
        fetchLoans();
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

  // ── Open Installment Modal ──
  const openInstallmentModal = (loanId) => {
    setInstallmentLoanId(loanId);
    setInstallmentForm({
      amount: '',
      notes: ''
    });
    setInstallmentModalOpen(true);
  };

  const handleInstallmentChange = (e) => {
    const { name, value } = e.target;
    setInstallmentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleInstallmentSubmit = async (e) => {
    e.preventDefault();

    if (!installmentForm.amount || parseFloat(installmentForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setInstallmentLoading(true);
      const result = await payrollApi.addLoanInstallment(installmentLoanId, {
        amount: parseFloat(installmentForm.amount),
        notes: installmentForm.notes
      });

      if (result.data.success) {
        alert('Installment added successfully!');
        setInstallmentModalOpen(false);
        fetchLoans();
        if (selectedLoan) {
          const updated = await payrollApi.getLoanById(selectedLoan.id);
          setSelectedLoan(updated.data.data);
        }
      } else {
        alert(result.data.message || 'Failed to add installment');
      }
    } catch (err) {
      alert(err.message || 'Something went wrong');
      console.error('Installment error:', err);
    } finally {
      setInstallmentLoading(false);
    }
  };

  // ── Delete Loan ──
  const openDeleteModal = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const result = await payrollApi.deleteLoan(deleteId);
      if (result.data.success) {
        alert('Loan deleted successfully');
        setDeleteModalOpen(false);
        fetchLoans();
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

  // ── Calculate Installment Amount ──
  const calculateInstallment = () => {
    const amount = parseFloat(formData.amount) || 0;
    const totalInst = parseInt(formData.totalInstallments) || 1;
    if (amount > 0 && totalInst > 0) {
      const instAmount = amount / totalInst;
      setFormData(prev => ({
        ...prev,
        installmentAmount: instAmount.toFixed(2)
      }));
    }
  };

  useEffect(() => {
    calculateInstallment();
  }, [formData.amount, formData.totalInstallments]);

  // ── Loading ──
  if (loading && loans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading loan records...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ── RENDER ── (Same as before, no changes needed)
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-blue-600" />
            Advance & Loan Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee loans, advances, and bonuses • <span className="font-medium">{totalCount}</span> records
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilters({ ...filters, status: 'active' });
              setPage(1);
            }}
            className="px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center gap-1"
          >
            <CheckCircle size={16} />
            Active
          </button>
          <button
            onClick={() => {
              setFilters({ ...filters, status: 'paid' });
              setPage(1);
            }}
            className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-1"
          >
            <FileText size={16} />
            Paid
          </button>
          <button
            onClick={() => openFormModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus size={18} />
            New Loan/Advance
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Loans', value: stats.total, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Total Amount', value: `Rs. ${formatCurrency(stats.totalAmount)}`, icon: DollarSign, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Active', value: stats.active, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Paid', value: stats.paid, icon: CreditCard, bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Employees', value: stats.activeEmployees, icon: Users, bg: 'bg-indigo-50', text: 'text-indigo-600' }
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
              placeholder="Search loan # or employee..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="min-w-[150px]">
            <ReactSelect
              value={filters.type}
              onChange={(val) => handleFilterChange('type', val || '')}
              options={typeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              placeholder="All Types"
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
            onClick={fetchLoans}
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
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-center">Installments</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No loan records found</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new loan or advance</p>
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const statusBadge = getStatusBadge(loan.status);
                  const typeBadge = getLoanTypeBadge(loan.type);
                  const remaining = parseFloat(loan.amount) - parseFloat(loan.paidAmount || 0);
                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openViewModal(loan)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                            {getInitials(loan.employee?.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{loan.employee?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{loan.employee?.employeeCode || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        Rs. {formatCurrency(loan.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        Rs. {formatCurrency(loan.paidAmount || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {remaining > 0 ? (
                          <span className="text-red-600">Rs. {formatCurrency(remaining)}</span>
                        ) : (
                          <span className="text-green-600">Rs. 0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {loan._count?.installments || 0} / {loan.totalInstallments || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openViewModal(loan); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          {loan.status === 'active' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openInstallmentModal(loan.id); }}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                              title="Add Installment"
                            >
                              <Plus size={15} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openFormModal(loan); }}
                            className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteModal(loan.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
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
            Showing {loans.length} of {totalCount} entries
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
              disabled={loans.length < pageSize}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW LOAN MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {getInitials(selectedLoan.employee?.name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedLoan.employee?.name}</h2>
                    <p className="text-sm text-gray-500">{selectedLoan.loanNo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLoan.status === 'active' && (
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        openInstallmentModal(selectedLoan.id);
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Installment
                    </button>
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
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="font-semibold text-lg text-blue-600">Rs. {formatCurrency(selectedLoan.amount)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-semibold text-lg text-green-600">Rs. {formatCurrency(selectedLoan.paidAmount || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className={`font-semibold text-lg ${(selectedLoan.amount - (selectedLoan.paidAmount || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Rs. {formatCurrency(selectedLoan.amount - (selectedLoan.paidAmount || 0))}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedLoan.status).color}`}>
                      {getStatusBadge(selectedLoan.status).label}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Type</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getLoanTypeBadge(selectedLoan.type).color}`}>
                      {getLoanTypeBadge(selectedLoan.type).label}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total Installments</p>
                    <p className="font-medium">{selectedLoan.totalInstallments || 1}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Installment Amount</p>
                    <p className="font-medium">Rs. {formatCurrency(selectedLoan.installmentAmount)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Deduct from Salary</p>
                    <p className="font-medium">{selectedLoan.deductFromSalary ? '✅ Yes' : '❌ No'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Created At</p>
                    <p className="font-medium">{formatDate(selectedLoan.createdAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Approved At</p>
                    <p className="font-medium">{formatDate(selectedLoan.approvedAt)}</p>
                  </div>
                  {selectedLoan.purpose && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-3">
                      <p className="text-xs text-gray-500">Purpose</p>
                      <p className="font-medium">{selectedLoan.purpose}</p>
                    </div>
                  )}
                </div>

                {/* Installments Table */}
                {selectedLoan.installments?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Installment History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-xs font-medium text-gray-500 uppercase">
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedLoan.installments.map((inst, idx) => (
                            <tr key={inst.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{idx + 1}</td>
                              <td className="px-3 py-2 text-right font-medium text-green-600">
                                Rs. {formatCurrency(inst.amount)}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{formatDate(inst.paidDate || inst.createdAt)}</td>
                              <td className="px-3 py-2 text-gray-500">{inst.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

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
      {/* ── CREATE/EDIT LOAN MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setFormModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Wallet size={22} className="text-blue-600" />
                  {editingLoan ? 'Edit Loan/Advance' : 'New Loan/Advance'}
                </h2>
                <button onClick={() => setFormModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
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
                    isDisabled={!!editingLoan}
                  />
                </div>

                {/* Type and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <ReactSelect
                      value={formData.type}
                      onChange={(val) => setFormData(prev => ({ ...prev, type: val || 'loan' }))}
                      options={[
                        { value: 'loan', label: 'Loan' },
                        { value: 'advance', label: 'Advance' },
                        { value: 'bonus', label: 'Bonus' },
                        { value: 'reimbursement', label: 'Reimbursement' }
                      ]}
                      placeholder="Select Type"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                      min="1"
                      step="100"
                    />
                  </div>
                </div>

                {/* Installments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Installments
                    </label>
                    <input
                      type="number"
                      name="totalInstallments"
                      value={formData.totalInstallments}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Installment Amount
                    </label>
                    <input
                      type="number"
                      name="installmentAmount"
                      value={formData.installmentAmount}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-gray-50"
                      step="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Auto-calculated from amount and installments</p>
                  </div>
                </div>

                {/* Deduct from Salary */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="deductFromSalary"
                    checked={formData.deductFromSalary}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Deduct from salary automatically
                  </label>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <textarea
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleFormChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Reason for loan/advance..."
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
                    {formLoading ? 'Saving...' : editingLoan ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── INSTALLMENT MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {installmentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setInstallmentModalOpen(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Plus size={22} className="text-green-600" />
                  Add Installment
                </h2>
                <button onClick={() => setInstallmentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleInstallmentSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={installmentForm.amount}
                    onChange={handleInstallmentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    required
                    min="1"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={installmentForm.notes}
                    onChange={handleInstallmentChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Installment remarks..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setInstallmentModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={installmentLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-medium"
                  >
                    {installmentLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check size={16} />
                    )}
                    {installmentLoading ? 'Adding...' : 'Add Installment'}
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
                  <h3 className="text-xl font-bold text-gray-800">Delete Loan/Advance</h3>
                  <p className="text-gray-500 mt-2">
                    Are you sure you want to delete this loan/advance? This action cannot be undone.
                  </p>
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    ⚠️ This will also remove all associated installments and ledger entries.
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

export default AdvanceLoan;