// ═══════════════════════════════════════════════════════════
// pages/accounts/Ledger.jsx
// Fixed ReactSelect + Added "All Accounts" Option Support
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronLeft, Download, RefreshCw, Landmark,
  LayoutGrid, Table as TableIcon, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const formatTime = (d) => (d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—');

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

export default function Ledger() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [summary, setSummary] = useState({ totalCredits: 0, totalDebits: 0, netFlow: 0 });
  const [viewMode, setViewMode] = useState('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 1. Fetch ALL Accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await accountApi.getAll({ limit: 1000 });
        const dataPayload = res?.data?.data || res?.data || res || [];
        const accs = Array.isArray(dataPayload) ? dataPayload : [];
        
        setAccounts(accs);

        if (accs.length > 0) {
          setSelectedAccountId((prev) => {
            if (prev === 'ALL') return 'ALL';
            if (prev && accs.some(a => String(a.id) === String(prev))) {
              return String(prev);
            }
            return 'ALL';
          });
        } else {
          setSelectedAccountId('ALL');
          setHistory([]);
        }
      } catch (e) {
        toast.error('Failed to load accounts list');
      }
    };
    fetchAccounts();
  }, [currentBranch?.id, user?.branchId]);

  // Helper to extract transactions array
  const extractTxns = (resPayload) => {
    if (Array.isArray(resPayload)) return resPayload;
    if (resPayload?.success && Array.isArray(resPayload.data)) return resPayload.data;
    if (resPayload?.data) {
      if (Array.isArray(resPayload.data)) return resPayload.data;
      if (Array.isArray(resPayload.data?.data)) return resPayload.data.data;
    }
    return [];
  };

  // 2. Fetch Ledger History for Selected Account OR ALL Accounts
  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    try {
      const params = { limit: 2000 };
      if (filters.from && filters.from.trim() !== '') params.from = filters.from;
      if (filters.to && filters.to.trim() !== '') params.to = filters.to;

      let txns = [];

      if (selectedAccountId === 'ALL') {
        // Fetch history for all accounts in parallel
        const historyPromises = accounts.map((acc) =>
          accountApi.getHistory(acc.id, params).catch(() => null)
        );
        const results = await Promise.all(historyPromises);

        results.forEach((res, index) => {
          if (!res) return;
          const resPayload = res?.data || res;
          const accTxns = extractTxns(resPayload);
          const accInfo = accounts[index];

          accTxns.forEach((txn) => {
            txns.push({
              ...txn,
              accountName: accInfo?.bankName || 'Account',
              accountNumber: accInfo?.accountNumber || '',
            });
          });
        });

        // Sort all aggregated transactions by date (Latest first)
        txns.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
      } else {
        const accIdNum = parseInt(selectedAccountId, 10);
        if (isNaN(accIdNum)) return;

        const res = await accountApi.getHistory(accIdNum, params);
        const resPayload = res?.data || res;
        txns = extractTxns(resPayload).reverse();
      }

      setHistory(txns);

      // Compute Combined Summary
      const computed = txns.reduce((acc, txn) => {
        const t = (txn.type || txn.transactionType || txn.txnType || '').toString().toUpperCase();
        const amt = parseFloat(txn.amount) || 0;
        if (t === 'CREDIT' || t === 'CR' || t === 'IN') {
          acc.totalCredits += amt;
        } else if (t === 'DEBIT' || t === 'DR' || t === 'OUT') {
          acc.totalDebits += amt;
        } else {
          if (amt < 0) acc.totalDebits += Math.abs(amt);
          else acc.totalCredits += amt;
        }
        return acc;
      }, { totalCredits: 0, totalDebits: 0, netFlow: 0 });

      computed.netFlow = computed.totalCredits - computed.totalDebits;
      setSummary(computed);

    } catch (err) {
      if (err?.response?.status !== 429) {
        toast.error(err?.response?.data?.message || 'Failed to load ledger history');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, accounts, filters.from, filters.to]);

  useEffect(() => {
    if (selectedAccountId) {
      setCurrentPage(1);
      fetchLedger();
    }
  }, [selectedAccountId, fetchLedger]);

  const selectedAccount = selectedAccountId === 'ALL'
    ? { bankName: 'All Accounts', accountNumber: 'Combined' }
    : accounts.find(a => String(a.id) === String(selectedAccountId));

  // Calculated Overall Balance for "All Accounts" Mode
  const totalBalanceAllAccounts = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.currentBalance ?? acc.initialBalance ?? 0), 0);
  }, [accounts]);

  // 3. ReactSelect Options (With "All Accounts" option at top)
  const accountOptions = useMemo(() => {
    const list = accounts.map(a => ({
      value: String(a.id),
      label: `${a.bankName || 'Account'} — ${a.accountNumber || 'N/A'} (${formatCurrency(a.currentBalance ?? a.initialBalance)})`
    }));

    return [
      { value: 'ALL', label: '🌐 All Accounts (Combined Ledger)' },
      ...list
    ];
  }, [accounts]);

  // Pagination Slice
  const totalPages = Math.ceil(history.length / itemsPerPage) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return history.slice(start, start + itemsPerPage);
  }, [history, currentPage]);

  const handleExport = () => {
    if (history.length === 0) {
      toast.error('No ledger records to export');
      return;
    }
    const rows = history.map(t => ({
      Date: formatDate(t.transactionDate),
      Time: formatTime(t.transactionDate),
      Account: t.accountName ? `${t.accountName} (${t.accountNumber})` : (selectedAccount?.bankName || '—'),
      'Voucher #': `V-${t.id}`,
      Description: t.description || '—',
      Category: CATEGORY_LABELS[t.category] || t.category,
      Debit: t.type === 'DEBIT' ? t.amount : '',
      Credit: t.type === 'CREDIT' ? t.amount : '',
      'Balance After': t.balanceAfter ?? '—',
    }));
    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${selectedAccountId === 'ALL' ? 'all_accounts' : (selectedAccount?.bankName || 'account')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Ledger CSV exported successfully!');
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
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Account Ledger</h1>
                  <p className="text-xs font-medium" style={{ color: '#475569' }}>
                    {selectedAccount?.bankName || 'Select account'} ({selectedAccount?.accountNumber || '—'})
                    {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100/80 text-[#8B6914] font-bold">{currentBranch.name}</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl border border-slate-300 flex items-center shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')} 
                  title="Grid View"
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
                <Download size={14} /> Export
              </button>
              <button onClick={fetchLedger} className="p-2 rounded-xl border hover:bg-amber-50 transition-all bg-white" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 space-y-4">
        {/* Dropdown Select + Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap items-center gap-3" style={{ borderColor: '#CBD5E1' }}>
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Landmark size={18} style={{ color: '#2563EB' }} />
            <div className="w-full">
              <ReactSelect
                options={accountOptions}
                value={selectedAccountId ? String(selectedAccountId) : 'ALL'}
                onChange={(val) => {
                  if (val) {
                    setSelectedAccountId(String(val));
                  } else {
                    setSelectedAccountId('ALL');
                  }
                }}
                placeholder="Select Account..."
                isClearable={false}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold">From:</span>
            <input 
              type="date" 
              value={filters.from} 
              onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
              className="border rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]" 
              style={{ borderColor: '#CBD5E1' }} 
            />
            <span className="text-xs text-gray-400">to</span>
            <input 
              type="date" 
              value={filters.to} 
              onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
              className="border rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]" 
              style={{ borderColor: '#CBD5E1' }} 
            />
          </div>

          <button 
            onClick={() => { setCurrentPage(1); fetchLedger(); }} 
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:opacity-90" 
            style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}
          >
            Apply Filter
          </button>
          
          {(filters.from || filters.to) && (
            <button 
              onClick={() => { setFilters({ from: '', to: '' }); setCurrentPage(1); }}
              className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
            >
              Reset
            </button>
          )}
        </div>

        {/* Account Summaries */}
        {selectedAccount && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <p className="text-xs font-bold uppercase text-gray-500">
                {selectedAccountId === 'ALL' ? 'Accounts Count' : 'Opening Balance'}
              </p>
              <p className="text-lg font-bold font-mono mt-1 text-gray-800">
                {selectedAccountId === 'ALL' 
                  ? `${accounts.length} Accounts`
                  : formatCurrency(history.length > 0 ? parseFloat(history[history.length - 1].balanceAfter) - (history[history.length - 1].type === 'CREDIT' ? parseFloat(history[history.length - 1].amount) : -parseFloat(history[history.length - 1].amount)) : (selectedAccount.currentBalance ?? selectedAccount.initialBalance))
                }
              </p>
            </div>
            <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <p className="text-xs font-bold uppercase text-gray-500">Total Credits (In)</p>
              <p className="text-lg font-bold font-mono text-green-600 mt-1">+{formatCurrency(summary.totalCredits)}</p>
            </div>
            <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <p className="text-xs font-bold uppercase text-gray-500">Total Debits (Out)</p>
              <p className="text-lg font-bold font-mono text-red-600 mt-1">-{formatCurrency(summary.totalDebits)}</p>
            </div>
            <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <p className="text-xs font-bold uppercase text-gray-500">Total Combined Balance</p>
              <p className="text-lg font-bold font-mono mt-1" style={{ color: '#2563EB' }}>
                {selectedAccountId === 'ALL' 
                  ? formatCurrency(totalBalanceAllAccounts)
                  : formatCurrency(selectedAccount.currentBalance ?? selectedAccount.initialBalance)
                }
              </p>
            </div>
            <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <p className="text-xs font-bold uppercase text-gray-500">Net Flow</p>
              <p className={`text-lg font-bold font-mono mt-1 ${summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.netFlow >= 0 ? '+' : ''}{formatCurrency(summary.netFlow)}
              </p>
            </div>
          </div>
        )}

        {/* View Mode Data Representation */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#CBD5E1' }}>
            <BookOpen size={48} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <p className="text-sm font-medium" style={{ color: '#475569' }}>No transactions recorded for this account</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedHistory.map(txn => (
              <div key={txn.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" style={{ borderColor: '#CBD5E1' }}>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">V-{txn.id}</span>
                    {(() => {
                      const t = (txn.type || txn.transactionType || txn.txnType || '').toString().toUpperCase();
                      const isCredit = t === 'CREDIT' || t === 'CR' || t === 'IN';
                      return (
                        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl ${isCredit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
                        </span>
                      );
                    })()}
                  </div>

                  {selectedAccountId === 'ALL' && txn.accountName && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">
                      {txn.accountName} ({txn.accountNumber})
                    </span>
                  )}

                  <h3 className="font-bold text-sm text-gray-900 mb-1">{txn.description || 'Ledger Entry'}</h3>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 ${CATEGORY_COLORS[txn.category] || 'bg-gray-100 text-gray-700'}`}>
                    {CATEGORY_LABELS[txn.category] || txn.category}
                  </span>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                  <span>{formatDate(txn.transactionDate)} • {formatTime(txn.transactionDate)}</span>
                  <span className="font-mono font-bold text-gray-800">
                    {txn.balanceAfter != null ? `Bal: ${formatCurrency(txn.balanceAfter)}` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Date & Time</th>
                    {selectedAccountId === 'ALL' && <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Account</th>}
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Voucher #</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Description & Category</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Debit (Out)</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Credit (In)</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#334155' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedHistory.map((txn, idx) => (
                    <tr key={txn.id} className="transition-all hover:bg-amber-50/30" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 text-xs">{formatDate(txn.transactionDate)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{formatTime(txn.transactionDate)}</p>
                      </td>
                      {selectedAccountId === 'ALL' && (
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-xs text-amber-900">{txn.accountName || '—'}</p>
                          <p className="text-[10px] text-gray-500">{txn.accountNumber}</p>
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">V-{txn.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-gray-800 text-xs font-semibold">{txn.description || '—'}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mt-0.5 ${CATEGORY_COLORS[txn.category] || 'bg-gray-100 text-gray-700'}`}>
                          {CATEGORY_LABELS[txn.category] || txn.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        {(() => {
                          const t = (txn.type || txn.transactionType || txn.txnType || '').toString().toUpperCase();
                          return t === 'DEBIT' || t === 'DR' || t === 'OUT' ? <span className="font-bold text-red-600">{formatCurrency(txn.amount)}</span> : <span className="text-gray-300">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        {(() => {
                          const t = (txn.type || txn.transactionType || txn.txnType || '').toString().toUpperCase();
                          return t === 'CREDIT' || t === 'CR' || t === 'IN' ? <span className="font-bold text-green-600">{formatCurrency(txn.amount)}</span> : <span className="text-gray-300">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold font-mono text-xs text-gray-800">
                        {txn.balanceAfter != null ? formatCurrency(txn.balanceAfter) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && history.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, history.length)}</span> of{' '}
              <span className="font-bold text-gray-800">{history.length}</span> records
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-sm'
                            : 'border border-slate-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}