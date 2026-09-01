// ═══════════════════════════════════════════════════════════
// pages/accounts/DayBook.jsx
// Date-wise Daily Transaction Book with Branch Support & Dual Views
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronLeft, Calendar, ArrowDownLeft, ArrowUpRight,
  Search, Download, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  LayoutGrid, Table as TableIcon, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
const formatDate = (d) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

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

export default function DayBook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  // Local timezone mein aaj ki date (UTC bug fix)
  const getLocalDateStr = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 10);
    return localISOTime;
  };
  const todayStr = getLocalDateStr();

  const [date, setDate] = useState(todayStr);
  const [allTxns, setAllTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // Default to table view

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const activeBranchId = currentBranch?.id || user?.branchId || 1;
      const params = {
        branchId: activeBranchId,
        from: date,
        to: date,
        limit: 200
      };

      const res = await accountApi.getAllTransactions(params);
      const dataPayload = res?.data || res || [];
      let txns = Array.isArray(dataPayload) ? dataPayload : [];

      // Safety: sirf selected date ki transactions dikhao (backend bug protection)
      txns = txns.filter(t => {
        if (!t.transactionDate) return false;
        const tDate = new Date(t.transactionDate);
        const tStr = getLocalDateStr(tDate);
        return tStr === date;
      });

      // Sort by time (newest first)
      txns.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
      setAllTxns(txns);
    } catch (err) {
      if (err?.response?.status !== 429) {
        toast.error('Failed to load day book');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDayBook(); 
  }, [date, currentBranch?.id]);

  const dayTotalCredit = useMemo(() => 
    allTxns.filter(t => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  , [allTxns]);

  const dayTotalDebit = useMemo(() => 
    allTxns.filter(t => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  , [allTxns]);

  const changeDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#F5F2EB' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#E0D8CC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#4A4A4A' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-md">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Day Book</h1>
                  <p className="text-xs font-medium" style={{ color: '#7A7A7A' }}>
                    {formatDate(date)}
                    {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-[#F4E7C9] text-[#8B6914] font-bold">{currentBranch.name}</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="bg-white p-1 rounded-xl border border-[#E0D8CC] flex items-center shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')} 
                  title="Grid Card View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#A97A1F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  title="Table View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#A97A1F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <TableIcon size={18} />
                </button>
              </div>

              {/* Date Navigation Controls */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
                <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-amber-50 transition-all text-[#A97A1F]" title="Previous Day">
                  <ChevronLeftIcon size={16} />
                </button>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  max={todayStr}
                  className="border rounded-lg px-2 py-1 text-xs font-medium bg-white focus:outline-none" 
                  style={{ borderColor: '#E0D8CC' }} 
                />
                <button 
                  onClick={() => changeDate(1)} 
                  disabled={date >= todayStr}
                  className={`p-1.5 rounded-lg transition-all ${date >= todayStr ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-amber-50 text-[#A97A1F]'}`} 
                  title="Next Day"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>

              <button onClick={fetchDayBook} className="p-2 rounded-xl border bg-white hover:bg-amber-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <p className="text-xs font-bold uppercase text-gray-500">Total In (Credit)</p>
            <p className="text-xl font-bold font-mono text-green-600 mt-1">+{formatCurrency(dayTotalCredit)}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <p className="text-xs font-bold uppercase text-gray-500">Total Out (Debit)</p>
            <p className="text-xl font-bold font-mono text-red-600 mt-1">-{formatCurrency(dayTotalDebit)}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <p className="text-xs font-bold uppercase text-gray-500">Net Flow for Date</p>
            <p className={`text-xl font-bold font-mono mt-1 ${dayTotalCredit >= dayTotalDebit ? 'text-green-600' : 'text-red-600'}`}>
              {dayTotalCredit >= dayTotalDebit ? '+' : ''}{formatCurrency(dayTotalCredit - dayTotalDebit)}
            </p>
          </div>
        </div>

        {/* Data Container: Grid or Table */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          </div>
        ) : allTxns.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#E0D8CC' }}>
            <Calendar size={48} className="mx-auto mb-4" style={{ color: '#E0D8CC' }} />
            <p className="text-sm font-medium" style={{ color: '#7A7A7A' }}>No transactions recorded on {formatDate(date)}</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTxns.map(txn => (
              <div key={txn.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" style={{ borderColor: '#E0D8CC' }}>
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
                  <p className="text-xs text-amber-800 font-semibold mb-2">Account: {txn.bankAccount?.bankName || txn.accountName || '—'}</p>
                </div>
                <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                  <span>{new Date(txn.transactionDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-mono text-gray-400">Bal: {formatCurrency(txn.balanceAfter)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F4' }}>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Time</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Account</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Description</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Category</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>In (Credit)</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Out (Debit)</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allTxns.map((txn, idx) => (
                    <tr key={txn.id} className="transition-all hover:bg-amber-50/30" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td className="px-4 py-3.5 text-xs text-gray-500 font-mono">
                        {new Date(txn.transactionDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800 text-xs">
                        {txn.bankAccount?.bankName || txn.accountName || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 text-xs font-medium max-w-xs truncate" title={txn.description}>
                        {txn.description || '—'}
                      </td>
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
                      <td className="px-4 py-3.5 text-right font-bold font-mono text-xs text-gray-800">
                        {formatCurrency(txn.balanceAfter)}
                      </td>
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