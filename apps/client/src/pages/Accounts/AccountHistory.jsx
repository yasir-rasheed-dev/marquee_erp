// ═══════════════════════════════════════════════════════════
// components/accounts/AccountHistory.jsx
// Complete Ledger: Start Balance | Current Balance | All Txns
// }, [createForm.bookingId, inventoryItems, menuItems]); Enterprise ERP v4
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowUpRight, Calendar, Filter,
  Search, Download, TrendingUp, TrendingDown, Wallet,
  Clock, User, FileText, ChevronLeft, ChevronRight,
  RefreshCw, Banknote, CreditCard, Landmark
} from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function AccountHistory({ account, onClose }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    category: '',
    type: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCredits: 0, totalDebits: 0, netFlow: 0 });

  const fetchTodaySummary = async () => {
    try {
      const res = await accountApi.getTodaySummary(account.id);
      console.log('📦 TodaySummary API raw response:', res.data);
      
      // Handle multiple backend response shapes
      const isDirectObject = res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.success === undefined;
      const summary = res.data?.data || res.data?.summary || (isDirectObject ? res.data : null);
      
      if (summary && typeof summary === 'object' && Object.keys(summary).length > 0) {
        setTodaySummary(summary);
      }
    } catch (err) {
      console.error('Today summary error:', err);
    }
  };

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.category) params.category = filters.category;
      if (filters.type) params.type = filters.type;

      const res = await accountApi.getHistory(account.id, params);
      console.log('📦 History API raw response:', res.data);
      
      // Handle multiple backend response shapes (wrapped or direct array)
      const isDirectArray = Array.isArray(res.data);
      const transactions = res.data?.data || res.data?.transactions || res.data?.history || (isDirectArray ? res.data : []) || [];
      const meta = res.data?.meta || res.data?.pagination || { page: 1, limit: 25, totalPages: 1 };
      const summaryData = res.data?.summary || { totalCredits: 0, totalDebits: 0, netFlow: 0 };
      
      if (res.data?.success || isDirectArray || Array.isArray(transactions)) {
        setHistory(transactions);
        setPagination({
          page: meta.page || 1,
          limit: meta.limit || 25,
          totalPages: meta.totalPages || 1,
        });
        setSummary(summaryData);
      }
    } catch (err) {
      toast.error('Failed to load history');
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySummary();
    fetchHistory(1);
  }, [account.id]);

  useEffect(() => {
    fetchHistory(1);
  }, [filters]);

  const handleExport = () => {
    const rows = history.map(h => ({
      Date: formatDate(h.transactionDate),
      Time: formatTime(h.transactionDate),
      Type: h.type,
      Category: CATEGORY_LABELS[h.category] || h.category,
      Description: h.description,
      'Reference #': h.referenceNumber || '',
      Amount: h.type === 'CREDIT' ? h.amount : -h.amount,
      'Balance After': h.balanceAfter,
      'By': h.createdByUser?.name || '',
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account.bankName}_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported!');
  };

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#F5F2EB' }}>
      {/* ═══ PAGE HEADER ═══ */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#E0D8CC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => onClose ? onClose() : navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#4A4A4A' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-md">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{account.bankName}</h1>
                  <p className="text-xs font-medium" style={{ color: '#7A7A7A' }}>
                    {account.accountHolder} • {account.accountNumber} • {account.accountType}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold hover:bg-amber-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

          {/* ═══ TODAY SUMMARY CARDS ═══ */}
          {todaySummary && (
            <div className="px-6 py-5 border-b" style={{ borderColor: '#F0ECE6', backgroundColor: '#FAF8F4' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#A97A1F' }}>
                <Clock size={12} className="inline mr-1" /> Today's Summary — {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Start Balance */}
                <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} style={{ color: '#7A7A7A' }} />
                    <span className="text-xs font-bold uppercase" style={{ color: '#7A7A7A' }}>Start of Day</span>
                  </div>
                  <p className="text-xl font-bold font-mono" style={{ color: '#1A1A1A' }}>{formatCurrency(todaySummary.startOfDayBalance)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Opening balance @ 12:00 AM</p>
                </div>

                {/* Current Balance */}
                <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote size={16} style={{ color: '#A97A1F' }} />
                    <span className="text-xs font-bold uppercase" style={{ color: '#A97A1F' }}>Current Balance</span>
                  </div>
                  <p className="text-xl font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(todaySummary.currentBalance)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Live updated</p>
                </div>

                {/* Today's In */}
                <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-green-600" />
                    <span className="text-xs font-bold uppercase text-green-600">Today's In (CR)</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-green-600">+{formatCurrency(todaySummary.todayCredits)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{todaySummary.transactionCount} transactions</p>
                </div>

                {/* Today's Out */}
                <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={16} className="text-red-600" />
                    <span className="text-xs font-bold uppercase text-red-600">Today's Out (DR)</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-red-600">-{formatCurrency(todaySummary.todayDebits)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Net: {formatCurrency(todaySummary.change)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ LIFETIME SUMMARY ═══ */}
          <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4" style={{ borderColor: '#F0ECE6' }}>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase" style={{ color: '#7A7A7A' }}>Total In (All Time)</p>
                <p className="text-lg font-bold font-mono text-green-600">+{formatCurrency(summary.totalCredits)}</p>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: '#E0D8CC' }} />
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase" style={{ color: '#7A7A7A' }}>Total Out (All Time)</p>
                <p className="text-lg font-bold font-mono text-red-600">-{formatCurrency(summary.totalDebits)}</p>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: '#E0D8CC' }} />
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase" style={{ color: '#7A7A7A' }}>Net Flow</p>
                <p className={`text-lg font-bold font-mono ${summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.netFlow >= 0 ? '+' : ''}{formatCurrency(summary.netFlow)}
                </p>
              </div>
            </div>
            <button onClick={() => { fetchTodaySummary(); fetchHistory(pagination.page); }} className="p-2 rounded-xl hover:bg-amber-50 transition-all" style={{ color: '#A97A1F' }} title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* ═══ FILTERS ═══ */}
          <div className="px-6 py-4 border-b flex flex-wrap items-center gap-3" style={{ borderColor: '#F0ECE6', backgroundColor: '#FAF8F4' }}>
            <Filter size={14} style={{ color: '#A97A1F' }} />
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar size={14} style={{ color: '#7A7A7A' }} />
              <input
                type="date"
                value={filters.from}
                onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
                className="border rounded-lg px-2 py-1.5 text-xs"
                style={{ borderColor: '#E0D8CC' }}
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={filters.to}
                onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
                className="border rounded-lg px-2 py-1.5 text-xs"
                style={{ borderColor: '#E0D8CC' }}
              />
            </div>
            <select
              value={filters.type}
              onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="border rounded-lg px-2 py-1.5 text-xs"
              style={{ borderColor: '#E0D8CC', backgroundColor: '#fff' }}
            >
              <option value="">All Types</option>
              <option value="CREDIT">In (Credit)</option>
              <option value="DEBIT">Out (Debit)</option>
            </select>
            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="border rounded-lg px-2 py-1.5 text-xs"
              style={{ borderColor: '#E0D8CC', backgroundColor: '#fff' }}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {(filters.from || filters.to || filters.type || filters.category) && (
              <button
                onClick={() => setFilters({ from: '', to: '', category: '', type: '' })}
                className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50 text-red-600 transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* ═══ TRANSACTION TABLE ═══ */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: '#7A7A7A' }}>Loading ledger...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto mb-3" style={{ color: '#E0D8CC' }} />
                <p className="text-sm font-medium" style={{ color: '#7A7A7A' }}>No transactions found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="border rounded-2xl overflow-hidden" style={{ borderColor: '#E0D8CC' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr style={{ backgroundColor: '#FAF8F4' }}>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Date & Time</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Type</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Category</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Description</th>
                      <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Balance</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((txn, idx) => (
                      <tr
                        key={txn.id}
                        className="border-t transition-all hover:bg-amber-50/30"
                        style={{ borderColor: '#F0ECE6', backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAF8' }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{formatDate(txn.transactionDate)}</p>
                          <p className="text-[11px] text-gray-400">{formatTime(txn.transactionDate)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            txn.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.type === 'CREDIT' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {txn.type === 'CREDIT' ? 'IN' : 'OUT'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${CATEGORY_COLORS[txn.category] || 'bg-gray-100 text-gray-700'}`}>
                            {CATEGORY_LABELS[txn.category] || txn.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-800 truncate" title={txn.description}>{txn.description}</p>
                          {txn.referenceNumber && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Ref: {txn.referenceNumber}</p>
                          )}
                          {txn.paidTo && (
                            <p className="text-[10px] text-gray-400">To: {txn.paidTo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`font-bold font-mono ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold font-mono text-gray-700">{formatCurrency(txn.balanceAfter)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} style={{ color: '#B0A89C' }} />
                            <span className="text-xs text-gray-500">{txn.createdByUser?.name || 'System'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#F0ECE6', backgroundColor: '#FAF8F4' }}>
                    <p className="text-xs text-gray-500">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => fetchHistory(pagination.page - 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all"
                        style={{ borderColor: '#E0D8CC' }}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchHistory(pagination.page + 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all"
                        style={{ borderColor: '#E0D8CC' }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}