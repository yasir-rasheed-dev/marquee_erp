// pages/KitchenProductionReports.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ChefHat, ClipboardList, DollarSign, TrendingUp, UtensilsCrossed,
  Package, Filter, Download, Printer, Search, Calendar, RefreshCw,
  ChevronDown, ChevronUp, Eye, X, FileText, BarChart3, ArrowUpDown,
  CheckCircle2, Clock, AlertCircle, CookingPot, Flame,
  PieChart, Layers, Box, Minus, RotateCcw,
  CalendarDays, Tag, Percent, Hash, Weight
} from 'lucide-react';

import kitchenOrderApi from '../../services/kitchenOrderApi';
import productionPlanApi from '../../services/productionApi';
import bookingApi from '../../services/bookingApi';
import recipeApi from '../../services/recipeApi';
import eventExecutionApi from '../../services/eventExecutionApi';
import menuApi from '../../services/menuApi';
import categoryApi from '../../services/categoryApi'; // 🔥 ADDED

const formatMoney = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'PKR 0.00';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const extractArray = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response.data?.results && Array.isArray(response.data.results)) return response.data.results;
  if (response.data?.items && Array.isArray(response.data.items)) return response.data.items;
  if (response.data?.list && Array.isArray(response.data.list)) return response.data.list;
  if (response.data?.records && Array.isArray(response.data.records)) return response.data.records;
  if (response.data?.content && Array.isArray(response.data.content)) return response.data.content;
  if (response.data?.orders && Array.isArray(response.data.orders)) return response.data.orders;
  if (response.data?.plans && Array.isArray(response.data.plans)) return response.data.plans;
  if (response.data?.bookings && Array.isArray(response.data.bookings)) return response.data.bookings;
  if (response.data?.ingredients && Array.isArray(response.data.ingredients)) return response.data.ingredients;
  if (response.data?.usages && Array.isArray(response.data.usages)) return response.data.usages;
  if (response.data?.consumptions && Array.isArray(response.data.consumptions)) return response.data.consumptions;
  if (response.data?.categories && Array.isArray(response.data.categories)) return response.data.categories;
  console.warn('extractArray: Unknown response format', response);
  return [];
};

const extractObject = (response) => {
  if (!response) return null;
  if (response.data !== undefined) return response.data;
  return response;
};

const normalizeStatus = (status) => {
  if (!status) return 'pending';
  const s = String(status).toLowerCase().trim().replace(/[_\s]/g, '-');
  const map = {
    'pending': 'pending',
    'pend': 'pending',
    'prepare': 'preparing',
    'preparing': 'preparing',
    'prep': 'preparing',
    'in-progress': 'in-progress',
    'inprogress': 'in-progress',
    'progress': 'in-progress',
    'completed': 'completed',
    'complete': 'completed',
    'done': 'completed',
    'finished': 'completed',
    'served': 'served',
    'serve': 'served',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'cancel': 'cancelled',
    'planned': 'planned',
    'plan': 'planned',
    'active': 'active',
    'inactive': 'inactive',
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
  };
  return map[s] || s;
};

const isDateInRange = (dateStr, fromStr, toStr) => {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  if (isNaN(date)) return true;
  if (fromStr) {
    const from = new Date(fromStr);
    from.setHours(0, 0, 0, 0);
    if (date < from) return false;
  }
  if (toStr) {
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str}"`
          : str;
      }).join(',')
    )
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

const downloadPDF = (data, filename) => {
  if (!data || !data.length) return;
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [169, 122, 31];
  doc.setFillColor(245, 242, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('Marquee ERP', 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Marquee Management System', 14, 21);
  doc.setFontSize(13);
  doc.setTextColor(26, 26, 26);
  doc.text(filename.replace(/_/g, ' ').toUpperCase(), pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - 14, 12, { align: 'right' });
  const headers = Object.keys(data[0]).map(h => h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
  const body = data.map(row => Object.values(row).map(v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return String(v).substring(0, 50);
    return String(v);
  }));
  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', overflow: 'linebreak' },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 245] },
  });
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`(c) 2026 Marquee ERP - Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

const StatusBadge = ({ status, children }) => {
  const normalized = normalizeStatus(status);
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    preparing: 'bg-blue-100 text-blue-700 border-blue-200',
    served: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    planned: 'bg-gray-100 text-gray-700 border-gray-200',
    'in-progress': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200',
    low: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-green-100 text-green-700 border-green-200',
  };
  const style = styles[normalized] || styles.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {children || normalized}
    </span>
  );
};

const SummaryCard = ({ icon: Icon, label, value, subtext, color = 'gold' }) => {
  const colors = {
    gold: 'text-[#2563EB] bg-[#2563EB]/10',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    gray: 'text-gray-600 bg-gray-50',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color] || colors.gold}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const FilterCard = ({ title, icon: Icon, children, onReset, onApply, loading }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-[#2563EB]" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          onClick={onApply}
          disabled={loading}
          className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-[#2563EB] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          {loading ? 'Loading...' : 'Apply Filters'}
        </button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  </div>
);

const DataTable = ({ columns, data, loading, emptyText = 'No data found', onRowClick, sortable = true }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <RefreshCw size={32} className="animate-spin mx-auto text-[#2563EB] mb-3" />
        <p className="text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                    col.sortable !== false && sortable ? 'cursor-pointer hover:text-[#2563EB]' : ''
                  } ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortable && col.sortable !== false && sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                    {sortable && col.sortable !== false && sortConfig.key !== col.key && (
                      <ArrowUpDown size={12} className="text-gray-300" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
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

const ExportToolbar = ({ onExport, onPrint, data, filename, title }) => (
  <div className="flex items-center justify-between mb-4 print:hidden">
    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    <div className="flex items-center gap-2">
      <button
        onClick={() => downloadPDF(data, filename)}
        disabled={!data?.length}
        className="px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
      >
        <FileText size={14} /> PDF
      </button>
      <button
        onClick={() => exportToCSV(data, filename)}
        disabled={!data?.length}
        className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1.5 disabled:opacity-40"
      >
        <Download size={14} /> Export CSV
      </button>
      <button
        onClick={onPrint}
        className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1.5"
      >
        <Printer size={14} /> Print
      </button>
    </div>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, icon: Icon }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all ${Icon ? 'pl-9' : ''}`}
      />
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options, icon: Icon }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all bg-white ${Icon ? 'pl-9' : ''}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  </div>
);

const KitchenOrderReport = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    branchId: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10000 };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.branchId) params.branchId = filters.branchId;

      const res = await kitchenOrderApi.getAll(params);
      let arr = extractArray(res);
      console.log('KitchenOrderReport raw data:', arr.length, arr[0]);

      arr = arr.map(order => ({
        ...order,
        id: order.id || order.orderId || order._id,
        customerName: order.customerName || order.customer?.name || order.guestName || order.booking?.customerName || order.booking?.customer?.name || order.clientName || '-',
        orderNumber: order.orderNumber || order.orderNo || order.orderCode || order.orderRef || order.reference || `#${order.id || order.orderId}`,
        itemCount: order.itemCount || order.items?.length || order._count?.items || order.orderItems?.length || order.products?.length || 0,
        totalAmount: order.totalAmount || order.amount || order.grandTotal || order.total || order.sum || 0,
        createdAt: order.createdAt || order.orderDate || order.date || order.created_at || order.timestamp,
        status: normalizeStatus(order.status || order.orderStatus || order.state || order.orderState)
      }));

      setAllData(arr);
    } catch (err) {
      console.error('Kitchen Order Report error:', err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.branchId]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.status) result = result.filter(d => d.status === filters.status);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(d =>
        String(d.id).includes(s) ||
        String(d.orderNumber).toLowerCase().includes(s) ||
        String(d.customerName).toLowerCase().includes(s) ||
        String(d.status).toLowerCase().includes(s)
      );
    }
    if (filters.dateFrom || filters.dateTo) {
      result = result.filter(d => isDateInRange(d.createdAt, filters.dateFrom, filters.dateTo));
    }
    return result;
  }, [allData, filters]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const pending = filteredData.filter(d => d.status === 'pending').length;
    const preparing = filteredData.filter(d => d.status === 'preparing').length;
    const served = filteredData.filter(d => d.status === 'served').length;
    const cancelled = filteredData.filter(d => d.status === 'cancelled').length;
    return { total, pending, preparing, served, cancelled };
  }, [filteredData]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'id', label: 'Order #', sortable: true },
    { key: 'orderNumber', label: 'Order No', sortable: true, render: (row) => row.orderNumber || `#${row.id}` },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'customerName', label: 'Customer', sortable: true, render: (row) => row.customerName || '-' },
    { key: 'itemCount', label: 'Items', sortable: true, render: (row) => {
      const count = row.itemCount || 0;
      return <span className={count > 0 ? 'font-semibold text-gray-900' : 'text-gray-400'}>{count}</span>;
    }},
    { key: 'totalAmount', label: 'Amount', sortable: true, render: (row) => formatMoney(row.totalAmount || 0) },
    { key: 'createdAt', label: 'Date', sortable: true, render: (row) => formatDateTime(row.createdAt) },
    { key: 'actions', label: '', sortable: false, className: 'w-10', render: () => <Eye size={16} className="text-gray-400 hover:text-[#2563EB] cursor-pointer" /> }
  ];

  return (
    <div>
      <ExportToolbar title="Kitchen Order Report (KDS)" data={filteredData} filename="kitchen_order_report" onPrint={() => window.print()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard icon={ClipboardList} label="Total Orders" value={summary.total} color="gold" />
        <SummaryCard icon={Clock} label="Pending" value={summary.pending} color="orange" />
        <SummaryCard icon={CookingPot} label="Preparing" value={summary.preparing} color="blue" />
        <SummaryCard icon={CheckCircle2} label="Served" value={summary.served} color="green" />
        <SummaryCard icon={X} label="Cancelled" value={summary.cancelled} color="red" />
      </div>
      <FilterCard title="Filters" onReset={() => setFilters({ status: '', search: '', dateFrom: '', dateTo: '', branchId: '' })} onApply={fetchData} loading={loading}>
        <SelectField label="Status" icon={Tag} value={filters.status} onChange={(v) => updateFilter('status', v)} options={[
          { value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'preparing', label: 'Preparing' }, { value: 'served', label: 'Served' }, { value: 'cancelled', label: 'Cancelled' }
        ]} />
        <InputField label="Search" icon={Search} value={filters.search} onChange={(v) => updateFilter('search', v)} placeholder="Order # or customer..." />
        <InputField label="From Date" type="date" icon={Calendar} value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} />
        <InputField label="To Date" type="date" icon={Calendar} value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} />
      </FilterCard>
      <DataTable columns={columns} data={filteredData} loading={loading} />
    </div>
  );
};

const ProductionPlanReport = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', bookingId: '', dateFrom: '', dateTo: '', search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10000 };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.bookingId) params.bookingId = filters.bookingId;

      const res = await productionPlanApi.getAll(params);
      let arr = extractArray(res);
      console.log('ProductionPlanReport raw data:', arr.length, arr[0]);

      arr = arr.map(p => ({
        ...p,
        id: p.id || p.planId || p._id,
        bookingId: p.bookingId || p.booking?.id,
        eventName: p.eventName || p.booking?.eventName || p.booking?.name || p.booking?.customerName || p.booking?.customer?.name || p.event?.name || p.title || null,
        planDate: p.planDate || p.date || p.plan_date || p.scheduledDate,
        status: normalizeStatus(p.status || p.planStatus || p.state || p.planState),
        itemCount: p.items?.length || p.itemCount || p._count?.items || p.planItems?.length || p.products?.length || 0,
        notes: p.notes || p.description || p.remarks || ''
      }));

      setAllData(arr);
    } catch (err) {
      console.error('Production Plan Report error:', err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.bookingId]);

  useEffect(() => { fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.status) result = result.filter(d => d.status === filters.status);
    if (filters.bookingId) result = result.filter(d => String(d.bookingId).includes(filters.bookingId));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(d => String(d.id).includes(s) || String(d.eventName).toLowerCase().includes(s) || String(d.notes).toLowerCase().includes(s));
    }
    if (filters.dateFrom || filters.dateTo) result = result.filter(d => isDateInRange(d.planDate, filters.dateFrom, filters.dateTo));
    return result;
  }, [allData, filters]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const planned = filteredData.filter(d => d.status === 'planned').length;
    const inProgress = filteredData.filter(d => d.status === 'in-progress').length;
    const completed = filteredData.filter(d => d.status === 'completed').length;
    const cancelled = filteredData.filter(d => d.status === 'cancelled').length;
    return { total, planned, inProgress, completed, cancelled };
  }, [filteredData]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'id', label: 'Plan ID', sortable: true },
    { key: 'bookingId', label: 'Booking #', sortable: true, render: (row) => row.bookingId || '-' },
    { key: 'eventName', label: 'Event / Booking', sortable: true, render: (row) => {
      const name = row.eventName;
      if (name) return <span className="font-medium text-gray-900">{name}</span>;
      if (row.bookingId) return <span className="text-gray-500 italic">Booking #{row.bookingId}</span>;
      return '-';
    }},
    { key: 'planDate', label: 'Plan Date', sortable: true, render: (row) => formatDate(row.planDate) },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'itemCount', label: 'Items', sortable: true, render: (row) => {
      const count = row.itemCount || 0;
      return <span className={count > 0 ? 'font-semibold text-gray-900' : 'text-gray-400'}>{count}</span>;
    }},
    { key: 'notes', label: 'Notes', sortable: false, render: (row) => <span className="truncate max-w-[200px] block">{row.notes || '-'}</span> },
    { key: 'actions', label: '', sortable: false, className: 'w-10', render: () => <Eye size={16} className="text-gray-400 hover:text-[#2563EB] cursor-pointer" /> }
  ];

  return (
    <div>
      <ExportToolbar title="Production Plan Report" data={filteredData} filename="production_plan_report" onPrint={() => window.print()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard icon={Layers} label="Total Plans" value={summary.total} color="gold" />
        <SummaryCard icon={CalendarDays} label="Planned" value={summary.planned} color="gray" />
        <SummaryCard icon={Flame} label="In Progress" value={summary.inProgress} color="blue" />
        <SummaryCard icon={CheckCircle2} label="Completed" value={summary.completed} color="green" />
        <SummaryCard icon={X} label="Cancelled" value={summary.cancelled} color="red" />
      </div>
      <FilterCard title="Filters" onReset={() => setFilters({ status: '', bookingId: '', dateFrom: '', dateTo: '', search: '' })} onApply={fetchData} loading={loading}>
        <SelectField label="Status" icon={Tag} value={filters.status} onChange={(v) => updateFilter('status', v)} options={[
          { value: '', label: 'All Statuses' }, { value: 'planned', label: 'Planned' }, { value: 'in-progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }
        ]} />
        <InputField label="Booking ID" icon={Hash} value={filters.bookingId} onChange={(v) => updateFilter('bookingId', v)} placeholder="Enter booking ID..." />
        <InputField label="From Date" type="date" icon={Calendar} value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} />
        <InputField label="To Date" type="date" icon={Calendar} value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} />
      </FilterCard>
      <DataTable columns={columns} data={filteredData} loading={loading} />
    </div>
  );
};

const RecipeCostingReport = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ menuItemId: '', category: '', search: '' });
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]); // 🔥 categoryApi se aayega
  const [catLoading, setCatLoading] = useState(false);

  // 🔥 FETCH CATEGORIES FROM categoryApi
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await categoryApi.getAll({ scope: 'MENU', limit: 10000 });
      const cats = extractArray(res);
      console.log('RecipeCostingReport categories:', cats.length, cats[0]);
      setCategories(cats);
    } catch (err) {
      console.error('Category fetch error:', err);
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, []);

  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await menuApi.getAll({ limit: 10000 });
      setMenuItems(extractArray(res));
    } catch (err) {
      console.error('Menu fetch error:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10000 };
      if (filters.menuItemId) params.menuItemId = filters.menuItemId;

      const res = await recipeApi.getMenuIngredients(params);
      const ingredients = extractArray(res);
      console.log('RecipeCostingReport raw ingredients:', ingredients.length, ingredients[0]);

      const grouped = {};
      ingredients.forEach(ing => {
        const miId = ing.menuItemId || ing.menuItem?.id || ing.menu_item_id;
        if (!miId) return;
        if (!grouped[miId]) {
          grouped[miId] = {
            menuItemId: miId,
            menuItemName: ing.menuItem?.name || ing.menuItemName || ing.menu_item_name || `Item #${miId}`,
            category: ing.menuItem?.category?.name || ing.menuItem?.category || ing.category || 'Uncategorized',
            categoryId: ing.menuItem?.categoryId || ing.menuItem?.category?.id || null,
            ingredients: [],
            totalCost: 0,
            portionSize: ing.menuItem?.portionSize || ing.menuItem?.serves || ing.portionSize || 1
          };
        }
        const cost = (ing.quantity || 0) * (ing.inventoryItem?.avgCost || ing.inventoryItem?.unitCost || ing.unitCost || ing.cost || 0);
        grouped[miId].ingredients.push({
          name: ing.inventoryItem?.name || ing.ingredientName || ing.inventory_item_name || ing.name || 'Unknown',
          quantity: ing.quantity || 0,
          unit: ing.unit || ing.measurementUnit || ing.inventoryItem?.unit || 'units',
          cost: cost
        });
        grouped[miId].totalCost += cost;
      });

      let arr = Object.values(grouped);
      console.log('RecipeCostingReport grouped:', arr.length);
      setAllData(arr);
    } catch (err) {
      console.error('Recipe Costing Report error:', err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, [filters.menuItemId]);

  useEffect(() => {
    fetchCategories(); // 🔥 categories pehle fetch karo
    fetchMenuItems();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.category) {
      result = result.filter(d => {
        // Match by category name OR categoryId
        const catName = String(d.category).toLowerCase();
        const filterCat = String(filters.category).toLowerCase();
        return catName === filterCat || String(d.categoryId) === filters.category;
      });
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(d =>
        d.menuItemName.toLowerCase().includes(s) ||
        d.category.toLowerCase().includes(s) ||
        d.ingredients.some(ing => ing.name.toLowerCase().includes(s))
      );
    }
    return result;
  }, [allData, filters]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const avgCost = total > 0 ? filteredData.reduce((s, d) => s + d.totalCost, 0) / total : 0;
    const maxCost = total > 0 ? Math.max(...filteredData.map(d => d.totalCost)) : 0;
    const minCost = total > 0 ? Math.min(...filteredData.map(d => d.totalCost)) : 0;
    return { total, avgCost, maxCost, minCost };
  }, [filteredData]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  // 🔥 categoryApi se aaye hue categories ko dropdown mein use karo
  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories.map(c => ({
        value: c.name || c.categoryName || c.label || c.title || `Category #${c.id}`,
        label: c.name || c.categoryName || c.label || c.title || `Category #${c.id}`
      }));
    }
    // Fallback: menu items se derive karo
    const cats = [...new Set(menuItems.map(m => m.category?.name || m.category).filter(Boolean))];
    return cats.map(c => ({ value: c, label: c }));
  }, [categories, menuItems]);

  const columns = [
    { key: 'menuItemName', label: 'Menu Item', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'ingredients', label: 'Ingredients', sortable: false, render: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.ingredients.slice(0, 3).map((ing, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{ing.name} ({ing.quantity} {ing.unit})</span>
        ))}
        {row.ingredients.length > 3 && (
          <span className="px-2 py-0.5 bg-[#2563EB]/10 text-[#2563EB] text-xs rounded-md">+{row.ingredients.length - 3} more</span>
        )}
      </div>
    )},
    { key: 'portionSize', label: 'Portions', sortable: true, render: (row) => row.portionSize || 1 },
    { key: 'totalCost', label: 'Recipe Cost', sortable: true, render: (row) => <span className="font-semibold text-gray-900">{formatMoney(row.totalCost)}</span> },
    { key: 'costPerPortion', label: 'Cost / Portion', sortable: true, render: (row) => formatMoney(row.totalCost / (row.portionSize || 1)) },
    { key: 'actions', label: '', sortable: false, className: 'w-10', render: () => <Eye size={16} className="text-gray-400 hover:text-[#2563EB] cursor-pointer" /> }
  ];

  return (
    <div>
      <ExportToolbar title="Recipe Costing / Food Cost Report" data={filteredData} filename="recipe_costing_report" onPrint={() => window.print()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={ChefHat} label="Total Recipes" value={summary.total} color="gold" />
        <SummaryCard icon={DollarSign} label="Avg Recipe Cost" value={formatMoney(summary.avgCost)} color="blue" />
        <SummaryCard icon={TrendingUp} label="Highest Cost" value={formatMoney(summary.maxCost)} color="red" />
        <SummaryCard icon={PieChart} label="Lowest Cost" value={formatMoney(summary.minCost)} color="green" />
      </div>
      <FilterCard title="Filters" onReset={() => setFilters({ menuItemId: '', category: '', search: '' })} onApply={fetchData} loading={loading}>
        <SelectField label="Menu Item" icon={UtensilsCrossed} value={filters.menuItemId} onChange={(v) => updateFilter('menuItemId', v)} options={[
          { value: '', label: 'All Menu Items' },
          ...menuItems.map(m => ({ value: String(m.id), label: m.name }))
        ]} />
        <SelectField label="Category" icon={Tag} value={filters.category} onChange={(v) => updateFilter('category', v)} options={[
          { value: '', label: catLoading ? 'Loading categories...' : 'All Categories' },
          ...categoryOptions
        ]} />
        <InputField label="Search" icon={Search} value={filters.search} onChange={(v) => updateFilter('search', v)} placeholder="Search menu item or ingredient..." />
        <div className="flex items-end">
          <button onClick={fetchData} disabled={loading} className="w-full px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#2563EB] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Search Recipes
          </button>
        </div>
      </FilterCard>
      <DataTable columns={columns} data={filteredData} loading={loading} />
    </div>
  );
};

const ProfitabilityReport = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category: '', search: '', minMargin: '', maxMargin: '' });
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]); // 🔥 categoryApi se
  const [catLoading, setCatLoading] = useState(false);

  // 🔥 FETCH CATEGORIES FROM categoryApi
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await categoryApi.getAll({ scope: 'MENU', limit: 10000 });
      const cats = extractArray(res);
      console.log('ProfitabilityReport categories:', cats.length, cats[0]);
      setCategories(cats);
    } catch (err) {
      console.error('Category fetch error:', err);
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, recipeRes] = await Promise.all([
        menuApi.getAll({ limit: 10000 }),
        recipeApi.getMenuIngredients({ limit: 10000 })
      ]);

      const menus = extractArray(menuRes);
      const ingredients = extractArray(recipeRes);
      console.log('ProfitabilityReport menus:', menus.length, 'ingredients:', ingredients.length);
      setMenuItems(menus);

      const costMap = {};
      ingredients.forEach(ing => {
        const miId = ing.menuItemId || ing.menuItem?.id || ing.menu_item_id;
        if (!miId) return;
        if (!costMap[miId]) costMap[miId] = 0;
        costMap[miId] += (ing.quantity || 0) * (ing.inventoryItem?.avgCost || ing.inventoryItem?.unitCost || ing.unitCost || ing.cost || 0);
      });

      let arr = menus.map(item => {
        const recipeCost = costMap[item.id] || 0;
        const salePrice = item.price || item.salePrice || item.rate || 0;
        const profit = salePrice - recipeCost;
        const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
        return {
          ...item,
          recipeCost,
          salePrice,
          profit,
          margin: Math.round(margin * 100) / 100,
          category: item.category?.name || item.category || 'Uncategorized',
          categoryId: item.categoryId || item.category?.id || null,
          name: item.name || item.itemName || item.menuName || `Item #${item.id}`
        };
      });

      setAllData(arr);
    } catch (err) {
      console.error('Profitability Report error:', err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories(); // 🔥 categories pehle fetch karo
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.category) {
      result = result.filter(d => {
        const catName = String(d.category).toLowerCase();
        const filterCat = String(filters.category).toLowerCase();
        return catName === filterCat || String(d.categoryId) === filters.category;
      });
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(s));
    }
    if (filters.minMargin !== '') result = result.filter(d => d.margin >= parseFloat(filters.minMargin));
    if (filters.maxMargin !== '') result = result.filter(d => d.margin <= parseFloat(filters.maxMargin));
    return result;
  }, [allData, filters]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const avgMargin = total > 0 ? filteredData.reduce((s, d) => s + d.margin, 0) / total : 0;
    const profitable = filteredData.filter(d => d.profit > 0).length;
    const lossMaking = filteredData.filter(d => d.profit < 0).length;
    const breakEven = filteredData.filter(d => d.profit === 0).length;
    return { total, avgMargin: Math.round(avgMargin * 100) / 100, profitable, lossMaking, breakEven };
  }, [filteredData]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  // 🔥 categoryApi se aaye hue categories
  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories.map(c => ({
        value: c.name || c.categoryName || c.label || c.title || `Category #${c.id}`,
        label: c.name || c.categoryName || c.label || c.title || `Category #${c.id}`
      }));
    }
    const cats = [...new Set(menuItems.map(m => m.category?.name || m.category).filter(Boolean))];
    return cats.map(c => ({ value: c, label: c }));
  }, [categories, menuItems]);

  const columns = [
    { key: 'name', label: 'Menu Item', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'salePrice', label: 'Sale Price', sortable: true, render: (row) => <span className="font-medium">{formatMoney(row.salePrice)}</span> },
    { key: 'recipeCost', label: 'Recipe Cost', sortable: true, render: (row) => formatMoney(row.recipeCost) },
    { key: 'profit', label: 'Profit', sortable: true, render: (row) => (
      <span className={row.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{formatMoney(row.profit)}</span>
    )},
    { key: 'margin', label: 'Margin %', sortable: true, render: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${row.margin >= 50 ? 'bg-emerald-500' : row.margin >= 30 ? 'bg-[#2563EB]' : row.margin >= 0 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.max(row.margin, 0), 100)}%` }} />
        </div>
        <span className={`text-xs font-semibold ${row.margin >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{row.margin}%</span>
      </div>
    )},
    { key: 'actions', label: '', sortable: false, className: 'w-10', render: () => <Eye size={16} className="text-gray-400 hover:text-[#2563EB] cursor-pointer" /> }
  ];

  return (
    <div>
      <ExportToolbar title="Menu Item Profitability Report" data={filteredData} filename="profitability_report" onPrint={() => window.print()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard icon={BarChart3} label="Total Items" value={summary.total} color="gold" />
        <SummaryCard icon={Percent} label="Avg Margin" value={`${summary.avgMargin}%`} color="blue" />
        <SummaryCard icon={TrendingUp} label="Profitable" value={summary.profitable} color="green" />
        <SummaryCard icon={AlertCircle} label="Loss Making" value={summary.lossMaking} color="red" />
        <SummaryCard icon={Minus} label="Break Even" value={summary.breakEven} color="gray" />
      </div>
      <FilterCard title="Filters" onReset={() => setFilters({ category: '', search: '', minMargin: '', maxMargin: '' })} onApply={fetchData} loading={loading}>
        <SelectField label="Category" icon={Tag} value={filters.category} onChange={(v) => updateFilter('category', v)} options={[
          { value: '', label: catLoading ? 'Loading categories...' : 'All Categories' },
          ...categoryOptions
        ]} />
        <InputField label="Search" icon={Search} value={filters.search} onChange={(v) => updateFilter('search', v)} placeholder="Search item..." />
        <InputField label="Min Margin %" type="number" icon={Percent} value={filters.minMargin} onChange={(v) => updateFilter('minMargin', v)} placeholder="0" />
        <InputField label="Max Margin %" type="number" icon={Percent} value={filters.maxMargin} onChange={(v) => updateFilter('maxMargin', v)} placeholder="100" />
      </FilterCard>
      <DataTable columns={columns} data={filteredData} loading={loading} />
    </div>
  );
};

const DishUsageReport = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ bookingId: '', dishId: '', dateFrom: '', dateTo: '', search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10000 };
      if (filters.bookingId) params.bookingId = filters.bookingId;
      if (filters.dishId) params.dishId = filters.dishId;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await eventExecutionApi.getDishUsages(params);
      let arr = extractArray(res);
      console.log('DishUsageReport raw data:', arr.length, arr[0]);

      arr = arr.map(d => ({
        ...d,
        id: d.id || d.usageId || d._id,
        dishId: d.dishId || d.dish?.id || d.dish_id,
        dishName: d.dishName || d.dish?.name || d.dish?.dishName || d.itemName || d.dish?.itemName || `Dish #${d.dishId}`,
        bookingId: d.bookingId || d.booking?.id || d.eventId,
        eventName: d.eventName || d.booking?.eventName || d.booking?.name || d.booking?.customerName || d.booking?.customer?.name || d.event?.name || `Booking #${d.bookingId}`,
        quantity: d.quantity || d.qty || d.amount || d.usedQuantity || 0,
        unit: d.unit || d.dish?.unit || d.dish?.measurementUnit || 'pcs',
        usedAt: d.usedAt || d.createdAt || d.date || d.usageDate || d.timestamp
      }));

      setAllData(arr);
    } catch (err) {
      console.error('Dish Usage Report error:', err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, [filters.bookingId, filters.dishId, filters.dateFrom, filters.dateTo]);

  useEffect(() => { fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(d =>
        String(d.dishName).toLowerCase().includes(s) ||
        String(d.eventName).toLowerCase().includes(s) ||
        String(d.bookingId).includes(s)
      );
    }
    return result;
  }, [allData, filters]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const totalQty = filteredData.reduce((s, d) => s + (d.quantity || 0), 0);
    const uniqueDishes = new Set(filteredData.map(d => d.dishId)).size;
    const uniqueEvents = new Set(filteredData.map(d => d.bookingId)).size;
    return { total, totalQty, uniqueDishes, uniqueEvents };
  }, [filteredData]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'eventName', label: 'Event / Booking', sortable: true, render: (row) => {
      const name = row.eventName;
      if (name && !name.startsWith('Booking #')) return <span className="font-medium text-gray-900">{name}</span>;
      if (row.bookingId) return <span className="text-gray-500 italic">Booking #{row.bookingId}</span>;
      return '-';
    }},
    { key: 'dishName', label: 'Dish / Degh', sortable: true, render: (row) => {
      const name = row.dishName;
      if (name && !name.startsWith('Dish #')) return <span className="font-medium text-gray-900">{name}</span>;
      if (row.dishId) return <span className="text-gray-500 italic">Dish #{row.dishId}</span>;
      return '-';
    }},
    { key: 'quantity', label: 'Qty Used', sortable: true, render: (row) => row.quantity || 0 },
    { key: 'unit', label: 'Unit', sortable: true, render: (row) => row.unit || 'pcs' },
    { key: 'usedAt', label: 'Used At', sortable: true, render: (row) => formatDateTime(row.usedAt) },
    { key: 'actions', label: '', sortable: false, className: 'w-10', render: () => <Eye size={16} className="text-gray-400 hover:text-[#2563EB] cursor-pointer" /> }
  ];

  return (
    <div>
      <ExportToolbar title="Dish Usage Report (Kis Degh Mein Kya Laga)" data={filteredData} filename="dish_usage_report" onPrint={() => window.print()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={UtensilsCrossed} label="Total Records" value={summary.total} color="gold" />
        <SummaryCard icon={Hash} label="Total Qty Used" value={summary.totalQty} color="blue" />
        <SummaryCard icon={CookingPot} label="Unique Dishes" value={summary.uniqueDishes} color="purple" />
        <SummaryCard icon={CalendarDays} label="Unique Events" value={summary.uniqueEvents} color="green" />
      </div>
      <FilterCard title="Filters" onReset={() => setFilters({ bookingId: '', dishId: '', dateFrom: '', dateTo: '', search: '' })} onApply={fetchData} loading={loading}>
        <InputField label="Booking ID" icon={Hash} value={filters.bookingId} onChange={(v) => updateFilter('bookingId', v)} placeholder="Filter by booking..." />
        <InputField label="Dish ID" icon={CookingPot} value={filters.dishId} onChange={(v) => updateFilter('dishId', v)} placeholder="Filter by dish..." />
        <InputField label="From Date" type="date" icon={Calendar} value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} />
        <InputField label="To Date" type="date" icon={Calendar} value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} />
      </FilterCard>
      <DataTable columns={columns} data={filteredData} loading={loading} />
    </div>
  );
};

const InventoryConsumptionReport = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ bookingId: '', inventoryItemId: '', dateFrom: '', dateTo: '', search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10000 };
      if (filters.bookingId) params.bookingId = filters.bookingId;
      if (filters.inventoryItemId) params.inventoryItemId = filters.inventoryItemId;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await eventExecutionApi.getInventoryConsumptions(params);
      let arr = extractArray(res);
      console.log('InventoryConsumptionReport raw data:', arr.length, arr[0]);

      arr = arr.map(d => ({
        ...d,
        id: d.id || d.consumptionId || d._id,
        inventoryItemId: d.inventoryItemId || d.inventoryItem?.id || d.itemId || d.inventory_item_id,
        itemName: d.inventoryItem?.name || d.itemName || d.inventoryItem?.itemName || d.inventoryItem?.productName || d.item?.name || `Item #${d.inventoryItemId}`,
        bookingId: d.bookingId || d.booking?.id || d.eventId,
        eventName: d.eventName || d.booking?.eventName || d.booking?.name || d.booking?.customerName || d.booking?.customer?.name || d.event?.name || `Booking #${d.bookingId}`,
        quantity: d.quantity || d.qty || d.amount || d.consumedQuantity || 0,
        unit: d.unit || d.inventoryItem?.unit || d.inventoryItem?.measurementUnit || d.item?.unit || '-',
        unitCost: d.unitCost || d.avgCost || d.inventoryItem?.unitCost || d.inventoryItem?.avgCost || d.item?.unitCost || 0,
        consumedAt: d.consumedAt || d.createdAt || d.date || d.consumptionDate || d.timestamp
      }));

      setAllData(arr);
    } catch (err) {
      console.error('Inventory Consumption Report error:', err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, [filters.bookingId, filters.inventoryItemId, filters.dateFrom, filters.dateTo]);

  useEffect(() => { fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(d =>
        String(d.itemName).toLowerCase().includes(s) ||
        String(d.eventName).toLowerCase().includes(s) ||
        String(d.bookingId).includes(s)
      );
    }
    return result;
  }, [allData, filters]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const totalQty = filteredData.reduce((s, d) => s + (d.quantity || 0), 0);
    const totalValue = filteredData.reduce((s, d) => s + ((d.quantity || 0) * (d.unitCost || 0)), 0);
    const uniqueItems = new Set(filteredData.map(d => d.inventoryItemId)).size;
    return { total, totalQty, totalValue, uniqueItems };
  }, [filteredData]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'eventName', label: 'Event / Booking', sortable: true, render: (row) => {
      const name = row.eventName;
      if (name && !name.startsWith('Booking #')) return <span className="font-medium text-gray-900">{name}</span>;
      if (row.bookingId) return <span className="text-gray-500 italic">Booking #{row.bookingId}</span>;
      return '-';
    }},
    { key: 'itemName', label: 'Inventory Item', sortable: true, render: (row) => {
      const name = row.itemName;
      if (name && !name.startsWith('Item #')) return <span className="font-medium text-gray-900">{name}</span>;
      if (row.inventoryItemId) return <span className="text-gray-500 italic">Item #{row.inventoryItemId}</span>;
      return '-';
    }},
    { key: 'quantity', label: 'Qty', sortable: true, render: (row) => row.quantity || 0 },
    { key: 'unit', label: 'Unit', sortable: true, render: (row) => row.unit || '-' },
    { key: 'unitCost', label: 'Unit Cost', sortable: true, render: (row) => formatMoney(row.unitCost || 0) },
    { key: 'totalCost', label: 'Total Value', sortable: true, render: (row) => {
      const qty = row.quantity || 0;
      const cost = row.unitCost || 0;
      return formatMoney(qty * cost);
    }},
    { key: 'consumedAt', label: 'Consumed At', sortable: true, render: (row) => formatDateTime(row.consumedAt) },
    { key: 'actions', label: '', sortable: false, className: 'w-10', render: () => <Eye size={16} className="text-gray-400 hover:text-[#2563EB] cursor-pointer" /> }
  ];

  return (
    <div>
      <ExportToolbar title="Inventory Consumption by Event Report" data={filteredData} filename="inventory_consumption_report" onPrint={() => window.print()} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={Package} label="Total Records" value={summary.total} color="gold" />
        <SummaryCard icon={Weight} label="Total Qty" value={summary.totalQty.toLocaleString('en-PK')} color="blue" />
        <SummaryCard icon={DollarSign} label="Total Value" value={formatMoney(summary.totalValue)} color="green" />
        <SummaryCard icon={Box} label="Unique Items" value={summary.uniqueItems} color="purple" />
      </div>
      <FilterCard title="Filters" onReset={() => setFilters({ bookingId: '', inventoryItemId: '', dateFrom: '', dateTo: '', search: '' })} onApply={fetchData} loading={loading}>
        <InputField label="Booking ID" icon={Hash} value={filters.bookingId} onChange={(v) => updateFilter('bookingId', v)} placeholder="Filter by event..." />
        <InputField label="Inventory Item ID" icon={Box} value={filters.inventoryItemId} onChange={(v) => updateFilter('inventoryItemId', v)} placeholder="Filter by item..." />
        <InputField label="From Date" type="date" icon={Calendar} value={filters.dateFrom} onChange={(v) => updateFilter('dateFrom', v)} />
        <InputField label="To Date" type="date" icon={Calendar} value={filters.dateTo} onChange={(v) => updateFilter('dateTo', v)} />
      </FilterCard>
      <DataTable columns={columns} data={filteredData} loading={loading} />
    </div>
  );
};

const TABS = [
  { id: 'kitchen', label: 'Kitchen Order Report (KDS)', icon: ClipboardList, component: KitchenOrderReport },
  { id: 'production', label: 'Production Plan Report', icon: Layers, component: ProductionPlanReport },
  { id: 'recipe', label: 'Recipe Costing / Food Cost', icon: ChefHat, component: RecipeCostingReport },
  { id: 'profit', label: 'Menu Item Profitability', icon: TrendingUp, component: ProfitabilityReport },
  { id: 'dish', label: 'Dish Usage Report', icon: CookingPot, component: DishUsageReport },
  { id: 'inventory', label: 'Inventory Consumption by Event', icon: Package, component: InventoryConsumptionReport },
];

export default function KitchenProductionReports() {
  const [activeTab, setActiveTab] = useState('kitchen');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || KitchenOrderReport;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      <div className="mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat size={28} className="text-[#2563EB]" />
              Kitchen & Production Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Comprehensive reports for kitchen orders, production plans, recipe costing, and event inventory tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">Kitchen & Production Reports</h1>
        <p className="text-sm text-gray-500">Generated on {new Date().toLocaleString('en-PK')}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 mb-6 overflow-x-auto print:hidden">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
        <ActiveComponent />
      </div>
    </div>
  );
}
