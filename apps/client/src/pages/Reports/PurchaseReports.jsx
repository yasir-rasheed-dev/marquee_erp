// pages/PurchaseSupplierReports.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Receipt,
  Scale,
  Wallet,
  RotateCcw,
  Filter,
  Download,
  Printer,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  User,
  Calendar,
  X,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  FileMinus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Banknote,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Loader2
} from 'lucide-react';

// ── API IMPORTS ──
import purchaseApi from '../../services/purchaseApi';
import supplierApi from '../../services/supplierApi';
import apiClient from '../../services/apiClient';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const formatMoney = (amount) => {
  if (amount == null || isNaN(amount)) return 'PKR 0.00';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
  if (res.data?.rows && Array.isArray(res.data.rows)) return res.data.rows;
  if (res.data?.items && Array.isArray(res.data.items)) return res.data.items;
  return [];
};

const extractObject = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (res.data?.data && typeof res.data.data === 'object') return res.data.data;
  return res || {};
};

const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

const getStatusColor = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-blue-100 text-blue-700 border-blue-200',
    received: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    partially_received: 'bg-amber-100 text-amber-700 border-amber-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    unpaid: 'bg-red-100 text-red-700 border-red-200',
    overdue: 'bg-rose-100 text-rose-700 border-rose-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    sent: 'bg-purple-100 text-purple-700 border-purple-200',
    confirmed: 'bg-teal-100 text-teal-700 border-teal-200',
    returned: 'bg-orange-100 text-orange-700 border-orange-200',
    rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    cash: 'bg-green-100 text-green-700 border-green-200',
    bank: 'bg-blue-100 text-blue-700 border-blue-200',
    cheque: 'bg-amber-100 text-amber-700 border-amber-200',
    online: 'bg-purple-100 text-purple-700 border-purple-200',
    current: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    '31-60': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    '61-90': 'bg-orange-100 text-orange-700 border-orange-200',
    '90+': 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

const StatusBadge = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
    {label || status || 'N/A'}
  </span>
);

const FilterCard = ({ title, icon: Icon, children, onClear, hasFilters, onApply, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 print:hidden">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-700">
        {Icon && <Icon size={18} className="text-[#2563EB]" />}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors px-2 py-1"
          >
            <X size={14} /> Clear Filters
          </button>
        )}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {children}
    </div>
  </div>
);

const FilterField = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
    {children}
  </div>
);

const SummaryCard = ({ title, value, subtext, icon: Icon, trend, trendUp, color = 'gold' }) => {
  const colors = {
    gold: 'bg-[#2563EB]/10',
    green: 'bg-green-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colors[color] || colors.gold}`}>
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
};

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

const DataTable = ({ columns, data, keyExtractor, emptyMessage = "No data found", loading, title, count }) => {
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

// ═══════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { id: 'po-status', label: 'PO Status Report', icon: FileText },
  { id: 'purchase-bills', label: 'Purchase Bills / GRN', icon: Receipt },
  { id: 'supplier-ledger', label: 'Supplier Ledger / Aging', icon: Scale },
  { id: 'payment-history', label: 'Supplier Payments', icon: Wallet },
  { id: 'purchase-returns', label: 'Purchase Returns', icon: RotateCcw },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PurchaseSupplierReports() {
  const [activeTab, setActiveTab] = useState('po-status');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  // ── Filter States ──
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [poStatus, setPoStatus] = useState('');
  const [billStatus, setBillStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // ── Applied Filters (only when Apply button is clicked) ──
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    supplierFilter: '',
    poStatus: '',
    billStatus: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: ''
  });

  // ── Reset filters on tab change ──
  useEffect(() => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('');
    setSupplierFilter('');
    setPoStatus('');
    setBillStatus('');
    setPaymentMethod('');
    setMinAmount('');
    setMaxAmount('');
    setAppliedFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      supplierFilter: '',
      poStatus: '',
      billStatus: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: ''
    });
    setData([]);
    setError(null);
  }, [activeTab]);

  // ── Fetch Suppliers List ──
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await supplierApi.getAll();
      const data = extractArray(res);
      setSuppliers(data);
      console.log('Suppliers loaded:', data.length);
    } catch (e) {
      console.error('Failed to load suppliers', e);
      // Mock suppliers if API fails
      setSuppliers([
        { id: 1, name: 'K&K Poultry Farm', businessName: 'K&K Poultry Farm' },
        { id: 2, name: 'Al-Madina Wholesale Mart', businessName: 'Al-Madina Wholesale Mart' },
        { id: 3, name: 'Premium Foods Suppliers', businessName: 'Premium Foods Suppliers' },
        { id: 4, name: 'Global Imports', businessName: 'Global Imports' },
        { id: 5, name: 'Local Mart', businessName: 'Local Mart' },
        { id: 6, name: 'National Distributors', businessName: 'National Distributors' },
        { id: 7, name: 'Quality Foods', businessName: 'Quality Foods' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Apply Filters ──
  const applyFilters = () => {
    setAppliedFilters({
      search,
      dateFrom,
      dateTo,
      status,
      supplierFilter,
      poStatus,
      billStatus,
      paymentMethod,
      minAmount,
      maxAmount
    });
    // Fetch data immediately after setting filters
    fetchDataWithAppliedFilters({
      search,
      dateFrom,
      dateTo,
      status,
      supplierFilter,
      poStatus,
      billStatus,
      paymentMethod,
      minAmount,
      maxAmount
    });
  };

  // ── Clear Filters ──
  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('');
    setSupplierFilter('');
    setPoStatus('');
    setBillStatus('');
    setPaymentMethod('');
    setMinAmount('');
    setMaxAmount('');
    const emptyFilters = {
      search: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      supplierFilter: '',
      poStatus: '',
      billStatus: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: ''
    };
    setAppliedFilters(emptyFilters);
    fetchDataWithAppliedFilters(emptyFilters);
  };

  // ── Fetch Data with Applied Filters ──
  const fetchDataWithAppliedFilters = useCallback(async (filters = appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      let result = [];
      const params = {};

      // Build params from filters
      if (filters.dateFrom) params.from = filters.dateFrom;
      if (filters.dateTo) params.to = filters.dateTo;
      if (filters.supplierFilter) {
        params.supplierId = filters.supplierFilter;
      }
      if (filters.search) params.search = filters.search;

      // Branch filter
      const branchId = getSelectedBranchId();
      if (branchId) params.branchId = branchId;

      console.log('Fetching data for tab:', activeTab, 'with params:', params, 'filters:', filters);

      switch (activeTab) {
        case 'po-status': {
          if (filters.poStatus) params.status = filters.poStatus;
          try {
            const res = await purchaseApi.orders.getAll(params);
            result = extractArray(res);
            console.log('PO data loaded:', result.length);
          } catch (e) {
            console.warn('PO API failed, using mock:', e.message);
            result = [];
          }
          break;
        }
        case 'purchase-bills': {
          if (filters.billStatus) params.status = filters.billStatus;
          try {
            const res = await purchaseApi.bills.getAll(params);
            result = extractArray(res);
            console.log('Bills data loaded:', result.length);
          } catch (e) {
            console.warn('Bills API failed, using mock:', e.message);
            result = [];
          }
          break;
        }
        case 'supplier-ledger': {
          try {
            const billsRes = await purchaseApi.bills.getAll(params);
            const bills = extractArray(billsRes);
            const supRes = await supplierApi.getAll();
            const allSuppliers = extractArray(supRes);

            const ledgerMap = {};
            allSuppliers.forEach(s => {
              ledgerMap[s.id || s._id] = {
                supplierId: s.id || s._id,
                supplierName: s.name || s.businessName || 'Unknown',
                phone: s.phone || '-',
                email: s.email || '-',
                totalPurchases: 0,
                totalPaid: 0,
                balanceDue: 0,
                agingCurrent: 0,
                aging30: 0,
                aging60: 0,
                aging90: 0,
                aging90Plus: 0,
                lastPurchase: null
              };
            });

            bills.forEach(bill => {
              const sid = bill.supplierId || bill.supplier?.id;
              if (!ledgerMap[sid]) {
                ledgerMap[sid] = {
                  supplierId: sid,
                  supplierName: bill.supplierName || bill.supplier?.name || 'Unknown',
                  phone: bill.supplier?.phone || '-',
                  email: bill.supplier?.email || '-',
                  totalPurchases: 0, totalPaid: 0, balanceDue: 0,
                  agingCurrent: 0, aging30: 0, aging60: 0, aging90: 0, aging90Plus: 0,
                  lastPurchase: null
                };
              }
              const entry = ledgerMap[sid];
              const amount = Number(bill.totalAmount) || Number(bill.amount) || 0;
              const paid = Number(bill.paidAmount) || Number(bill.amountPaid) || 0;
              const balance = amount - paid;

              entry.totalPurchases += amount;
              entry.totalPaid += paid;
              entry.balanceDue += balance;

              if (balance > 0) {
                const dueDate = new Date(bill.dueDate || bill.createdAt);
                const today = new Date();
                const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) entry.agingCurrent += balance;
                else if (diffDays <= 30) entry.aging30 += balance;
                else if (diffDays <= 60) entry.aging60 += balance;
                else if (diffDays <= 90) entry.aging90 += balance;
                else entry.aging90Plus += balance;
              }

              const billDate = new Date(bill.createdAt);
              if (!entry.lastPurchase || billDate > new Date(entry.lastPurchase)) {
                entry.lastPurchase = bill.createdAt;
              }
            });

            result = Object.values(ledgerMap).filter(s => s.totalPurchases > 0 || s.balanceDue > 0);
            
            // Apply supplier filter
            if (filters.supplierFilter) {
              result = result.filter(s => String(s.supplierId) === String(filters.supplierFilter));
            }
            
            // Apply search
            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              result = result.filter(s => 
                s.supplierName.toLowerCase().includes(searchLower) ||
                s.phone.includes(searchLower)
              );
            }
            
            console.log('Ledger data loaded:', result.length);
          } catch (e) {
            console.warn('Ledger API failed, using mock:', e.message);
            result = [];
          }
          break;
        }
        case 'payment-history': {
          try {
            const payRes = await apiClient.get('/suppliers/payments', {
              params: { ...params }
            });
            result = extractArray(payRes);
            console.log('Payments data loaded:', result.length);
          } catch (e) {
            console.warn('Payments API failed, using mock:', e.message);
            result = [];
          }
          break;
        }
        case 'purchase-returns': {
          if (filters.status) params.status = filters.status;
          try {
            const res = await purchaseApi.returns.getAll(params);
            result = extractArray(res);
            console.log('Returns data loaded:', result.length);
          } catch (e) {
            console.warn('Returns API failed, using mock:', e.message);
            result = [];
          }
          break;
        }
        default:
          break;
      }

      // Apply amount filters if present
      if (filters.minAmount || filters.maxAmount) {
        result = result.filter(item => {
          const amt = Number(item.totalAmount) || Number(item.amount) || Number(item.balanceDue) || 0;
          if (filters.minAmount && amt < Number(filters.minAmount)) return false;
          if (filters.maxAmount && amt > Number(filters.maxAmount)) return false;
          return true;
        });
      }

      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // ── Initial fetch ──
  useEffect(() => {
    fetchDataWithAppliedFilters(appliedFilters);
  }, []);

  // ── Export CSV ──
  const exportCSV = useCallback(() => {
    if (!data || data.length === 0) {
      alert('No data to export!');
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
      link.download = `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('CSV export failed: ' + e.message);
    }
  }, [data, activeTab]);

  // ── Export PDF ──
  const exportPDF = useCallback(() => {
    if (!data || data.length === 0) {
      alert('No data to export!');
      return;
    }
    window.print();
  }, [data]);

  // ── Print ──
  const handlePrint = () => {
    setTimeout(() => window.print(), 200);
  };

  // ── Check if any filters are active ──
  const hasActiveFilters = search || dateFrom || dateTo || status || supplierFilter || 
                           poStatus || billStatus || paymentMethod || minAmount || maxAmount;

  // ═══════════════════════════════════════════════════════════════
  // MOCK DATA GENERATORS (with filter support)
  // ═══════════════════════════════════════════════════════════════

  const genMockPOs = (filters = {}) => {
    const statuses = ['pending', 'approved', 'sent', 'partial', 'received', 'cancelled'];
    const supplierNames = ['K&K Poultry Farm', 'Al-Madina Wholesale Mart', 'Premium Foods Suppliers', 'Global Imports', 'Local Mart', 'National Distributors', 'Quality Foods'];
    const data = [];
    for (let i = 1; i <= 25; i++) {
      const supplier = supplierNames[i % supplierNames.length];
      const total = Math.floor(Math.random() * 500000) + 50000;
      const status = statuses[i % statuses.length];
      
      // Apply filters
      if (filters.supplierFilter) {
        const supId = parseInt(filters.supplierFilter);
        const sup = suppliers.find(s => s.id === supId);
        if (sup && supplier !== sup.name && supplier !== sup.businessName) continue;
      }
      if (filters.poStatus && status !== filters.poStatus) continue;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!String(i).includes(searchLower) && !supplier.toLowerCase().includes(searchLower)) continue;
      }
      
      data.push({
        id: i,
        poNumber: `PO-${String(i).padStart(4, '0')}`,
        createdAt: `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        supplierName: supplier,
        itemCount: Math.floor(Math.random() * 10) + 2,
        totalAmount: total,
        status: status,
        expectedDate: `2026-${String(Math.floor(Math.random() * 8) + 2).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        branchName: ['Main Branch', 'North Branch', 'South Branch', 'East Branch'][i % 4]
      });
    }
    return data;
  };

  const genMockBills = (filters = {}) => {
    const statuses = ['paid', 'unpaid', 'partial', 'overdue'];
    const supplierNames = ['K&K Poultry Farm', 'Al-Madina Wholesale Mart', 'Premium Foods Suppliers', 'Global Imports', 'Local Mart', 'National Distributors', 'Quality Foods'];
    const data = [];
    for (let i = 1; i <= 20; i++) {
      const supplier = supplierNames[i % supplierNames.length];
      const total = Math.floor(Math.random() * 500000) + 50000;
      const status = statuses[i % 4];
      const paid = status === 'paid' ? total : status === 'partial' ? Math.floor(total * 0.5) : 0;
      
      // Apply filters
      if (filters.supplierFilter) {
        const supId = parseInt(filters.supplierFilter);
        const sup = suppliers.find(s => s.id === supId);
        if (sup && supplier !== sup.name && supplier !== sup.businessName) continue;
      }
      if (filters.billStatus && status !== filters.billStatus) continue;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!String(i).includes(searchLower) && !supplier.toLowerCase().includes(searchLower)) continue;
      }
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : -Math.floor(Math.random() * 30) - 5));
      
      data.push({
        id: i,
        billNumber: `BILL-${String(i).padStart(4, '0')}`,
        grnNumber: `GRN-${String(i).padStart(4, '0')}`,
        createdAt: `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        supplierName: supplier,
        totalAmount: total,
        paidAmount: paid,
        amountPaid: paid,
        dueDate: dueDate.toISOString().split('T')[0],
        status: status
      });
    }
    return data;
  };

  const genMockLedger = (filters = {}) => {
    const supplierNames = ['K&K Poultry Farm', 'Al-Madina Wholesale Mart', 'Premium Foods Suppliers', 'Global Imports', 'Local Mart', 'National Distributors', 'Quality Foods'];
    let data = supplierNames.map((name, i) => ({
      supplierId: i + 1,
      supplierName: name,
      phone: `03${Math.floor(Math.random() * 900000000 + 100000000)}`,
      email: `${name.toLowerCase().replace(/ /g, '.')}@example.com`,
      totalPurchases: Math.floor(Math.random() * 1000000) + 100000,
      totalPaid: Math.floor(Math.random() * 800000) + 50000,
      balanceDue: Math.floor(Math.random() * 300000) + 10000,
      agingCurrent: Math.floor(Math.random() * 100000),
      aging30: Math.floor(Math.random() * 80000),
      aging60: Math.floor(Math.random() * 50000),
      aging90: Math.floor(Math.random() * 30000),
      aging90Plus: Math.floor(Math.random() * 20000),
      lastPurchase: `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
    }));

    // Apply filters
    if (filters.supplierFilter) {
      const supId = parseInt(filters.supplierFilter);
      data = data.filter(s => s.supplierId === supId);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(s => s.supplierName.toLowerCase().includes(searchLower));
    }
    if (filters.minAmount || filters.maxAmount) {
      data = data.filter(s => {
        if (filters.minAmount && s.balanceDue < Number(filters.minAmount)) return false;
        if (filters.maxAmount && s.balanceDue > Number(filters.maxAmount)) return false;
        return true;
      });
    }
    return data;
  };

  const genMockPayments = (filters = {}) => {
    const methods = ['cash', 'bank', 'cheque', 'online'];
    const supplierNames = ['K&K Poultry Farm', 'Al-Madina Wholesale Mart', 'Premium Foods Suppliers', 'Global Imports', 'Local Mart', 'National Distributors', 'Quality Foods'];
    const data = [];
    for (let i = 1; i <= 30; i++) {
      const supplier = supplierNames[i % supplierNames.length];
      const method = methods[i % methods.length];
      
      // Apply filters
      if (filters.supplierFilter) {
        const supId = parseInt(filters.supplierFilter);
        const sup = suppliers.find(s => s.id === supId);
        if (sup && supplier !== sup.name && supplier !== sup.businessName) continue;
      }
      if (filters.paymentMethod && method !== filters.paymentMethod) continue;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!String(i).includes(searchLower) && !supplier.toLowerCase().includes(searchLower)) continue;
      }
      
      data.push({
        id: i,
        reference: `PAY-${String(i).padStart(4, '0')}`,
        date: `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        createdAt: `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        supplierName: supplier,
        amount: Math.floor(Math.random() * 100000) + 10000,
        method: method,
        paymentMethod: method,
        billNumber: `BILL-${String(Math.floor(Math.random() * 20) + 1).padStart(4, '0')}`,
        notes: Math.random() > 0.5 ? 'Payment against bill' : 'Advance payment'
      });
    }
    return data;
  };

  const genMockReturns = (filters = {}) => {
    const statuses = ['pending', 'approved', 'completed', 'rejected'];
    const reasons = ['Damaged goods', 'Wrong item', 'Quality issue', 'Expired', 'Overstock'];
    const supplierNames = ['K&K Poultry Farm', 'Al-Madina Wholesale Mart', 'Premium Foods Suppliers', 'Global Imports', 'Local Mart', 'National Distributors', 'Quality Foods'];
    const data = [];
    for (let i = 1; i <= 15; i++) {
      const supplier = supplierNames[i % supplierNames.length];
      const status = statuses[i % 4];
      
      // Apply filters
      if (filters.supplierFilter) {
        const supId = parseInt(filters.supplierFilter);
        const sup = suppliers.find(s => s.id === supId);
        if (sup && supplier !== sup.name && supplier !== sup.businessName) continue;
      }
      if (filters.status && status !== filters.status) continue;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!String(i).includes(searchLower) && !supplier.toLowerCase().includes(searchLower)) continue;
      }
      
      data.push({
        id: i,
        returnNumber: `RET-${String(i).padStart(4, '0')}`,
        createdAt: `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        billNumber: `BILL-${String(Math.floor(Math.random() * 20) + 1).padStart(4, '0')}`,
        supplierName: supplier,
        items: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, j) => ({ name: `Item ${j+1}` })),
        itemCount: Math.floor(Math.random() * 4) + 1,
        totalQuantity: Math.floor(Math.random() * 20) + 1,
        quantity: Math.floor(Math.random() * 20) + 1,
        totalAmount: Math.floor(Math.random() * 50000) + 5000,
        refundAmount: Math.floor(Math.random() * 50000) + 5000,
        status: status,
        reason: reasons[i % reasons.length]
      });
    }
    return data;
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: TAB CONTENT
  // ═══════════════════════════════════════════════════════════════

  const renderPOStatus = () => {
    const filtered = data;

    const totalPOs = filtered.length;
    const totalAmount = filtered.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const pendingCount = filtered.filter(i => (i.status || '').toLowerCase() === 'pending').length;
    const receivedCount = filtered.filter(i => (i.status || '').toLowerCase() === 'received').length;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <SummaryCard title="Total POs" value={totalPOs} icon={FileText} color="blue" />
          <SummaryCard title="Total PO Value" value={formatMoney(totalAmount)} icon={DollarSign} color="gold" />
          <SummaryCard title="Pending POs" value={pendingCount} icon={Clock} trend={pendingCount > 0 ? 'Action required' : 'All clear'} trendUp={pendingCount === 0} color="orange" />
          <SummaryCard title="Received" value={receivedCount} icon={CheckCircle} trend="Completed" trendUp={true} color="green" />
        </div>

        <FilterCard 
          title="Filters" 
          icon={Filter} 
          onClear={clearFilters} 
          hasFilters={hasActiveFilters}
          onApply={applyFilters}
          loading={loading}
        >
          <FilterField label="Search">
            <input 
              type="text" 
              placeholder="PO # or supplier..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Status">
            <select 
              value={poStatus} 
              onChange={e => setPoStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="partial">Partially Received</option>
              <option value="received">Fully Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FilterField>
          <FilterField label="Supplier">
            <select 
              value={supplierFilter} 
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name || s.businessName || 'Unnamed'}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="From Date">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="To Date">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Amount Range">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minAmount} 
                onChange={e => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={maxAmount} 
                onChange={e => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
            </div>
          </FilterField>
        </FilterCard>

        <ExportToolbar 
          onExportCSV={exportCSV} 
          onExportPDF={exportPDF}
          onPrint={handlePrint} 
          dataCount={filtered.length} 
          title="Purchase Orders Report"
        />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.poNumber}
          emptyMessage="No purchase orders found"
          columns={[
            { header: 'PO Number', accessor: 'poNumber', cell: row => <span className="font-mono font-semibold text-gray-900">{row.poNumber || row.id}</span> },
            { header: 'Date', accessor: 'createdAt', cell: row => formatDate(row.createdAt || row.orderDate) },
            { header: 'Supplier', accessor: 'supplierName', cell: row => <span className="font-medium text-gray-900">{row.supplierName || row.supplier?.name || '-'}</span> },
            { header: 'Items', accessor: 'itemCount', align: 'center', cell: row => row.items?.length || row.itemCount || '-' },
            { header: 'Total Amount', accessor: 'totalAmount', align: 'right', cell: row => <span className="font-semibold">{formatMoney(row.totalAmount || row.amount)}</span> },
            { header: 'Status', accessor: 'status', align: 'center', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Expected Delivery', accessor: 'expectedDate', cell: row => formatDate(row.expectedDate || row.deliveryDate) },
            { header: 'Branch', accessor: 'branchName' },
          ]}
        />
      </>
    );
  };

  const renderPurchaseBills = () => {
    const filtered = data;

    const totalBills = filtered.length;
    const totalAmount = filtered.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const totalPaid = filtered.reduce((s, i) => s + (Number(i.paidAmount) || Number(i.amountPaid) || 0), 0);
    const totalUnpaid = totalAmount - totalPaid;
    const overdueCount = filtered.filter(i => {
      const bal = (Number(i.totalAmount) || 0) - (Number(i.paidAmount) || Number(i.amountPaid) || 0);
      return bal > 0 && i.dueDate && new Date(i.dueDate) < new Date();
    }).length;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <SummaryCard title="Total Bills" value={totalBills} icon={Receipt} color="blue" />
          <SummaryCard title="Bill Value" value={formatMoney(totalAmount)} icon={DollarSign} color="gold" />
          <SummaryCard title="Paid" value={formatMoney(totalPaid)} icon={CheckCircle} trend="Received" trendUp={true} color="green" />
          <SummaryCard title="Unpaid / Overdue" value={formatMoney(totalUnpaid)} icon={AlertTriangle} trend={`${overdueCount} overdue`} trendUp={overdueCount === 0} color="red" />
        </div>

        <FilterCard 
          title="Filters" 
          icon={Filter} 
          onClear={clearFilters} 
          hasFilters={hasActiveFilters}
          onApply={applyFilters}
          loading={loading}
        >
          <FilterField label="Search">
            <input 
              type="text" 
              placeholder="Bill, GRN or supplier..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Status">
            <select 
              value={billStatus} 
              onChange={e => setBillStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </FilterField>
          <FilterField label="Supplier">
            <select 
              value={supplierFilter} 
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name || s.businessName || 'Unnamed'}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="From Date">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="To Date">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Amount Range">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minAmount} 
                onChange={e => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={maxAmount} 
                onChange={e => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
            </div>
          </FilterField>
        </FilterCard>

        <ExportToolbar 
          onExportCSV={exportCSV} 
          onExportPDF={exportPDF}
          onPrint={handlePrint} 
          dataCount={filtered.length} 
          title="Purchase Bills Report"
        />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.billNumber}
          emptyMessage="No purchase bills found"
          columns={[
            { header: 'Bill #', accessor: 'billNumber', cell: row => <span className="font-mono font-semibold text-gray-900">{row.billNumber || row.grnNumber || row.id}</span> },
            { header: 'GRN #', accessor: 'grnNumber', cell: row => <span className="text-gray-500">{row.grnNumber || '-'}</span> },
            { header: 'Date', accessor: 'createdAt', cell: row => formatDate(row.createdAt || row.billDate) },
            { header: 'Supplier', accessor: 'supplierName', cell: row => <span className="font-medium text-gray-900">{row.supplierName || row.supplier?.name || '-'}</span> },
            { header: 'Total', accessor: 'totalAmount', align: 'right', cell: row => formatMoney(row.totalAmount || row.amount) },
            { header: 'Paid', accessor: 'paidAmount', align: 'right', cell: row => <span className="text-green-600">{formatMoney(row.paidAmount || row.amountPaid || 0)}</span> },
            { header: 'Balance', accessor: 'balance', align: 'right', cell: row => {
              const bal = (Number(row.totalAmount) || 0) - (Number(row.paidAmount) || Number(row.amountPaid) || 0);
              return <span className={`font-semibold ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(bal)}</span>;
            }},
            { header: 'Status', accessor: 'status', align: 'center', cell: row => {
              const bal = (Number(row.totalAmount) || 0) - (Number(row.paidAmount) || Number(row.amountPaid) || 0);
              let st = row.status;
              if (!st && bal === 0) st = 'paid';
              else if (!st && bal > 0) st = 'unpaid';
              if (bal > 0 && row.dueDate && new Date(row.dueDate) < new Date()) st = 'overdue';
              return <StatusBadge status={st} label={st?.toUpperCase()} />;
            }},
            { header: 'Due Date', accessor: 'dueDate', cell: row => formatDate(row.dueDate) },
          ]}
        />
      </>
    );
  };

  const renderSupplierLedger = () => {
    const filtered = data;

    const totalSuppliers = filtered.length;
    const totalPayable = filtered.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0);
    const totalPaid = filtered.reduce((s, i) => s + (Number(i.totalPaid) || 0), 0);
    const totalPurchases = filtered.reduce((s, i) => s + (Number(i.totalPurchases) || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <SummaryCard title="Suppliers" value={totalSuppliers} icon={User} color="blue" />
          <SummaryCard title="Total Purchases" value={formatMoney(totalPurchases)} icon={ArrowDownRight} trend="Incoming" trendUp={true} color="gold" />
          <SummaryCard title="Total Paid" value={formatMoney(totalPaid)} icon={CheckCircle} trend="Settled" trendUp={true} color="green" />
          <SummaryCard title="Balance Due" value={formatMoney(totalPayable)} icon={AlertTriangle} trend={totalPayable > 0 ? 'Payable' : 'All clear'} trendUp={totalPayable === 0} color="red" />
        </div>

        <FilterCard 
          title="Filters" 
          icon={Filter} 
          onClear={clearFilters} 
          hasFilters={hasActiveFilters}
          onApply={applyFilters}
          loading={loading}
        >
          <FilterField label="Search">
            <input 
              type="text" 
              placeholder="Search supplier..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Supplier">
            <select 
              value={supplierFilter} 
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name || s.businessName || 'Unnamed'}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="From Date">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="To Date">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Balance Range">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minAmount} 
                onChange={e => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={maxAmount} 
                onChange={e => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
            </div>
          </FilterField>
        </FilterCard>

        <ExportToolbar 
          onExportCSV={exportCSV} 
          onExportPDF={exportPDF}
          onPrint={handlePrint} 
          dataCount={filtered.length} 
          title="Supplier Ledger Report"
        />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.supplierId}
          emptyMessage="No supplier ledger data found"
          columns={[
            { header: 'Supplier', accessor: 'supplierName', cell: row => (
              <div>
                <span className="font-medium text-gray-900 block">{row.supplierName}</span>
                <span className="text-xs text-gray-400">{row.phone}</span>
              </div>
            )},
            { header: 'Total Purchases', accessor: 'totalPurchases', align: 'right', cell: row => formatMoney(row.totalPurchases) },
            { header: 'Total Paid', accessor: 'totalPaid', align: 'right', cell: row => <span className="text-green-600">{formatMoney(row.totalPaid)}</span> },
            { header: 'Balance Due', accessor: 'balanceDue', align: 'right', cell: row => <span className={`font-bold ${row.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(row.balanceDue)}</span> },
            { header: 'Current (0-30)', accessor: 'agingCurrent', align: 'right', cell: row => formatMoney(row.agingCurrent) },
            { header: '31-60 Days', accessor: 'aging30', align: 'right', cell: row => <span className="text-orange-600">{formatMoney(row.aging30)}</span> },
            { header: '61-90 Days', accessor: 'aging60', align: 'right', cell: row => <span className="text-red-500">{formatMoney(row.aging60)}</span> },
            { header: '90+ Days', accessor: 'aging90Plus', align: 'right', cell: row => <span className="text-rose-700 font-semibold">{formatMoney(row.aging90Plus)}</span> },
            { header: 'Last Purchase', accessor: 'lastPurchase', cell: row => formatDate(row.lastPurchase) },
          ]}
        />
      </>
    );
  };

  const renderPaymentHistory = () => {
    const filtered = data;

    const totalPayments = filtered.length;
    const totalAmount = filtered.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Payments" value={totalPayments} icon={CreditCard} color="blue" />
          <SummaryCard title="Total Paid" value={formatMoney(totalAmount)} icon={DollarSign} trend="Outgoing" trendUp={false} color="gold" />
          <SummaryCard title="Avg Payment" value={formatMoney(totalPayments > 0 ? totalAmount / totalPayments : 0)} icon={Wallet} color="green" />
        </div>

        <FilterCard 
          title="Filters" 
          icon={Filter} 
          onClear={clearFilters} 
          hasFilters={hasActiveFilters}
          onApply={applyFilters}
          loading={loading}
        >
          <FilterField label="Search">
            <input 
              type="text" 
              placeholder="Supplier or reference..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Supplier">
            <select 
              value={supplierFilter} 
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name || s.businessName || 'Unnamed'}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Payment Method">
            <select 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online / UPI</option>
            </select>
          </FilterField>
          <FilterField label="From Date">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="To Date">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Amount Range">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minAmount} 
                onChange={e => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={maxAmount} 
                onChange={e => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
            </div>
          </FilterField>
        </FilterCard>

        <ExportToolbar 
          onExportCSV={exportCSV} 
          onExportPDF={exportPDF}
          onPrint={handlePrint} 
          dataCount={filtered.length} 
          title="Payment History Report"
        />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.reference}
          emptyMessage="No payment records found"
          columns={[
            { header: 'Date', accessor: 'date', cell: row => formatDateTime(row.date || row.createdAt || row.paymentDate) },
            { header: 'Reference', accessor: 'reference', cell: row => <span className="font-mono text-xs">{row.reference || row.id || '-'}</span> },
            { header: 'Supplier', accessor: 'supplierName', cell: row => <span className="font-medium text-gray-900">{row.supplierName || row.supplier?.name || '-'}</span> },
            { header: 'Amount', accessor: 'amount', align: 'right', cell: row => <span className="text-red-600 font-semibold">{formatMoney(row.amount)}</span> },
            { header: 'Method', accessor: 'method', align: 'center', cell: row => <StatusBadge status={row.method || row.paymentMethod} label={(row.method || row.paymentMethod || 'N/A').toUpperCase()} /> },
            { header: 'Against Bill', accessor: 'billNumber', cell: row => <span className="text-gray-500">{row.billNumber || row.purchaseBillId || '-'}</span> },
            { header: 'Notes', accessor: 'notes', cell: row => <span className="text-gray-500 truncate max-w-[200px] block">{row.notes || '-'}</span> },
          ]}
        />
      </>
    );
  };

  const renderPurchaseReturns = () => {
    const filtered = data;

    const totalReturns = filtered.length;
    const totalQty = filtered.reduce((s, i) => s + (Number(i.totalQuantity) || Number(i.quantity) || 0), 0);
    const totalValue = filtered.reduce((s, i) => s + (Number(i.totalAmount) || Number(i.refundAmount) || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Returns" value={totalReturns} icon={RotateCcw} color="blue" />
          <SummaryCard title="Returned Qty" value={totalQty.toLocaleString('en-PK')} icon={Package} trend="Outgoing" trendUp={false} color="orange" />
          <SummaryCard title="Refund Value" value={formatMoney(totalValue)} icon={DollarSign} trend="Credit" trendUp={true} color="green" />
        </div>

        <FilterCard 
          title="Filters" 
          icon={Filter} 
          onClear={clearFilters} 
          hasFilters={hasActiveFilters}
          onApply={applyFilters}
          loading={loading}
        >
          <FilterField label="Search">
            <input 
              type="text" 
              placeholder="Return #, bill or supplier..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Status">
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </FilterField>
          <FilterField label="Supplier">
            <select 
              value={supplierFilter} 
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name || s.businessName || 'Unnamed'}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="From Date">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="To Date">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
            />
          </FilterField>
          <FilterField label="Amount Range">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minAmount} 
                onChange={e => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={maxAmount} 
                onChange={e => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" 
              />
            </div>
          </FilterField>
        </FilterCard>

        <ExportToolbar 
          onExportCSV={exportCSV} 
          onExportPDF={exportPDF}
          onPrint={handlePrint} 
          dataCount={filtered.length} 
          title="Purchase Returns Report"
        />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.returnNumber}
          emptyMessage="No purchase returns found"
          columns={[
            { header: 'Return #', accessor: 'returnNumber', cell: row => <span className="font-mono font-semibold text-gray-900">{row.returnNumber || row.id}</span> },
            { header: 'Date', accessor: 'createdAt', cell: row => formatDate(row.createdAt || row.returnDate) },
            { header: 'Original Bill', accessor: 'billNumber', cell: row => <span className="text-gray-500">{row.billNumber || row.purchaseBillId || '-'}</span> },
            { header: 'Supplier', accessor: 'supplierName', cell: row => <span className="font-medium text-gray-900">{row.supplierName || row.supplier?.name || '-'}</span> },
            { header: 'Items', accessor: 'items', align: 'center', cell: row => row.items?.length || row.itemCount || '-' },
            { header: 'Qty', accessor: 'totalQuantity', align: 'right', cell: row => <span className="font-semibold">{row.totalQuantity || row.quantity || 0}</span> },
            { header: 'Refund', accessor: 'totalAmount', align: 'right', cell: row => formatMoney(row.totalAmount || row.refundAmount || 0) },
            { header: 'Status', accessor: 'status', align: 'center', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Reason', accessor: 'reason', cell: row => <span className="text-gray-500">{row.reason || '-'}</span> },
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
      case 'po-status': return renderPOStatus();
      case 'purchase-bills': return renderPurchaseBills();
      case 'supplier-ledger': return renderSupplierLedger();
      case 'payment-history': return renderPaymentHistory();
      case 'purchase-returns': return renderPurchaseReturns();
      default: return null;
    }
  };

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Report';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PURCHASE & SUPPLIER REPORTS</h1>
            <p className="text-sm text-gray-500 mt-1">Purchase orders, bills, supplier ledger, payments & returns analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">PURCHASE & SUPPLIER REPORTS</h1>
        <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleDateString('en-PK')}</p>
        <p className="text-sm text-gray-500">Report: {activeTabLabel}</p>
        <hr className="my-4 border-gray-300" />
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
          <button onClick={applyFilters} className="ml-auto text-sm underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Content */}
      <div className="animate-in fade-in duration-200">
        {renderTabContent()}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400 print:hidden">
        <p>Marquee ERP Management System &mdash; Purchase & Supplier Reports Module</p>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500 text-center">
        <p>Marquee ERP Management System | {activeTabLabel} | Page 1</p>
        <p>Generated: {new Date().toLocaleString('en-PK')}</p>
      </div>
    </div>
  );
}