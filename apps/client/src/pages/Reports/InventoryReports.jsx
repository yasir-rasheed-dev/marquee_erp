// pages/InventoryStockReports.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Package,
  AlertTriangle,
  History,
  DollarSign,
  ArrowLeftRight,
  Trash2,
  Filter,
  Download,
  Printer,
  Search,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Boxes,
  Calendar,
  MapPin,
  Tag,
  Layers,
  FileText,
  X
} from 'lucide-react';

// ── API IMPORTS ──
import inventoryApi from '../../services/inventoryApi';
import stockTransactionApi from '../../services/stockTransactionApi';
import stockTransferApi from '../../services/stockTransferApi';
import wastageLogApi from '../../services/wastageLogApi';
import ReactSelect from '../../components/ui/ReactSelect';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const formatMoney = (amount) => {
  if (amount == null || isNaN(amount)) return 'PKR 0.00';
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
  return [];
};

const extractObject = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (res.data?.data && typeof res.data.data === 'object') return res.data.data;
  return res || {};
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
    wastage: 'bg-red-100 text-red-700'
  };
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

const StatusBadge = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
    {label || status}
  </span>
);

const FilterCard = ({ title, icon: Icon, children, onClear, hasFilters }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 print:hidden">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-700">
        {Icon && <Icon size={18} className="text-[#2563EB]" />}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {children}
    </div>
  </div>
);

const SummaryCard = ({ title, value, subtext, icon: Icon, trend, trendUp }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
      <div className="p-2 bg-[#2563EB]/10 rounded-lg">
        {Icon && <Icon size={20} className="text-[#2563EB]" />}
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

const ExportToolbar = ({ onExportCSV, onExportPDF, onPrint, dataCount }) => (
  <div className="flex items-center justify-between mb-4 print:hidden">
    <p className="text-sm text-gray-500">
      Showing <span className="font-semibold text-gray-700">{dataCount}</span> records
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
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#2563EB] transition-colors"
      >
        <Printer size={16} /> Print
      </button>
    </div>
  </div>
);

const DataTable = ({ columns, data, keyExtractor, emptyMessage = "No data found", loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <RefreshCw size={32} className="mx-auto text-[#2563EB] animate-spin mb-3" />
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

// ═══════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { id: 'current-stock', label: 'Current Stock Level', icon: Boxes },
  { id: 'low-stock', label: 'Low Stock / Reorder', icon: AlertTriangle },
  { id: 'transactions', label: 'Transaction History', icon: History },
  { id: 'valuation', label: 'Inventory Valuation', icon: DollarSign },
  { id: 'transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
  { id: 'wastage', label: 'Wastage & Damage', icon: Trash2 },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function InventoryStockReports() {
  const [activeTab, setActiveTab] = useState('current-stock');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // ── Filter States ──
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [wastageReason, setWastageReason] = useState('');

  // ── Reset filters on tab change ──
  useEffect(() => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setCategory('');
    setStatus('');
    setBranchFilter('');
    setTransactionType('');
    setTransferStatus('');
    setWastageReason('');
    setData([]);
    setError(null);
  }, [activeTab]);

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result = [];
      const params = {};

      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (branchFilter) params.branchId = branchFilter;
      if (search) params.search = search;
      if (category) params.category = category;

      switch (activeTab) {
        case 'current-stock': {
          if (status) params.status = status;
          const res = await inventoryApi.getAll(params);
          result = extractArray(res);
          break;
        }
        case 'low-stock': {
          params.lowStock = true;
          if (status) params.status = status;
          const res = await inventoryApi.getAll(params);
          result = extractArray(res);
          break;
        }
        case 'transactions': {
          if (transactionType) params.type = transactionType;
          const res = await stockTransactionApi.getAll(params);
          result = extractArray(res);
          break;
        }
        case 'valuation': {
          const res = await inventoryApi.getAll(params);
          result = extractArray(res);
          break;
        }
        case 'transfers': {
          if (transferStatus) params.status = transferStatus;
          const res = await stockTransferApi.getAll(params);
          result = extractArray(res);
          break;
        }
        case 'wastage': {
          if (wastageReason) params.reason = wastageReason;
          const res = await wastageLogApi.getReport(params);
          result = extractArray(res);
          if (result.length === 0) {
            // Fallback to getAll if report endpoint returns empty
            const fallback = await wastageLogApi.getAll(params);
            result = extractArray(fallback);
          }
          break;
        }
        default:
          break;
      }
      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, dateFrom, dateTo, category, status, branchFilter, transactionType, transferStatus, wastageReason]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Download PDF ──
  const downloadPDF = useCallback(() => {
    if (!data.length) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [169, 122, 31];

    // Header
    doc.setFillColor(245, 242, 235);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('Marquee ERP', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Marquee Management System', 14, 21);

    const tabLabel = TABS.find(t => t.id === activeTab)?.label || 'Report';
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
      case 'current-stock':
        headers = [['Item Name', 'SKU', 'Category', 'Stock', 'Unit', 'Reorder', 'Status', 'Branch']];
        body = data.map(r => [r.name || '', r.sku || '', r.category || '', String(r.currentStock || 0), r.unit || '', String(r.reorderLevel || '-'), r.status || 'active', r.branchName || '']);
        break;
      case 'low-stock':
        headers = [['Item Name', 'SKU', 'Category', 'Current', 'Reorder', 'Shortage', 'Unit', 'Supplier']];
        body = data.map(r => [r.name || '', r.sku || '', r.category || '', String(r.currentStock || 0), String(r.reorderLevel || 0), String(Math.max(0, (r.reorderLevel || 0) - (r.currentStock || 0))), r.unit || '', r.supplierName || '']);
        break;
      case 'transactions':
        headers = [['Date', 'Reference', 'Item', 'Type', 'Qty', 'Unit', 'Branch', 'Notes']];
        body = data.map(r => [formatDateShort(r.createdAt || r.date), r.reference || '', r.itemName || r.inventory?.name || '', r.type || '', String(r.quantity || 0), r.unit || '', r.branchName || '', (r.notes || '').substring(0, 40)]);
        break;
      case 'valuation':
        headers = [['Item Name', 'SKU', 'Category', 'Qty', 'Unit Cost', 'Total Value', 'Unit', 'Location']];
        body = data.map(r => [r.name || '', r.sku || '', r.category || '', String(r.currentStock || 0), formatMoney(r.unitCost || r.purchasePrice || 0), formatMoney((r.currentStock || 0) * (r.unitCost || r.purchasePrice || 0)), r.unit || '', r.location || '']);
        break;
      case 'transfers':
        headers = [['Date', 'Reference', 'Item', 'From Branch', 'To Branch', 'Qty', 'Status', 'By']];
        body = data.map(r => [formatDateShort(r.createdAt || r.date), r.reference || '', r.itemName || r.inventory?.name || '', r.fromBranchName || r.fromBranch?.name || '', r.toBranchName || r.toBranch?.name || '', String(r.quantity || 0), r.status || '', r.createdByName || '']);
        break;
      case 'wastage':
        headers = [['Date', 'Item', 'Reason', 'Qty', 'Unit', 'Unit Cost', 'Total Loss', 'Branch']];
        body = data.map(r => [formatDateShort(r.createdAt || r.date), r.itemName || r.inventory?.name || '', r.reason || '', String(r.quantity || 0), r.unit || '', formatMoney(r.unitCost || r.inventory?.unitCost || 0), formatMoney((r.quantity || 0) * (r.unitCost || r.inventory?.unitCost || 0)), r.branchName || '']);
        break;
      default:
        headers = [['Data']];
        body = data.map(r => [JSON.stringify(r)]);
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
        if (activeTab === 'valuation' && data.column.index === 5) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`© 2026 Marquee ERP — Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Inventory_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [data, activeTab, dateFrom, dateTo]);

  // ── Download CSV ──
  const downloadCSV = useCallback(() => {
    if (!data.length) return;
    let headers = [];
    let rows = [];

    switch (activeTab) {
      case 'current-stock':
        headers = ['Item Name', 'SKU', 'Category', 'Current Stock', 'Unit', 'Reorder Level', 'Status', 'Branch'];
        rows = data.map(r => [r.name, r.sku, r.category, r.currentStock, r.unit, r.reorderLevel, r.status, r.branchName]);
        break;
      case 'low-stock':
        headers = ['Item Name', 'SKU', 'Category', 'Current Stock', 'Reorder Level', 'Shortage', 'Unit', 'Supplier'];
        rows = data.map(r => [r.name, r.sku, r.category, r.currentStock, r.reorderLevel, Math.max(0, (r.reorderLevel || 0) - (r.currentStock || 0)), r.unit, r.supplierName]);
        break;
      case 'transactions':
        headers = ['Date', 'Reference', 'Item', 'Type', 'Quantity', 'Unit', 'Branch', 'Notes'];
        rows = data.map(r => [formatDateShort(r.createdAt || r.date), r.reference, r.itemName || r.inventory?.name, r.type, r.quantity, r.unit, r.branchName, r.notes]);
        break;
      case 'valuation':
        headers = ['Item Name', 'SKU', 'Category', 'Stock Qty', 'Unit Cost', 'Total Value', 'Unit', 'Location'];
        rows = data.map(r => [r.name, r.sku, r.category, r.currentStock, r.unitCost || r.purchasePrice, (r.currentStock || 0) * (r.unitCost || r.purchasePrice || 0), r.unit, r.location]);
        break;
      case 'transfers':
        headers = ['Date', 'Reference', 'Item', 'From Branch', 'To Branch', 'Quantity', 'Status', 'Transferred By'];
        rows = data.map(r => [formatDateShort(r.createdAt || r.date), r.reference, r.itemName || r.inventory?.name, r.fromBranchName || r.fromBranch?.name, r.toBranchName || r.toBranch?.name, r.quantity, r.status, r.createdByName]);
        break;
      case 'wastage':
        headers = ['Date', 'Item', 'Reason', 'Quantity', 'Unit', 'Unit Cost', 'Total Loss', 'Branch'];
        rows = data.map(r => [formatDateShort(r.createdAt || r.date), r.itemName || r.inventory?.name, r.reason, r.quantity, r.unit, r.unitCost || r.inventory?.unitCost, (r.quantity || 0) * (r.unitCost || r.inventory?.unitCost || 0), r.branchName]);
        break;
      default:
        headers = Object.keys(data[0]);
        rows = data.map(r => Object.values(r));
    }

    const csvContent = [
      ['Marquee ERP - Inventory Report'],
      [`Report: ${TABS.find(t => t.id === activeTab)?.label}`],
      [`Generated: ${new Date().toLocaleString('en-GB')}`],
      dateFrom && dateTo ? [`Period: ${dateFrom} to ${dateTo}`] : [],
      [],
      headers,
      ...rows
    ].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Inventory_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [data, activeTab, dateFrom, dateTo]);

  // ── Print ──
  const handlePrint = () => window.print();

  // ── Clear Filters ──
  const hasActiveFilters = search || dateFrom || dateTo || category || status || branchFilter || transactionType || transferStatus || wastageReason;
  const clearFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setCategory('');
    setStatus(''); setBranchFilter(''); setTransactionType('');
    setTransferStatus(''); setWastageReason('');
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: TAB CONTENT
  // ═══════════════════════════════════════════════════════════════

  const renderCurrentStock = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalQty = filtered.reduce((sum, i) => sum + (Number(i.currentStock) || 0), 0);
    const lowStockCount = filtered.filter(i => (i.currentStock || 0) <= (i.reorderLevel || 0)).length;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Items" value={totalItems} icon={Boxes} />
          <SummaryCard title="Total Stock Qty" value={totalQty.toLocaleString('en-PK')} icon={Package} />
          <SummaryCard title="Low Stock Items" value={lowStockCount} icon={AlertTriangle} trend={lowStockCount > 0 ? 'Needs attention' : 'All good'} trendUp={lowStockCount === 0} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search item or SKU..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <ReactSelect
            value={category}
            onChange={(val) => setCategory(val || '')}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'raw', label: 'Raw Material' },
              { value: 'finished', label: 'Finished Goods' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'consumable', label: 'Consumable' }
            ]}
            placeholder="All Categories"
            isSearchable={false}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out_of_stock', label: 'Out of Stock' }
            ]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.sku}
          emptyMessage="No inventory items found"
          columns={[
            { header: 'Item Name', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'SKU', accessor: 'sku' },
            { header: 'Category', accessor: 'category' },
            { header: 'Current Stock', accessor: 'currentStock', cell: row => <span className="font-semibold">{row.currentStock || 0}</span> },
            { header: 'Unit', accessor: 'unit' },
            { header: 'Reorder Level', accessor: 'reorderLevel', cell: row => <span className="text-orange-600">{row.reorderLevel || '-'}</span> },
            { header: 'Status', accessor: 'status', cell: row => {
              const stock = row.currentStock || 0;
              const reorder = row.reorderLevel || 0;
              let st = row.status || 'active';
              if (stock === 0) st = 'out_of_stock';
              else if (stock <= reorder) st = 'low';
              return <StatusBadge status={st} label={st.replace('_', ' ').toUpperCase()} />;
            }},
            { header: 'Branch', accessor: 'branchName' },
          ]}
        />
      </>
    );
  };

  const renderLowStock = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalShortage = filtered.reduce((sum, i) => {
      const needed = (i.reorderLevel || 0) - (i.currentStock || 0);
      return sum + (needed > 0 ? needed : 0);
    }, 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Low Stock Items" value={totalItems} icon={AlertTriangle} trend="Needs reorder" trendUp={false} />
          <SummaryCard title="Total Shortage Qty" value={totalShortage.toLocaleString('en-PK')} icon={Package} />
          <SummaryCard title="Avg Reorder Level" value={Math.round(filtered.reduce((s, i) => s + (i.reorderLevel || 0), 0) / (filtered.length || 1))} icon={Layers} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search item or SKU..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <ReactSelect
            value={category}
            onChange={(val) => setCategory(val || '')}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'raw', label: 'Raw Material' },
              { value: 'finished', label: 'Finished Goods' },
              { value: 'packaging', label: 'Packaging' }
            ]}
            placeholder="All Categories"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No low stock items found"
          columns={[
            { header: 'Item Name', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'SKU', accessor: 'sku' },
            { header: 'Category', accessor: 'category' },
            { header: 'Current Stock', accessor: 'currentStock', cell: row => <span className="text-red-600 font-semibold">{row.currentStock || 0}</span> },
            { header: 'Reorder Level', accessor: 'reorderLevel', cell: row => <span className="text-orange-600 font-semibold">{row.reorderLevel || 0}</span> },
            { header: 'Shortage', accessor: 'shortage', cell: row => {
              const short = (row.reorderLevel || 0) - (row.currentStock || 0);
              return <span className="text-red-600 font-bold">{short > 0 ? short : 0}</span>;
            }},
            { header: 'Unit', accessor: 'unit' },
            { header: 'Supplier', accessor: 'supplierName' },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status="low" label="LOW STOCK" /> },
          ]}
        />
      </>
    );
  };

  const renderTransactions = () => {
    const filtered = data.filter(item =>
      !search || item.itemName?.toLowerCase().includes(search.toLowerCase()) || item.reference?.toLowerCase().includes(search.toLowerCase())
    );

    const totalTxns = filtered.length;
    const totalIn = filtered.filter(t => ['purchase', 'transfer_in', 'adjustment_in'].includes(t.type)).reduce((s, t) => s + (t.quantity || 0), 0);
    const totalOut = filtered.filter(t => ['sale', 'transfer_out', 'adjustment_out', 'wastage'].includes(t.type)).reduce((s, t) => s + (t.quantity || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Transactions" value={totalTxns} icon={History} />
          <SummaryCard title="Stock In" value={totalIn.toLocaleString('en-PK')} icon={TrendingUp} trend="Incoming" trendUp={true} />
          <SummaryCard title="Stock Out" value={totalOut.toLocaleString('en-PK')} icon={TrendingDown} trend="Outgoing" trendUp={false} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search item or reference..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <ReactSelect
            value={transactionType}
            onChange={(val) => setTransactionType(val || '')}
            options={[
              { value: '', label: 'All Types' },
              { value: 'purchase', label: 'Purchase' },
              { value: 'sale', label: 'Sale' },
              { value: 'adjustment', label: 'Adjustment' },
              { value: 'transfer_in', label: 'Transfer In' },
              { value: 'transfer_out', label: 'Transfer Out' },
              { value: 'wastage', label: 'Wastage' }
            ]}
            placeholder="All Types"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.reference}
          emptyMessage="No transactions found"
          columns={[
            { header: 'Date', accessor: 'createdAt', cell: row => formatDate(row.createdAt || row.date) },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Item', accessor: 'itemName', cell: row => <span className="font-medium text-gray-900">{row.itemName || row.inventory?.name}</span> },
            { header: 'Type', accessor: 'type', cell: row => <StatusBadge status={row.type} label={row.type?.toUpperCase().replace('_', ' ')} /> },
            { header: 'Qty', accessor: 'quantity', cell: row => (
              <span className={`font-semibold ${['sale','transfer_out','wastage','adjustment_out'].includes(row.type) ? 'text-red-600' : 'text-green-600'}`}>
                {['sale','transfer_out','wastage','adjustment_out'].includes(row.type) ? '-' : '+'}{row.quantity || 0}
              </span>
            )},
            { header: 'Unit', accessor: 'unit' },
            { header: 'Branch', accessor: 'branchName' },
            { header: 'Notes', accessor: 'notes', cell: row => <span className="text-gray-500 truncate max-w-[200px] block">{row.notes || '-'}</span> },
          ]}
        />
      </>
    );
  };

  const renderValuation = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalValue = filtered.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.unitCost || i.purchasePrice || 0)), 0);
    const avgUnitCost = totalItems > 0 ? filtered.reduce((s, i) => s + (i.unitCost || i.purchasePrice || 0), 0) / totalItems : 0;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Inventory Value" value={formatMoney(totalValue)} icon={DollarSign} />
          <SummaryCard title="Items Count" value={totalItems} icon={Boxes} />
          <SummaryCard title="Avg Unit Cost" value={formatMoney(avgUnitCost)} icon={Tag} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search item or SKU..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <ReactSelect
            value={category}
            onChange={(val) => setCategory(val || '')}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'raw', label: 'Raw Material' },
              { value: 'finished', label: 'Finished Goods' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'consumable', label: 'Consumable' }
            ]}
            placeholder="All Categories"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.sku}
          emptyMessage="No inventory data found"
          columns={[
            { header: 'Item Name', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'SKU', accessor: 'sku' },
            { header: 'Category', accessor: 'category' },
            { header: 'Stock Qty', accessor: 'currentStock', cell: row => <span className="font-semibold">{row.currentStock || 0}</span> },
            { header: 'Unit Cost', accessor: 'unitCost', cell: row => formatMoney(row.unitCost || row.purchasePrice || 0) },
            { header: 'Total Value', accessor: 'totalValue', cell: row => formatMoney((row.currentStock || 0) * (row.unitCost || row.purchasePrice || 0)) },
            { header: 'Unit', accessor: 'unit' },
            { header: 'Location', accessor: 'location' },
          ]}
        />
      </>
    );
  };

  const renderTransfers = () => {
    const filtered = data.filter(item =>
      !search || item.reference?.toLowerCase().includes(search.toLowerCase()) || item.itemName?.toLowerCase().includes(search.toLowerCase())
    );

    const totalTransfers = filtered.length;
    const inTransit = filtered.filter(t => t.status === 'in_transit').length;
    const completed = filtered.filter(t => t.status === 'received' || t.status === 'completed').length;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Transfers" value={totalTransfers} icon={ArrowLeftRight} />
          <SummaryCard title="In Transit" value={inTransit} icon={TrendingUp} trend="Pending" trendUp={inTransit === 0} />
          <SummaryCard title="Completed" value={completed} icon={Package} trend="Delivered" trendUp={true} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search reference or item..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <ReactSelect
            value={transferStatus}
            onChange={(val) => setTransferStatus(val || '')}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'received', label: 'Received' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.reference}
          emptyMessage="No stock transfers found"
          columns={[
            { header: 'Date', accessor: 'createdAt', cell: row => formatDateShort(row.createdAt || row.date) },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Item', accessor: 'itemName', cell: row => <span className="font-medium text-gray-900">{row.itemName || row.inventory?.name}</span> },
            { header: 'From Branch', accessor: 'fromBranchName', cell: row => <span className="flex items-center gap-1"><MapPin size={12} />{row.fromBranchName || row.fromBranch?.name}</span> },
            { header: 'To Branch', accessor: 'toBranchName', cell: row => <span className="flex items-center gap-1"><MapPin size={12} />{row.toBranchName || row.toBranch?.name}</span> },
            { header: 'Qty', accessor: 'quantity', cell: row => <span className="font-semibold">{row.quantity || 0}</span> },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase().replace('_', ' ')} /> },
            { header: 'Transferred By', accessor: 'createdByName' },
          ]}
        />
      </>
    );
  };

  const renderWastage = () => {
    const filtered = data.filter(item =>
      !search || item.itemName?.toLowerCase().includes(search.toLowerCase()) || item.reason?.toLowerCase().includes(search.toLowerCase())
    );

    const totalWastage = filtered.length;
    const totalQty = filtered.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const totalValue = filtered.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitCost || 0)), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Wastage Entries" value={totalWastage} icon={Trash2} />
          <SummaryCard title="Total Wasted Qty" value={totalQty.toLocaleString('en-PK')} icon={Package} trend="Loss" trendUp={false} />
          <SummaryCard title="Total Value Loss" value={formatMoney(totalValue)} icon={DollarSign} trend="Financial impact" trendUp={false} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search item or reason..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <ReactSelect
            value={wastageReason}
            onChange={(val) => setWastageReason(val || '')}
            options={[
              { value: '', label: 'All Reasons' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'expired', label: 'Expired' },
              { value: 'spoiled', label: 'Spoiled' },
              { value: 'burned', label: 'Burned / Overcooked' },
              { value: 'theft', label: 'Theft / Missing' },
              { value: 'other', label: 'Other' }
            ]}
            placeholder="All Reasons"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No wastage records found"
          columns={[
            { header: 'Date', accessor: 'createdAt', cell: row => formatDate(row.createdAt || row.date) },
            { header: 'Item', accessor: 'itemName', cell: row => <span className="font-medium text-gray-900">{row.itemName || row.inventory?.name}</span> },
            { header: 'Reason', accessor: 'reason', cell: row => <StatusBadge status={row.reason} label={row.reason?.toUpperCase()} /> },
            { header: 'Qty', accessor: 'quantity', cell: row => <span className="text-red-600 font-semibold">{row.quantity || 0}</span> },
            { header: 'Unit', accessor: 'unit' },
            { header: 'Unit Cost', accessor: 'unitCost', cell: row => formatMoney(row.unitCost || row.inventory?.unitCost || 0) },
            { header: 'Total Loss', accessor: 'totalLoss', cell: row => formatMoney((row.quantity || 0) * (row.unitCost || row.inventory?.unitCost || 0)) },
            { header: 'Branch', accessor: 'branchName' },
            { header: 'Notes', accessor: 'notes', cell: row => <span className="text-gray-500 truncate max-w-[200px] block">{row.notes || '-'}</span> },
          ]}
        />
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    switch (activeTab) {
      case 'current-stock': return renderCurrentStock();
      case 'low-stock': return renderLowStock();
      case 'transactions': return renderTransactions();
      case 'valuation': return renderValuation();
      case 'transfers': return renderTransfers();
      case 'wastage': return renderWastage();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">INVENTORY & STOCK REPORTS</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time inventory analytics and stock movement reports</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">INVENTORY & STOCK REPORTS</h1>
        <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleDateString('en-PK')}</p>
        <p className="text-sm text-gray-500">Report: {TABS.find(t => t.id === activeTab)?.label}</p>
      </div>

      {/* Tabs */}
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

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 print:hidden">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={fetchData} className="ml-auto text-sm underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Content */}
      <div className="animate-in fade-in duration-200">
        {renderTabContent()}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400 print:hidden">
        <p>Marquee ERP Management System &mdash; Inventory & Stock Reports Module</p>
      </div>
    </div>
  );
}