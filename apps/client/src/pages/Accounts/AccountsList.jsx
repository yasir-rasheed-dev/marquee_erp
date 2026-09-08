// ═══════════════════════════════════════════════════════════
// pages/accounts/AccountsList.jsx
// Bank Accounts Grid + Table View + Filters + CRUD Modal + Pagination
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Plus, Landmark, Wallet, TrendingUp,
  Search, RefreshCw, X,
  Pencil, Trash2, Eye, ChevronLeft, ChevronRight, LayoutGrid, Table as TableIcon, Banknote,
  CreditCard, Building2, PiggyBank, Coffee, Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import ReactSelect from '../../components/ui/ReactSelect';

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  FROZEN: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-red-100 text-red-700',
};

// ── Updated: Payment Method Icons ──
const TYPE_ICONS = {
  BANK: Building2,
  CASH: Wallet,
  CREDIT: CreditCard,
  JAZZCASH: Smartphone,
  EASYPAISA: Smartphone,
  OTHER: Landmark,
};

// ── Updated: Account Type Options (Payment Methods) ──
const ACCOUNT_TYPE_OPTIONS = [
  { value: 'BANK', label: 'Bank Account', icon: Building2 },
  { value: 'CASH', label: 'Cash', icon: Wallet },
  { value: 'CREDIT', label: 'Credit Card', icon: CreditCard },
  { value: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { value: 'EASYPAISA', label: 'EasyPaisa', icon: Smartphone },
  { value: 'OTHER', label: 'Other', icon: Landmark },
];

// ── Updated: Filter Options ──
const accountTypeFilterOptions = [
  { value: '', label: 'All Account Types' },
  ...ACCOUNT_TYPE_OPTIONS,
];

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'FROZEN', label: 'Frozen' },
  { value: 'CLOSED', label: 'Closed' }
];

const limitOptions = [
  { value: '5', label: '5 / page' },
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' }
];

export default function AccountsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ── Filter States ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Pagination States ──
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editAccount, setEditAccount] = useState(null);

  const [, setHistoryAccount] = useState(null);

  const [form, setForm] = useState({
    bankName: '',
    accountHolder: '',
    accountType: 'BANK',
    accountNumber: '',
    initialBalance: '',
    status: 'ACTIVE',
    notes: ''
  });

  // ── Debounce Search ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus]);

  // ── Fetch Accounts ──
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const activeBranchId = currentBranch?.id || user?.branchId || 1;
      const params = { 
        branchId: activeBranchId,
        page,
        limit
      };
      
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterType) params.accountType = filterType;
      if (filterStatus) params.status = filterStatus;

      const res = await accountApi.getAll(params);
      
      let items = [];
      let total = 0;

      if (res.data?.success) {
        items = res.data.data || [];
        total = res.data.total || res.data.data?.length || 0;
      } else if (Array.isArray(res.data)) {
        items = res.data;
        total = res.data.length;
      } else if (Array.isArray(res)) {
        items = res;
        total = res.length;
      }

      setAccounts(items);
      setTotalRecords(total);
      setTotalPages(Math.ceil(total / limit) || 1);

    } catch (err) {
      if (err?.response?.status !== 429) {
        toast.error('Failed to load accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAccounts(); 
  }, [debouncedSearch, filterType, filterStatus, page, limit, currentBranch?.id]);

  const openCreate = () => {
    setModalMode('create');
    setEditAccount(null);
    setForm({ bankName: '', accountHolder: '', accountType: 'BANK', accountNumber: '', initialBalance: '', status: 'ACTIVE', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (acc) => {
    setModalMode('edit');
    setEditAccount(acc);
    setForm({
      bankName: acc.bankName || '',
      accountHolder: acc.accountHolder || '',
      accountType: acc.accountType || 'BANK',
      accountNumber: acc.accountNumber || '',
      initialBalance: acc.initialBalance || '',
      status: acc.status || 'ACTIVE',
      notes: acc.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const activeBranchId = currentBranch?.id || user?.branchId || 1;
      const submitData = {
        ...form,
        branchId: activeBranchId,
        companyId: currentBranch?.companyId || user?.companyId || 1,
        initialBalance: form.initialBalance ? parseFloat(form.initialBalance) : 0
      };

      if (modalMode === 'create') {
        await accountApi.create(submitData);
        toast.success('Account created successfully!');
      } else {
        await accountApi.update(editAccount.id, submitData);
        toast.success('Account updated successfully!');
      }
      setModalOpen(false);
      fetchAccounts(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save account');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await accountApi.delete(id);
      toast.success('Account deleted successfully!');
      fetchAccounts(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.currentBalance || 0), 0);

  // ── Helper to get icon for account type ──
  const getAccountIcon = (type) => {
    const option = ACCOUNT_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.icon || Landmark;
  };

  // ── Helper to get label for account type ──
  const getAccountTypeLabel = (type) => {
    const option = ACCOUNT_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.label || type || 'Other';
  };

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#334155' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-md">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Payment Accounts</h1>
                  <p className="text-xs font-medium" style={{ color: '#475569' }}>
                    {totalRecords} total accounts • Page {page} of {totalPages}
                    {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100/80 text-[#8B6914] font-bold">{currentBranch.name}</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl border border-slate-300 flex items-center shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')} 
                  title="Grid Card View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  title="Table View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <TableIcon size={18} />
                </button>
              </div>

              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>
                <Plus size={16} /> Add Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#2563EB' }} />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search by account name, holder, or number..."
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                style={{ borderColor: '#CBD5E1', backgroundColor: '#fff', color: '#0F172A' }} 
              />
            </div>

            {/* Account Type Filter */}
            <div className="w-full md:w-56">
              <ReactSelect
                options={accountTypeFilterOptions}
                value={filterType}
                onChange={(val) => setFilterType(val || '')}
                placeholder="All Account Types"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <ReactSelect
                options={statusFilterOptions}
                value={filterStatus}
                onChange={(val) => setFilterStatus(val || '')}
                placeholder="All Statuses"
              />
            </div>

            {/* Refresh Button */}
            <button 
              onClick={fetchAccounts} 
              title="Refresh Data"
              className="w-full md:w-auto p-2.5 px-4 rounded-xl border hover:bg-amber-50 transition-all flex items-center justify-center gap-2 text-sm font-semibold" 
              style={{ borderColor: '#CBD5E1', color: '#2563EB' }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8 md:px-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#CBD5E1' }}>
            <Landmark size={48} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <p className="text-sm font-medium" style={{ color: '#475569' }}>No accounts found matching your filters</p>
            <button onClick={openCreate} className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>Create First Account</button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID CARD VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => {
              const Icon = getAccountIcon(acc.accountType);
              const typeLabel = getAccountTypeLabel(acc.accountType);
              return (
                <div key={acc.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all group" style={{ borderColor: '#CBD5E1' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                        <Icon size={20} style={{ color: '#2563EB' }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>{acc.bankName || typeLabel}</h3>
                        <p className="text-xs text-gray-400 font-mono">{acc.accountNumber || '—'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${STATUS_COLORS[acc.status] || 'bg-gray-100'}`}>{acc.status}</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                    <p className="text-2xl font-bold font-mono" style={{ color: '#2563EB' }}>{formatCurrency(acc.currentBalance ?? acc.initialBalance)}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Icon size={12} /> {typeLabel}
                    </span>
                    <span>{acc._count?.transactions || 0} transactions</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setHistoryAccount(acc)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold hover:bg-amber-50 transition-all" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                      <Eye size={12} /> Ledger
                    </button>
                    <button onClick={() => openEdit(acc)} className="p-2 rounded-xl border hover:bg-gray-50 transition-all" style={{ borderColor: '#CBD5E1', color: '#334155' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="p-2 rounded-xl border hover:bg-red-50 transition-all text-red-500" style={{ borderColor: '#CBD5E1' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Account Name & No</th>
                    <th className="py-3.5 px-4">Holder Name</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Current Balance</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {accounts.map(acc => {
                    const Icon = getAccountIcon(acc.accountType);
                    const typeLabel = getAccountTypeLabel(acc.accountType);
                    return (
                      <tr key={acc.id} className="hover:bg-amber-50/30 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="text-[#2563EB]" />
                            <div>
                              <div className="font-bold text-gray-900">{acc.bankName || typeLabel}</div>
                              <div className="text-xs font-mono text-gray-400">{acc.accountNumber || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                          {acc.accountHolder || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          <span className="font-bold text-[#8B6914] flex items-center gap-1">
                            <Icon size={12} /> {typeLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${STATUS_COLORS[acc.status] || 'bg-gray-100'}`}>{acc.status}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-[#2563EB]">
                          {formatCurrency(acc.currentBalance ?? acc.initialBalance)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setHistoryAccount(acc)} title="Ledger" className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB] transition-all">
                              <Eye size={15} />
                            </button>
                            <button onClick={() => openEdit(acc)} title="Edit Account" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-all">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => handleDelete(acc.id)} title="Delete Account" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAGINATION BAR ── */}
        {!loading && accounts.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-300 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            
            {/* Info & Rows Per Page */}
            <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
              <span>
                Showing <strong className="text-gray-900">{((page - 1) * limit) + 1}</strong> to <strong className="text-gray-900">{Math.min(page * limit, totalRecords)}</strong> of <strong className="text-gray-900">{totalRecords}</strong> entries
              </span>

              <div className="w-32">
                <ReactSelect
                  options={limitOptions}
                  value={String(limit)}
                  onChange={(val) => {
                    setLimit(Number(val) || 10);
                    setPage(1);
                  }}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-300 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Number Pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showDots = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showDots && <span className="px-1 text-gray-400 text-xs">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          page === p
                            ? 'bg-[#2563EB] text-white shadow-sm'
                            : 'bg-gray-50 border border-slate-300 text-gray-700 hover:bg-amber-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-2 rounded-xl border border-slate-300 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border relative" style={{ borderColor: '#CBD5E1' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>{modalMode === 'create' ? 'Add Payment Account' : 'Edit Payment Account'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Account Name *</label>
                <input required value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HBL Main, Cash Drawer, JazzCash Account"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Account Holder</label>
                  <input value={form.accountHolder} onChange={e => setForm({ ...form, accountHolder: e.target.value })} placeholder="Name on account"
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Account Type *</label>
                  <ReactSelect
                    options={ACCOUNT_TYPE_OPTIONS}
                    value={form.accountType}
                    onChange={(val) => setForm({ ...form, accountType: val || 'BANK' })}
                    placeholder="Select Type"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Account Number / ID</label>
                  <input value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} placeholder="e.g. 1234-5678-90 or 03XX-XXXXXXX"
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Initial Balance</label>
                  <input type="number" min="0" step="0.01" value={form.initialBalance} onChange={e => setForm({ ...form, initialBalance: e.target.value })} placeholder="0.00"
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Status</label>
                <ReactSelect
                  options={statusFilterOptions}
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val || 'ACTIVE' })}
                  placeholder="Select Status"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: '#334155' }}>Note</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Extra details..." rows={2}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm" style={{ borderColor: '#CBD5E1' }}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>
                  {modalMode === 'create' ? 'Save Account' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}