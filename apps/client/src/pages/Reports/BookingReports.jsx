import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LayoutDashboard, Filter, Download, Printer, RefreshCw, Search,
  Calendar, Users, Building2, Package, TrendingUp, TrendingDown,
  DollarSign, CreditCard, CheckCircle2, Clock, XCircle, PartyPopper,
  ChevronDown, BarChart3, PieChart as PieChartIcon, ArrowUpRight,
  ArrowDownRight, AlertCircle, Loader2, RotateCcw, FileSpreadsheet,
  FileText, Wallet, Percent, ChefHat, Boxes, HeartCrack, Target,
  Award, Star, Zap, Landmark, BarChart4, Hash, Phone, MapPin,
  BadgeCheck, Ban, CircleDollarSign, Receipt, Banknote, Wifi, X
} from 'lucide-react';
import bookingApi from '../../services/bookingApi';
import eventExecutionApi from '../../services/eventExecutionApi';
import hallApi from '../../services/hallApi';
import packageApi from '../../services/packageApi';
import ReactSelect from '../../components/ui/ReactSelect';

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const THEME = {
  primary: '#C89B3C',
  primaryHover: '#A97A1F',
  primaryLight: '#FDF6E3',
  primaryDark: '#8B6914',
};

// ═══════════════════════════════════════════════════════════
// BULLETPROOF HELPERS
// ═══════════════════════════════════════════════════════════
const safe = (obj, path, fallback = '') => {
  if (!obj || typeof obj !== 'object') return fallback;
  const keys = path.split('.');
  let val = obj;
  for (const key of keys) {
    if (val == null || typeof val !== 'object') return fallback;
    val = val[key];
  }
  return val !== undefined && val !== null ? val : fallback;
};

const safeNum = (obj, path, fallback = 0) => {
  const val = safe(obj, path, fallback);
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const safeStr = (obj, path, fallback = '-') => {
  const val = safe(obj, path, fallback);
  return String(val || fallback);
};

const extractArray = (res, path = 'data') => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const data = safe(res, path, null);
  if (Array.isArray(data)) return data;
  return [];
};

const extractObject = (res, path = 'data') => {
  if (!res) return {};
  if (res && typeof res === 'object' && !Array.isArray(res)) return res;
  const data = safe(res, path, null);
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  return {};
};

const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr).substring(0, 10);
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dateStr);
  }
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
    damaged: 'bg-red-100 text-red-700',
    expired: 'bg-purple-100 text-purple-700',
    spoiled: 'bg-rose-100 text-rose-700',
    purchase: 'bg-blue-100 text-blue-700',
    sale: 'bg-green-100 text-green-700',
    adjustment: 'bg-amber-100 text-amber-700',
    transfer_in: 'bg-emerald-100 text-emerald-700',
    transfer_out: 'bg-orange-100 text-orange-700',
    wastage: 'bg-red-100 text-red-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    ongoing: 'bg-sky-100 text-sky-700',
    finalized: 'bg-violet-100 text-violet-700',
    tentative: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-amber-100 text-amber-700',
    unknown: 'bg-gray-100 text-gray-600',
  };
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

// ═══════════════════════════════════════════════════════════
// EXPORT HELPERS
// ═══════════════════════════════════════════════════════════
const exportToCSV = (data, filename) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    alert('Koi data nahi hai export karne ke liye!');
    return;
  }
  try {
    const headers = Object.keys(data[0]).join(',');
    const csvRows = data.map(row =>
      Object.values(row).map(val => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
        return str;
      }).join(',')
    );
    const blob = new Blob(['\uFEFF' + [headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const now = new Date();
    link.download = `${filename}_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  } catch (e) { alert('CSV export failed: ' + e.message); }
};

const exportToPDF = (elementId, filename) => {
  const element = document.getElementById(elementId);
  const table = element?.querySelector('table');
  if (!table) { alert('Report table nahi mila!'); return; }

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [169, 122, 31];

  doc.setFillColor(245, 242, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('UniSoft ERP', 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Marquee Management System', 14, 21);

  doc.setFontSize(13);
  doc.setTextColor(26, 26, 26);
  doc.text(filename.replace(/_/g, ' ').toUpperCase(), pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - 14, 12, { align: 'right' });

  autoTable(doc, {
    html: `#${elementId} table`,
    startY: 32,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 245] },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`© 2026 UniSoft ERP — Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ═══════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════
const genMockBookings = () => {
  const data = [];
  for (let i = 1; i <= 20; i++) {
    const total = Math.floor(Math.random() * 500000) + 50000;
    const paid = Math.floor(total * (0.3 + Math.random() * 0.5));
    data.push({
      id: i, customerName: `Customer ${i}`, customerPhone: `03${Math.floor(Math.random()*900000000+100000000)}`,
      eventDate: `2026-0${Math.floor(Math.random()*8)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
      eventType: ['Wedding','Corporate','Birthday','Mehndi','Walima'][Math.floor(Math.random()*5)],
      hallName: ['Grand Hall','Crystal Room','Royal Banquet','Garden Lawn','Poolside'][Math.floor(Math.random()*5)],
      packageName: ['Gold','Silver','Platinum','Basic','Premium'][Math.floor(Math.random()*5)],
      guestCount: Math.floor(Math.random()*300)+50,
      status: ['confirmed','pending','cancelled','completed'][Math.floor(Math.random()*4)],
      totalAmount: total, paidAmount: paid, balanceAmount: total - paid,
      paymentMode: ['cash','bank_transfer','card','cheque'][Math.floor(Math.random()*4)],
      createdAt: `2026-0${Math.floor(Math.random()*8)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`
    });
  }
  return data;
};

const genMockEvents = () => {
  const data = [];
  for (let i = 1; i <= 15; i++) {
    const cost = Math.floor(Math.random()*300000)+20000;
    const rev = Math.floor(Math.random()*500000)+100000;
    data.push({
      id: i, bookingId: Math.floor(Math.random()*50)+1,
      eventName: `Event ${i}`, hallName: ['Grand Hall','Crystal Room','Royal Banquet','Garden Lawn','Poolside'][Math.floor(Math.random()*5)],
      startTime: `2026-0${Math.floor(Math.random()*8)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')} 10:00`,
      endTime: `2026-0${Math.floor(Math.random()*8)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')} 18:00`,
      status: ['ongoing','completed','finalized','cancelled'][Math.floor(Math.random()*4)],
      totalCost: cost, revenue: rev, profit: rev - cost,
      profitMargin: ((rev-cost)/rev*100).toFixed(2),
      dishCount: Math.floor(Math.random()*15)+5, inventoryUsed: Math.floor(Math.random()*50)+10, damages: Math.floor(Math.random()*5)
    });
  }
  return data;
};

const genMockHalls = () => {
  const hallNames = ['Grand Hall', 'Crystal Room', 'Royal Banquet', 'Garden Lawn', 'Poolside', 'Terrace Hall', 'Ballroom', 'Conference Hall'];
  return hallNames.map((name, i) => ({
    id: i + 1,
    name: name,
    capacity: [500, 300, 400, 200, 150, 350, 250, 100][i % 8],
    basePrice: [150000, 100000, 120000, 80000, 60000, 130000, 90000, 50000][i % 8],
    totalBookings: Math.floor(Math.random() * 30) + 5,
    totalRevenue: Math.floor(Math.random() * 3000000) + 500000,
    occupancyRate: Math.floor(Math.random() * 60) + 30,
    freeDates: Math.floor(Math.random() * 15) + 5,
    busyDates: Math.floor(Math.random() * 20) + 5,
    location: ['Main Building', 'East Wing', 'West Wing', 'Garden Area', 'North Block'][i % 5],
    amenities: ['AC', 'WiFi', 'Parking', 'Projector', 'Sound System'].slice(0, Math.floor(Math.random() * 4) + 2)
  }));
};

const genMockPackages = () => {
  const packageNames = ['Platinum', 'Gold', 'Silver', 'Basic', 'Premium', 'Standard', 'Deluxe', 'Executive'];
  return packageNames.map((name, i) => ({
    id: i + 1,
    name: name,
    price: [500000, 350000, 200000, 100000, 450000, 250000, 300000, 150000][i % 8],
    totalSold: Math.floor(Math.random() * 50) + 10,
    totalRevenue: Math.floor(Math.random() * 3000000) + 500000,
    avgGuestCount: Math.floor(Math.random() * 300) + 50,
    popularity: Math.floor(Math.random() * 40) + 50,
    description: [`${name} package with full services`, `Premium ${name} package`, `Standard ${name} package`][i % 3],
    duration: ['4 hours', '6 hours', '8 hours', 'Full Day'][i % 4],
    includes: ['Catering', 'Decor', 'Sound', 'Lighting', 'Staff'].slice(0, Math.floor(Math.random() * 4) + 2)
  }));
};

// ═══════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="mb-2 text-lg font-bold text-red-700">Something went wrong</p>
          <p className="mb-4 text-sm text-red-600">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]"
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════
// UNIFIED UI COMPONENTS
// ═══════════════════════════════════════════════════════════

const StatusBadge = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
    {label || status}
  </span>
);

const FilterCard = ({ title, icon: Icon, children, onClear, hasFilters }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 print:hidden">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-700">
        {Icon && <Icon size={18} className="text-[#C89B3C]" />}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
        >
          <X size={14} /> Clear Filters
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

const FilterField = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
    {children}
  </div>
);

const SummaryCard = ({ title, value, icon: Icon, trend, trendUp }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="p-2 bg-[#C89B3C]/10 rounded-lg">
        {Icon && <Icon size={20} className="text-[#C89B3C]" />}
      </div>
    </div>
    {trend && (
      <div className="flex items-center gap-1 mt-2">
        {trendUp ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trend}</span>
      </div>
    )}
  </div>
);

const ExportToolbar = ({ onExportCSV, onExportPDF, onPrint, dataCount, title }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 print:hidden">
    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    <div className="flex items-center gap-2">
      <p className="text-sm text-gray-500 mr-2">
        Showing <span className="font-semibold text-gray-700">{dataCount}</span> records
      </p>
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
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#C89B3C] rounded-lg hover:bg-[#A97A1F] transition-colors"
      >
        <Printer size={16} /> Print
      </button>
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className="h-5 w-5 text-[#C89B3C]" />}
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const EmptyState = ({ message = "No data available" }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
    <FileText size={32} className="mx-auto text-gray-300 mb-3" />
    <p className="text-gray-500">{message}</p>
  </div>
);

const DataTable = ({ columns, data, keyExtractor, emptyMessage = "No data found", loading, title, count }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Loader2 size={32} className="mx-auto text-[#C89B3C] animate-spin mb-3" />
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
      {(title || count !== undefined) && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-700">
            {title} {count !== undefined && <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{count}</span>}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, ri) => (
              <tr key={keyExtractor ? keyExtractor(row, ri) : ri} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col, ci) => (
                  <td key={ci} className={`px-4 py-3 whitespace-nowrap text-gray-700 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
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

// ═══════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════
const COLORS = ['#C89B3C', '#059669', '#2563eb', '#dc2626', '#7c3aed', '#f59e0b', '#14b8a6', '#f97316'];

const SimpleBarChart = ({ data, valueKey, labelKey, color = THEME.primary, title }) => {
  if (!data || data.length === 0) return (
    <SectionCard title={title} icon={BarChart3}>
      <EmptyState />
    </SectionCard>
  );
  const maxVal = Math.max(...data.map(d => safeNum(d, valueKey, 0)), 1);
  return (
    <SectionCard title={title} icon={BarChart3}>
      <div className="flex items-end gap-2" style={{ height: '200px', padding: '20px 0', borderBottom: '2px solid #e5e7eb' }}>
        {data.map((item, idx) => {
          const val = safeNum(item, valueKey, 0);
          const height = Math.max((val / maxVal) * 160, 4);
          return (
            <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-700">{val.toLocaleString()}</span>
              <div className="w-full rounded-t" style={{ backgroundColor: color, height: `${height}px`, minHeight: '4px' }} />
              <span className="max-w-[70px] truncate text-[10px] text-gray-500" title={safeStr(item, labelKey, '')}>
                {safeStr(item, labelKey, '')}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

const SimplePieChart = ({ data, valueKey, labelKey, title }) => {
  if (!data || data.length === 0) return (
    <SectionCard title={title} icon={PieChartIcon}>
      <EmptyState />
    </SectionCard>
  );
  const total = data.reduce((sum, d) => sum + safeNum(d, valueKey, 0), 0);
  if (total === 0) return (
    <SectionCard title={title} icon={PieChartIcon}>
      <EmptyState />
    </SectionCard>
  );
  let currentDeg = 0;
  const segments = data.map((d, i) => {
    const val = safeNum(d, valueKey, 0);
    const deg = (val / total) * 360;
    const start = currentDeg;
    currentDeg += deg;
    return { ...d, start, deg, color: COLORS[i % COLORS.length], val };
  });
  const gradient = segments.map(s => `${s.color} ${s.start}deg ${s.start + s.deg}deg`).join(', ');
  return (
    <SectionCard title={title} icon={PieChartIcon}>
      <div className="flex flex-wrap items-center justify-center gap-8">
        <div className="relative h-48 w-48 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-700">
            Total
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <div className="h-4 w-4 rounded" style={{ backgroundColor: s.color }} />
              <span>{safeStr(s, labelKey, '')}: {s.val.toLocaleString()} ({((s.val/total)*100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════
// TAB 1: BOOKING SUMMARY REPORT
// ═══════════════════════════════════════════════════════════
const BookingSummaryReport = ({ data: rawData }) => {
  const reportId = 'booking-summary-report';
  const [filters, setFilters] = useState({ 
    status: '', 
    fromDate: '', 
    toDate: '', 
    eventType: '', 
    hallName: '',
    paymentStatus: '',
    minAmount: '',
    maxAmount: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [showDebug, setShowDebug] = useState(false);

  const data = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => {
      const customer = safe(item, 'customer', null);
      const hall = safe(item, 'hall', null);
      const total = safeNum(item, 'totalAmount', safeNum(item, 'total_amount', safeNum(item, 'total', 0)));
      const paid = safeNum(item, 'paidAmount', safeNum(item, 'paid_amount', safeNum(item, 'paid', 0)));
      const due = safeNum(item, 'dueAmount', safeNum(item, 'due_amount', safeNum(item, 'remaining', 0)));
      return {
        id: safeNum(item, 'id', idx + 1),
        customerName: safeStr(item, 'customerName', safeStr(item, 'customer_name', safeStr(customer, 'name', `Customer ${idx+1}`))),
        customerPhone: safeStr(item, 'customerPhone', safeStr(item, 'customer_phone', safeStr(item, 'phone', safeStr(customer, 'phone', '-')))),
        eventDate: safeStr(item, 'eventDate', safeStr(item, 'event_date', safeStr(item, 'date', '-'))),
        eventType: safeStr(item, 'eventType', safeStr(item, 'event_type', safeStr(item, 'type', '-'))),
        hallName: safeStr(item, 'hallName', safeStr(item, 'hall_name', safeStr(hall, 'name', safeStr(item, 'hall', '-')))),
        packageName: safeStr(item, 'packageName', safeStr(item, 'package_name', safeStr(item, 'package', '-'))),
        guestCount: safeNum(item, 'guestCount', safeNum(item, 'guest_count', safeNum(item, 'guests', 0))),
        status: safeStr(item, 'status', 'pending').toLowerCase(),
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: due > 0 ? due : (total - paid),
        paymentMode: safeStr(item, 'paymentMode', safeStr(item, 'payment_mode', safeStr(item, 'payment', 'cash'))),
        paymentStatus: safeStr(item, 'paymentStatus', safeStr(item, 'payment_status', 'pending')).toLowerCase(),
        createdAt: safeStr(item, 'createdAt', safeStr(item, 'created_at', safeStr(item, 'created', '-')))
      };
    });
  }, [rawData]);

  const filteredData = useMemo(() => {
    try {
      return data.filter(item => {
        if (appliedFilters.status && item.status !== appliedFilters.status) return false;
        if (appliedFilters.eventType && item.eventType !== appliedFilters.eventType) return false;
        if (appliedFilters.hallName && item.hallName !== appliedFilters.hallName) return false;
        if (appliedFilters.paymentStatus && item.paymentStatus !== appliedFilters.paymentStatus) return false;
        if (appliedFilters.fromDate && item.eventDate && item.eventDate < appliedFilters.fromDate) return false;
        if (appliedFilters.toDate && item.eventDate && item.eventDate > appliedFilters.toDate) return false;
        if (appliedFilters.minAmount && item.totalAmount < Number(appliedFilters.minAmount)) return false;
        if (appliedFilters.maxAmount && item.totalAmount > Number(appliedFilters.maxAmount)) return false;
        return true;
      });
    } catch (e) { console.error('Filter error:', e); return data; }
  }, [data, appliedFilters]);

  const stats = useMemo(() => {
    try {
      return {
        total: filteredData.length,
        confirmed: filteredData.filter(d => d.status === 'confirmed').length,
        pending: filteredData.filter(d => d.status === 'pending').length,
        cancelled: filteredData.filter(d => d.status === 'cancelled').length,
        completed: filteredData.filter(d => d.status === 'completed').length,
        totalRevenue: filteredData.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
        totalPaid: filteredData.reduce((sum, d) => sum + (d.paidAmount || 0), 0),
        totalBalance: filteredData.reduce((sum, d) => sum + (d.balanceAmount || 0), 0)
      };
    } catch (e) { return { total: 0, confirmed: 0, pending: 0, cancelled: 0, completed: 0, totalRevenue: 0, totalPaid: 0, totalBalance: 0 }; }
  }, [filteredData]);

  const statusChartData = useMemo(() => [
    { name: 'Confirmed', value: stats.confirmed },
    { name: 'Pending', value: stats.pending },
    { name: 'Cancelled', value: stats.cancelled },
    { name: 'Completed', value: stats.completed }
  ].filter(d => d.value > 0), [stats]);

  const monthlyData = useMemo(() => {
    try {
      const grouped = {};
      filteredData.forEach(item => {
        const month = item.eventDate ? item.eventDate.substring(0, 7) : 'Unknown';
        if (!grouped[month]) grouped[month] = { month, count: 0, revenue: 0 };
        grouped[month].count++;
        grouped[month].revenue += (item.totalAmount || 0);
      });
      return Object.values(grouped).sort((a, b) => String(a.month).localeCompare(String(b.month)));
    } catch (e) { return []; }
  }, [filteredData]);

  const uniqueEventTypes = [...new Set(data.map(d => d.eventType).filter(Boolean))];
  const uniqueHalls = [...new Set(data.map(d => d.hallName).filter(Boolean))];

  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate || filters.eventType || 
                           filters.hallName || filters.paymentStatus || filters.minAmount || filters.maxAmount;
  
  const clearFilters = () => { 
    setFilters({
      status: '', fromDate: '', toDate: '', eventType: '', hallName: '',
      paymentStatus: '', minAmount: '', maxAmount: ''
    }); 
    setAppliedFilters({}); 
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  return (
    <ErrorBoundary>
      <div>
        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <FilterField label="Status">
            <ReactSelect
              value={filters.status}
              onChange={(val) => setFilters(prev => ({ ...prev, status: val || '' }))}
              options={[
                { value: '', label: 'All Status' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'pending', label: 'Pending' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'completed', label: 'Completed' }
              ]}
              placeholder="All Status"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Payment Status">
            <ReactSelect
              value={filters.paymentStatus}
              onChange={(val) => setFilters(prev => ({ ...prev, paymentStatus: val || '' }))}
              options={[
                { value: '', label: 'All Payment Status' },
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Partial' },
                { value: 'pending', label: 'Pending' },
                { value: 'overdue', label: 'Overdue' }
              ]}
              placeholder="All Payment Status"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Event Type">
            <ReactSelect
              value={filters.eventType}
              onChange={(val) => setFilters(prev => ({ ...prev, eventType: val || '' }))}
              options={[
                { value: '', label: 'All Types' },
                ...uniqueEventTypes.map(t => ({ value: t, label: t }))
              ]}
              placeholder="All Types"
              isSearchable={true}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Hall">
            <ReactSelect
              value={filters.hallName}
              onChange={(val) => setFilters(prev => ({ ...prev, hallName: val || '' }))}
              options={[
                { value: '', label: 'All Halls' },
                ...uniqueHalls.map(h => ({ value: h, label: h }))
              ]}
              placeholder="All Halls"
              isSearchable={true}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="From Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} />
          </FilterField>
          <FilterField label="To Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} />
          </FilterField>
          <FilterField label="Min Amount">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minAmount} onChange={e => setFilters({...filters, minAmount: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Amount">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxAmount} onChange={e => setFilters({...filters, maxAmount: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <div className="flex items-end print:hidden">
            <button onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </FilterCard>

        <ExportToolbar
          title="Booking Summary Report"
          dataCount={filteredData.length}
          onExportCSV={() => exportToCSV(filteredData, 'Booking_Summary')}
          onExportPDF={() => exportToPDF(reportId, 'Booking_Summary')}
          onPrint={() => window.print()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total Bookings" value={stats.total} icon={LayoutDashboard} />
          <SummaryCard title="Confirmed" value={stats.confirmed} icon={CheckCircle2} trend="Active" trendUp={true} />
          <SummaryCard title="Pending" value={stats.pending} icon={Clock} trend="Awaiting" trendUp={false} />
          <SummaryCard title="Cancelled" value={stats.cancelled} icon={XCircle} trend="Lost" trendUp={false} />
          <SummaryCard title="Total Revenue" value={formatMoney(stats.totalRevenue)} icon={DollarSign} />
          <SummaryCard title="Total Paid" value={formatMoney(stats.totalPaid)} icon={Wallet} trend="Collected" trendUp={true} />
          <SummaryCard title="Total Balance" value={formatMoney(stats.totalBalance)} icon={AlertCircle} trend="Pending" trendUp={false} />
          <SummaryCard title="Completed" value={stats.completed} icon={PartyPopper} trend="Done" trendUp={true} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SimplePieChart data={statusChartData} valueKey="value" labelKey="name" title="Status Distribution" />
          <SimpleBarChart data={monthlyData} valueKey="count" labelKey="month" color={THEME.primary} title="Monthly Bookings Trend" />
        </div>

        <div id={reportId}>
          <DataTable
            title="Detailed Booking List"
            count={filteredData.length}
            emptyMessage="No bookings found"
            data={filteredData}
            keyExtractor={(row, i) => row.id || i}
            columns={[
              { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
              { header: 'Customer', accessor: 'customerName', cell: row => (
                <div>
                  <div className="font-medium text-gray-900">{row.customerName}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={12} /> {row.customerPhone}
                  </div>
                </div>
              )},
              { header: 'Date', accessor: 'eventDate', cell: row => formatDate(row.eventDate) },
              { header: 'Type', accessor: 'eventType' },
              { header: 'Hall', accessor: 'hallName' },
              { header: 'Guests', accessor: 'guestCount' },
              { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
              { header: 'Payment', accessor: 'paymentStatus', cell: row => <StatusBadge status={row.paymentStatus} label={row.paymentStatus?.toUpperCase()} /> },
              { header: 'Total', accessor: 'totalAmount', align: 'right', cell: row => <span className="font-semibold text-gray-900">{row.totalAmount.toLocaleString()}</span> },
              { header: 'Paid', accessor: 'paidAmount', align: 'right', cell: row => <span className="text-emerald-600">{row.paidAmount.toLocaleString()}</span> },
              { header: 'Balance', accessor: 'balanceAmount', align: 'right', cell: row => <span className="font-semibold text-red-600">{row.balanceAmount.toLocaleString()}</span> },
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════
// TAB 2: PAYMENT COLLECTION REPORT
// ═══════════════════════════════════════════════════════════
const PaymentCollectionReport = ({ data: rawData }) => {
  const reportId = 'payment-collection-report';
  const [filters, setFilters] = useState({ 
    fromDate: '', 
    toDate: '', 
    paymentMode: '', 
    status: '',
    minAmount: '',
    maxAmount: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const data = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => {
      const customer = safe(item, 'customer', null);
      const total = safeNum(item, 'totalAmount', safeNum(item, 'total_amount', safeNum(item, 'total', 0)));
      const paid = safeNum(item, 'paidAmount', safeNum(item, 'paid_amount', safeNum(item, 'paid', 0)));
      const due = safeNum(item, 'dueAmount', safeNum(item, 'due_amount', safeNum(item, 'remaining', 0)));
      return {
        id: safeNum(item, 'id', idx + 1),
        customerName: safeStr(item, 'customerName', safeStr(item, 'customer_name', safeStr(customer, 'name', `Customer ${idx+1}`))),
        createdAt: safeStr(item, 'createdAt', safeStr(item, 'created_at', safeStr(item, 'created', '-'))),
        paymentMode: safeStr(item, 'paymentMode', safeStr(item, 'payment_mode', safeStr(item, 'payment', 'cash'))),
        status: safeStr(item, 'status', 'pending').toLowerCase(),
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: due > 0 ? due : (total - paid)
      };
    });
  }, [rawData]);

  const filteredData = useMemo(() => {
    try {
      return data.filter(item => {
        if (appliedFilters.paymentMode && item.paymentMode !== appliedFilters.paymentMode) return false;
        if (appliedFilters.status && item.status !== appliedFilters.status) return false;
        if (appliedFilters.fromDate && item.createdAt && item.createdAt < appliedFilters.fromDate) return false;
        if (appliedFilters.toDate && item.createdAt && item.createdAt > appliedFilters.toDate) return false;
        if (appliedFilters.minAmount && item.totalAmount < Number(appliedFilters.minAmount)) return false;
        if (appliedFilters.maxAmount && item.totalAmount > Number(appliedFilters.maxAmount)) return false;
        return true;
      });
    } catch (e) { return data; }
  }, [data, appliedFilters]);

  const stats = useMemo(() => {
    try {
      const total = filteredData.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
      const paid = filteredData.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
      const balance = filteredData.reduce((sum, d) => sum + (d.balanceAmount || 0), 0);
      return { total, paid, balance, collectionRate: total > 0 ? ((paid / total) * 100).toFixed(1) : 0 };
    } catch (e) { return { total: 0, paid: 0, balance: 0, collectionRate: 0 }; }
  }, [filteredData]);

  const modeData = useMemo(() => {
    try {
      const grouped = {};
      filteredData.forEach(item => {
        const mode = item.paymentMode || 'unknown';
        if (!grouped[mode]) grouped[mode] = { name: mode.toUpperCase(), value: 0, count: 0 };
        grouped[mode].value += (item.paidAmount || 0);
        grouped[mode].count++;
      });
      return Object.values(grouped);
    } catch (e) { return []; }
  }, [filteredData]);

  const hasActiveFilters = filters.fromDate || filters.toDate || filters.paymentMode || 
                           filters.status || filters.minAmount || filters.maxAmount;
  
  const clearFilters = () => { 
    setFilters({ fromDate: '', toDate: '', paymentMode: '', status: '', minAmount: '', maxAmount: '' }); 
    setAppliedFilters({}); 
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  return (
    <ErrorBoundary>
      <div>
        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <FilterField label="From Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} />
          </FilterField>
          <FilterField label="To Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} />
          </FilterField>
          <FilterField label="Payment Mode">
            <ReactSelect
              value={filters.paymentMode}
              onChange={(val) => setFilters(prev => ({ ...prev, paymentMode: val || '' }))}
              options={[
                { value: '', label: 'All Modes' },
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'card', label: 'Card' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'online', label: 'Online' },
                { value: 'jazzcash', label: 'JazzCash' },
                { value: 'easypaisa', label: 'EasyPaisa' }
              ]}
              placeholder="All Modes"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Status">
            <ReactSelect
              value={filters.status}
              onChange={(val) => setFilters(prev => ({ ...prev, status: val || '' }))}
              options={[
                { value: '', label: 'All Status' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              placeholder="All Status"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Min Amount">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minAmount} onChange={e => setFilters({...filters, minAmount: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Amount">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxAmount} onChange={e => setFilters({...filters, maxAmount: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <div className="flex items-end print:hidden">
            <button onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </FilterCard>

        <ExportToolbar
          title="Payment Collection Report"
          dataCount={filteredData.length}
          onExportCSV={() => exportToCSV(filteredData, 'Payment_Collection')}
          onExportPDF={() => exportToPDF(reportId, 'Payment_Collection')}
          onPrint={() => window.print()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total Amount" value={formatMoney(stats.total)} icon={DollarSign} />
          <SummaryCard title="Paid Amount" value={formatMoney(stats.paid)} icon={Wallet} trend="Collected" trendUp={true} />
          <SummaryCard title="Balance" value={formatMoney(stats.balance)} icon={AlertCircle} trend="Pending" trendUp={false} />
          <SummaryCard title="Collection Rate" value={`${stats.collectionRate}%`} icon={Percent} trend={Number(stats.collectionRate) > 80 ? 'Good' : 'Low'} trendUp={Number(stats.collectionRate) > 80} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SimplePieChart data={modeData} valueKey="value" labelKey="name" title="Payment Mode Breakdown" />
          <SimpleBarChart data={modeData} valueKey="value" labelKey="name" color="#059669" title="Amount by Payment Mode" />
        </div>

        <div id={reportId}>
          <DataTable
            title="Payment Details"
            count={filteredData.length}
            emptyMessage="No payment records found"
            data={filteredData}
            keyExtractor={(row, i) => row.id || i}
            columns={[
              { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
              { header: 'Customer', accessor: 'customerName' },
              { header: 'Date', accessor: 'createdAt', cell: row => formatDate(row.createdAt) },
              { header: 'Mode', accessor: 'paymentMode', cell: row => (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-gray-700">
                  <CreditCard size={12} /> {row.paymentMode}
                </span>
              )},
              { header: 'Total', accessor: 'totalAmount', align: 'right', cell: row => <span className="font-semibold text-gray-900">{row.totalAmount.toLocaleString()}</span> },
              { header: 'Paid', accessor: 'paidAmount', align: 'right', cell: row => <span className="text-emerald-600">{row.paidAmount.toLocaleString()}</span> },
              { header: 'Balance', accessor: 'balanceAmount', align: 'right', cell: row => <span className="text-red-600">{row.balanceAmount.toLocaleString()}</span> },
              { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
              { header: '%', accessor: 'paidAmount', align: 'center', cell: row => {
                const pct = row.totalAmount > 0 ? ((row.paidAmount / row.totalAmount) * 100).toFixed(0) : 0;
                return (
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{pct}%</span>
                  </div>
                );
              }},
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════
// TAB 3: EVENT EXECUTION REPORT
// ═══════════════════════════════════════════════════════════
const EventExecutionReport = ({ data: rawData }) => {
  const reportId = 'event-execution-report';
  const [filters, setFilters] = useState({ 
    status: '', 
    fromDate: '', 
    toDate: '', 
    hallName: '',
    minCost: '',
    maxCost: '',
    minRevenue: '',
    maxRevenue: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const data = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => ({
      id: safeNum(item, 'id', idx + 1),
      eventName: safeStr(item, 'eventName', safeStr(item, 'event_name', safeStr(item, 'name', `Event ${idx+1}`))),
      hallName: safeStr(item, 'hallName', safeStr(item, 'hall_name', safeStr(item, 'hall', '-'))),
      startTime: safeStr(item, 'startTime', safeStr(item, 'start_time', safeStr(item, 'start', '-'))),
      endTime: safeStr(item, 'endTime', safeStr(item, 'end_time', safeStr(item, 'end', '-'))),
      status: safeStr(item, 'status', 'ongoing').toLowerCase(),
      totalCost: safeNum(item, 'totalCost', safeNum(item, 'total_cost', safeNum(item, 'cost', 0))),
      revenue: safeNum(item, 'revenue', safeNum(item, 'totalRevenue', safeNum(item, 'total_revenue', 0))),
      profit: safeNum(item, 'profit', 0),
      profitMargin: safeNum(item, 'profitMargin', safeNum(item, 'profit_margin', 0)),
      dishCount: safeNum(item, 'dishCount', safeNum(item, 'dish_count', safeNum(item, 'dishes', 0))),
      inventoryUsed: safeNum(item, 'inventoryUsed', safeNum(item, 'inventory_used', 0)),
      damages: safeNum(item, 'damages', 0)
    }));
  }, [rawData]);

  const filteredData = useMemo(() => {
    try {
      return data.filter(item => {
        if (appliedFilters.status && item.status !== appliedFilters.status) return false;
        if (appliedFilters.hallName && item.hallName !== appliedFilters.hallName) return false;
        if (appliedFilters.fromDate && item.startTime && item.startTime < appliedFilters.fromDate) return false;
        if (appliedFilters.toDate && item.startTime && item.startTime > appliedFilters.toDate) return false;
        if (appliedFilters.minCost && item.totalCost < Number(appliedFilters.minCost)) return false;
        if (appliedFilters.maxCost && item.totalCost > Number(appliedFilters.maxCost)) return false;
        if (appliedFilters.minRevenue && item.revenue < Number(appliedFilters.minRevenue)) return false;
        if (appliedFilters.maxRevenue && item.revenue > Number(appliedFilters.maxRevenue)) return false;
        return true;
      });
    } catch (e) { return data; }
  }, [data, appliedFilters]);

  const stats = useMemo(() => {
    try {
      return {
        total: filteredData.length,
        completed: filteredData.filter(d => d.status === 'completed').length,
        ongoing: filteredData.filter(d => d.status === 'ongoing').length,
        finalized: filteredData.filter(d => d.status === 'finalized').length,
        avgProfit: filteredData.length > 0 ? (filteredData.reduce((sum, d) => sum + (d.profit || 0), 0) / filteredData.length).toFixed(0) : 0,
        totalDishes: filteredData.reduce((sum, d) => sum + (d.dishCount || 0), 0),
        totalDamages: filteredData.reduce((sum, d) => sum + (d.damages || 0), 0),
        totalInventory: filteredData.reduce((sum, d) => sum + (d.inventoryUsed || 0), 0)
      };
    } catch (e) { return { total: 0, completed: 0, ongoing: 0, finalized: 0, avgProfit: 0, totalDishes: 0, totalDamages: 0, totalInventory: 0 }; }
  }, [filteredData]);

  const statusData = useMemo(() => [
    { name: 'Ongoing', value: stats.ongoing },
    { name: 'Completed', value: stats.completed },
    { name: 'Finalized', value: stats.finalized }
  ].filter(d => d.value > 0), [stats]);

  const hallPerf = useMemo(() => {
    try {
      const grouped = {};
      filteredData.forEach(item => {
        const hall = item.hallName || 'Unknown';
        if (!grouped[hall]) grouped[hall] = { name: hall, value: 0, events: 0 };
        grouped[hall].value += (item.profit || 0);
        grouped[hall].events++;
      });
      return Object.values(grouped);
    } catch (e) { return []; }
  }, [filteredData]);

  const uniqueHalls = [...new Set(data.map(d => d.hallName).filter(Boolean))];

  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate || filters.hallName ||
                           filters.minCost || filters.maxCost || filters.minRevenue || filters.maxRevenue;
  
  const clearFilters = () => { 
    setFilters({ status: '', fromDate: '', toDate: '', hallName: '', 
                 minCost: '', maxCost: '', minRevenue: '', maxRevenue: '' }); 
    setAppliedFilters({}); 
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  return (
    <ErrorBoundary>
      <div>
        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <FilterField label="Status">
            <ReactSelect
              value={filters.status}
              onChange={(val) => setFilters(prev => ({ ...prev, status: val || '' }))}
              options={[
                { value: '', label: 'All Status' },
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'completed', label: 'Completed' },
                { value: 'finalized', label: 'Finalized' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              placeholder="All Status"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Hall">
            <ReactSelect
              value={filters.hallName}
              onChange={(val) => setFilters(prev => ({ ...prev, hallName: val || '' }))}
              options={[
                { value: '', label: 'All Halls' },
                ...uniqueHalls.map(h => ({ value: h, label: h }))
              ]}
              placeholder="All Halls"
              isSearchable={true}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="From Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} />
          </FilterField>
          <FilterField label="To Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} />
          </FilterField>
          <FilterField label="Min Cost">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minCost} onChange={e => setFilters({...filters, minCost: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Cost">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxCost} onChange={e => setFilters({...filters, maxCost: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <FilterField label="Min Revenue">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minRevenue} onChange={e => setFilters({...filters, minRevenue: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Revenue">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxRevenue} onChange={e => setFilters({...filters, maxRevenue: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <div className="flex items-end print:hidden">
            <button onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </FilterCard>

        <ExportToolbar
          title="Event Execution Report"
          dataCount={filteredData.length}
          onExportCSV={() => exportToCSV(filteredData, 'Event_Execution')}
          onExportPDF={() => exportToPDF(reportId, 'Event_Execution')}
          onPrint={() => window.print()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total Events" value={stats.total} icon={LayoutDashboard} />
          <SummaryCard title="Completed" value={stats.completed} icon={CheckCircle2} trend="Done" trendUp={true} />
          <SummaryCard title="Ongoing" value={stats.ongoing} icon={Zap} trend="Active" trendUp={true} />
          <SummaryCard title="Finalized" value={stats.finalized} icon={Award} trend="Closed" trendUp={true} />
          <SummaryCard title="Avg Profit" value={formatMoney(stats.avgProfit)} icon={TrendingUp} />
          <SummaryCard title="Total Dishes" value={stats.totalDishes} icon={ChefHat} />
          <SummaryCard title="Damages" value={stats.totalDamages} icon={HeartCrack} trend="Loss" trendUp={false} />
          <SummaryCard title="Inventory" value={stats.totalInventory} icon={Boxes} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SimplePieChart data={statusData} valueKey="value" labelKey="name" title="Event Status Distribution" />
          <SimpleBarChart data={hallPerf} valueKey="value" labelKey="name" color="#14b8a6" title="Hall-wise Profit" />
        </div>

        <div id={reportId}>
          <DataTable
            title="Event Execution Details"
            count={filteredData.length}
            emptyMessage="No events found"
            data={filteredData}
            keyExtractor={(row, i) => row.id || i}
            columns={[
              { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
              { header: 'Event', accessor: 'eventName' },
              { header: 'Hall', accessor: 'hallName' },
              { header: 'Duration', accessor: 'startTime', cell: row => <span className="text-xs text-gray-500">{formatDate(row.startTime)} - {formatDate(row.endTime)}</span> },
              { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
              { header: 'Cost', accessor: 'totalCost', align: 'right', cell: row => <span className="text-red-600">{row.totalCost.toLocaleString()}</span> },
              { header: 'Revenue', accessor: 'revenue', align: 'right', cell: row => <span className="text-emerald-600">{row.revenue.toLocaleString()}</span> },
              { header: 'Profit', accessor: 'profit', align: 'right', cell: row => <span className={`font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()}</span> },
              { header: 'Margin', accessor: 'profitMargin', align: 'center', cell: row => <span className="font-semibold text-gray-700">{row.profitMargin}%</span> },
              { header: 'Dishes', accessor: 'dishCount', align: 'center', cell: row => <span className="text-gray-600">{row.dishCount}</span> },
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════
// TAB 4: HALL UTILIZATION REPORT
// ═══════════════════════════════════════════════════════════
const HallUtilizationReport = ({ data: rawData }) => {
  const reportId = 'hall-utilization-report';
  const [filters, setFilters] = useState({ 
    hallName: '', 
    minOccupancy: '', 
    maxOccupancy: '',
    minCapacity: '',
    maxCapacity: '',
    location: '',
    sortBy: 'occupancy'
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const data = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => ({
      id: safeNum(item, 'id', idx + 1),
      name: safeStr(item, 'name', safeStr(item, 'hallName', safeStr(item, 'hall_name', `Hall ${idx+1}`))),
      capacity: safeNum(item, 'capacity', safeNum(item, 'maxCapacity', 0)),
      basePrice: safeNum(item, 'basePrice', safeNum(item, 'base_price', safeNum(item, 'price', 0))),
      totalBookings: safeNum(item, 'totalBookings', safeNum(item, 'total_bookings', safeNum(item, 'bookings', 0))),
      totalRevenue: safeNum(item, 'totalRevenue', safeNum(item, 'total_revenue', safeNum(item, 'revenue', 0))),
      occupancyRate: safeNum(item, 'occupancyRate', safeNum(item, 'occupancy_rate', safeNum(item, 'occupancy', 0))),
      freeDates: safeNum(item, 'freeDates', safeNum(item, 'free_dates', 0)),
      busyDates: safeNum(item, 'busyDates', safeNum(item, 'busy_dates', 0)),
      location: safeStr(item, 'location', safeStr(item, 'hall_location', 'Main Building')),
      amenities: safe(item, 'amenities', [])
    }));
  }, [rawData]);

  const filteredData = useMemo(() => {
    try {
      let result = data.filter(item => {
        if (appliedFilters.hallName && item.name !== appliedFilters.hallName) return false;
        if (appliedFilters.location && item.location !== appliedFilters.location) return false;
        if (appliedFilters.minOccupancy && item.occupancyRate < Number(appliedFilters.minOccupancy)) return false;
        if (appliedFilters.maxOccupancy && item.occupancyRate > Number(appliedFilters.maxOccupancy)) return false;
        if (appliedFilters.minCapacity && item.capacity < Number(appliedFilters.minCapacity)) return false;
        if (appliedFilters.maxCapacity && item.capacity > Number(appliedFilters.maxCapacity)) return false;
        return true;
      });

      // Apply sorting
      if (appliedFilters.sortBy) {
        result = [...result].sort((a, b) => {
          switch (appliedFilters.sortBy) {
            case 'occupancy': return b.occupancyRate - a.occupancyRate;
            case 'capacity': return b.capacity - a.capacity;
            case 'revenue': return b.totalRevenue - a.totalRevenue;
            case 'bookings': return b.totalBookings - a.totalBookings;
            default: return 0;
          }
        });
      }
      return result;
    } catch (e) { return data; }
  }, [data, appliedFilters]);

  const stats = useMemo(() => {
    try {
      return {
        totalHalls: filteredData.length,
        totalCapacity: filteredData.reduce((sum, d) => sum + (d.capacity || 0), 0),
        avgOccupancy: filteredData.length > 0 ? (filteredData.reduce((sum, d) => sum + (d.occupancyRate || 0), 0) / filteredData.length).toFixed(1) : 0,
        totalRevenue: filteredData.reduce((sum, d) => sum + (d.totalRevenue || 0), 0),
        totalBookings: filteredData.reduce((sum, d) => sum + (d.totalBookings || 0), 0)
      };
    } catch (e) { return { totalHalls: 0, totalCapacity: 0, avgOccupancy: 0, totalRevenue: 0, totalBookings: 0 }; }
  }, [filteredData]);

  const occupancyData = useMemo(() => filteredData.map(d => ({ name: d.name, value: d.occupancyRate })), [filteredData]);
  const revenueData = useMemo(() => filteredData.map(d => ({ name: d.name, value: d.totalRevenue })), [filteredData]);
  const capacityData = useMemo(() => filteredData.map(d => ({ name: d.name, value: d.capacity })), [filteredData]);

  const uniqueLocations = [...new Set(data.map(d => d.location).filter(Boolean))];

  const hasActiveFilters = filters.hallName || filters.minOccupancy || filters.maxOccupancy ||
                           filters.minCapacity || filters.maxCapacity || filters.location || filters.sortBy !== 'occupancy';
  
  const clearFilters = () => { 
    setFilters({ hallName: '', minOccupancy: '', maxOccupancy: '', minCapacity: '', maxCapacity: '', location: '', sortBy: 'occupancy' }); 
    setAppliedFilters({}); 
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  return (
    <ErrorBoundary>
      <div>
        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <FilterField label="Hall Name">
            <ReactSelect
              value={filters.hallName}
              onChange={(val) => setFilters(prev => ({ ...prev, hallName: val || '' }))}
              options={[
                { value: '', label: 'All Halls' },
                ...data.map(h => ({ value: h.name, label: h.name }))
              ]}
              placeholder="All Halls"
              isSearchable={true}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Location">
            <ReactSelect
              value={filters.location}
              onChange={(val) => setFilters(prev => ({ ...prev, location: val || '' }))}
              options={[
                { value: '', label: 'All Locations' },
                ...uniqueLocations.map(l => ({ value: l, label: l }))
              ]}
              placeholder="All Locations"
              isSearchable={true}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Min Occupancy %">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minOccupancy} onChange={e => setFilters({...filters, minOccupancy: e.target.value})} placeholder="e.g. 50" />
          </FilterField>
          <FilterField label="Max Occupancy %">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxOccupancy} onChange={e => setFilters({...filters, maxOccupancy: e.target.value})} placeholder="e.g. 90" />
          </FilterField>
          <FilterField label="Min Capacity">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minCapacity} onChange={e => setFilters({...filters, minCapacity: e.target.value})} placeholder="Min guests" />
          </FilterField>
          <FilterField label="Max Capacity">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxCapacity} onChange={e => setFilters({...filters, maxCapacity: e.target.value})} placeholder="Max guests" />
          </FilterField>
          <FilterField label="Sort By">
            <ReactSelect
              value={filters.sortBy}
              onChange={(val) => setFilters(prev => ({ ...prev, sortBy: val || 'occupancy' }))}
              options={[
                { value: 'occupancy', label: 'Occupancy Rate' },
                { value: 'capacity', label: 'Capacity' },
                { value: 'revenue', label: 'Revenue' },
                { value: 'bookings', label: 'Bookings' }
              ]}
              placeholder="Sort By"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <div className="flex items-end print:hidden">
            <button onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </FilterCard>

        <ExportToolbar
          title="Hall Utilization Report"
          dataCount={filteredData.length}
          onExportCSV={() => exportToCSV(filteredData, 'Hall_Utilization')}
          onExportPDF={() => exportToPDF(reportId, 'Hall_Utilization')}
          onPrint={() => window.print()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total Halls" value={stats.totalHalls} icon={Landmark} />
          <SummaryCard title="Total Capacity" value={stats.totalCapacity} icon={Users} />
          <SummaryCard title="Avg Occupancy" value={`${stats.avgOccupancy}%`} icon={Percent} />
          <SummaryCard title="Total Revenue" value={formatMoney(stats.totalRevenue)} icon={DollarSign} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SimpleBarChart data={occupancyData} valueKey="value" labelKey="name" color="#3b82f6" title="Occupancy Rate per Hall (%)" />
          <SimpleBarChart data={revenueData} valueKey="value" labelKey="name" color="#f59e0b" title="Revenue per Hall (PKR)" />
          <SimpleBarChart data={capacityData} valueKey="value" labelKey="name" color="#8b5cf6" title="Capacity per Hall" />
        </div>

        <div id={reportId}>
          <DataTable
            title="Hall Details"
            count={filteredData.length}
            emptyMessage="No halls found"
            data={filteredData}
            keyExtractor={(row, i) => row.id || i}
            columns={[
              { header: 'Hall', accessor: 'name', cell: row => <span className="font-semibold text-gray-900">{row.name}</span> },
              { header: 'Location', accessor: 'location' },
              { header: 'Capacity', accessor: 'capacity', align: 'right' },
              { header: 'Base Price', accessor: 'basePrice', align: 'right', cell: row => row.basePrice.toLocaleString() },
              { header: 'Bookings', accessor: 'totalBookings', align: 'right', cell: row => <span className="font-semibold text-gray-900">{row.totalBookings}</span> },
              { header: 'Revenue', accessor: 'totalRevenue', align: 'right', cell: row => row.totalRevenue.toLocaleString() },
              { header: 'Occupancy', accessor: 'occupancyRate', align: 'center', cell: row => (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(row.occupancyRate,100)}%` }} />
                  </div>
                  <span className="min-w-[35px] text-xs font-semibold text-gray-700">{row.occupancyRate}%</span>
                </div>
              )},
              { header: 'Free Days', accessor: 'freeDates', align: 'right', cell: row => <span className="text-emerald-600">{row.freeDates}</span> },
              { header: 'Busy Days', accessor: 'busyDates', align: 'right', cell: row => <span className="text-red-600">{row.busyDates}</span> },
              { header: 'Status', accessor: 'occupancyRate', align: 'center', cell: row => (
                <StatusBadge status={row.occupancyRate > 80 ? 'active' : row.occupancyRate > 50 ? 'pending' : 'low'}
                  label={row.occupancyRate > 80 ? 'HIGH' : row.occupancyRate > 50 ? 'MODERATE' : 'LOW'} />
              )},
              { header: 'Amenities', accessor: 'amenities', cell: row => (
                <div className="flex flex-wrap gap-1">
                  {(row.amenities || []).slice(0, 3).map((a, i) => (
                    <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{a}</span>
                  ))}
                  {(row.amenities || []).length > 3 && <span className="text-[10px] text-gray-400">+{row.amenities.length - 3}</span>}
                </div>
              )}
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════
// TAB 5: PACKAGE PERFORMANCE REPORT
// ═══════════════════════════════════════════════════════════
const PackagePerformanceReport = ({ data: rawData }) => {
  const reportId = 'package-performance-report';
  const [filters, setFilters] = useState({ 
    minRevenue: '', 
    maxRevenue: '',
    minSold: '',
    maxSold: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'revenue'
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const data = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => ({
      id: safeNum(item, 'id', idx + 1),
      name: safeStr(item, 'name', safeStr(item, 'packageName', safeStr(item, 'package_name', `Package ${idx+1}`))),
      price: safeNum(item, 'price', safeNum(item, 'basePrice', safeNum(item, 'amount', 0))),
      totalSold: safeNum(item, 'totalSold', safeNum(item, 'total_sold', safeNum(item, 'sold', 0))),
      totalRevenue: safeNum(item, 'totalRevenue', safeNum(item, 'total_revenue', safeNum(item, 'revenue', 0))),
      avgGuestCount: safeNum(item, 'avgGuestCount', safeNum(item, 'avg_guests', safeNum(item, 'guests', 0))),
      popularity: safeNum(item, 'popularity', safeNum(item, 'score', 0)),
      description: safeStr(item, 'description', ''),
      duration: safeStr(item, 'duration', ''),
      includes: safe(item, 'includes', [])
    }));
  }, [rawData]);

  const filteredData = useMemo(() => {
    try {
      let result = data.filter(item => {
        if (appliedFilters.minRevenue && item.totalRevenue < Number(appliedFilters.minRevenue)) return false;
        if (appliedFilters.maxRevenue && item.totalRevenue > Number(appliedFilters.maxRevenue)) return false;
        if (appliedFilters.minSold && item.totalSold < Number(appliedFilters.minSold)) return false;
        if (appliedFilters.maxSold && item.totalSold > Number(appliedFilters.maxSold)) return false;
        if (appliedFilters.minPrice && item.price < Number(appliedFilters.minPrice)) return false;
        if (appliedFilters.maxPrice && item.price > Number(appliedFilters.maxPrice)) return false;
        return true;
      });

      if (appliedFilters.sortBy) {
        result = [...result].sort((a, b) => {
          switch (appliedFilters.sortBy) {
            case 'revenue': return b.totalRevenue - a.totalRevenue;
            case 'sold': return b.totalSold - a.totalSold;
            case 'popularity': return b.popularity - a.popularity;
            case 'price': return b.price - a.price;
            default: return 0;
          }
        });
      }
      return result;
    } catch (e) { return data; }
  }, [data, appliedFilters]);

  const stats = useMemo(() => {
    try {
      return {
        totalPackages: filteredData.length,
        totalSold: filteredData.reduce((sum, d) => sum + (d.totalSold || 0), 0),
        totalRevenue: filteredData.reduce((sum, d) => sum + (d.totalRevenue || 0), 0),
        avgPrice: filteredData.length > 0 ? (filteredData.reduce((sum, d) => sum + (d.price || 0), 0) / filteredData.length).toFixed(0) : 0,
        topPackage: filteredData.length > 0 ? filteredData.reduce((max, d) => (d.totalSold || 0) > (max.totalSold || 0) ? d : max, filteredData[0]) : null,
        mostPopular: filteredData.length > 0 ? filteredData.reduce((max, d) => (d.popularity || 0) > (max.popularity || 0) ? d : max, filteredData[0]) : null
      };
    } catch (e) { return { totalPackages: 0, totalSold: 0, totalRevenue: 0, avgPrice: 0, topPackage: null, mostPopular: null }; }
  }, [filteredData]);

  const soldData = useMemo(() => filteredData.map(d => ({ name: d.name, value: d.totalSold })), [filteredData]);
  const revenueData = useMemo(() => filteredData.map(d => ({ name: d.name, value: d.totalRevenue })), [filteredData]);
  const popularityData = useMemo(() => filteredData.map(d => ({ name: d.name, value: d.popularity })), [filteredData]);

  const hasActiveFilters = filters.minRevenue || filters.maxRevenue || filters.minSold || 
                           filters.maxSold || filters.minPrice || filters.maxPrice || filters.sortBy !== 'revenue';
  
  const clearFilters = () => { 
    setFilters({ minRevenue: '', maxRevenue: '', minSold: '', maxSold: '', minPrice: '', maxPrice: '', sortBy: 'revenue' }); 
    setAppliedFilters({}); 
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  return (
    <ErrorBoundary>
      <div>
        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <FilterField label="Min Revenue (PKR)">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minRevenue} onChange={e => setFilters({...filters, minRevenue: e.target.value})} placeholder="e.g. 1000000" />
          </FilterField>
          <FilterField label="Max Revenue (PKR)">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxRevenue} onChange={e => setFilters({...filters, maxRevenue: e.target.value})} placeholder="e.g. 5000000" />
          </FilterField>
          <FilterField label="Min Sold">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minSold} onChange={e => setFilters({...filters, minSold: e.target.value})} placeholder="e.g. 10" />
          </FilterField>
          <FilterField label="Max Sold">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxSold} onChange={e => setFilters({...filters, maxSold: e.target.value})} placeholder="e.g. 100" />
          </FilterField>
          <FilterField label="Min Price (PKR)">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})} placeholder="e.g. 50000" />
          </FilterField>
          <FilterField label="Max Price (PKR)">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})} placeholder="e.g. 500000" />
          </FilterField>
          <FilterField label="Sort By">
            <ReactSelect
              value={filters.sortBy}
              onChange={(val) => setFilters(prev => ({ ...prev, sortBy: val || 'revenue' }))}
              options={[
                { value: 'revenue', label: 'Revenue' },
                { value: 'sold', label: 'Most Sold' },
                { value: 'popularity', label: 'Popularity' },
                { value: 'price', label: 'Price' }
              ]}
              placeholder="Sort By"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <div className="flex items-end print:hidden">
            <button onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </FilterCard>

        <ExportToolbar
          title="Package Performance Report"
          dataCount={filteredData.length}
          onExportCSV={() => exportToCSV(filteredData, 'Package_Performance')}
          onExportPDF={() => exportToPDF(reportId, 'Package_Performance')}
          onPrint={() => window.print()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total Packages" value={stats.totalPackages} icon={Package} />
          <SummaryCard title="Total Sold" value={stats.totalSold} icon={CheckCircle2} trend="Sales" trendUp={true} />
          <SummaryCard title="Total Revenue" value={formatMoney(stats.totalRevenue)} icon={DollarSign} />
          <SummaryCard title="Avg Price" value={formatMoney(stats.avgPrice)} icon={Wallet} />
        </div>

        {(stats.topPackage || stats.mostPopular) && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {stats.topPackage && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="p-2 bg-[#C89B3C]/10 rounded-lg">
                    <Award className="h-5 w-5 text-[#C89B3C]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Top Selling Package</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Package</p>
                    <p className="font-bold text-gray-900">{stats.topPackage.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sold</p>
                    <p className="font-bold text-emerald-600">{stats.topPackage.totalSold} times</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue</p>
                    <p className="font-bold text-blue-600">{formatMoney(stats.topPackage.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price</p>
                    <p className="font-bold text-violet-600">{formatMoney(stats.topPackage.price)}</p>
                  </div>
                </div>
              </div>
            )}
            {stats.mostPopular && stats.mostPopular.id !== stats.topPackage?.id && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Star className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Most Popular Package</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Package</p>
                    <p className="font-bold text-gray-900">{stats.mostPopular.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Popularity</p>
                    <p className="font-bold text-amber-600">{stats.mostPopular.popularity}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sold</p>
                    <p className="font-bold text-emerald-600">{stats.mostPopular.totalSold} times</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue</p>
                    <p className="font-bold text-blue-600">{formatMoney(stats.mostPopular.totalRevenue)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SimpleBarChart data={soldData} valueKey="value" labelKey="name" color={THEME.primary} title="Sales Count per Package" />
          <SimpleBarChart data={revenueData} valueKey="value" labelKey="name" color="#059669" title="Revenue per Package (PKR)" />
          <SimpleBarChart data={popularityData} valueKey="value" labelKey="name" color="#8b5cf6" title="Popularity Score per Package" />
        </div>

        <div id={reportId}>
          <DataTable
            title="Package Details"
            count={filteredData.length}
            emptyMessage="No packages found"
            data={filteredData}
            keyExtractor={(row, i) => row.id || i}
            columns={[
              { header: 'Package', accessor: 'name', cell: row => <span className="font-semibold text-gray-900">{row.name}</span> },
              { header: 'Price', accessor: 'price', align: 'right', cell: row => formatMoney(row.price) },
              { header: 'Sold', accessor: 'totalSold', align: 'right', cell: row => <span className="font-semibold text-gray-900">{row.totalSold}</span> },
              { header: 'Revenue', accessor: 'totalRevenue', align: 'right', cell: row => formatMoney(row.totalRevenue) },
              { header: 'Avg Guests', accessor: 'avgGuestCount', align: 'right' },
              { header: 'Duration', accessor: 'duration' },
              { header: 'Popularity', accessor: 'popularity', align: 'center', cell: row => (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(row.popularity,100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-600">{row.popularity}%</span>
                </div>
              )},
              { header: 'Performance', accessor: 'popularity', align: 'center', cell: row => (
                <StatusBadge status={row.popularity > 70 ? 'active' : row.popularity > 40 ? 'pending' : 'low'}
                  label={row.popularity > 70 ? 'EXCELLENT' : row.popularity > 40 ? 'GOOD' : 'POOR'} />
              )},
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════
// TAB 6: EVENT COSTING VS REVENUE REPORT
// ═══════════════════════════════════════════════════════════
const CostingRevenueReport = ({ data: rawData }) => {
  const reportId = 'costing-revenue-report';
  const [filters, setFilters] = useState({ 
    status: '', 
    fromDate: '', 
    toDate: '', 
    minProfit: '', 
    maxProfit: '',
    minCost: '',
    maxCost: '',
    minRevenue: '',
    maxRevenue: '',
    hallName: '',
    sortBy: 'profit'
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const data = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    return rawData.map((item, idx) => {
      const cost = safeNum(item, 'totalCost', safeNum(item, 'total_cost', safeNum(item, 'cost', 0)));
      const rev = safeNum(item, 'revenue', safeNum(item, 'totalRevenue', safeNum(item, 'total_revenue', 0)));
      const prof = safeNum(item, 'profit', rev - cost);
      return {
        id: safeNum(item, 'id', idx + 1),
        eventName: safeStr(item, 'eventName', safeStr(item, 'event_name', safeStr(item, 'name', `Event ${idx+1}`))),
        hallName: safeStr(item, 'hallName', safeStr(item, 'hall_name', safeStr(item, 'hall', '-'))),
        startTime: safeStr(item, 'startTime', safeStr(item, 'start_time', safeStr(item, 'start', '-'))),
        status: safeStr(item, 'status', 'ongoing').toLowerCase(),
        totalCost: cost,
        revenue: rev,
        profit: prof,
        profitMargin: safeNum(item, 'profitMargin', safeNum(item, 'profit_margin', rev > 0 ? ((rev - cost) / rev * 100).toFixed(2) : 0)),
        dishCount: safeNum(item, 'dishCount', safeNum(item, 'dish_count', 0)),
        inventoryUsed: safeNum(item, 'inventoryUsed', safeNum(item, 'inventory_used', 0))
      };
    });
  }, [rawData]);

  const filteredData = useMemo(() => {
    try {
      let result = data.filter(item => {
        if (appliedFilters.status && item.status !== appliedFilters.status) return false;
        if (appliedFilters.hallName && item.hallName !== appliedFilters.hallName) return false;
        if (appliedFilters.fromDate && item.startTime && item.startTime < appliedFilters.fromDate) return false;
        if (appliedFilters.toDate && item.startTime && item.startTime > appliedFilters.toDate) return false;
        if (appliedFilters.minProfit && item.profit < Number(appliedFilters.minProfit)) return false;
        if (appliedFilters.maxProfit && item.profit > Number(appliedFilters.maxProfit)) return false;
        if (appliedFilters.minCost && item.totalCost < Number(appliedFilters.minCost)) return false;
        if (appliedFilters.maxCost && item.totalCost > Number(appliedFilters.maxCost)) return false;
        if (appliedFilters.minRevenue && item.revenue < Number(appliedFilters.minRevenue)) return false;
        if (appliedFilters.maxRevenue && item.revenue > Number(appliedFilters.maxRevenue)) return false;
        return true;
      });

      if (appliedFilters.sortBy) {
        result = [...result].sort((a, b) => {
          switch (appliedFilters.sortBy) {
            case 'profit': return b.profit - a.profit;
            case 'margin': return Number(b.profitMargin) - Number(a.profitMargin);
            case 'revenue': return b.revenue - a.revenue;
            case 'cost': return b.totalCost - a.totalCost;
            default: return 0;
          }
        });
      }
      return result;
    } catch (e) { return data; }
  }, [data, appliedFilters]);

  const stats = useMemo(() => {
    try {
      const totalCost = filteredData.reduce((sum, d) => sum + (d.totalCost || 0), 0);
      const totalRevenue = filteredData.reduce((sum, d) => sum + (d.revenue || 0), 0);
      const totalProfit = filteredData.reduce((sum, d) => sum + (d.profit || 0), 0);
      const profitable = filteredData.filter(d => (d.profit || 0) > 0).length;
      const lossMaking = filteredData.filter(d => (d.profit || 0) < 0).length;
      return {
        totalCost, totalRevenue, totalProfit, profitable, lossMaking,
        avgMargin: filteredData.length > 0 ? (filteredData.reduce((sum, d) => sum + Number(d.profitMargin || 0), 0) / filteredData.length).toFixed(2) : 0,
        totalEvents: filteredData.length,
        successRate: filteredData.length > 0 ? (profitable / filteredData.length * 100).toFixed(1) : 0
      };
    } catch (e) { return { totalCost: 0, totalRevenue: 0, totalProfit: 0, profitable: 0, lossMaking: 0, avgMargin: 0, totalEvents: 0, successRate: 0 }; }
  }, [filteredData]);

  const profitData = useMemo(() => filteredData.map(d => ({ name: String(d.eventName).substring(0, 20), value: d.profit })).slice(0, 15), [filteredData]);
  const costRevenueData = useMemo(() => filteredData.slice(0, 10).map(d => ({ name: String(d.eventName).substring(0, 15), cost: d.totalCost, revenue: d.revenue })), [filteredData]);

  const marginDistribution = useMemo(() => {
    try {
      const ranges = { '0-10%': 0, '10-20%': 0, '20-30%': 0, '30%+': 0, 'Loss': 0 };
      filteredData.forEach(d => {
        const margin = Number(d.profitMargin || 0);
        if (margin < 0) ranges['Loss']++;
        else if (margin < 10) ranges['0-10%']++;
        else if (margin < 20) ranges['10-20%']++;
        else if (margin < 30) ranges['20-30%']++;
        else ranges['30%+']++;
      });
      return Object.entries(ranges).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    } catch (e) { return []; }
  }, [filteredData]);

  const uniqueHalls = [...new Set(data.map(d => d.hallName).filter(Boolean))];

  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate || filters.minProfit || 
                           filters.maxProfit || filters.minCost || filters.maxCost || 
                           filters.minRevenue || filters.maxRevenue || filters.hallName || filters.sortBy !== 'profit';
  
  const clearFilters = () => { 
    setFilters({ status: '', fromDate: '', toDate: '', minProfit: '', maxProfit: '', 
                 minCost: '', maxCost: '', minRevenue: '', maxRevenue: '', hallName: '', sortBy: 'profit' }); 
    setAppliedFilters({}); 
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  return (
    <ErrorBoundary>
      <div>
        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <FilterField label="Status">
            <ReactSelect
              value={filters.status}
              onChange={(val) => setFilters(prev => ({ ...prev, status: val || '' }))}
              options={[
                { value: '', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'finalized', label: 'Finalized' },
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              placeholder="All Status"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="Hall">
            <ReactSelect
              value={filters.hallName}
              onChange={(val) => setFilters(prev => ({ ...prev, hallName: val || '' }))}
              options={[
                { value: '', label: 'All Halls' },
                ...uniqueHalls.map(h => ({ value: h, label: h }))
              ]}
              placeholder="All Halls"
              isSearchable={true}
              isClearable={false}
            />
          </FilterField>
          <FilterField label="From Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} />
          </FilterField>
          <FilterField label="To Date">
            <input type="date" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} />
          </FilterField>
          <FilterField label="Min Cost">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minCost} onChange={e => setFilters({...filters, minCost: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Cost">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxCost} onChange={e => setFilters({...filters, maxCost: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <FilterField label="Min Revenue">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minRevenue} onChange={e => setFilters({...filters, minRevenue: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Revenue">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxRevenue} onChange={e => setFilters({...filters, maxRevenue: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <FilterField label="Min Profit">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.minProfit} onChange={e => setFilters({...filters, minProfit: e.target.value})} placeholder="Min PKR" />
          </FilterField>
          <FilterField label="Max Profit">
            <input type="number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]"
              value={filters.maxProfit} onChange={e => setFilters({...filters, maxProfit: e.target.value})} placeholder="Max PKR" />
          </FilterField>
          <FilterField label="Sort By">
            <ReactSelect
              value={filters.sortBy}
              onChange={(val) => setFilters(prev => ({ ...prev, sortBy: val || 'profit' }))}
              options={[
                { value: 'profit', label: 'Profit' },
                { value: 'margin', label: 'Profit Margin' },
                { value: 'revenue', label: 'Revenue' },
                { value: 'cost', label: 'Cost' }
              ]}
              placeholder="Sort By"
              isSearchable={false}
              isClearable={false}
            />
          </FilterField>
          <div className="flex items-end print:hidden">
            <button onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </FilterCard>

        <ExportToolbar
          title="Costing vs Revenue Report"
          dataCount={filteredData.length}
          onExportCSV={() => exportToCSV(filteredData, 'Costing_vs_Revenue')}
          onExportPDF={() => exportToPDF(reportId, 'Costing_vs_Revenue')}
          onPrint={() => window.print()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total Cost" value={formatMoney(stats.totalCost)} icon={TrendingDown} trend="Expense" trendUp={false} />
          <SummaryCard title="Total Revenue" value={formatMoney(stats.totalRevenue)} icon={TrendingUp} trend="Income" trendUp={true} />
          <SummaryCard title="Net Profit" value={formatMoney(stats.totalProfit)} icon={BarChart4} trend={stats.totalProfit >= 0 ? 'Profit' : 'Loss'} trendUp={stats.totalProfit >= 0} />
          <SummaryCard title="Avg Margin" value={`${stats.avgMargin}%`} icon={Percent} />
          <SummaryCard title="Profitable" value={stats.profitable} icon={ArrowUpRight} trend="Winners" trendUp={true} />
          <SummaryCard title="Loss Making" value={stats.lossMaking} icon={ArrowDownRight} trend="Losers" trendUp={false} />
          <SummaryCard title="Total Events" value={stats.totalEvents} icon={LayoutDashboard} />
          <SummaryCard title="Success Rate" value={`${stats.successRate}%`} icon={Target} trend="Efficiency" trendUp={Number(stats.successRate) > 50} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SimpleBarChart data={profitData} valueKey="value" labelKey="name" color={stats.totalProfit >= 0 ? '#059669' : '#dc2626'} title="Profit/Loss per Event (PKR)" />
          <SimplePieChart data={marginDistribution} valueKey="value" labelKey="name" title="Profit Margin Distribution" />
        </div>

        {costRevenueData.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-[#C89B3C]" />
              <h3 className="text-base font-bold text-gray-900">Cost vs Revenue Comparison (Top 10 Events)</h3>
            </div>
            <div className="space-y-3">
              {costRevenueData.map((item, idx) => {
                const maxVal = Math.max(...costRevenueData.flatMap(d => [d.cost, d.revenue]), 1);
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="text-gray-500">
                        <span className="text-red-500">Cost: {formatMoney(item.cost)}</span>
                        <span className="mx-2">|</span>
                        <span className="text-emerald-500">Revenue: {formatMoney(item.revenue)}</span>
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <div className="h-3 flex-1 overflow-hidden rounded bg-red-100">
                        <div className="h-full rounded bg-red-500" style={{ width: `${(item.cost / maxVal) * 100}%` }} />
                      </div>
                      <div className="h-3 flex-1 overflow-hidden rounded bg-emerald-100">
                        <div className="h-full rounded bg-emerald-500" style={{ width: `${(item.revenue / maxVal) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>Cost: {((item.cost / maxVal) * 100).toFixed(0)}%</span>
                      <span>Revenue: {((item.revenue / maxVal) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div id={reportId}>
          <DataTable
            title="Profit/Loss Details"
            count={filteredData.length}
            emptyMessage="No events found"
            data={filteredData}
            keyExtractor={(row, i) => row.id || i}
            columns={[
              { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
              { header: 'Event', accessor: 'eventName' },
              { header: 'Hall', accessor: 'hallName' },
              { header: 'Cost', accessor: 'totalCost', align: 'right', cell: row => <span className="text-red-600">{row.totalCost.toLocaleString()}</span> },
              { header: 'Revenue', accessor: 'revenue', align: 'right', cell: row => <span className="text-emerald-600">{row.revenue.toLocaleString()}</span> },
              { header: 'Profit', accessor: 'profit', align: 'right', cell: row => <span className={`font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()}</span> },
              { header: 'Margin', accessor: 'profitMargin', align: 'center', cell: row => <span className="font-semibold text-gray-700">{row.profitMargin}%</span> },
              { header: 'Status', accessor: 'status', align: 'center', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
              { header: 'Result', accessor: 'profit', align: 'center', cell: row => (
                <StatusBadge status={row.profit >= 0 ? 'active' : 'low'} label={row.profit >= 0 ? 'PROFIT' : 'LOSS'} />
              )},
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT: BOOKING & EVENT REPORTS PAGE
// ═══════════════════════════════════════════════════════════
const BookingEventReports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [eventExecutions, setEventExecutions] = useState([]);
  const [halls, setHalls] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadStatus, setLoadStatus] = useState({});

  const tabs = [
    { id: 0, name: 'Booking Summary', icon: BarChart3 },
    { id: 1, name: 'Payment Collection', icon: DollarSign },
    { id: 2, name: 'Event Execution', icon: Zap },
    { id: 3, name: 'Hall Utilization', icon: Landmark },
    { id: 4, name: 'Package Performance', icon: Package },
    { id: 5, name: 'Costing vs Revenue', icon: TrendingUp }
  ];

  useEffect(() => {
    console.log('BookingEventReports mounting...');
    const loadData = async () => {
      setLoading(true); setError(null);
      const status = {};

      try {
        try {
          const res = await bookingApi.getAll();
          const data = extractArray(res);
          status.bookings = { source: 'API', count: data.length };
          setBookings(data);
          console.log('Bookings loaded:', data.length);
        } catch (e) {
          console.warn('Booking API failed, using mock:', e.message);
          status.bookings = { source: 'MOCK', count: 20 };
          setBookings(genMockBookings());
        }

        try {
          const res = await eventExecutionApi.getAll();
          const data = extractArray(res);
          status.events = { source: 'API', count: data.length };
          setEventExecutions(data);
          console.log('Events loaded:', data.length);
        } catch (e) {
          console.warn('Event API failed, using mock:', e.message);
          status.events = { source: 'MOCK', count: 15 };
          setEventExecutions(genMockEvents());
        }

        try {
          const res = await hallApi.getAll();
          const data = extractArray(res);
          status.halls = { source: 'API', count: data.length };
          setHalls(data);
          console.log('Halls loaded:', data.length);
        } catch (e) {
          console.warn('Hall API failed, using mock:', e.message);
          status.halls = { source: 'MOCK', count: 8 };
          setHalls(genMockHalls());
        }

        try {
          const res = await packageApi.getAll();
          const data = extractArray(res);
          status.packages = { source: 'API', count: data.length };
          setPackages(data);
          console.log('Packages loaded:', data.length);
        } catch (e) {
          console.warn('Package API failed, using mock:', e.message);
          status.packages = { source: 'MOCK', count: 8 };
          setPackages(genMockPackages());
        }

        setLoadStatus(status);
      } catch (error) {
        console.error('Data load error:', error);
        setError('Data load karne mein error aaya. Mock data use ho rahi hai.');
        setBookings(genMockBookings());
        setEventExecutions(genMockEvents());
        setHalls(genMockHalls());
        setPackages(genMockPackages());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-[#C89B3C]" />
        <p className="font-medium text-gray-500">Reports load ho rahi hain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="mb-2 text-lg font-bold text-red-700">Error</p>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A97A1F]"
          >
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const totalRecords = bookings.length + eventExecutions.length + halls.length + packages.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BOOKING & EVENT REPORTS</h1>
              <p className="text-sm text-gray-500 mt-1">Complete analytics dashboard for your banquet management system</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-gray-900">BOOKING & EVENT REPORTS</h1>
          <p className="text-sm text-gray-500">Generated on: {now.toLocaleDateString('en-GB')}</p>
          <p className="text-sm text-gray-500">Report: {tabs.find(t => t.id === activeTab)?.name}</p>
          <hr className="my-4 border-gray-300" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6 overflow-x-auto print:hidden">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#C89B3C] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 0 && <BookingSummaryReport data={bookings} />}
          {activeTab === 1 && <PaymentCollectionReport data={bookings} />}
          {activeTab === 2 && <EventExecutionReport data={eventExecutions} />}
          {activeTab === 3 && <HallUtilizationReport data={halls} />}
          {activeTab === 4 && <PackagePerformanceReport data={packages} />}
          {activeTab === 5 && <CostingRevenueReport data={eventExecutions} />}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 print:hidden">
          <p>UniSoft Enterprise ERP — Booking & Event Reports Module</p>
        </div>
      </div>
    </div>
  );
};

export default BookingEventReports;