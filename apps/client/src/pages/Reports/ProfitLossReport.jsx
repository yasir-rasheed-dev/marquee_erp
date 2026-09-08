// components/reports/ProfitLossReport.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  AlertCircle, FileText, Download, Printer, Loader2,
  Calendar, Building2, Wallet, ArrowUpRight, ArrowDownRight,
  Receipt, Users, HelpCircle
} from 'lucide-react';
import reportApi from '../../services/reportApi';
import { useBranch } from '../../context/BranchContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════
// THEME TOKENS
// ═══════════════════════════════════════════════════════════
const THEME = {
  primary: '#2563EB',
  primaryDark: '#2563EB',
  primaryRgb: [169, 122, 31],
  primaryLight: 'rgba(200, 155, 60, 0.1)',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  gray: '#6B7280',
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const formatMoney = (amount) => {
  if (amount == null || isNaN(amount)) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatMoneyRaw = (amount) => {
  if (amount == null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const today = () => new Date().toISOString().split('T')[0];

const extractObject = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (res.success && res.data) return res.data;
  return res || {};
};

// ═══════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════
const SummaryCard = ({ title, amount, subtitle, icon: Icon, color = 'gray', highlight }) => {
  const colors = {
    green: 'bg-emerald-50/50 border-emerald-200 text-emerald-700',
    red: 'bg-rose-50/50 border-rose-200 text-rose-700',
    blue: 'bg-blue-50/50 border-blue-200 text-blue-700',
    orange: 'bg-amber-50/50 border-amber-200 text-amber-700',
    gray: 'bg-gray-50/50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color] || colors.gray} ${highlight ? 'ring-2 ring-[#2563EB] ring-offset-2' : ''} bg-white shadow-xs transition-all hover:shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-mono font-bold text-gray-900 mt-1">{formatMoney(amount)}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 bg-[#2563EB]/10 rounded-xl">
            <Icon size={20} className="text-[#2563EB]" />
          </div>
        )}
      </div>
    </div>
  );
};

const SectionCard = ({ title, subtitle, children, color, className = '', badge }) => {
  const colors = {
    green: 'border-emerald-200',
    orange: 'border-amber-200',
    red: 'border-rose-200',
    blue: 'border-blue-200',
    gray: 'border-gray-200'
  };
  return (
    <div className={`bg-white rounded-2xl border ${colors[color] || colors.gray} p-5 shadow-xs ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
};

const LineItem = ({ label, amount, count, negative, hint }) => (
  <div className="flex justify-between items-center py-1.5 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-gray-700 text-sm font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
            {count}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </div>
    <span className={`font-mono font-semibold text-sm ${negative ? 'text-rose-600' : 'text-gray-900'}`}>
      {negative ? '- ' : ''}{formatMoney(Math.abs(amount || 0))}
    </span>
  </div>
);

const TotalLine = ({ label, amount, color = 'gray' }) => (
  <div className="flex justify-between items-center pt-2.5 border-t-2 border-gray-200 font-bold text-gray-900 px-2">
    <span className="text-sm uppercase tracking-wide">{label}</span>
    <span className="font-mono text-base">{formatMoney(amount || 0)}</span>
  </div>
);

const Divider = () => <div className="border-t border-gray-100 my-1" />;

// ═══════════════════════════════════════════════════════════
// PDF GENERATION (PROFESSIONAL & MATHEMATICALLY ACCURATE)
// ═══════════════════════════════════════════════════════════
const generatePDF = (report, dateFrom, dateTo, branchName) => {
  if (!report) {
    alert('No data to export');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = THEME.primaryRgb;

  // Header Banner
  doc.setFillColor(250, 248, 244);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setDrawColor(224, 216, 204);
  doc.setLineWidth(0.5);
  doc.line(0, 30, pageWidth, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('MARQUEE MANAGEMENT SYSTEM', 14, 13);
  doc.setFontSize(9);
  doc.setTextColor(110, 100, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Profit & Loss Statement  |  ${branchName || 'All Branches'}`, 14, 20);

  const now = new Date().toLocaleString('en-PK');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${now}`, pageWidth - 14, 13, { align: 'right' });
  if (dateFrom && dateTo) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth - 14, 20, { align: 'right' });
  }

  let yPos = 38;

  // 1. Executive Summary Table
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('1. FINANCIAL EXECUTIVE SUMMARY', 14, yPos);
  yPos += 5;

  const netProfit = report.summary?.netProfit ?? 0;
  const isProfit = netProfit >= 0;

  const summaryData = [
    ['Total Operating Revenue', formatMoneyRaw(report.summary?.totalRevenue), 'Total Cost of Goods Sold (COGS)', formatMoneyRaw(report.summary?.totalCOGS)],
    ['Gross Profit', formatMoneyRaw(report.summary?.grossProfit), 'Total Operating Expenses', formatMoneyRaw(report.summary?.totalExpenses)],
    ['Gross Profit Margin', `${report.summary?.grossMargin || 0}%`, 'NET PROFIT / (LOSS)', `${isProfit ? '' : '-'}${formatMoneyRaw(Math.abs(netProfit))}`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 246, 242], cellWidth: 55 },
      1: { halign: 'right', cellWidth: 40 },
      2: { fontStyle: 'bold', fillColor: [248, 246, 242], cellWidth: 55 },
      3: {
        halign: 'right',
        cellWidth: 40,
        fillColor: isProfit ? [232, 245, 233] : [255, 235, 238],
        fontStyle: 'bold',
        textColor: isProfit ? [27, 94, 32] : [183, 28, 28]
      },
    },
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // 2. Revenue Breakdown
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('2. OPERATING REVENUE BREAKDOWN', 14, yPos);
  yPos += 5;

  const revenueBody = [
    ['Realized Booking Revenue', `${report.revenue?.bookings?.count || 0} active bookings`, formatMoneyRaw(report.revenue?.bookings?.amount)],
    ['Other Operating Income', `${report.revenue?.otherIncome?.count || 0} deposits/credits`, formatMoneyRaw(report.revenue?.otherIncome?.amount)],
    ['TOTAL REVENUE', '', formatMoneyRaw(report.revenue?.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Revenue Component', 'Records', 'Amount (PKR)']],
    body: revenueBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 45, halign: 'center' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === revenueBody.length - 1) {
        data.cell.styles.fillColor = [245, 242, 235];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // 3. COGS Section
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('3. COST OF GOODS SOLD (COGS)', 14, yPos);
  yPos += 5;

  const cogsBasis = report.cogs?.calculationBasis === 'DIRECT_CONSUMPTION'
    ? 'Direct Event Materials Consumed'
    : 'Raw Material Purchases (Net of Returns)';

  const cogsBody = [
    [cogsBasis, `${report.cogs?.directConsumption?.count || report.cogs?.netPurchases?.billsCount || 0} records`, formatMoneyRaw(report.cogs?.materialCostUsed)],
    ['Direct Event Staff Wages', `${report.cogs?.directLabor?.count || 0} staff assignments`, formatMoneyRaw(report.cogs?.directLabor?.amount)],
    ['TOTAL COGS', '', formatMoneyRaw(report.cogs?.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Direct Cost Item', 'Reference', 'Amount (PKR)']],
    body: cogsBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: [180, 130, 40], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 45, halign: 'center' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === cogsBody.length - 1) {
        data.cell.styles.fillColor = [245, 242, 235];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Check if we need a page break before operating expenses
  if (yPos + 80 > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }

  // 4. Operating Expenses
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('4. OPERATING & ADMINISTRATIVE EXPENSES', 14, yPos);
  yPos += 5;

  const expCats = report.expenses?.operatingVouchers?.byCategory || {};
  const expenseBody = [
    ['Salaries & Payroll Wages', `${report.expenses?.salaries?.count || 0} payroll entries`, formatMoneyRaw(report.expenses?.salaries?.amount)],
    ['Rent', 'Facility lease', formatMoneyRaw(expCats.rent || 0)],
    ['Utilities (Electricity, Gas, Water)', 'Utility bills', formatMoneyRaw(expCats.utilities || 0)],
    ['Repairs & Maintenance', 'Premises maintenance', formatMoneyRaw(expCats.maintenance || 0)],
    ['Cleaning & Supplies', 'Janitorial & housekeeping', formatMoneyRaw(expCats.cleaning || 0)],
    ['Taxes & Legal', 'Official taxes / fees', formatMoneyRaw(expCats.taxes || 0)],
    ['Marketing & Advertising', 'Promotions', formatMoneyRaw(expCats.marketing || 0)],
    ['Other Administrative Vouchers', `${report.expenses?.operatingVouchers?.count || 0} vouchers`, formatMoneyRaw(expCats.other || 0)],
    ['Wastage & Spoilage Loss', `${report.expenses?.wastage?.count || 0} log items`, formatMoneyRaw(report.expenses?.wastage?.amount)],
    ['TOTAL OPERATING EXPENSES', '', formatMoneyRaw(report.expenses?.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Expense Category', 'Notes', 'Amount (PKR)']],
    body: expenseBody,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [180, 80, 70], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 45, halign: 'center' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === expenseBody.length - 1) {
        data.cell.styles.fillColor = [245, 242, 235];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Check page overflow for bottom calculation card
  if (yPos + 55 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  }

  // 5. Final Accounting Box
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(14, yPos, pageWidth - 28, 48, 3, 3, 'F');

  doc.setFontSize(9.5);
  doc.setTextColor(230, 230, 230);
  doc.setFont('helvetica', 'normal');
  doc.text('Operating Revenue', 20, yPos + 10);
  doc.text(formatMoneyRaw(report.revenue?.total), pageWidth - 20, yPos + 10, { align: 'right' });

  doc.setTextColor(248, 113, 113);
  doc.text('Less: Cost of Goods Sold (COGS)', 20, yPos + 18);
  doc.text(`- ${formatMoneyRaw(report.cogs?.total)}`, pageWidth - 20, yPos + 18, { align: 'right' });

  doc.setTextColor(96, 165, 250);
  doc.setFont('helvetica', 'bold');
  doc.text(`Gross Profit (${report.summary?.grossMargin || 0}%)`, 20, yPos + 26);
  doc.text(formatMoneyRaw(report.summary?.grossProfit), pageWidth - 20, yPos + 26, { align: 'right' });

  doc.setTextColor(248, 113, 113);
  doc.setFont('helvetica', 'normal');
  doc.text('Less: Operating Expenses', 20, yPos + 34);
  doc.text(`- ${formatMoneyRaw(report.expenses?.total)}`, pageWidth - 20, yPos + 34, { align: 'right' });

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(20, yPos + 38, pageWidth - 20, yPos + 38);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isProfit ? [74, 222, 128] : [248, 113, 113]);
  doc.text(`NET PROFIT / LOSS  (${report.summary?.profitMargin || 0}%)`, 20, yPos + 44);
  doc.text(`${isProfit ? '' : '-'}${formatMoneyRaw(Math.abs(netProfit))}`, pageWidth - 20, yPos + 44, { align: 'right' });

  // Footers for all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(`Marquee ERP Management System — Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  doc.save(`Profit_Loss_Report_${dateFrom}_to_${dateTo}.pdf`);
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const ProfitLossReport = () => {
  const { branches, currentBranch } = useBranch();

  const [filters, setFilters] = useState({
    fromDate: monthStart(),
    toDate: today(),
    branchId: currentBranch?.id ? String(currentBranch.id) : '',
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep branch in sync if currentBranch changes initially
  useEffect(() => {
    if (currentBranch?.id && !filters.branchId) {
      setFilters(prev => ({ ...prev, branchId: String(currentBranch.id) }));
    }
  }, [currentBranch]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reportApi.getProfitLoss({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        branchId: filters.branchId || undefined,
      });
      const data = extractObject(res);
      if (data.success === false) throw new Error(data.error || 'Failed to load report');
      setReport(data.data || data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to generate 100% accurate P&L report');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today() || filters.branchId !== (currentBranch?.id ? String(currentBranch.id) : '');

  const isProfit = (report?.summary?.netProfit ?? 0) >= 0;

  // Selected Branch Name
  const selectedBranchName = useMemo(() => {
    if (!filters.branchId) return 'All Branches';
    const found = branches.find(b => String(b.id) === String(filters.branchId));
    return found ? found.name : `Branch #${filters.branchId}`;
  }, [filters.branchId, branches]);

  // ── CSV Export ──
  const csvData = useMemo(() => {
    if (!report) return [];
    const rows = [];
    rows.push({ Category: 'REVENUE', Item: 'Realized Booking Revenue', Amount: report.revenue?.bookings?.amount || 0 });
    rows.push({ Category: 'REVENUE', Item: 'Other Operating Income', Amount: report.revenue?.otherIncome?.amount || 0 });
    rows.push({ Category: 'REVENUE', Item: 'TOTAL REVENUE', Amount: report.revenue?.total || 0 });

    rows.push({ Category: 'COGS', Item: 'Direct Material Used', Amount: report.cogs?.materialCostUsed || 0 });
    rows.push({ Category: 'COGS', Item: 'Direct Staff Wages', Amount: report.cogs?.directLabor?.amount || 0 });
    rows.push({ Category: 'COGS', Item: 'TOTAL COGS', Amount: report.cogs?.total || 0 });

    rows.push({ Category: 'GROSS_PROFIT', Item: 'GROSS PROFIT', Amount: report.summary?.grossProfit || 0 });

    const cats = report.expenses?.operatingVouchers?.byCategory || {};
    rows.push({ Category: 'EXPENSES', Item: 'Salaries & Wages', Amount: report.expenses?.salaries?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Rent', Amount: cats.rent || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Utilities', Amount: cats.utilities || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Repairs & Maintenance', Amount: cats.maintenance || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Cleaning & Supplies', Amount: cats.cleaning || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Taxes & Legal', Amount: cats.taxes || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Marketing', Amount: cats.marketing || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Other Administrative Vouchers', Amount: cats.other || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'Wastage & Spoilage Loss', Amount: report.expenses?.wastage?.amount || 0 });
    rows.push({ Category: 'EXPENSES', Item: 'TOTAL OPERATING EXPENSES', Amount: report.expenses?.total || 0 });

    rows.push({ Category: 'NET_PROFIT', Item: 'NET PROFIT / LOSS', Amount: report.summary?.netProfit || 0 });
    return rows;
  }, [report]);

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    const headers = ['Category', 'Line Item', 'Amount (PKR)'];
    const rows = csvData.map(r => [r.Category, `"${r.Item}"`, r.Amount]);
    const csvContent = [
      ['"Marquee ERP Management System — Profit & Loss Statement"'],
      [`"Branch: ${selectedBranchName}"`],
      [`"Period: ${filters.fromDate} to ${filters.toDate}"`],
      [`"Generated: ${new Date().toLocaleString('en-PK')}"`],
      [],
      headers,
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Profit_Loss_${selectedBranchName.replace(/\s+/g, '_')}_${filters.fromDate}_to_${filters.toDate}.csv`;
    link.click();
  }, [csvData, filters, report, selectedBranchName]);

  const handleExportPDF = useCallback(() => {
    generatePDF(report, filters.fromDate, filters.toDate, selectedBranchName);
  }, [report, filters, selectedBranchName]);

  const triggerPrint = () => {
    setTimeout(() => window.print(), 200);
  };

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#2563EB]" />
        <span className="text-gray-700 font-semibold text-base">Calculating 100% Accurate P&L Metrics...</span>
        <span className="text-gray-400 text-xs">Cross-verifying bookings, COGS, payroll & vouchers</span>
      </div>
    );
  }

  const expCats = report?.expenses?.operatingVouchers?.byCategory || {};

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-300 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-[#2563EB]" size={22} />
              Profit & Loss Statement (P&L)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Accurate accounting engine with zero double-counting across purchases, stock, and vouchers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={() => setFilters({ fromDate: monthStart(), toDate: today(), branchId: '' })}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-[#2563EB] text-white rounded-xl hover:bg-[#2563EB] transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Apply Filters'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Branch</label>
            <div className="relative">
              <select
                value={filters.branchId}
                onChange={(e) => setFilters(p => ({ ...p, branchId: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] appearance-none"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <Building2 size={16} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <>
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Active Scope:</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {selectedBranchName}
              </span>
              <span className="text-xs text-gray-400">
                ({filters.fromDate} to {filters.toDate})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition shadow-xs"
              >
                <FileText size={14} /> Download PDF
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-xs"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#2563EB] rounded-xl hover:bg-[#2563EB] transition shadow-xs"
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          {/* Primary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Revenue"
              amount={report.summary?.totalRevenue}
              subtitle={`${report.summary?.activeBookingsCount || 0} active bookings`}
              icon={DollarSign}
              color="green"
            />
            <SummaryCard
              title="Total COGS"
              amount={report.summary?.totalCOGS}
              subtitle={report.cogs?.calculationBasis === 'DIRECT_CONSUMPTION' ? 'Direct Consumption' : 'Net Purchases'}
              icon={ShoppingCart}
              color="orange"
            />
            <SummaryCard
              title="Gross Profit"
              amount={report.summary?.grossProfit}
              subtitle={`Margin: ${report.summary?.grossMargin || 0}%`}
              icon={TrendingUp}
              color="blue"
            />
            <SummaryCard
              title="Net Profit / (Loss)"
              amount={report.summary?.netProfit}
              subtitle={`Net Margin: ${report.summary?.profitMargin || 0}%`}
              icon={isProfit ? TrendingUp : TrendingDown}
              color={isProfit ? 'green' : 'red'}
              highlight
            />
          </div>

          {/* Margin Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isProfit ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isProfit ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
              </div>
              <div>
                <p className={`font-bold text-sm ${isProfit ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {isProfit ? 'Net Operating Profit Realized' : 'Net Operating Loss Incurred'}
                </p>
                <p className="text-xs text-gray-500">
                  Gross Profit ({formatMoney(report.summary?.grossProfit)}) minus Total Operating Expenses ({formatMoney(report.summary?.totalExpenses)})
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase font-bold text-gray-400 block">Net Margin</span>
              <span className={`text-2xl font-mono font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {report.summary?.profitMargin || 0}%
              </span>
            </div>
          </div>

          {/* Financial Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Revenue Section */}
            <SectionCard
              title="1. Revenue"
              subtitle="Realized event billings and miscellaneous income"
              color="green"
              badge={`${report.revenue?.bookings?.count || 0} Events`}
            >
              <LineItem
                label="Realized Booking Revenue"
                amount={report.revenue?.bookings?.amount}
                count={report.revenue?.bookings?.count}
                hint="Total invoice value of active events in period"
              />
              <div className="ml-4 pl-3 border-l-2 border-emerald-100 text-xs text-gray-500 space-y-1 py-1">
                <div className="flex justify-between">
                  <span>Advance / Cash Collected on Bookings:</span>
                  <span className="font-mono text-emerald-700 font-medium">{formatMoney(report.revenue?.bookings?.advanceCollected)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Receivables Remaining:</span>
                  <span className="font-mono text-amber-700 font-medium">{formatMoney(report.revenue?.bookings?.dueReceivable)}</span>
                </div>
              </div>
              <LineItem
                label="Other Operating Income"
                amount={report.revenue?.otherIncome?.amount}
                count={report.revenue?.otherIncome?.count}
                hint="Credits & deposits not linked to events"
              />
              <Divider />
              <TotalLine label="Total Revenue" amount={report.revenue?.total} />
            </SectionCard>

            {/* 2. COGS Section */}
            <SectionCard
              title="2. Cost of Goods Sold (COGS)"
              subtitle="Direct raw material and event production costs"
              color="orange"
              badge={report.cogs?.calculationBasis === 'DIRECT_CONSUMPTION' ? 'Direct Stock Consumption' : 'Net Purchases'}
            >
              {report.cogs?.calculationBasis === 'DIRECT_CONSUMPTION' ? (
                <LineItem
                  label="Direct Event Raw Material Consumed"
                  amount={report.cogs?.directConsumption?.amount}
                  count={report.cogs?.directConsumption?.count}
                  hint="Tracked kitchen/store consumption for functions"
                />
              ) : (
                <>
                  <LineItem
                    label="Raw Material Purchases"
                    amount={report.cogs?.netPurchases?.grossPurchases}
                    count={report.cogs?.netPurchases?.billsCount}
                    hint="Gross supplier bills issued during period"
                  />
                  {Number(report.cogs?.netPurchases?.returns || 0) > 0 && (
                    <LineItem
                      label="Less: Purchase Returns"
                      amount={report.cogs?.netPurchases?.returns}
                      negative
                      hint="Goods returned to suppliers"
                    />
                  )}
                </>
              )}

              <LineItem
                label="Event Direct Staff Wages"
                amount={report.cogs?.directLabor?.amount}
                count={report.cogs?.directLabor?.count}
                hint="Waiters, cooks & temporary event labor"
              />

              <Divider />
              <TotalLine label="Total Cost of Goods Sold (COGS)" amount={report.cogs?.total} />
            </SectionCard>

            {/* 3. Operating Expenses Section */}
            <SectionCard
              title="3. Operating & Administrative Expenses"
              subtitle="Fixed overheads, recurring payroll, and venue maintenance"
              color="red"
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <LineItem
                  label="Salaries & Fixed Payroll"
                  amount={report.expenses?.salaries?.amount}
                  count={report.expenses?.salaries?.count}
                  hint="Permanent staff salaries processed"
                />
                <LineItem
                  label="Rent Expense"
                  amount={expCats.rent || 0}
                  hint="Hall / premises lease vouchers"
                />
                <LineItem
                  label="Utilities (Electricity, Gas, Water)"
                  amount={expCats.utilities || 0}
                  hint="Commercial utility bills paid"
                />
                <LineItem
                  label="Repairs & Maintenance"
                  amount={expCats.maintenance || 0}
                  hint="HVAC, plumbing, electrical & decor repairs"
                />
                <LineItem
                  label="Cleaning & Housekeeping"
                  amount={expCats.cleaning || 0}
                  hint="Janitorial supplies & hygiene contracts"
                />
                <LineItem
                  label="Taxes & Official Fees"
                  amount={expCats.taxes || 0}
                  hint="PNT / GST / local municipal charges"
                />
                <LineItem
                  label="Marketing & Advertising"
                  amount={expCats.marketing || 0}
                  hint="Social media ads, banners & promotions"
                />
                <LineItem
                  label="Wastage & Spoilage Loss"
                  amount={report.expenses?.wastage?.amount}
                  count={report.expenses?.wastage?.count}
                  hint="Discarded or broken inventory write-offs"
                />
                <LineItem
                  label="Other Administrative Vouchers"
                  amount={expCats.other || 0}
                  count={report.expenses?.operatingVouchers?.count}
                  hint="General office and petty cash expenditures"
                />
              </div>

              <Divider />
              <TotalLine label="Total Operating Expenses" amount={report.expenses?.total} />
            </SectionCard>
          </div>

          {/* 4. Cash Flow vs P&L Inflow/Outflow Quick View */}
          {report.cashFlow && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="text-gray-600" size={18} />
                  <h4 className="text-sm font-bold text-gray-800">Cash Flow Synchronization</h4>
                </div>
                <span className="text-xs text-gray-400">Actual liquid movements in bank & cash accounts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Cash Collected</span>
                  <span className="text-base font-mono font-bold text-emerald-900">{formatMoney(report.cashFlow?.inflows)}</span>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">Booking receipts + deposits</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                  <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Cash Disbursed</span>
                  <span className="text-base font-mono font-bold text-rose-900">{formatMoney(report.cashFlow?.outflows)}</span>
                  <span className="text-[11px] text-rose-700 block mt-0.5">Supplier checks + salaries + vouchers</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <span className="text-[10px] font-bold uppercase text-blue-800 block">Net Period Cash Movement</span>
                  <span className="text-base font-mono font-bold text-blue-900">{formatMoney(report.cashFlow?.net)}</span>
                  <span className="text-[11px] text-blue-700 block mt-0.5">Inflows minus Outflows</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Bottom Line Financial Summary Box */}
          <div className="bg-gray-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
            <div className="flex justify-between items-center text-sm sm:text-base text-gray-300">
              <span className="font-medium">Total Operating Revenue</span>
              <span className="font-mono font-bold text-white text-base sm:text-lg">{formatMoney(report.revenue?.total)}</span>
            </div>

            <div className="flex justify-between items-center text-sm sm:text-base text-rose-400">
              <span className="font-medium">Less: Cost of Goods Sold (COGS)</span>
              <span className="font-mono font-bold text-base sm:text-lg">- {formatMoney(report.cogs?.total)}</span>
            </div>

            <div className="flex justify-between items-center text-base sm:text-lg font-bold text-blue-400 border-t border-gray-800 pt-3">
              <span>Gross Profit (GP)</span>
              <div className="text-right">
                <span className="font-mono text-lg sm:text-xl">{formatMoney(report.summary?.grossProfit)}</span>
                <span className="text-xs text-blue-300 block font-normal">Margin: {report.summary?.grossMargin || 0}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm sm:text-base text-rose-400">
              <span className="font-medium">Less: Total Operating Expenses</span>
              <span className="font-mono font-bold text-base sm:text-lg">- {formatMoney(report.expenses?.total)}</span>
            </div>

            <div className={`flex justify-between items-center text-xl sm:text-2xl font-bold border-t border-gray-800 pt-4 ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <div>
                <span>NET PROFIT / (LOSS)</span>
                <span className="text-xs font-normal text-gray-400 block mt-0.5">
                  Bottom Line Net Operating Income (NOI)
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl sm:text-3xl">
                  {formatMoney(report.summary?.netProfit)}
                </span>
                <span className="text-xs font-medium block mt-0.5">
                  Net Margin: {report.summary?.profitMargin || 0}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitLossReport;
