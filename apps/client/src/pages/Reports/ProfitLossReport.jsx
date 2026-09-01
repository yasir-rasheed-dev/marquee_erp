// components/reports/ProfitLossReport.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  AlertCircle, FileText, Download, Printer, Loader2,
  Calendar, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import reportApi from '../../services/reportApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════
// THEME TOKENS
// ═══════════════════════════════════════════════════════════
const THEME = {
  primary: '#C89B3C',
  primaryDark: '#A97A1F',
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
  if (amount == null || isNaN(amount)) return 'PKR 0.00';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatMoneyRaw = (amount) => {
  if (amount == null || isNaN(amount)) return '0.00';
  return Number(amount).toFixed(2);
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
const SummaryCard = ({ title, amount, icon: Icon, color = 'gray', highlight }) => {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color] || colors.gray} ${highlight ? 'ring-2 ring-[#C89B3C] ring-offset-2' : ''} bg-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatMoney(amount)}</p>
        </div>
        {Icon && (
          <div className="p-2 bg-[#C89B3C]/10 rounded-lg">
            <Icon size={20} className="text-[#C89B3C]" />
          </div>
        )}
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

const FilterCard = ({ children, title, onReset, onApply, loading, hasFilters }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-700">
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors px-2 py-1"
          >
            Clear
          </button>
        )}
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-1"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-[#C89B3C] text-white rounded-lg hover:bg-[#A97A1F] transition flex items-center gap-1 disabled:opacity-50 shadow-sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
        </button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

const ExportToolbar = ({ onExportPDF, onExportCSV, onPrint, dataCount, title }) => (
  <div className="flex items-center justify-between mb-4">
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
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#C89B3C] transition-all"
      >
        <Download size={16} /> CSV
      </button>
      <button
        onClick={onPrint}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#C89B3C] rounded-lg hover:bg-[#A97A1F] transition-colors shadow-sm"
      >
        <Printer size={16} /> Print
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// PDF GENERATION (Only P&L)
// ═══════════════════════════════════════════════════════════
const generatePDF = (report, dateFrom, dateTo) => {
  if (!report) {
    alert('No data to export');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = THEME.primaryRgb;

  // Header
  doc.setFillColor(245, 242, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('UniSoft Enterprise ERP', 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Profit & Loss Statement', 14, 21);

  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  doc.text('PROFIT & LOSS STATEMENT', pageWidth / 2, 12, { align: 'center' });

  const now = new Date().toLocaleString('en-GB');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${now}`, pageWidth - 14, 12, { align: 'right' });
  if (dateFrom && dateTo) {
    doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth - 14, 18, { align: 'right' });
  }

  let yPos = 36;

  // Summary Cards
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', 14, yPos);
  yPos += 8;

  const summaryData = [
    ['Total Revenue', formatMoneyRaw(report.summary?.totalRevenue), 'Total COGS', formatMoneyRaw(report.summary?.totalCOGS)],
    ['Gross Profit', formatMoneyRaw(report.summary?.grossProfit), 'Net Profit / Loss', formatMoneyRaw(report.summary?.netProfit)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
      font: 'helvetica',
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 242, 235] },
      1: { halign: 'right', fillColor: [232, 245, 233] },
      2: { fontStyle: 'bold', fillColor: [245, 242, 235] },
      3: { halign: 'right', fillColor: report.summary?.netProfit >= 0 ? [232, 245, 233] : [255, 235, 238] },
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
    },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Revenue Section
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('REVENUE BREAKDOWN', 14, yPos);
  yPos += 6;

  const revenueBody = [
    ['Booking Revenue', report.revenue?.bookings?.count ? `${report.revenue.bookings.count} bookings` : '-', formatMoneyRaw(report.revenue?.bookings?.amount)],
    ['Event Revenue', report.revenue?.events?.count ? `${report.revenue.events.count} events` : '-', formatMoneyRaw(report.revenue?.events?.amount)],
    ['Other Income', '-', formatMoneyRaw(report.revenue?.otherIncome?.amount)],
    ['TOTAL REVENUE', '', formatMoneyRaw(report.revenue?.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Count', 'Amount (PKR)']],
    body: revenueBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [200, 155, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === revenueBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [245, 242, 235];
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // COGS Section
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('COST OF GOODS SOLD (COGS)', 14, yPos);
  yPos += 6;

  const cogsBody = [
    ['Purchase Cost (GRN)', report.cogs?.purchaseCost?.count ? `${report.cogs.purchaseCost.count} items` : '-', formatMoneyRaw(report.cogs?.purchaseCost?.amount)],
    ['Inventory Consumed', '-', formatMoneyRaw(report.cogs?.inventoryConsumed?.amount)],
    ['Kitchen Production', '-', formatMoneyRaw(report.cogs?.kitchenProduction?.amount)],
    ['Purchase Returns', '-', `-${formatMoneyRaw(report.cogs?.purchaseReturns?.amount)}`],
    ['TOTAL COGS', '', formatMoneyRaw(report.cogs?.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Count', 'Amount (PKR)']],
    body: cogsBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [200, 155, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === cogsBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [245, 242, 235];
      }
      if (data.row.index === 3 && data.column.index === 2) {
        data.cell.styles.textColor = [183, 28, 28];
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Expenses Section
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('OPERATING EXPENSES', 14, yPos);
  yPos += 6;

  const expenseItems = [
    ['Salaries & Wages', report.expenses?.salaries?.count ? `${report.expenses.salaries.count}` : '-', formatMoneyRaw(report.expenses?.salaries?.amount)],
    ['Event Staff', '-', formatMoneyRaw(report.expenses?.eventStaff?.amount)],
    ['Staff Payments', '-', formatMoneyRaw(report.expenses?.staffPayments?.amount)],
    ['Loan / Advances', '-', formatMoneyRaw(report.expenses?.loans?.amount)],
    ['Supplier Payments', '-', formatMoneyRaw(report.expenses?.supplierPayments?.amount)],
    ['Rent', '-', formatMoneyRaw(report.expenses?.rent?.amount)],
    ['Utilities', '-', formatMoneyRaw(report.expenses?.utilities?.amount)],
    ['Taxes', '-', formatMoneyRaw(report.expenses?.taxes?.amount)],
    ['Wastage / Damage', report.expenses?.wastage?.count ? `${report.expenses.wastage.count}` : '-', formatMoneyRaw(report.expenses?.wastage?.amount)],
    ['Payment Vouchers', '-', formatMoneyRaw(report.expenses?.paymentVouchers?.amount)],
    ['Other Expenses', '-', formatMoneyRaw(report.expenses?.otherExpenses?.amount)],
    ['TOTAL OPERATING EXPENSES', '', formatMoneyRaw(report.expenses?.total)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Count', 'Amount (PKR)']],
    body: expenseItems,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [200, 155, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === expenseItems.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [245, 242, 235];
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 12;

  // Final Calculation Box
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(14, yPos, pageWidth - 28, 55, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('Revenue', 20, yPos + 12);
  doc.text(formatMoneyRaw(report.revenue?.total), pageWidth - 20, yPos + 12, { align: 'right' });

  doc.setTextColor(239, 83, 80);
  doc.text('Less: COGS', 20, yPos + 22);
  doc.text(`- ${formatMoneyRaw(report.cogs?.total)}`, pageWidth - 20, yPos + 22, { align: 'right' });

  doc.setDrawColor(80, 80, 80);
  doc.line(20, yPos + 28, pageWidth - 20, yPos + 28);

  doc.setTextColor(100, 181, 246);
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Profit', 20, yPos + 36);
  doc.text(formatMoneyRaw(report.grossProfit), pageWidth - 20, yPos + 36, { align: 'right' });

  doc.setTextColor(239, 83, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Less: Operating Expenses', 20, yPos + 44);
  doc.text(`- ${formatMoneyRaw(report.expenses?.total)}`, pageWidth - 20, yPos + 44, { align: 'right' });

  doc.setDrawColor(80, 80, 80);
  doc.line(20, yPos + 50, pageWidth - 20, yPos + 50);

  const netProfit = report.summary?.netProfit || 0;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(netProfit >= 0 ? [102, 187, 106] : [239, 83, 80]);
  doc.text('NET PROFIT / LOSS', 20, yPos + 62);
  doc.text(formatMoneyRaw(netProfit), pageWidth - 20, yPos + 62, { align: 'right' });

  // Profit Margin
  yPos += 70;
  doc.setFillColor(netProfit >= 0 ? [232, 245, 233] : [255, 235, 238]);
  doc.roundedRect(14, yPos, pageWidth - 28, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(netProfit >= 0 ? [27, 94, 32] : [183, 28, 28]);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Profit Margin: ${report.profitMargin}%`, pageWidth / 2, yPos + 8, { align: 'center' });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`© 2026 UniSoft ERP — Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Profit_Loss_Report_${dateFrom}_to_${dateTo}.pdf`);
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const ProfitLossReport = () => {
  const [filters, setFilters] = useState({
    fromDate: monthStart(),
    toDate: today(),
  });
  const [report, setReport] = useState(null);
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
    } catch (err) {
      setError(err.message || 'Failed to generate P&L report');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasFilters = filters.fromDate !== monthStart() || filters.toDate !== today();

  const isProfit = (report?.netProfit || 0) >= 0;

  // ── CSV Export ──
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
    const csvContent = [
      ['UniSoft Enterprise ERP — Profit & Loss Statement'],
      [`Period: ${filters.fromDate} to ${filters.toDate}`],
      [`Generated: ${new Date().toLocaleString('en-GB')}`],
      [],
      headers,
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Profit_Loss_Report_${filters.fromDate}_to_${filters.toDate}.csv`;
    link.click();
  }, [csvData, filters, report]);

  const handleExportPDF = useCallback(() => {
    generatePDF(report, filters.fromDate, filters.toDate);
  }, [report, filters]);

  const triggerPrint = () => {
    setTimeout(() => window.print(), 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#C89B3C]" />
        <span className="ml-3 text-gray-600">Generating P&L Report...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterCard
        title="Profit & Loss Filters"
        onReset={() => { setFilters({ fromDate: monthStart(), toDate: today() }); }}
        onApply={fetchReport}
        loading={loading}
        hasFilters={hasFilters}
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
          />
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

          <div className={`p-4 rounded-xl border ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">Net Profit Margin</span>
              <span className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {report.profitMargin}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Revenue" color="green">
              <LineItem label="Booking Revenue" amount={report.revenue?.bookings?.amount} count={report.revenue?.bookings?.count} />
              <LineItem label="Event Revenue" amount={report.revenue?.events?.amount} count={report.revenue?.events?.count} />
              <LineItem label="Other Income" amount={report.revenue?.otherIncome?.amount} />
              <Divider />
              <TotalLine label="Total Revenue" amount={report.revenue?.total} color="green" />
            </SectionCard>

            <SectionCard title="Cost of Goods Sold" color="orange">
              <LineItem label="Purchase Cost (GRN)" amount={report.cogs?.purchaseCost?.amount} count={report.cogs?.purchaseCost?.count} />
              <LineItem label="Inventory Consumed" amount={report.cogs?.inventoryConsumed?.amount} />
              <LineItem label="Kitchen Production" amount={report.cogs?.kitchenProduction?.amount} />
              <LineItem label="Purchase Returns" amount={report.cogs?.purchaseReturns?.amount} negative />
              <Divider />
              <TotalLine label="Total COGS" amount={report.cogs?.total} color="orange" />
            </SectionCard>

            <SectionCard title="Operating Expenses" color="red" className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <LineItem label="Salaries & Wages" amount={report.expenses?.salaries?.amount} count={report.expenses?.salaries?.count} />
                <LineItem label="Event Staff Payments" amount={report.expenses?.eventStaff?.amount} />
                <LineItem label="Direct Staff Payments" amount={report.expenses?.staffPayments?.amount} />
                <LineItem label="Loan / Advances" amount={report.expenses?.loans?.amount} />
                <LineItem label="Supplier Payments" amount={report.expenses?.supplierPayments?.amount} />
                <LineItem label="Rent" amount={report.expenses?.rent?.amount} />
                <LineItem label="Utilities" amount={report.expenses?.utilities?.amount} />
                <LineItem label="Taxes" amount={report.expenses?.taxes?.amount} />
                <LineItem label="Wastage / Damage" amount={report.expenses?.wastage?.amount} count={report.expenses?.wastage?.count} />
                <LineItem label="Payment Vouchers" amount={report.expenses?.paymentVouchers?.amount} />
                <LineItem label="Other Expenses" amount={report.expenses?.otherExpenses?.amount} />
              </div>
              <Divider />
              <TotalLine label="Total Operating Expenses" amount={report.expenses?.total} color="red" />
            </SectionCard>
          </div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center text-lg">
              <span>Revenue</span>
              <span>{formatMoney(report.revenue?.total)}</span>
            </div>
            <div className="flex justify-between items-center text-lg text-red-400">
              <span>Less: COGS</span>
              <span>- {formatMoney(report.cogs?.total)}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-bold text-blue-400 my-2 border-t border-gray-700 pt-2">
              <span>Gross Profit</span>
              <span>{formatMoney(report.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center text-lg text-red-400">
              <span>Less: Operating Expenses</span>
              <span>- {formatMoney(report.expenses?.total)}</span>
            </div>
            <div className={`flex justify-between items-center text-2xl font-bold mt-2 border-t border-gray-700 pt-2 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              <span>Net Profit / Loss</span>
              <span>{formatMoney(report.netProfit)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitLossReport;