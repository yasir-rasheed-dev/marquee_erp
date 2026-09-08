import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  TrendingUp, TrendingDown, DollarSign, BookOpen, Calendar,
  Download, FileText, Filter, Printer, Search, RefreshCw,
  ArrowRightLeft, Wallet, CreditCard, Building2, PieChart,
  BarChart3, ChevronDown, Eye, X, Loader2, ChevronLeft,
  ChevronRight, Scale, Receipt, Landmark, Tag, ArrowUpCircle,
  ArrowDownCircle, MinusCircle, CheckCircle2, AlertCircle,
  ShoppingCart, Boxes, AlertTriangle, History
} from 'lucide-react';
import reportApi from '../../services/reportApi';
import accountApi from '../../services/accountApi';
import bookingApi from '../../services/bookingApi';

// ═══════════════════════════════════════════════════════════
// THEME TOKENS (Single source of truth)
// ═══════════════════════════════════════════════════════════
const THEME = {
  primary: '#2563EB',
  primaryDark: '#2563EB',
  primaryRgb: [169, 122, 31],
  primaryLight: 'rgba(200, 155, 60, 0.1)',
  primaryFocus: 'focus:ring-[#2563EB]/30 focus:border-[#2563EB]',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  gray: '#6B7280',
};

// ── BULLETPROOF API WRAPPER (Strips 'type' to prevent Prisma enum crash) ──
if (accountApi && accountApi.getAllTransactions) {
  const _origGetAll = accountApi.getAllTransactions.bind(accountApi);
  accountApi.getAllTransactions = async (params) => {
    const safe = { ...(params || {}) };
    delete safe.type;
    return _origGetAll(safe);
  };
}
if (accountApi && accountApi.getHistory) {
  const _origGetHist = accountApi.getHistory.bind(accountApi);
  accountApi.getHistory = async (accountId, params) => {
    const safe = { ...(params || {}) };
    delete safe.type;
    return _origGetHist(accountId, safe);
  };
}

// ═══════════════════════════════════════════════════════════
// BULLETPROOF HELPERS & UTILITIES
// ═══════════════════════════════════════════════════════════

const formatMoney = (amount) => {
  if (amount == null || isNaN(amount)) return 'PKR 0.00';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatMoneyRaw = (amount) => {
  if (amount == null || isNaN(amount)) return '0.00';
  return Number(amount).toFixed(2);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.rows)) return res.rows;
  if (Array.isArray(res.results)) return res.results;
  if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data?.rows && Array.isArray(res.data.rows)) return res.data.rows;
  if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
  return [];
};

const extractObject = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (res.success && res.data) return res.data;
  return res || {};
};

const getAccountType = (account) => {
  const raw = account?.type || account?.accountType || account?.account_type || 
              account?.category || account?.accountCategory || account?.kind || 
              account?.nature || account?.account_nature || account?.group || 
              account?.account_group || account?.classification || '';
  const t = String(raw).toLowerCase().trim();

  if (['asset','assets','bank','cash','fixed asset','current asset','debit',
       'receivable','stock','inventory','asset account','bank account',
       'current account','saving account','savings account','savings','deposit',
       'prepaid','advance'].some(k => t.includes(k))) return 'asset';
  if (['liability','liabilities','payable','loan','credit','current liability',
       'long term liability','creditor','dues','liability account','payable account',
       'loan account','long-term liability','short-term liability','overdraft',
       'provision'].some(k => t.includes(k))) return 'liability';
  if (['equity','capital','owner equity','share capital','retained earnings',
       'owner','partner','investment','equity account','capital account',
       'owners equity','shareholder','fund','reserve'].some(k => t.includes(k))) return 'equity';

  const code = String(account?.code || account?.accountCode || account?.account_number || '').trim();
  if (code) {
    const firstDigit = code[0];
    if (['1'].includes(firstDigit)) return 'asset';
    if (['2'].includes(firstDigit)) return 'liability';
    if (['3'].includes(firstDigit)) return 'equity';
  }

  const name = String(account?.name || account?.accountName || '').toLowerCase();
  if (['cash','bank','inventory','stock','receivable','prepaid','deposit','asset','equipment','furniture','building','vehicle'].some(k => name.includes(k))) return 'asset';
  if (['payable','loan','creditor','dues','overdraft','liability','tax payable','salary payable'].some(k => name.includes(k))) return 'liability';
  if (['capital','equity','owner','partner','investment','retained','reserve','fund'].some(k => name.includes(k))) return 'equity';

  return 'other';
};

const safeSum = (arr, key = 'balance') => {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => {
    let val = item[key];
    if (val === undefined || val === null) val = item.currentBalance;
    if (val === undefined || val === null) val = item.amount;
    if (val === undefined || val === null) val = 0;
    return acc + Number(val);
  }, 0);
};

const getStatusColor = (status) => {
  const map = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    in_transit: 'bg-amber-100 text-amber-700',
    received: 'bg-green-100 text-green-700',
    low: 'bg-orange-100 text-orange-700',
    out_of_stock: 'bg-red-100 text-red-700',
    reconciled: 'bg-green-100 text-green-700',
    unreconciled: 'bg-orange-100 text-orange-700',
    credit: 'bg-green-100 text-green-700',
    debit: 'bg-red-100 text-red-700',
    transfer: 'bg-blue-100 text-blue-700',
    surplus: 'bg-green-100 text-green-700',
    deficit: 'bg-red-100 text-red-700',
    expense: 'bg-red-100 text-red-700',
    journal: 'bg-purple-100 text-purple-700',
  };
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

// ── Flatten nested objects for CSV ──
const flattenObject = (obj, prefix = '') => {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return { [prefix]: obj };
  if (Array.isArray(obj)) return { [prefix]: JSON.stringify(obj) };

  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre));
    } else if (Array.isArray(obj[k])) {
      acc[pre] = JSON.stringify(obj[k]);
    } else {
      acc[pre] = obj[k];
    }
    return acc;
  }, {});
};

// ═══════════════════════════════════════════════════════════
// UNIFIED SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

const StatusBadge = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
    {label || status}
  </span>
);

const FilterCard = ({ children, title, onReset, onApply, loading, hasFilters }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 print:hidden">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-700">
        <Filter size={18} className="text-[#2563EB]" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors px-2 py-1"
          >
            <X size={14} /> Clear
          </button>
        )}
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-1"
        >
          <RefreshCw size={14} /> Reset
        </button>
        <button
          onClick={onApply}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#2563EB] transition flex items-center gap-1 disabled:opacity-50 shadow-sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Apply
        </button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

const SummaryCard = ({ title, amount, icon: Icon, color = 'gray', highlight, subtext, trend, trendUp }) => {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    gold: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color] || colors.gray} ${highlight ? 'ring-2 ring-[#2563EB] ring-offset-2' : ''} bg-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{typeof amount === 'number' ? formatMoney(amount) : amount}</p>
          {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-[#2563EB]/10 rounded-lg">
            <Icon size={20} className="text-[#2563EB]" />
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trendUp ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
          <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trend}</span>
        </div>
      )}
    </div>
  );
};

const ExportToolbar = ({ onExportPDF, onExportCSV, onPrint, dataCount, title }) => (
  <div className="flex items-center justify-between mb-4 print:hidden">
    <p className="text-sm text-gray-500">
      Showing <span className="font-semibold text-gray-700">{dataCount}</span> records
      {title && <span className="text-gray-400"> — {title}</span>}
    </p>
    <div className="flex items-center gap-2">
      <button
        onClick={onExportPDF}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all shadow-sm"
      >
        <FileText size={16} /> PDF
      </button>
      <button
        onClick={onExportCSV}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#2563EB] transition-all"
      >
        <Download size={16} /> CSV
      </button>
      <button
        onClick={onPrint}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#2563EB] transition-colors shadow-sm"
      >
        <Printer size={16} /> Print
      </button>
    </div>
  </div>
);

const DataTable = ({ columns, data, keyExtractor, emptyMessage = 'No data found', loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Loader2 size={32} className="mx-auto text-[#2563EB] animate-spin mb-3" />
        <p className="text-gray-500">Loading data...</p>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 whitespace-nowrap">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, ri) => (
              <tr key={keyExtractor ? keyExtractor(row, ri) : ri} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col, ci) => (
                  <td key={ci} className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SectionCard = ({ title, children, color, className = '' }) => {
  const colors = { green: 'border-green-200', orange: 'border-orange-200', red: 'border-red-200', blue: 'border-blue-200', gray: 'border-gray-200' };
  return (
    <div className={`bg-white rounded-xl border ${colors[color] || colors.gray} p-5 shadow-sm ${className}`}>
      <h3 className="text-lg font-bold mb-4 text-gray-800">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
};

const LineItem = ({ label, amount, count, negative }) => (
  <div className="flex justify-between items-center py-1">
    <div className="flex items-center gap-2">
      <span className="text-gray-600 text-sm">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count} items</span>
      )}
    </div>
    <span className={`font-mono font-medium text-sm ${negative ? 'text-red-500' : 'text-gray-900'}`}>
      {negative ? '- ' : ''}{formatMoney(Math.abs(amount || 0))}
    </span>
  </div>
);

const TotalLine = ({ label, amount, color = 'gray' }) => (
  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200 font-bold text-gray-900">
    <span>{label}</span>
    <span className="font-mono">{formatMoney(amount || 0)}</span>
  </div>
);

const Divider = () => <div className="border-t border-gray-100 my-2" />;

// ═══════════════════════════════════════════════════════════
// PDF ENGINE
// ═══════════════════════════════════════════════════════════

const generatePDF = (activeTab, tabLabel, data, dateFrom, dateTo) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    alert('No data to export');
    return;
  }

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = THEME.primaryRgb;

  // Header
  doc.setFillColor(245, 242, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('Marquee ERP Management System', 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Financial Reports Module', 14, 21);

  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  doc.text(tabLabel.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

  const now = new Date().toLocaleString('en-GB');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${now}`, pageWidth - 14, 12, { align: 'right' });
  if (dateFrom && dateTo) {
    doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth - 14, 18, { align: 'right' });
  }

  let yPos = 36;
  let headers = [];
  let body = [];

  switch (activeTab) {
    case 'pnl': {
      const report = data;
      headers = [['Category', 'Item', 'Amount (PKR)']];
      body = [
        ['REVENUE', 'Booking Revenue', formatMoneyRaw(report.revenue?.bookings?.amount)],
        ['REVENUE', 'Event Revenue', formatMoneyRaw(report.revenue?.events?.amount)],
        ['REVENUE', 'Other Income', formatMoneyRaw(report.revenue?.otherIncome?.amount)],
        ['REVENUE', 'TOTAL REVENUE', formatMoneyRaw(report.revenue?.total)],
        ['COGS', 'Purchase Cost', formatMoneyRaw(report.cogs?.purchaseCost?.amount)],
        ['COGS', 'Inventory Consumed', formatMoneyRaw(report.cogs?.inventoryConsumed?.amount)],
        ['COGS', 'Kitchen Production', formatMoneyRaw(report.cogs?.kitchenProduction?.amount)],
        ['COGS', 'Purchase Returns', formatMoneyRaw(report.cogs?.purchaseReturns?.amount)],
        ['COGS', 'TOTAL COGS', formatMoneyRaw(report.cogs?.total)],
        ['EXPENSES', 'Salaries & Wages', formatMoneyRaw(report.expenses?.salaries?.amount)],
        ['EXPENSES', 'Event Staff', formatMoneyRaw(report.expenses?.eventStaff?.amount)],
        ['EXPENSES', 'Staff Payments', formatMoneyRaw(report.expenses?.staffPayments?.amount)],
        ['EXPENSES', 'Loans/Advances', formatMoneyRaw(report.expenses?.loans?.amount)],
        ['EXPENSES', 'Supplier Payments', formatMoneyRaw(report.expenses?.supplierPayments?.amount)],
        ['EXPENSES', 'Rent', formatMoneyRaw(report.expenses?.rent?.amount)],
        ['EXPENSES', 'Utilities', formatMoneyRaw(report.expenses?.utilities?.amount)],
        ['EXPENSES', 'Taxes', formatMoneyRaw(report.expenses?.taxes?.amount)],
        ['EXPENSES', 'Wastage/Damage', formatMoneyRaw(report.expenses?.wastage?.amount)],
        ['EXPENSES', 'Other Expenses', formatMoneyRaw(report.expenses?.otherExpenses?.amount)],
        ['EXPENSES', 'Payment Vouchers', formatMoneyRaw(report.expenses?.paymentVouchers?.amount)],
        ['EXPENSES', 'TOTAL EXPENSES', formatMoneyRaw(report.expenses?.total)],
        ['SUMMARY', 'Gross Profit', formatMoneyRaw(report.grossProfit)],
        ['SUMMARY', 'Net Profit', formatMoneyRaw(report.netProfit)],
        ['SUMMARY', 'Profit Margin %', `${report.profitMargin || 0}%`],
      ];
      break;
    }
    case 'balance': {
      headers = [['Account Name', 'Type', 'Code', 'Balance (PKR)']];
      body = data.map(r => [
        r.name || r.accountName || '-',
        getAccountType(r),
        r.code || r.accountCode || '-',
        formatMoneyRaw(r.balance || r.currentBalance || r.amount || 0),
      ]);
      break;
    }
    case 'ledger': {
      const isAllAccounts = data.length > 0 && data[0]._accountName;
      if (isAllAccounts) {
        headers = [['Date', 'Account', 'Voucher No', 'Description', 'Debit', 'Credit', 'Balance', 'Type']];
        body = data.map(r => [
          formatDate(r.date || r.createdAt),
          r._accountName || '-',
          r.voucherNo || r.reference || r.id || '-',
          r.description || r.notes || r.particulars || '-',
          formatMoneyRaw(r.debit || r.amount || 0),
          formatMoneyRaw(r.credit || 0),
          formatMoneyRaw(r.runningBalance || 0),
          r.type || r.transactionType || '-',
        ]);
      } else {
        headers = [['Date', 'Voucher No', 'Description', 'Debit', 'Credit', 'Balance', 'Type']];
        body = data.map(r => [
          formatDate(r.date || r.createdAt),
          r.voucherNo || r.reference || r.id || '-',
          r.description || r.notes || r.particulars || '-',
          formatMoneyRaw(r.debit || r.amount || 0),
          formatMoneyRaw(r.credit || 0),
          formatMoneyRaw(r.runningBalance || 0),
          r.type || r.transactionType || '-',
        ]);
      }
      break;
    }
    case 'cashflow': {
      headers = [['Period', 'Inflow (PKR)', 'Outflow (PKR)', 'Net Flow (PKR)', 'Status']];
      body = data.map(r => [
        r.date,
        formatMoneyRaw(r.inflow),
        formatMoneyRaw(r.outflow),
        formatMoneyRaw(r.net),
        r.net >= 0 ? 'Surplus' : 'Deficit',
      ]);
      break;
    }
    case 'bank-recon': {
      headers = [['Date', 'Reference', 'Description', 'Amount (PKR)', 'Type', 'Status']];
      body = data.map(r => [
        formatDate(r.date || r.createdAt),
        r.reference || r.voucherNo || r.id || '-',
        r.description || r.notes || '-',
        formatMoneyRaw(r.amount || 0),
        (r.type || '').toLowerCase().includes('credit') || Number(r.amount) > 0 ? 'Deposit' : 'Withdrawal',
        r.isReconciled || r.reconciled ? 'Reconciled' : 'Pending',
      ]);
      break;
    }
    case 'vouchers': {
      headers = [['Voucher No', 'Date', 'Account', 'Type', 'Description', 'Amount (PKR)', 'Mode']];
      body = data.map(r => [
        r.voucherNo || r.reference || r.id || '-',
        formatDate(r.date || r.createdAt),
        r.accountName || r.account?.name || '-',
        r.type || r.transactionType || 'General',
        (r.description || r.notes || r.particulars || '-').substring(0, 50),
        formatMoneyRaw(r.amount || 0),
        r.paymentMode || r.mode || '-',
      ]);
      break;
    }
    case 'expense': {
      headers = [['Category', 'Amount (PKR)', 'Count', '% of Total']];
      const total = data.reduce((s, d) => s + d.amount, 0);
      body = data.map(r => [
        r.key,
        formatMoneyRaw(r.amount),
        String(r.count),
        total > 0 ? ((r.amount / total) * 100).toFixed(2) + '%' : '0%',
      ]);
      break;
    }
    case 'transfers': {
      headers = [['Date', 'Reference', 'From Account', 'To Account', 'Amount (PKR)', 'Description', 'Status']];
      body = data.map(r => [
        formatDate(r.date || r.createdAt),
        r.reference || r.voucherNo || r.id || '-',
        r.fromAccountName || r.fromAccount?.name || '-',
        r.toAccountName || r.toAccount?.name || '-',
        formatMoneyRaw(r.amount || 0),
        (r.description || r.notes || '-').substring(0, 40),
        r.status || 'Completed',
      ]);
      break;
    }
    default:
      headers = [['Data']];
      body = Array.isArray(data) ? data.map(r => [JSON.stringify(r)]) : [[JSON.stringify(data)]];
  }

  autoTable(doc, {
    startY: yPos,
    head: headers,
    body: body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 245] },
    didParseCell: (data) => {
      const amountCols = ['Amount (PKR)', 'Balance (PKR)', 'Debit', 'Credit', 'Inflow (PKR)', 'Outflow (PKR)', 'Net Flow (PKR)'];
      if (amountCols.includes(headers[0][data.column.index])) {
        data.cell.styles.halign = 'right';
        data.cell.styles.font = 'courier';
      }
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`© 2026 Marquee ERP Management System — Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  const safeLabel = tabLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Financial_${safeLabel}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ── Bulletproof CSV Export ──
const exportToCSV = (data, filename, headers, rows, meta = {}) => {
  if (!data || !data.length) {
    alert('No data to export');
    return;
  }

  const csvContent = [
    ['Marquee ERP Management System — Financial Report'],
    [`Report: ${meta.reportName || 'Report'}`],
    [`Generated: ${new Date().toLocaleString('en-GB')}`],
    meta.period ? [`Period: ${meta.period}`] : [],
    [],
    headers,
    ...rows,
  ].map(r => r.map(c => {
    const str = String(c ?? '').replace(/"/g, '""');
    return /[,\n"]/.test(str) ? `"${str}"` : str;
  }).join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const triggerPrint = () => {
  setTimeout(() => window.print(), 200);
};

// ═══════════════════════════════════════════════════════════
// REPORT 1: PROFIT & LOSS STATEMENT
// ═══════════════════════════════════════════════════════════

const ProfitLossReport = () => {
  const [filters, setFilters] = useState({
    fromDate: monthStart(),
    toDate: today(),
    comparePrevious: false,
  });
  const [report, setReport] = useState(null);
  const [prevReport, setPrevReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reportApi.getProfitLoss({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
      const data = extractObject(res);
      if (data.success === false) throw new Error(data.error || 'Failed to load');
      setReport(data.data || data);

      if (filters.comparePrevious) {
        const days = Math.max(1, Math.ceil((new Date(filters.toDate) - new Date(filters.fromDate)) / (1000 * 60 * 60 * 24)));
        const prevTo = new Date(filters.fromDate);
        prevTo.setDate(prevTo.getDate() - 1);
        const prevFrom = new Date(prevTo);
        prevFrom.setDate(prevFrom.getDate() - days);
        const prevRes = await reportApi.getProfitLoss({
          fromDate: prevFrom.toISOString().split('T')[0],
          toDate: prevTo.toISOString().split('T')[0],
        });
        const prevData = extractObject(prevRes);
        setPrevReport(prevData.data || prevData);
      } else {
        setPrevReport(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate P&L report');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today() || filters.comparePrevious;

  const csvData = useMemo(() => {
    if (!report) return [];
    const rows = [];
    rows.push({ Category: 'REVENUE', Item: 'Booking Revenue', Amount: report.revenue?.bookings?.amount || 0 });
    rows.push({ Category: 'REVENUE', Item: 'Event Revenue', Amount: report.revenue?.events?.amount || 0 });
    rows.push({ Category: 'REVENUE', Item: 'Other Income', Amount: report.revenue?.otherIncome?.amount || 0 });
    rows.push({ Category: 'REVENUE', Item: 'Total Revenue', Amount: report.revenue?.total || 0 });
    rows.push({ Category: 'COGS', Item: 'Purchase Cost', Amount: report.cogs?.purchaseCost?.amount || 0 });
    rows.push({ Category: 'COGS', Item: 'Inventory Consumed', Amount: report.cogs?.inventoryConsumed?.amount || 0 });
    rows.push({ Category: 'COGS', Item: 'Kitchen Production', Amount: report.cogs?.kitchenProduction?.amount || 0 });
    rows.push({ Category: 'COGS', Item: 'Purchase Returns', Amount: report.cogs?.purchaseReturns?.amount || 0 });
    rows.push({ Category: 'COGS', Item: 'Total COGS', Amount: report.cogs?.total || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Salaries & Wages', Amount: report.expenses?.salaries?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Event Staff', Amount: report.expenses?.eventStaff?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Staff Payments', Amount: report.expenses?.staffPayments?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Loans/Advances', Amount: report.expenses?.loans?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Supplier Payments', Amount: report.expenses?.supplierPayments?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Rent', Amount: report.expenses?.rent?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Utilities', Amount: report.expenses?.utilities?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Taxes', Amount: report.expenses?.taxes?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Wastage/Damage', Amount: report.expenses?.wastage?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Other Expenses', Amount: report.expenses?.otherExpenses?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Payment Vouchers', Amount: report.expenses?.paymentVouchers?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Total Expenses', Amount: report.expenses?.total || 0 });
    rows.push({ Category: 'SUMMARY', Item: 'Gross Profit', Amount: report.grossProfit || 0 });
    rows.push({ Category: 'SUMMARY', Item: 'Net Profit', Amount: report.netProfit || 0 });
    rows.push({ Category: 'SUMMARY', Item: 'Profit Margin %', Amount: report.profitMargin || 0 });
    return rows;
  }, [report]);

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    const headers = ['Category', 'Item', 'Amount (PKR)'];
    const rows = csvData.map(r => [r.Category, r.Item, r.Amount]);
    exportToCSV(csvData, 'Profit_Loss_Statement', headers, rows, {
      reportName: 'Profit & Loss Statement',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [csvData, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('pnl', 'Profit & Loss Statement', report, filters.fromDate, filters.toDate);
  }, [report, filters]);

  const isProfit = (report?.netProfit || 0) >= 0;

  return (
    <div className="space-y-6">
      <FilterCard
        title="Profit & Loss Filters"
        onReset={() => { setFilters({ fromDate: monthStart(), toDate: today(), comparePrevious: false }); }}
        onApply={fetchReport}
        loading={loading}
        hasFilters={hasFilters}
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="comparePrev" checked={filters.comparePrevious}
            onChange={(e) => setFilters(p => ({ ...p, comparePrevious: e.target.checked }))}
            className="w-4 h-4 text-[#2563EB] border-gray-300 rounded focus:ring-[#2563EB]" />
          <label htmlFor="comparePrev" className="text-sm text-gray-700">Compare with previous period</label>
        </div>
      </FilterCard>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {report && (
        <>
          <ExportToolbar
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onPrint={triggerPrint}
            dataCount={csvData.length}
            title="P&L Line Items"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard title="Total Revenue" amount={report.summary?.totalRevenue} icon={DollarSign} color="green" />
            <SummaryCard title="Total COGS" amount={report.summary?.totalCOGS} icon={ShoppingCart} color="orange" />
            <SummaryCard title="Gross Profit" amount={report.summary?.grossProfit} icon={TrendingUp} color="blue" />
            <SummaryCard title="Net Profit" amount={report.summary?.netProfit} icon={isProfit ? TrendingUp : TrendingDown} color={isProfit ? 'green' : 'red'} highlight />
          </div>

          {prevReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
              <div className="bg-white p-3 rounded-lg border shadow-sm"><span className="block text-gray-400">Previous Revenue</span><span className="font-semibold text-gray-700">{formatMoney(prevReport.summary?.totalRevenue)}</span></div>
              <div className="bg-white p-3 rounded-lg border shadow-sm"><span className="block text-gray-400">Previous COGS</span><span className="font-semibold text-gray-700">{formatMoney(prevReport.summary?.totalCOGS)}</span></div>
              <div className="bg-white p-3 rounded-lg border shadow-sm"><span className="block text-gray-400">Previous Gross</span><span className="font-semibold text-gray-700">{formatMoney(prevReport.summary?.grossProfit)}</span></div>
              <div className="bg-white p-3 rounded-lg border shadow-sm"><span className="block text-gray-400">Previous Net</span><span className="font-semibold text-gray-700">{formatMoney(prevReport.summary?.netProfit)}</span></div>
            </div>
          )}

          <div className={`p-4 rounded-xl border ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">Net Profit Margin</span>
              <span className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>{report.profitMargin}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Revenue" color="green">
              <LineItem label="Booking Revenue" amount={report.revenue?.bookings?.amount} count={report.revenue?.bookings?.count} />
              <LineItem label="Event Revenue" amount={report.revenue?.events?.amount} count={report.revenue?.events?.count} />
              <LineItem label="Other Income" amount={report.revenue?.otherIncome?.amount} />
              <Divider /><TotalLine label="Total Revenue" amount={report.revenue?.total} color="green" />
            </SectionCard>

            <SectionCard title="Cost of Goods Sold" color="orange">
              <LineItem label="Purchase Cost (GRN)" amount={report.cogs?.purchaseCost?.amount} count={report.cogs?.purchaseCost?.count} />
              <LineItem label="Inventory Consumed" amount={report.cogs?.inventoryConsumed?.amount} />
              <LineItem label="Kitchen Production" amount={report.cogs?.kitchenProduction?.amount} />
              <LineItem label="Purchase Returns" amount={report.cogs?.purchaseReturns?.amount} negative />
              <Divider /><TotalLine label="Total COGS" amount={report.cogs?.total} color="orange" />
            </SectionCard>

            <SectionCard title="Operating Expenses" color="red" className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <LineItem label="Salaries & Wages" amount={report.expenses?.salaries?.amount} count={report.expenses?.salaries?.count} />
                <LineItem label="Event Staff Payments" amount={report.expenses?.eventStaff?.amount} />
                <LineItem label="Direct Staff Payments" amount={report.expenses?.staffPayments?.amount} />
                <LineItem label="Loan / Advances" amount={report.expenses?.loans?.amount} />
                <LineItem label="Supplier Payments" amount={report.expenses?.supplierPayments?.amount} />
                <LineItem label="Rent" amount={report.expenses?.rent?.amount} />
                <LineItem label="Utilities (Electric/Gas/Water)" amount={report.expenses?.utilities?.amount} />
                <LineItem label="Taxes" amount={report.expenses?.taxes?.amount} />
                <LineItem label="Wastage / Damage" amount={report.expenses?.wastage?.amount} count={report.expenses?.wastage?.count} />
                <LineItem label="Payment Vouchers" amount={report.expenses?.paymentVouchers?.amount} />
                <LineItem label="Other Expenses" amount={report.expenses?.otherExpenses?.amount} />
              </div>
              <Divider /><TotalLine label="Total Operating Expenses" amount={report.expenses?.total} color="red" />
            </SectionCard>
          </div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center text-lg"><span>Revenue</span><span>{formatMoney(report.revenue?.total)}</span></div>
            <div className="flex justify-between items-center text-lg text-red-400"><span>Less: COGS</span><span>- {formatMoney(report.cogs?.total)}</span></div>
            <div className="flex justify-between items-center text-xl font-bold text-blue-400 my-2 border-t border-gray-700 pt-2"><span>Gross Profit</span><span>{formatMoney(report.grossProfit)}</span></div>
            <div className="flex justify-between items-center text-lg text-red-400"><span>Less: Operating Expenses</span><span>- {formatMoney(report.expenses?.total)}</span></div>
            <div className={`flex justify-between items-center text-2xl font-bold mt-2 border-t border-gray-700 pt-2 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              <span>Net Profit / Loss</span><span>{formatMoney(report.netProfit)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 2: BALANCE SHEET
// ═══════════════════════════════════════════════════════════

const BalanceSheetReport = () => {
  const [filters, setFilters] = useState({ asOfDate: today(), accountType: 'all' });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try { 
      const res = await accountApi.getAll({ asOfDate: filters.asOfDate }); 
      setAccounts(extractArray(res)); 
    }
    catch (err) { setError(err.message || 'Failed to load accounts'); }
    finally { setLoading(false); }
  }, [filters.asOfDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasFilters = filters.asOfDate !== today() || filters.accountType !== 'all';

  const categorized = useMemo(() => {
    const typeFilter = filters.accountType;
    const list = typeFilter === 'all' ? accounts : accounts.filter(a => getAccountType(a) === typeFilter);
    const assets = list.filter(a => getAccountType(a) === 'asset');
    const liabilities = list.filter(a => getAccountType(a) === 'liability');
    const equity = list.filter(a => getAccountType(a) === 'equity');
    const others = list.filter(a => !assets.includes(a) && !liabilities.includes(a) && !equity.includes(a));
    return { assets, liabilities, equity, others };
  }, [accounts, filters.accountType]);

  const totalAssets = safeSum(categorized.assets) + safeSum(categorized.others);
  const totalLiabilities = safeSum(categorized.liabilities);
  const totalEquity = safeSum(categorized.equity);

  const allAccounts = useMemo(() => [
    ...categorized.assets, ...categorized.liabilities, ...categorized.equity, ...categorized.others
  ], [categorized]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Account Name', 'Type', 'Code', 'Balance (PKR)'];
    const rows = allAccounts.map(a => [
      a.name || a.accountName || '-',
      getAccountType(a),
      a.code || a.accountCode || '-',
      a.balance || a.currentBalance || a.amount || 0,
    ]);
    rows.push(['TOTAL ASSETS', '', '', totalAssets]);
    rows.push(['TOTAL LIABILITIES', '', '', totalLiabilities]);
    rows.push(['TOTAL EQUITY', '', '', totalEquity]);
    rows.push(['LIABILITIES + EQUITY', '', '', totalLiabilities + totalEquity]);
    exportToCSV(allAccounts, 'Balance_Sheet', headers, rows, {
      reportName: 'Balance Sheet',
      period: `As of ${filters.asOfDate}`,
    });
  }, [allAccounts, totalAssets, totalLiabilities, totalEquity, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('balance', 'Balance Sheet', allAccounts, null, filters.asOfDate);
  }, [allAccounts, filters]);

  const accountTypeOptions = [
    { value: 'all', label: 'All Accounts' },
    { value: 'asset', label: 'Assets' },
    { value: 'liability', label: 'Liabilities' },
    { value: 'equity', label: 'Equity' },
  ];

  const renderCategory = (title, items, color) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className={`text-lg font-bold mb-4 text-${color}-600`}>{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
            <span className="text-gray-700 text-sm">{item.name || item.accountName || 'Unnamed'}</span>
            <span className="font-mono font-medium text-gray-900">{formatMoney(item.balance || item.currentBalance || item.amount)}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400 italic">No accounts found</p>}
        <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200 font-bold text-gray-900">
          <span>Total {title}</span>
          <span className="font-mono">{formatMoney(safeSum(items))}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <FilterCard title="Balance Sheet Filters" onReset={() => { setFilters({ asOfDate: today(), accountType: 'all' }); }} onApply={fetchData} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">As of Date</label>
          <input type="date" value={filters.asOfDate} onChange={(e) => setFilters(p => ({ ...p, asOfDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
          <select value={filters.accountType} onChange={(e) => setFilters(p => ({ ...p, accountType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {accountTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FilterCard>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && (
        <>
          <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={allAccounts.length} title="Accounts" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard title="Total Assets" amount={totalAssets} icon={Landmark} color="blue" />
            <SummaryCard title="Total Liabilities" amount={totalLiabilities} icon={Receipt} color="red" />
            <SummaryCard title="Total Equity" amount={totalEquity} icon={Scale} color="green" />
          </div>
          <div className={`p-4 rounded-xl border ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Balance Check: Assets = Liabilities + Equity</span>
              <span className={`font-bold ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? 'Balanced ✓' : 'Unbalanced ⚠'}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1 text-gray-600">
              <span>Assets: {formatMoney(totalAssets)}</span>
              <span>L + E: {formatMoney(totalLiabilities + totalEquity)}</span>
              <span>Difference: {formatMoney(totalAssets - totalLiabilities - totalEquity)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderCategory('Assets', [...categorized.assets, ...categorized.others], 'blue')}
            {renderCategory('Liabilities', categorized.liabilities, 'red')}
            {renderCategory('Equity / Capital', categorized.equity, 'green')}
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 3: ACCOUNT LEDGER
// ═══════════════════════════════════════════════════════════

const AccountLedgerReport = () => {
  const [filters, setFilters] = useState({ accountId: 'all', fromDate: monthStart(), toDate: today(), transactionType: 'all' });
  const [accounts, setAccounts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await accountApi.getAll();
        const data = extractArray(res);
        setAccounts(data);
        if (data.length === 0) setAccountsError('No accounts found. Please create accounts first.');
      } catch (err) { setAccountsError('Failed to load accounts: ' + (err.message || 'Unknown error')); }
    };
    loadAccounts();
  }, []);

  const transactionTypeOptions = [
    { value: 'all', label: 'All' },
    { value: 'credit', label: 'Credit' },
    { value: 'debit', label: 'Debit' },
    { value: 'transfer', label: 'Transfer' },
  ];

  const hasFilters = filters.accountId !== 'all' || filters.fromDate !== monthStart() || filters.toDate !== today() || filters.transactionType !== 'all';

  const fetchLedger = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (filters.accountId === 'all') {
        // ── ALL ACCOUNTS MODE ──
        setAccountInfo(null);
        const allTx = [];

        await Promise.all(accounts.map(async (acc) => {
          try {
            const res = await accountApi.getHistory(String(acc.id), { fromDate: filters.fromDate, toDate: filters.toDate });
            let data = extractArray(res);

            // Client-side type filter
            if (filters.transactionType !== 'all') {
              data = data.filter(tx => {
                const txType = String(tx.type || tx.transactionType || '').toLowerCase();
                const filterType = filters.transactionType.toLowerCase();
                if (filterType === 'credit') return ['credit','receipt','income'].some(t => txType.includes(t));
                if (filterType === 'debit') return ['debit','payment','expense'].some(t => txType.includes(t));
                return txType.includes(filterType);
              });
            }

            let running = Number(acc?.openingBalance || acc?.balance || 0);
            const enriched = data.map(tx => {
              const debit = Number(tx.debit || tx.amount || 0);
              const credit = Number(tx.credit || 0);
              running += (debit - credit);
              return {
                ...tx,
                runningBalance: running,
                _accountName: acc.bankName || acc.name || acc.accountName || acc.accountHolder || 'Unnamed',
                _accountCode: acc.accountNumber || acc.code || acc.accountCode || 'N/A',
                _accountType: acc.accountType || acc.type || 'Bank',
                _accountId: acc.id,
              };
            });
            allTx.push(...enriched);
          } catch (err) {
            console.warn(`Failed to load ledger for account ${acc.id}:`, err.message);
          }
        }));

        // Sort by date across all accounts
        allTx.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
        setLedger(allTx);
        if (allTx.length === 0) setError('No transactions found for any account in the selected period.');
      } else {
        // ── SINGLE ACCOUNT MODE ──
        const acc = accounts.find(a => String(a.id) === String(filters.accountId));
        setAccountInfo(acc ? { 
          ...acc, 
          name: acc.bankName || acc.name || acc.accountName || acc.accountHolder,
          code: acc.accountNumber || acc.code || acc.accountCode,
          type: acc.accountType || acc.type || 'Bank',
          balance: acc.currentBalance ?? acc.initialBalance ?? acc.balance ?? 0,
        } : null);
        const res = await accountApi.getHistory(filters.accountId, { fromDate: filters.fromDate, toDate: filters.toDate });
        let data = extractArray(res);
        if (filters.transactionType !== 'all') {
          data = data.filter(tx => {
            const txType = String(tx.type || tx.transactionType || '').toLowerCase();
            const filterType = filters.transactionType.toLowerCase();
            if (filterType === 'credit') return ['credit','receipt','income'].some(t => txType.includes(t));
            if (filterType === 'debit') return ['debit','payment','expense'].some(t => txType.includes(t));
            return txType.includes(filterType);
          });
        }
        let running = Number(acc?.openingBalance || acc?.balance || 0);
        const enriched = data.map(tx => {
          const debit = Number(tx.debit || tx.amount || 0);
          const credit = Number(tx.credit || 0);
          running += (debit - credit);
          return { ...tx, runningBalance: running };
        });
        setLedger(enriched);
      }
    } catch (err) { setError(err.message || 'Failed to load ledger'); }
    finally { setLoading(false); }
  }, [filters, accounts]);

  const handleExportCSV = useCallback(() => {
    const isAll = filters.accountId === 'all';
    const headers = isAll 
      ? ['Date', 'Account', 'Code', 'Voucher No', 'Description', 'Debit', 'Credit', 'Running Balance', 'Type']
      : ['Date', 'Voucher No', 'Description', 'Debit', 'Credit', 'Running Balance', 'Type'];
    const rows = ledger.map(tx => isAll ? [
      formatDate(tx.date || tx.createdAt),
      tx._accountName || '-',
      tx._accountCode || '-',
      tx.voucherNo || tx.reference || tx.id || '-',
      tx.description || tx.notes || tx.particulars || '-',
      tx.debit || tx.amount || 0,
      tx.credit || 0,
      tx.runningBalance || 0,
      tx.type || tx.transactionType || '-',
    ] : [
      formatDate(tx.date || tx.createdAt),
      tx.voucherNo || tx.reference || tx.id || '-',
      tx.description || tx.notes || tx.particulars || '-',
      tx.debit || tx.amount || 0,
      tx.credit || 0,
      tx.runningBalance || 0,
      tx.type || tx.transactionType || '-',
    ]);
    exportToCSV(ledger, isAll ? 'All_Accounts_Ledger' : `Ledger_${accountInfo?.name || 'Account'}`, headers, rows, {
      reportName: isAll ? 'All Accounts Ledger' : 'Account Ledger',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [ledger, accountInfo, filters]);

  const handleExportPDF = useCallback(() => {
    const isAll = filters.accountId === 'all';
    generatePDF('ledger', isAll ? 'All Accounts Ledger' : `Account Ledger — ${accountInfo?.name || 'Account'}`, ledger, filters.fromDate, filters.toDate);
  }, [ledger, accountInfo, filters]);

  // Summary stats for all-accounts view
  const ledgerStats = useMemo(() => {
    if (filters.accountId !== 'all') return null;
    const uniqueAccounts = new Set(ledger.map(tx => tx._accountId)).size;
    const totalDebit = ledger.reduce((s, tx) => s + Number(tx.debit || tx.amount || 0), 0);
    const totalCredit = ledger.reduce((s, tx) => s + Number(tx.credit || 0), 0);
    return { uniqueAccounts, totalDebit, totalCredit, count: ledger.length };
  }, [ledger, filters.accountId]);

  return (
    <div className="space-y-6">
      <FilterCard title="Ledger Filters" onReset={() => { setFilters({ accountId: 'all', fromDate: monthStart(), toDate: today(), transactionType: 'all' }); setLedger([]); setAccountInfo(null); }} onApply={fetchLedger} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
          <select value={filters.accountId} onChange={(e) => setFilters(p => ({ ...p, accountId: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            <option value="all">📋 All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.bankName || a.name || a.accountName || a.accountHolder || 'Unnamed'} ({a.accountNumber || a.code || a.accountCode || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type</label>
          <select value={filters.transactionType} onChange={(e) => setFilters(p => ({ ...p, transactionType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {transactionTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FilterCard>

      {accountsError && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2"><AlertCircle size={18} /> {accountsError}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {/* Single Account Info Card */}
      {accountInfo && filters.accountId !== 'all' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{accountInfo.bankName || accountInfo.name || accountInfo.accountName || accountInfo.accountHolder || 'Unnamed'}</h3>
              <p className="text-sm text-gray-500">{accountInfo.accountNumber || accountInfo.code || accountInfo.accountCode || 'N/A'} | {accountInfo.accountType || accountInfo.type || 'Bank'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-xl font-bold text-[#2563EB]">{formatMoney(accountInfo.currentBalance ?? accountInfo.initialBalance ?? accountInfo.balance ?? 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* All Accounts Summary Cards */}
      {filters.accountId === 'all' && ledgerStats && ledger.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard title="Accounts" amount={ledgerStats.uniqueAccounts} icon={Landmark} color="blue" subtext={`${ledgerStats.uniqueAccounts} active accounts`} />
          <SummaryCard title="Total Transactions" amount={ledgerStats.count} icon={FileText} color="gray" />
          <SummaryCard title="Total Debit" amount={ledgerStats.totalDebit} icon={ArrowDownCircle} color="green" />
          <SummaryCard title="Total Credit" amount={ledgerStats.totalCredit} icon={ArrowUpCircle} color="red" />
        </div>
      )}

      {ledger.length > 0 && (
        <>
          <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={ledger.length} title={filters.accountId === 'all' ? 'All Accounts' : 'Ledger Entries'} />
          <DataTable
            loading={loading}
            data={ledger}
            keyExtractor={(row, i) => row.id || `${row._accountId}-${i}`}
            emptyMessage="No transactions found"
            columns={filters.accountId === 'all' ? [
              { header: 'Date', accessor: 'date', cell: row => formatDate(row.date || row.createdAt) },
              { header: 'Account', accessor: '_accountName', cell: row => (
                <div>
                  <span className="font-medium text-gray-900">{row._accountName}</span>
                  <span className="text-xs text-gray-400 block">{row._accountCode}</span>
                </div>
              )},
              { header: 'Voucher No', accessor: 'voucherNo', cell: row => <span className="font-medium">{row.voucherNo || row.reference || row.id}</span> },
              { header: 'Description', accessor: 'description', cell: row => row.description || row.notes || row.particulars || '-' },
              { header: 'Debit', accessor: 'debit', cell: row => Number(row.debit || row.amount || 0) > 0 ? <span className="text-green-600 font-mono">{formatMoney(row.debit || row.amount)}</span> : '-' },
              { header: 'Credit', accessor: 'credit', cell: row => Number(row.credit || 0) > 0 ? <span className="text-red-600 font-mono">{formatMoney(row.credit)}</span> : '-' },
              { header: 'Balance', accessor: 'runningBalance', cell: row => <span className="font-mono font-semibold">{formatMoney(row.runningBalance)}</span> },
              { header: 'Type', accessor: 'type', cell: row => <StatusBadge status={row.type} label={row.type || row.transactionType || 'General'} /> },
            ] : [
              { header: 'Date', accessor: 'date', cell: row => formatDate(row.date || row.createdAt) },
              { header: 'Voucher No', accessor: 'voucherNo', cell: row => <span className="font-medium">{row.voucherNo || row.reference || row.id}</span> },
              { header: 'Description', accessor: 'description', cell: row => row.description || row.notes || row.particulars || '-' },
              { header: 'Debit', accessor: 'debit', cell: row => Number(row.debit || row.amount || 0) > 0 ? <span className="text-green-600 font-mono">{formatMoney(row.debit || row.amount)}</span> : '-' },
              { header: 'Credit', accessor: 'credit', cell: row => Number(row.credit || 0) > 0 ? <span className="text-red-600 font-mono">{formatMoney(row.credit)}</span> : '-' },
              { header: 'Balance', accessor: 'runningBalance', cell: row => <span className="font-mono font-semibold">{formatMoney(row.runningBalance)}</span> },
              { header: 'Type', accessor: 'type', cell: row => <StatusBadge status={row.type} label={row.type || row.transactionType || 'General'} /> },
            ]}
          />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 4: CASH FLOW / DAILY COLLECTION
// ═══════════════════════════════════════════════════════════

const CashFlowReport = () => {
  const [filters, setFilters] = useState({ fromDate: monthStart(), toDate: today(), accountId: 'all', groupBy: 'day', flowType: 'all' });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try { 
        const res = await accountApi.getAll(); 
        const data = extractArray(res);
        setAccounts(data);
        if (data.length === 0) setAccountsError('No accounts found.');
      }
      catch (err) { setAccountsError('Failed to load accounts: ' + (err.message || 'Unknown error')); }
    };
    loadAccounts();
  }, []);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today() || filters.accountId !== 'all' || filters.groupBy !== 'day' || filters.flowType !== 'all';

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let txData = [], bkData = [];
      try {
        const txRes = await accountApi.getAllTransactions({ 
          fromDate: filters.fromDate, toDate: filters.toDate, 
          accountId: filters.accountId === 'all' ? undefined : filters.accountId 
        });
        txData = extractArray(txRes);
      } catch (txErr) { console.warn('getAllTransactions failed:', txErr.message); }
      try {
        const bkRes = await bookingApi.getAll({ fromDate: filters.fromDate, toDate: filters.toDate });
        bkData = extractArray(bkRes);
      } catch (bkErr) { console.warn('bookings fetch failed:', bkErr.message); }
      setTransactions(txData); setBookings(bkData);
      if (txData.length === 0 && bkData.length === 0) setError('No transaction or booking data available for the selected period.');
    } catch (err) { setError(err.message || 'Failed to load cash flow data'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const groupedData = useMemo(() => {
    const map = new Map();
    const addToMap = (date, inflow, outflow) => {
      const key = filters.groupBy === 'month' ? date.slice(0, 7) : filters.groupBy === 'week' ? `${date.slice(0,4)}-W${Math.ceil(new Date(date).getDate()/7)}` : date;
      if (!map.has(key)) map.set(key, { date: key, inflow: 0, outflow: 0, net: 0 });
      const entry = map.get(key);
      entry.inflow += inflow; entry.outflow += outflow; entry.net = entry.inflow - entry.outflow;
    };
    transactions.forEach(tx => {
      const date = (tx.date || tx.createdAt || '').split('T')[0]; if (!date) return;
      const amt = Number(tx.amount || 0);
      const typeStr = String(tx.type || '').toLowerCase();
      const isIn = ['credit','income','receipt','collection'].includes(typeStr) || amt > 0;
      const isOut = ['debit','expense','payment'].includes(typeStr) || amt < 0;
      if (filters.flowType === 'inflow' && !isIn) return;
      if (filters.flowType === 'outflow' && !isOut) return;
      addToMap(date, isIn ? Math.abs(amt) : 0, isOut ? Math.abs(amt) : 0);
    });
    bookings.forEach(bk => {
      const date = (bk.eventDate || bk.bookingDate || bk.createdAt || '').split('T')[0]; if (!date) return;
      const paid = Number(bk.paidAmount || bk.received || 0);
      if (filters.flowType !== 'outflow') addToMap(date, paid, 0);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, bookings, filters.groupBy, filters.flowType]);

  const totals = useMemo(() => ({
    inflow: groupedData.reduce((s, d) => s + d.inflow, 0),
    outflow: groupedData.reduce((s, d) => s + d.outflow, 0),
    net: groupedData.reduce((s, d) => s + d.net, 0),
  }), [groupedData]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Period', 'Inflow (PKR)', 'Outflow (PKR)', 'Net Flow (PKR)', 'Status'];
    const rows = groupedData.map(d => [d.date, d.inflow, d.outflow, d.net, d.net >= 0 ? 'Surplus' : 'Deficit']);
    exportToCSV(groupedData, 'Cash_Flow_Report', headers, rows, {
      reportName: 'Cash Flow / Daily Collection',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [groupedData, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('cashflow', 'Cash Flow / Daily Collection', groupedData, filters.fromDate, filters.toDate);
  }, [groupedData, filters]);

  const groupByOptions = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  const flowTypeOptions = [
    { value: 'all', label: 'All' },
    { value: 'inflow', label: 'Inflow Only' },
    { value: 'outflow', label: 'Outflow Only' },
  ];

  return (
    <div className="space-y-6">
      <FilterCard title="Cash Flow Filters" onReset={() => { setFilters({ fromDate: monthStart(), toDate: today(), accountId: 'all', groupBy: 'day', flowType: 'all' }); }} onApply={fetchData} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
          <select value={filters.accountId} onChange={(e) => setFilters(p => ({ ...p, accountId: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            <option value="all">All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.bankName || a.name || a.accountName || a.accountHolder || 'Unnamed'} ({a.accountNumber || a.code || a.accountCode || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Group By</label>
          <select value={filters.groupBy} onChange={(e) => setFilters(p => ({ ...p, groupBy: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {groupByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Flow Type</label>
          <select value={filters.flowType} onChange={(e) => setFilters(p => ({ ...p, flowType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {flowTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FilterCard>

      {accountsError && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2"><AlertCircle size={18} /> {accountsError}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard title="Total Inflow" amount={totals.inflow} icon={ArrowUpCircle} color="green" trend="Incoming" trendUp={true} />
            <SummaryCard title="Total Outflow" amount={totals.outflow} icon={ArrowDownCircle} color="red" trend="Outgoing" trendUp={false} />
            <SummaryCard title="Net Cash Flow" amount={totals.net} icon={TrendingUp} color={totals.net >= 0 ? 'blue' : 'red'} highlight />
          </div>
          <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={groupedData.length} title="Cash Flow Periods" />
          <DataTable
            loading={loading}
            data={groupedData}
            keyExtractor={(row, i) => row.date || i}
            emptyMessage="No cash flow data found"
            columns={[
              { header: 'Period', accessor: 'date', cell: row => <span className="font-medium">{row.date}</span> },
              { header: 'Inflow', accessor: 'inflow', cell: row => <span className="text-green-600 font-mono">{formatMoney(row.inflow)}</span> },
              { header: 'Outflow', accessor: 'outflow', cell: row => <span className="text-red-600 font-mono">{formatMoney(row.outflow)}</span> },
              { header: 'Net Flow', accessor: 'net', cell: row => <span className="font-mono font-semibold">{formatMoney(row.net)}</span> },
              { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.net >= 0 ? 'surplus' : 'deficit'} label={row.net >= 0 ? 'SURPLUS' : 'DEFICIT'} /> },
            ]}
          />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 5: BANK RECONCILIATION - FIXED: All banks shown
// ═══════════════════════════════════════════════════════════

const BankReconciliationReport = () => {
  const [filters, setFilters] = useState({ bankAccountId: '', fromDate: monthStart(), toDate: today(), status: 'all' });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await accountApi.getAll();
        const all = extractArray(res);
        console.log('All accounts loaded:', all);
        
        // Show ALL accounts in dropdown - no filtering
        setAccounts(all);
        if (all.length === 0) {
          setAccountsError('No accounts found. Please create accounts first.');
        } else {
          // Auto-select first account if none selected
          if (!filters.bankAccountId && all.length > 0) {
            setFilters(prev => ({ ...prev, bankAccountId: String(all[0].id) }));
          }
        }
      } catch (err) { 
        console.error('Failed to load accounts:', err);
        setAccountsError('Failed to load accounts: ' + (err?.message || 'Unknown error')); 
      }
    };
    loadAccounts();
  }, []);

  const hasFilters = filters.bankAccountId || filters.fromDate !== monthStart() || filters.toDate !== today() || filters.status !== 'all';

  const fetchData = useCallback(async () => {
    if (!filters.bankAccountId) { setError('Select a bank account'); return; }
    setLoading(true); setError('');
    try {
      const res = await accountApi.getHistory(filters.bankAccountId, { fromDate: filters.fromDate, toDate: filters.toDate });
      const data = extractArray(res);
      setTransactions(data);
      if (data.length === 0) setError('No transactions found for this account in the selected period.');
    } catch (err) { 
      console.error('Failed to load transactions:', err);
      setError(err.message || 'Failed to load bank data'); 
    }
    finally { setLoading(false); }
  }, [filters]);

  // Auto-fetch when account is selected
  useEffect(() => {
    if (filters.bankAccountId) {
      fetchData();
    }
  }, [filters.bankAccountId, filters.fromDate, filters.toDate, filters.status]);

  const bankAccount = accounts.find(a => String(a.id) === String(filters.bankAccountId));

  const filteredTx = useMemo(() => {
    if (filters.status === 'all') return transactions;
    return transactions.filter(tx => {
      const reconciled = tx.isReconciled || tx.reconciled || tx.status === 'reconciled';
      return filters.status === 'reconciled' ? reconciled : !reconciled;
    });
  }, [transactions, filters.status]);

  const summary = useMemo(() => {
    const bookBalance = Number(bankAccount?.balance || bankAccount?.currentBalance || 0);
    const reconciled = filteredTx.filter(tx => tx.isReconciled || tx.reconciled).reduce((s, tx) => s + Math.abs(Number(tx.amount || 0)), 0);
    const unreconciled = filteredTx.filter(tx => !tx.isReconciled && !tx.reconciled).reduce((s, tx) => s + Math.abs(Number(tx.amount || 0)), 0);
    return { bookBalance, reconciled, unreconciled, total: reconciled + unreconciled };
  }, [filteredTx, bankAccount]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Date', 'Reference No', 'Description', 'Amount (PKR)', 'Type', 'Status'];
    const rows = filteredTx.map(tx => [
      formatDate(tx.date || tx.createdAt),
      tx.reference || tx.voucherNo || tx.id || '-',
      tx.description || tx.notes || '-',
      Math.abs(tx.amount || 0),
      (tx.type || '').toLowerCase() === 'credit' || Number(tx.amount) > 0 ? 'Deposit' : 'Withdrawal',
      tx.isReconciled || tx.reconciled ? 'Reconciled' : 'Unreconciled',
    ]);
    exportToCSV(filteredTx, `Bank_Recon_${bankAccount?.name || 'Bank'}`, headers, rows, {
      reportName: 'Bank Reconciliation',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [filteredTx, bankAccount, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('bank-recon', `Bank Reconciliation — ${bankAccount?.name || 'Bank'}`, filteredTx, filters.fromDate, filters.toDate);
  }, [filteredTx, bankAccount, filters]);

  const statusOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'reconciled', label: 'Reconciled' },
    { value: 'unreconciled', label: 'Unreconciled' },
  ];

  return (
    <div className="space-y-6">
      <FilterCard title="Bank Reconciliation Filters" onReset={() => { 
        setFilters({ bankAccountId: accounts.length > 0 ? String(accounts[0].id) : '', fromDate: monthStart(), toDate: today(), status: 'all' }); 
        setTransactions([]); 
      }} onApply={fetchData} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account *</label>
          <select value={filters.bankAccountId} onChange={(e) => setFilters(p => ({ ...p, bankAccountId: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            <option value="">Select Bank Account</option>
            {accounts.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.bankName || a.name || a.accountName || a.accountHolder || 'Unnamed'} ({a.accountNumber || a.code || a.accountCode || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reconciliation Status</label>
          <select value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FilterCard>

      {accountsError && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2"><AlertCircle size={18} /> {accountsError}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {bankAccount && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{bankAccount.bankName || bankAccount.name || bankAccount.accountName || bankAccount.accountHolder || 'Unnamed'}</h3>
              <p className="text-sm text-gray-500">Account #: {bankAccount.accountNumber || bankAccount.code || bankAccount.accountCode || 'N/A'} | Type: {bankAccount.accountType || bankAccount.type || 'Bank'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Book Balance</p>
              <p className="text-xl font-bold text-[#2563EB]">{formatMoney(bankAccount.balance || bankAccount.currentBalance || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {filteredTx.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard title="Book Balance" amount={summary.bookBalance} icon={Landmark} color="blue" />
            <SummaryCard title="Total Transactions" amount={summary.total} icon={FileText} color="gray" />
            <SummaryCard title="Reconciled Amount" amount={summary.reconciled} icon={CheckCircle2} color="green" />
            <SummaryCard title="Unreconciled Amount" amount={summary.unreconciled} icon={AlertCircle} color="orange" />
          </div>
          <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={filteredTx.length} title="Bank Transactions" />
          <DataTable
            loading={loading}
            data={filteredTx}
            keyExtractor={(row, i) => row.id || i}
            emptyMessage="No transactions found"
            columns={[
              { header: 'Date', accessor: 'date', cell: row => formatDate(row.date || row.createdAt) },
              { header: 'Reference', accessor: 'reference', cell: row => <span className="font-medium">{row.reference || row.voucherNo || row.id || '-'}</span> },
              { header: 'Description', accessor: 'description', cell: row => row.description || row.notes || '-' },
              { header: 'Amount', accessor: 'amount', cell: row => <span className="font-mono">{formatMoney(Math.abs(row.amount || 0))}</span> },
              { header: 'Type', accessor: 'type', cell: row => (
                <span className={`text-xs font-medium ${(row.type || '').toLowerCase().includes('credit') || Number(row.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(row.type || '').toLowerCase().includes('credit') || Number(row.amount) > 0 ? 'Deposit' : 'Withdrawal'}
                </span>
              )},
              { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.isReconciled || row.reconciled ? 'reconciled' : 'unreconciled'} label={row.isReconciled || row.reconciled ? 'RECONCILED' : 'PENDING'} /> },
            ]}
          />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 6: TRANSACTION VOUCHER REPORT
// ═══════════════════════════════════════════════════════════

const VoucherReport = () => {
  const [filters, setFilters] = useState({
    fromDate: monthStart(), toDate: today(), voucherType: 'all', accountId: 'all',
    voucherNo: '', amountMin: '', amountMax: '',
  });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try { 
        const res = await accountApi.getAll(); 
        const data = extractArray(res);
        setAccounts(data);
        if (data.length === 0) setAccountsError('No accounts found.');
      }
      catch (err) { setAccountsError('Failed to load accounts: ' + (err.message || 'Unknown error')); }
    };
    loadAccounts();
  }, []);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today() || filters.voucherType !== 'all' || 
                     filters.accountId !== 'all' || filters.voucherNo || filters.amountMin || filters.amountMax;

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { fromDate: filters.fromDate, toDate: filters.toDate };
      if (filters.accountId !== 'all') params.accountId = filters.accountId;
      if (filters.voucherNo) params.voucherNo = filters.voucherNo;
      if (filters.amountMin) params.amountMin = filters.amountMin;
      if (filters.amountMax) params.amountMax = filters.amountMax;
      const res = await accountApi.getAllTransactions(params);
      let data = extractArray(res);
      if (filters.voucherType !== 'all') {
        data = data.filter(tx => {
          const txType = String(tx.type || tx.transactionType || '').toLowerCase();
          const filterType = filters.voucherType.toLowerCase();
          if (filterType === 'credit') return ['credit','receipt','income'].some(t => txType.includes(t));
          if (filterType === 'debit') return ['debit','payment','expense'].some(t => txType.includes(t));
          return txType.includes(filterType);
        });
      }
      setTransactions(data);
    } catch (err) { setError(err.message || 'Failed to load vouchers'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const voucherTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'credit', label: 'Credit / Receipt' },
    { value: 'debit', label: 'Debit / Payment' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'journal', label: 'Journal' },
  ];

  const handleExportCSV = useCallback(() => {
    const headers = ['Voucher No', 'Date', 'Account', 'Type', 'Description', 'Amount (PKR)', 'Mode'];
    const rows = transactions.map(tx => [
      tx.voucherNo || tx.reference || tx.id || '-',
      formatDate(tx.date || tx.createdAt),
      tx.accountName || tx.account?.name || '-',
      tx.type || tx.transactionType || 'General',
      tx.description || tx.notes || tx.particulars || '-',
      Math.abs(tx.amount || 0),
      tx.paymentMode || tx.mode || '-',
    ]);
    exportToCSV(transactions, 'Transaction_Vouchers', headers, rows, {
      reportName: 'Transaction Voucher Report',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [transactions, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('vouchers', 'Transaction Vouchers', transactions, filters.fromDate, filters.toDate);
  }, [transactions, filters]);

  return (
    <div className="space-y-6">
      <FilterCard title="Voucher Filters" onReset={() => { setFilters({ fromDate: monthStart(), toDate: today(), voucherType: 'all', accountId: 'all', voucherNo: '', amountMin: '', amountMax: '' }); }} onApply={fetchData} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Voucher Type</label>
          <select value={filters.voucherType} onChange={(e) => setFilters(p => ({ ...p, voucherType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {voucherTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
          <select value={filters.accountId} onChange={(e) => setFilters(p => ({ ...p, accountId: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            <option value="all">All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.bankName || a.name || a.accountName || a.accountHolder || 'Unnamed'} ({a.accountNumber || a.code || a.accountCode || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Voucher No</label>
          <input type="text" placeholder="Search voucher..." value={filters.voucherNo} onChange={(e) => setFilters(p => ({ ...p, voucherNo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Amount</label>
            <input type="number" placeholder="0" value={filters.amountMin} onChange={(e) => setFilters(p => ({ ...p, amountMin: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Amount</label>
            <input type="number" placeholder="∞" value={filters.amountMax} onChange={(e) => setFilters(p => ({ ...p, amountMax: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          </div>
        </div>
      </FilterCard>

      {accountsError && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2"><AlertCircle size={18} /> {accountsError}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && (
        <>
          <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={transactions.length} title="Vouchers" />
          <DataTable
            loading={loading}
            data={transactions}
            keyExtractor={(row, i) => row.id || i}
            emptyMessage="No vouchers found"
            columns={[
              { header: 'Voucher No', accessor: 'voucherNo', cell: row => <span className="font-medium text-[#2563EB]">{row.voucherNo || row.reference || row.id || '-'}</span> },
              { header: 'Date', accessor: 'date', cell: row => formatDate(row.date || row.createdAt) },
              { header: 'Account', accessor: 'accountName', cell: row => row.accountName || row.account?.name || '-' },
              { header: 'Type', accessor: 'type', cell: row => <StatusBadge status={row.type} label={(row.type || row.transactionType || 'General').toUpperCase()} /> },
              { header: 'Description', accessor: 'description', cell: row => <span className="truncate max-w-[200px] block">{row.description || row.notes || row.particulars || '-'}</span> },
              { header: 'Amount', accessor: 'amount', cell: row => <span className="font-mono font-semibold">{formatMoney(Math.abs(row.amount || 0))}</span> },
              { header: 'Mode', accessor: 'paymentMode', cell: row => <span className="text-xs text-gray-500">{row.paymentMode || row.mode || '-'}</span> },
            ]}
          />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 7: EXPENSE CATEGORY-WISE BREAKDOWN
// ═══════════════════════════════════════════════════════════

const ExpenseBreakdownReport = () => {
  const [filters, setFilters] = useState({ fromDate: monthStart(), toDate: today(), category: 'all', groupBy: 'category' });
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await accountApi.getCustomCategories();
        const data = extractArray(res);
        setCategories(data);
        if (data.length === 0) setCategoriesError('No expense categories found.');
      } catch (err) { setCategoriesError('Failed to load categories: ' + (err.message || 'Unknown error')); }
    };
    loadCategories();
  }, []);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today() || filters.category !== 'all' || filters.groupBy !== 'category';

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { fromDate: filters.fromDate, toDate: filters.toDate };
      const res = await accountApi.getAllTransactions(params);
      let data = extractArray(res);
      data = data.filter(tx => {
        const amt = Number(tx.amount || 0);
        const typeStr = String(tx.type || tx.transactionType || '').toLowerCase();
        const catStr = String(tx.category || tx.customCategory || '').toLowerCase();
        const descStr = String(tx.description || tx.notes || '').toLowerCase();
        return amt < 0 || 
          ['debit','payment','expense','salary','rent','utility','wastage','tax'].some(t => typeStr.includes(t)) ||
          ['expense','salary','rent','utility','wastage','tax','bill','payment'].some(t => catStr.includes(t)) ||
          ['paid to','payment for','expense','bill','salary','rent'].some(t => descStr.includes(t));
      });
      if (filters.category !== 'all') {
        data = data.filter(tx => String(tx.categoryId || tx.customCategoryId || tx.category || '') === String(filters.category));
      }
      setTransactions(data);
    } catch (err) { setError(err.message || 'Failed to load expenses'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categoryOptions = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return [
      { value: 'all', label: 'All Categories' },
      ...list.map(c => ({ value: String(c?.id ?? ''), label: c?.name || c?.categoryName || 'Unnamed' }))
    ];
  }, [categories]);

  const groupByOptions = [
    { value: 'category', label: 'Category' },
    { value: 'date', label: 'Date' },
    { value: 'month', label: 'Month' },
  ];

  const groupedData = useMemo(() => {
    const map = new Map();
    transactions.forEach(tx => {
      const key = filters.groupBy === 'category' ? (tx.category || tx.customCategory || 'Uncategorized') :
                  filters.groupBy === 'date' ? (tx.date || tx.createdAt || '').split('T')[0] :
                  (tx.date || tx.createdAt || '').slice(0, 7);
      if (!map.has(key)) map.set(key, { key, amount: 0, count: 0 });
      const entry = map.get(key);
      entry.amount += Math.abs(Number(tx.amount || 0)); entry.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [transactions, filters.groupBy]);

  const totalExpense = useMemo(() => groupedData.reduce((s, d) => s + d.amount, 0), [groupedData]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Category', 'Amount (PKR)', 'Count', '% of Total'];
    const rows = groupedData.map(d => [
      d.key,
      d.amount,
      d.count,
      totalExpense > 0 ? ((d.amount / totalExpense) * 100).toFixed(2) + '%' : '0%',
    ]);
    exportToCSV(groupedData, 'Expense_Breakdown', headers, rows, {
      reportName: 'Expense Breakdown',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [groupedData, totalExpense, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('expense', 'Expense Breakdown', groupedData, filters.fromDate, filters.toDate);
  }, [groupedData, filters]);

  return (
    <div className="space-y-6">
      <FilterCard title="Expense Breakdown Filters" onReset={() => { setFilters({ fromDate: monthStart(), toDate: today(), category: 'all', groupBy: 'category' }); }} onApply={fetchData} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={filters.category} onChange={(e) => setFilters(p => ({ ...p, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Group By</label>
          <select value={filters.groupBy} onChange={(e) => setFilters(p => ({ ...p, groupBy: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {groupByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FilterCard>

      {categoriesError && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2"><AlertCircle size={18} /> {categoriesError}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard title="Total Expenses" amount={totalExpense} icon={PieChart} color="red" />
            <SummaryCard title="Categories" amount={groupedData.length} icon={Tag} color="blue" />
            <SummaryCard title="Avg per Category" amount={groupedData.length > 0 ? totalExpense / groupedData.length : 0} icon={BarChart3} color="orange" />
          </div>
          <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={groupedData.length} title="Expense Groups" />
          <DataTable
            loading={loading}
            data={groupedData}
            keyExtractor={(row, i) => row.key || i}
            emptyMessage="No expense data found"
            columns={[
              { header: filters.groupBy === 'category' ? 'Category' : filters.groupBy === 'date' ? 'Date' : 'Month', accessor: 'key', cell: row => <span className="font-medium">{row.key}</span> },
              { header: 'Amount', accessor: 'amount', cell: row => <span className="text-red-600 font-mono font-semibold">{formatMoney(row.amount)}</span> },
              { header: 'Count', accessor: 'count', cell: row => <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{row.count} txns</span> },
              { header: '% of Total', accessor: 'percentage', cell: row => (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${totalExpense > 0 ? (row.amount / totalExpense) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{totalExpense > 0 ? ((row.amount / totalExpense) * 100).toFixed(1) : 0}%</span>
                </div>
              )},
            ]}
          />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// REPORT 8: ACCOUNT-TO-ACCOUNT TRANSFER REPORT
// ═══════════════════════════════════════════════════════════

const TransferReport = () => {
  const [filters, setFilters] = useState({
    fromDate: monthStart(), toDate: today(), fromAccountId: 'all', toAccountId: 'all', status: 'all',
  });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');
  const [showAllMode, setShowAllMode] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      try { 
        const res = await accountApi.getAll(); 
        const data = extractArray(res);
        setAccounts(data);
        if (data.length === 0) setAccountsError('No accounts found.');
      }
      catch (err) { setAccountsError('Failed to load accounts: ' + (err.message || 'Unknown error')); }
    };
    loadAccounts();
  }, []);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today() || 
                     filters.fromAccountId !== 'all' || filters.toAccountId !== 'all' || filters.status !== 'all';

  const fetchData = useCallback(async () => {
    setLoading(true); setError(''); setShowAllMode(false);
    try {
      const params = { fromDate: filters.fromDate, toDate: filters.toDate };
      const res = await accountApi.getAllTransactions(params);
      const raw = extractArray(res);

      let data = raw.filter(tx => {
        const t = tx || {};
        const hasExplicitTransfer = (t.fromAccountId && t.toAccountId) || (t.fromAccount && t.toAccount) || (t.sourceAccountId && t.destinationAccountId);
        const typeStr = String(t.type || t.transactionType || '').toLowerCase();
        const isTransferType = ['transfer','contra','journal','inter-account','account_transfer'].some(k => typeStr.includes(k));
        const descStr = String(t.description || t.notes || t.particulars || t.reference || '').toLowerCase();
        const isTransferDesc = ['transfer','transferred','moved to','from account','to account','inter-bank','bank transfer'].some(k => descStr.includes(k));
        const hasTarget = t.targetAccountId || t.relatedAccountId || t.secondAccountId || t.toAccountId;
        const hasSource = t.accountId || t.fromAccountId;
        return hasExplicitTransfer || isTransferType || isTransferDesc || (hasTarget && hasSource);
      });

      if (data.length === 0 && raw.length > 0) { data = raw; setShowAllMode(true); }
      if (filters.fromAccountId !== 'all') {
        data = data.filter(tx => String(tx.fromAccountId || tx.accountId || tx.sourceAccountId || '') === String(filters.fromAccountId));
      }
      if (filters.toAccountId !== 'all') {
        data = data.filter(tx => String(tx.toAccountId || tx.targetAccountId || tx.destinationAccountId || tx.relatedAccountId || '') === String(filters.toAccountId));
      }
      if (filters.status !== 'all') {
        data = data.filter(tx => (tx.status || 'completed').toLowerCase() === filters.status.toLowerCase());
      }
      setTransactions(data);
    } catch (err) { setError(err.message || 'Failed to load transfers'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ];

  const totalTransferred = useMemo(() => transactions.reduce((s, tx) => s + Math.abs(Number(tx.amount || 0)), 0), [transactions]);

  const getAccountName = (id) => {
    if (!id) return '-';
    const acc = accounts.find(a => String(a.id) === String(id));
    return acc?.name || acc?.accountName || `Account #${id}`;
  };

  const handleExportCSV = useCallback(() => {
    const headers = ['Date', 'Reference', 'From Account', 'To Account', 'Amount (PKR)', 'Description', 'Status'];
    const rows = transactions.map(tx => [
      formatDate(tx.date || tx.createdAt),
      tx.reference || tx.voucherNo || tx.id || '-',
      tx.fromAccountName || tx.fromAccount?.name || getAccountName(tx.fromAccountId || tx.accountId || tx.sourceAccountId),
      tx.toAccountName || tx.toAccount?.name || getAccountName(tx.toAccountId || tx.targetAccountId || tx.destinationAccountId || tx.relatedAccountId),
      Math.abs(tx.amount || 0),
      tx.description || tx.notes || '-',
      tx.status || 'Completed',
    ]);
    exportToCSV(transactions, 'Account_Transfers', headers, rows, {
      reportName: 'Account-to-Account Transfers',
      period: `${filters.fromDate} to ${filters.toDate}`,
    });
  }, [transactions, accounts, filters]);

  const handleExportPDF = useCallback(() => {
    generatePDF('transfers', 'Account Transfers', transactions, filters.fromDate, filters.toDate);
  }, [transactions, filters]);

  return (
    <div className="space-y-6">
      <FilterCard title="Transfer Filters" onReset={() => { setFilters({ fromDate: monthStart(), toDate: today(), fromAccountId: 'all', toAccountId: 'all', status: 'all' }); setShowAllMode(false); }} onApply={fetchData} loading={loading} hasFilters={hasFilters}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Account</label>
          <select value={filters.fromAccountId} onChange={(e) => setFilters(p => ({ ...p, fromAccountId: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            <option value="all">All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.bankName || a.name || a.accountName || a.accountHolder || 'Unnamed'} ({a.accountNumber || a.code || a.accountCode || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Account</label>
          <select value={filters.toAccountId} onChange={(e) => setFilters(p => ({ ...p, toAccountId: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            <option value="all">All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.bankName || a.name || a.accountName || a.accountHolder || 'Unnamed'} ({a.accountNumber || a.code || a.accountCode || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FilterCard>

      {accountsError && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2"><AlertCircle size={18} /> {accountsError}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {showAllMode && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <div>
            <p className="font-medium">No transfer-specific records detected</p>
            <p className="text-xs opacity-80">Showing all transactions instead. Your system may record transfers as separate debit/credit entries.</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard title="Total Amount" amount={totalTransferred} icon={ArrowRightLeft} color="blue" highlight />
            <SummaryCard title="Record Count" amount={transactions.length} icon={FileText} color="gray" />
          </div>

          {transactions.length > 0 ? (
            <>
              <ExportToolbar onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} onPrint={triggerPrint} dataCount={transactions.length} title="Transfers" />
              <DataTable
                loading={loading}
                data={transactions}
                keyExtractor={(row, i) => row.id || i}
                emptyMessage="No transfers found"
                columns={[
                  { header: 'Date', accessor: 'date', cell: row => formatDate(row.date || row.createdAt) },
                  { header: 'Reference', accessor: 'reference', cell: row => <span className="font-medium">{row.reference || row.voucherNo || row.id || '-'}</span> },
                  { header: 'From Account', accessor: 'fromAccount', cell: row => row.fromAccountName || row.fromAccount?.name || getAccountName(row.fromAccountId || row.accountId || row.sourceAccountId) },
                  { header: 'To Account', accessor: 'toAccount', cell: row => row.toAccountName || row.toAccount?.name || getAccountName(row.toAccountId || row.targetAccountId || row.destinationAccountId || row.relatedAccountId) },
                  { header: 'Amount', accessor: 'amount', cell: row => <span className="font-mono font-semibold text-blue-600">{formatMoney(Math.abs(row.amount || 0))}</span> },
                  { header: 'Description', accessor: 'description', cell: row => <span className="truncate max-w-[200px] block">{row.description || row.notes || '-'}</span> },
                  { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={(row.status || 'Completed').toUpperCase()} /> },
                ]}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <FileText size={48} className="mb-2 opacity-30" />
              <p>No transactions found for selected filters</p>
              <p className="text-xs mt-1">Try adjusting the date range or account filters</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN: FINANCIAL REPORTS MODULE
// ═══════════════════════════════════════════════════════════

const TABS = [
  { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
  { id: 'balance', label: 'Balance Sheet', icon: Scale },
  { id: 'ledger', label: 'Account Ledger', icon: BookOpen },
  { id: 'cashflow', label: 'Cash Flow', icon: Wallet },
  { id: 'bank-recon', label: 'Bank Reconciliation', icon: Building2 },
  { id: 'vouchers', label: 'Vouchers', icon: FileText },
  { id: 'expense', label: 'Expense Breakdown', icon: PieChart },
  { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
];

const FinancialReports = () => {
  const [activeTab, setActiveTab] = useState('pnl');

  const renderReport = () => {
    switch (activeTab) {
      case 'pnl': return <ProfitLossReport />;
      case 'balance': return <BalanceSheetReport />;
      case 'ledger': return <AccountLedgerReport />;
      case 'cashflow': return <CashFlowReport />;
      case 'bank-recon': return <BankReconciliationReport />;
      case 'vouchers': return <VoucherReport />;
      case 'expense': return <ExpenseBreakdownReport />;
      case 'transfers': return <TransferReport />;
      default: return <ProfitLossReport />;
    }
  };

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Report';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FINANCIAL REPORTS</h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive accounting & financial overview</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>Reporting Period: {new Date().toLocaleDateString('en-PK')}</span>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FINANCIAL REPORTS</h1>
        <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleDateString('en-PK')}</p>
        <p className="text-sm text-gray-500">Report: {activeTabLabel}</p>
        <hr className="my-4 border-gray-300" />
      </div>

      {/* Unified Pill-Style Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6 overflow-x-auto print:hidden">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-200 max-w-7xl mx-auto">
        {renderReport()}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400 print:hidden">
        <p>Marquee ERP Management System — Financial Reports Module</p>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500 text-center">
        <p>Marquee ERP Management System | {activeTabLabel} | Page 1</p>
        <p>Generated: {new Date().toLocaleString('en-PK')}</p>
      </div>
    </div>
  );
};

export default FinancialReports;