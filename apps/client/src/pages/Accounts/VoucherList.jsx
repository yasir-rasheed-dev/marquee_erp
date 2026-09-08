// ═══════════════════════════════════════════════════════════
// pages/accounts/VoucherList.jsx
// All Transactions / Vouchers List with Filters & Dual Views
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ChevronLeft, ArrowDownLeft, ArrowUpRight,
  Search, Filter, Calendar, Download, RefreshCw,
  Landmark, LayoutGrid, Table as TableIcon, Layers, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
const formatDate = (d) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
const formatTime = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

const CATEGORY_LABELS = {
  BOOKING_PAYMENT: 'Booking Payment',
  BOOKING_REFUND: 'Booking Refund',
  EXPENSE: 'Expense',
  SALARY: 'Salary',
  VENDOR_PAYMENT: 'Vendor Payment',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  ADJUSTMENT: 'Adjustment',
  OPENING_BALANCE: 'Opening Balance',
  OTHER: 'Other',
};

const CATEGORY_COLORS = {
  BOOKING_PAYMENT: 'bg-blue-100 text-blue-700',
  BOOKING_REFUND: 'bg-orange-100 text-orange-700',
  EXPENSE: 'bg-red-100 text-red-700',
  SALARY: 'bg-purple-100 text-purple-700',
  VENDOR_PAYMENT: 'bg-pink-100 text-pink-700',
  DEPOSIT: 'bg-green-100 text-green-700',
  WITHDRAWAL: 'bg-amber-100 text-amber-700',
  TRANSFER_IN: 'bg-emerald-100 text-emerald-700',
  TRANSFER_OUT: 'bg-rose-100 text-rose-700',
  ADJUSTMENT: 'bg-gray-100 text-gray-700',
  OPENING_BALANCE: 'bg-yellow-100 text-yellow-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

export default function VoucherList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const [accounts, setAccounts] = useState([]);
  const [allTxns, setAllTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // Default to table for ledgers

  const [filters, setFilters] = useState({
    search: '', from: '', to: '', category: '', type: '', accountId: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Load Accounts list once
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const activeBranchId = currentBranch?.id || user?.branchId || 1;
        const accRes = await accountApi.getAll({ branchId: activeBranchId });
        const accs = accRes.data?.data || accRes.data || accRes || [];
        setAccounts(Array.isArray(accs) ? accs : []);
      } catch (e) {
        toast.error('Failed to load accounts list');
      }
    };
    loadAccounts();
  }, [currentBranch?.id]);

  // Fetch Vouchers in single API call
  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const activeBranchId = currentBranch?.id || user?.branchId || 1;
      const params = { branchId: activeBranchId };

      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.category) params.category = filters.category;
      if (filters.type) params.type = filters.type;
      if (filters.accountId) params.accountId = filters.accountId;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await accountApi.getAllTransactions(params);
      const dataPayload = res?.data?.data || res?.data || res || [];
      
      setAllTxns(Array.isArray(dataPayload) ? dataPayload : []);
    } catch (err) {
      if (err?.response?.status !== 429) {
        toast.error('Failed to load vouchers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [debouncedSearch, filters.from, filters.to, filters.category, filters.type, filters.accountId, currentBranch?.id]);

  const totalCredit = useMemo(() => 
    allTxns.filter(t => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  , [allTxns]);

  const totalDebit = useMemo(() => 
    allTxns.filter(t => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  , [allTxns]);

  // ── ReactSelect Options ──
  const accountFilterOptions = useMemo(() => [
    { value: '', label: 'All Accounts' },
    ...accounts.map(a => ({ value: String(a.id), label: `${a.bankName} (${a.accountNumber})` }))
  ], [accounts]);

  const typeFilterOptions = useMemo(() => [
    { value: '', label: 'All Types (Credit/Debit)' },
    { value: 'CREDIT', label: 'In (Credit)' },
    { value: 'DEBIT', label: 'Out (Debit)' }
  ], []);

  const categoryFilterOptions = useMemo(() => [
    { value: '', label: 'All Categories' },
    ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))
  ], []);

  const handleExport = () => {
    if (allTxns.length === 0) {
      toast.error('No vouchers to export');
      return;
    }
    const rows = allTxns.map(t => ({
      Date: formatDate(t.transactionDate),
      Time: formatTime(t.transactionDate),
      Account: t.bankAccount?.bankName || '—',
      Type: t.type,
      Category: CATEGORY_LABELS[t.category] || t.category,
      Description: t.description,
      Amount: t.type === 'CREDIT' ? t.amount : -t.amount,
      'Balance After': t.balanceAfter,
    }));
    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully!');
  };

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      {/* Top Header */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#334155' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-md">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Voucher List</h1>
                  <p className="text-xs font-medium" style={{ color: '#475569' }}>
                    {allTxns.length} vouchers recorded
                    {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100/80 text-[#8B6914] font-bold">{currentBranch.name}</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
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

              <button onClick={handleExport} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-amber-50 transition-all bg-white" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                <Download size={14} /> Export CSV
              </button>
              <button onClick={fetchVouchers} className="p-2 rounded-xl border hover:bg-amber-50 bg-white transition-all" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 space-y-4">
        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3" style={{ borderColor: '#CBD5E1' }}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#2563EB' }} />
              <input 
                type="text" 
                value={filters.search} 
                onChange={e => setFilters({ ...filters, search: e.target.value })} 
                placeholder="Search description, paid to, or ref #..."
                className="w-full border rounded-xl pl-10 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                style={{ borderColor: '#CBD5E1' }}
              />
            </div>

            <ReactSelect
              options={accountFilterOptions}
              value={accountFilterOptions.find(opt => opt.value === filters.accountId) || null}
              onChange={opt => setFilters({ ...filters, accountId: opt?.value || '' })}
              placeholder="All Accounts"
            />

            <ReactSelect
              options={typeFilterOptions}
              value={typeFilterOptions.find(opt => opt.value === filters.type) || null}
              onChange={opt => setFilters({ ...filters, type: opt?.value || '' })}
              placeholder="All Types (Credit/Debit)"
            />

            <ReactSelect
              options={categoryFilterOptions}
              value={categoryFilterOptions.find(opt => opt.value === filters.category) || null}
              onChange={opt => setFilters({ ...filters, category: opt?.value || '' })}
              placeholder="All Categories"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><Calendar size={14} /> Date Range:</span>
            <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })}
              className="border rounded-xl px-3 py-1.5 text-xs bg-white" style={{ borderColor: '#CBD5E1' }} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })}
              className="border rounded-xl px-3 py-1.5 text-xs bg-white" style={{ borderColor: '#CBD5E1' }} />

            {(filters.from || filters.to || filters.type || filters.category || filters.accountId || filters.search) && (
              <button onClick={() => setFilters({ search: '', from: '', to: '', category: '', type: '', accountId: '' })}
                className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl ml-auto transition-all">Clear Filters</button>
            )}
          </div>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <p className="text-xs font-bold uppercase text-gray-500">Total Credit (In)</p>
            <p className="text-2xl font-bold font-mono text-green-600 mt-1">+{formatCurrency(totalCredit)}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <p className="text-xs font-bold uppercase text-gray-500">Total Debit (Out)</p>
            <p className="text-2xl font-bold font-mono text-red-600 mt-1">-{formatCurrency(totalDebit)}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <p className="text-xs font-bold uppercase text-gray-500">Net Balance Flow</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${totalCredit >= totalDebit ? 'text-green-600' : 'text-red-600'}`}>
              {totalCredit >= totalDebit ? '+' : ''}{formatCurrency(totalCredit - totalDebit)}
            </p>
          </div>
        </div>

        {/* Main Data Container */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          </div>
        ) : allTxns.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#CBD5E1' }}>
            <FileText size={48} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <p className="text-sm font-medium" style={{ color: '#475569' }}>No vouchers found matching your query</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTxns.map(txn => (
              <div key={txn.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" style={{ borderColor: '#CBD5E1' }}>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${CATEGORY_COLORS[txn.category] || 'bg-gray-100 text-gray-700'}`}>
                      {CATEGORY_LABELS[txn.category] || txn.category}
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${txn.type === 'CREDIT' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mb-1">{txn.description || 'Transaction Voucher'}</h3>
                  <p className="text-xs text-amber-800 font-semibold mb-3">Bank: {txn.bankAccount?.bankName || '—'}</p>
                </div>
                <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                  <span>{formatDate(txn.transactionDate)} • {formatTime(txn.transactionDate)}</span>
                  <span className="font-mono text-gray-400">Bal: {formatCurrency(txn.balanceAfter)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Date & Time</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Account</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Description</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Category</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>In (Credit)</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Out (Debit)</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allTxns.map((txn, idx) => (
                    <tr key={txn.id} className="transition-all hover:bg-amber-50/30" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 text-xs">{formatDate(txn.transactionDate)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{formatTime(txn.transactionDate)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 text-xs">{txn.bankAccount?.bankName || '—'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{txn.bankAccount?.accountNumber}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium max-w-xs truncate" title={txn.description}>{txn.description || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${CATEGORY_COLORS[txn.category] || 'bg-gray-100 text-gray-700'}`}>
                          {CATEGORY_LABELS[txn.category] || txn.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        {txn.type === 'CREDIT' ? <span className="font-bold text-green-600">+{formatCurrency(txn.amount)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        {txn.type === 'DEBIT' ? <span className="font-bold text-red-600">-{formatCurrency(txn.amount)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold font-mono text-xs text-gray-800">{formatCurrency(txn.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}