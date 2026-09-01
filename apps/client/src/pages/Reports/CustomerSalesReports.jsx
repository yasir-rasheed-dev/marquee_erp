// pages/CustomerSalesReports.jsx
import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users,
  Calendar,
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  FileText,
  X,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  ChefHat,
  Star
} from 'lucide-react';

// ── API IMPORTS ──
import customerApi from '../../services/customerApi';
import bookingApi from '../../services/bookingApi';
import packageApi from '../../services/packageApi';
import menuApi from '../../services/menuApi';
import eventExecutionApi from '../../services/eventExecutionApi';
import ReactSelect from '../../components/ui/ReactSelect';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const parseAmount = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[,RsPKR\s]/gi, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

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

const getStatusColor = (status) => {
  const map = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-red-100 text-red-700',
    overdue: 'bg-rose-100 text-rose-700',
    vip: 'bg-purple-100 text-purple-700',
    regular: 'bg-blue-100 text-blue-700',
    new: 'bg-teal-100 text-teal-700',
    wedding: 'bg-pink-100 text-pink-700',
    corporate: 'bg-indigo-100 text-indigo-700',
    birthday: 'bg-orange-100 text-orange-700',
    dinner: 'bg-cyan-100 text-cyan-700',
    starter: 'bg-lime-100 text-lime-700',
    main: 'bg-amber-100 text-amber-700',
    dessert: 'bg-fuchsia-100 text-fuchsia-700',
    beverage: 'bg-sky-100 text-sky-700',
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600'
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

const DataTable = ({ columns, data, keyExtractor, emptyMessage = "No data found", loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <RefreshCw size={32} className="mx-auto text-[#C89B3C] animate-spin mb-3" />
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
  { id: 'customer-directory', label: 'Customer Directory', icon: Users },
  { id: 'booking-history', label: 'Booking History', icon: Calendar },
  { id: 'outstanding', label: 'Outstanding / Receivables', icon: CreditCard },
  { id: 'sales-category', label: 'Sales by Category / Item', icon: Package },
  { id: 'menu-performance', label: 'Menu Performance', icon: ChefHat },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CustomerSalesReports() {
  const [activeTab, setActiveTab] = useState('customer-directory');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // ── Filter States ──
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // ── Reset filters on tab change ──
  useEffect(() => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('');
    setCategory('');
    setMinAmount('');
    setMaxAmount('');
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
      if (search) params.search = search;
      if (status) params.status = status;

      switch (activeTab) {
        case 'customer-directory': {
          const [customersRes, bookingsRes] = await Promise.all([
            customerApi.getAll(params),
            bookingApi.getAll({ ...params, limit: 10000 }).catch(() => ({ data: [] }))
          ]);
          const customers = extractArray(customersRes);
          const bookings = extractArray(bookingsRes);

          result = customers.map(c => {
            const custBookings = bookings.filter(b =>
              b.customerId === c.id || b.customer?.id === c.id || b.customerId === c._id
            );
            const totalSpent = custBookings.reduce((s, b) => {
              return s + parseAmount(b.totalAmount ?? b.grandTotal ?? b.amount);
            }, 0);
            return {
              ...c,
              totalBookings: custBookings.length,
              totalSpent,
              status: c.status || 'active'
            };
          });
          break;
        }
        case 'booking-history': {
          const res = await bookingApi.getAll(params);
          result = extractArray(res);
          break;
        }
        case 'outstanding': {
          const res = await bookingApi.getAll(params);
          const bookings = extractArray(res);
          const customerMap = {};

          bookings.forEach(b => {
            const custId = b.customerId || b.customer?.id;
            const custName = b.customerName || b.customer?.name || 'Unknown';
            const custPhone = b.customerPhone || b.customer?.phone || b.customer?.mobile || '-';

            if (!custId) return;

            const total = parseAmount(b.totalAmount ?? b.grandTotal ?? b.amount);
            const paid = parseAmount(b.paidAmount ?? b.amountPaid);
            const outstanding = total - paid;

            if (outstanding <= 0) return;

            if (!customerMap[custId]) {
              customerMap[custId] = {
                id: custId,
                name: custName,
                phone: custPhone,
                bookings: 0,
                totalAmount: 0,
                paid: 0,
                outstanding: 0,
                lastPaymentDate: null
              };
            }

            customerMap[custId].bookings += 1;
            customerMap[custId].totalAmount += total;
            customerMap[custId].paid += paid;
            customerMap[custId].outstanding += outstanding;

            const pDate = b.lastPaymentDate || b.updatedAt || b.eventDate;
            if (pDate && (!customerMap[custId].lastPaymentDate || new Date(pDate) > new Date(customerMap[custId].lastPaymentDate))) {
              customerMap[custId].lastPaymentDate = pDate;
            }
          });

          result = Object.values(customerMap);
          break;
        }
        case 'sales-category': {
          if (category) params.category = category;
          const [packagesRes, bookingsRes] = await Promise.all([
            packageApi.getAll(params),
            bookingApi.getAll({ ...params, limit: 10000 }).catch(() => ({ data: [] }))
          ]);
          const packages = extractArray(packagesRes);
          const bookings = extractArray(bookingsRes);
          const totalRevenueAll = bookings.reduce((s, b) => s + parseAmount(b.totalAmount ?? b.grandTotal), 0);

          result = packages.map(pkg => {
            const pkgBookings = bookings.filter(b =>
              b.packageId === pkg.id || b.package?.id === pkg.id || b.packageId === pkg._id
            );
            const revenue = pkgBookings.reduce((s, b) => s + parseAmount(b.totalAmount ?? b.grandTotal), 0);
            return {
              ...pkg,
              category: pkg.category || 'Package',
              totalBookings: pkgBookings.length,
              totalRevenue: revenue,
              avgPerBooking: pkgBookings.length ? revenue / pkgBookings.length : 0,
              percentOfTotal: totalRevenueAll ? (revenue / totalRevenueAll) * 100 : 0
            };
          }).sort((a, b) => b.totalRevenue - a.totalRevenue);
          break;
        }
        case 'menu-performance': {
          if (category) params.category = category;
          const [menusRes, usagesRes] = await Promise.all([
            menuApi.getAll(params),
            eventExecutionApi.getDishUsages({ ...params, limit: 10000 }).catch(() => ({ data: [] }))
          ]);
          const menus = extractArray(menusRes);
          const usages = extractArray(usagesRes);

          result = menus.map(menu => {
            const menuUsages = usages.filter(u =>
              u.menuId === menu.id || u.menu?.id === menu.id || u.dishId === menu.id
            );
            const timesUsed = menuUsages.reduce((s, u) => s + (parseAmount(u.quantity) || parseAmount(u.timesUsed) || parseAmount(u.count) || 1), 0);
            return {
              ...menu,
              timesUsed,
              revenueContribution: parseAmount(menu.price ?? menu.cost) * timesUsed,
              category: menu.category || 'General'
            };
          }).sort((a, b) => b.timesUsed - a.timesUsed);
          break;
        }
        default:
          break;
      }

      if (minAmount) {
        result = result.filter(r =>
          (r.totalSpent || r.totalRevenue || r.outstanding || r.revenueContribution || 0) >= Number(minAmount)
        );
      }
      if (maxAmount) {
        result = result.filter(r =>
          (r.totalSpent || r.totalRevenue || r.outstanding || r.revenueContribution || 0) <= Number(maxAmount)
        );
      }

      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, dateFrom, dateTo, status, category, minAmount, maxAmount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Download PDF ──
  const downloadPDF = useCallback(() => {
    if (!data.length) {
      alert('No data to export');
      return;
    }
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

    let headers = [];
    let body = [];

    switch (activeTab) {
      case 'customer-directory':
        headers = [['Name', 'Phone', 'Email', 'Address', 'Bookings', 'Total Spent', 'Status']];
        body = data.map(r => [
          r.name || '',
          r.phone || '',
          r.email || '',
          r.address || '',
          String(r.totalBookings || 0),
          formatMoney(r.totalSpent || 0),
          r.status || 'active'
        ]);
        break;
      case 'booking-history':
        headers = [['Date', 'Reference', 'Customer', 'Package', 'Hall', 'Status', 'Amount', 'Paid', 'Balance']];
        body = data.map(r => {
          const total = r.totalAmount || r.grandTotal || 0;
          const paid = r.paidAmount || r.amountPaid || 0;
          return [
            formatDateShort(r.eventDate || r.date || r.createdAt),
            r.reference || r.id || '',
            r.customerName || r.customer?.name || '',
            r.packageName || r.package?.name || '',
            r.hallName || r.hall?.name || '',
            r.status || '',
            formatMoney(total),
            formatMoney(paid),
            formatMoney(total - paid)
          ];
        });
        break;
      case 'outstanding':
        headers = [['Customer', 'Phone', 'Bookings', 'Total Amount', 'Paid', 'Outstanding', 'Last Payment']];
        body = data.map(r => [
          r.name || '',
          r.phone || '',
          String(r.bookings),
          formatMoney(r.totalAmount),
          formatMoney(r.paid),
          formatMoney(r.outstanding),
          formatDateShort(r.lastPaymentDate)
        ]);
        break;
      case 'sales-category':
        headers = [['Category/Item', 'Bookings', 'Total Revenue', 'Avg per Booking', '% of Total']];
        body = data.map(r => [
          r.name || r.category || '',
          String(r.totalBookings),
          formatMoney(r.totalRevenue),
          formatMoney(r.avgPerBooking),
          `${(r.percentOfTotal || 0).toFixed(1)}%`
        ]);
        break;
      case 'menu-performance':
        headers = [['Menu Item', 'Category', 'Times Used', 'Price', 'Revenue Contribution', 'Popularity']];
        body = data.map(r => [
          r.name || '',
          r.category || '',
          String(r.timesUsed || 0),
          formatMoney(r.price || 0),
          formatMoney(r.revenueContribution || 0),
          r.timesUsed > 20 ? 'High' : r.timesUsed > 5 ? 'Medium' : 'Low'
        ]);
        break;
      default:
        headers = [['Data']];
        body = data.map(r => [JSON.stringify(r)]);
    }

    autoTable(doc, {
      startY: 36,
      head: headers,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 245] }
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`© 2026 UniSoft ERP — Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`CustomerSales_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [data, activeTab, dateFrom, dateTo]);

  // ── Download CSV ──
  const downloadCSV = useCallback(() => {
    if (!data.length) {
      alert('No data to export');
      return;
    }
    let headers = [];
    let rows = [];

    switch (activeTab) {
      case 'customer-directory':
        headers = ['Name', 'Phone', 'Email', 'Address', 'Total Bookings', 'Total Spent', 'Status'];
        rows = data.map(r => [r.name, r.phone, r.email, r.address, r.totalBookings, r.totalSpent, r.status]);
        break;
      case 'booking-history':
        headers = ['Date', 'Reference', 'Customer', 'Package', 'Hall', 'Status', 'Total Amount', 'Paid', 'Balance'];
        rows = data.map(r => {
          const total = r.totalAmount || r.grandTotal || 0;
          const paid = r.paidAmount || r.amountPaid || 0;
          return [
            formatDateShort(r.eventDate || r.date || r.createdAt),
            r.reference || r.id,
            r.customerName || r.customer?.name,
            r.packageName || r.package?.name,
            r.hallName || r.hall?.name,
            r.status,
            total,
            paid,
            total - paid
          ];
        });
        break;
      case 'outstanding':
        headers = ['Customer', 'Phone', 'Bookings', 'Total Amount', 'Paid', 'Outstanding', 'Last Payment Date'];
        rows = data.map(r => [r.name, r.phone, r.bookings, r.totalAmount, r.paid, r.outstanding, formatDateShort(r.lastPaymentDate)]);
        break;
      case 'sales-category':
        headers = ['Category/Item', 'Total Bookings', 'Total Revenue', 'Avg per Booking', 'Percent of Total'];
        rows = data.map(r => [r.name || r.category, r.totalBookings, r.totalRevenue, r.avgPerBooking, r.percentOfTotal]);
        break;
      case 'menu-performance':
        headers = ['Menu Item', 'Category', 'Times Used', 'Price', 'Revenue Contribution'];
        rows = data.map(r => [r.name, r.category, r.timesUsed, r.price, r.revenueContribution]);
        break;
      default:
        headers = Object.keys(data[0]);
        rows = data.map(r => Object.values(r));
    }

    const csvContent = [
      ['UniSoft ERP - Customer & Sales Report'],
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
    link.download = `CustomerSales_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [data, activeTab, dateFrom, dateTo]);

  // ── Print ──
  const handlePrint = () => window.print();

  // ── Clear Filters ──
  const hasActiveFilters = search || dateFrom || dateTo || status || category || minAmount || maxAmount;
  const clearFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setStatus('');
    setCategory(''); setMinAmount(''); setMaxAmount('');
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: TAB CONTENT
  // ═══════════════════════════════════════════════════════════════

  const renderCustomerDirectory = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.phone?.includes(search)
    );

    const totalCustomers = filtered.length;
    const activeCustomers = filtered.filter(c => (c.status || 'active') === 'active').length;
    const totalRevenue = filtered.reduce((sum, c) => sum + parseAmount(c.totalSpent), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Customers" value={totalCustomers} icon={Users} />
          <SummaryCard title="Active Customers" value={activeCustomers} icon={Users}
            trend={`${Math.round((activeCustomers / (totalCustomers || 1)) * 100)}% active`} trendUp={true} />
          <SummaryCard title="Total Revenue" value={formatMoney(totalRevenue)} icon={DollarSign} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'vip', label: 'VIP' },
              { value: 'regular', label: 'Regular' }
            ]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.phone}
          emptyMessage="No customers found"
          columns={[
            { header: 'Name', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'Phone', accessor: 'phone', cell: row => <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400"/>{row.phone || '-'}</span> },
            { header: 'Email', accessor: 'email', cell: row => <span className="flex items-center gap-1"><Mail size={12} className="text-gray-400"/>{row.email || '-'}</span> },
            { header: 'Address', accessor: 'address', cell: row => <span className="flex items-center gap-1"><MapPin size={12} className="text-gray-400"/>{row.address || '-'}</span> },
            { header: 'Bookings', accessor: 'totalBookings', cell: row => <span className="font-semibold">{row.totalBookings || 0}</span> },
            { header: 'Total Spent', accessor: 'totalSpent', cell: row => formatMoney(row.totalSpent || 0) },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status || 'active'} label={(row.status || 'ACTIVE').toUpperCase()} /> },
          ]}
        />
      </>
    );
  };

  const renderBookingHistory = () => {
    const filtered = data.filter(item =>
      !search || item.customerName?.toLowerCase().includes(search.toLowerCase()) || item.reference?.toLowerCase().includes(search.toLowerCase())
    );

    const totalBookings = filtered.length;
    const totalRevenue = filtered.reduce((sum, b) => sum + parseAmount(b.totalAmount ?? b.grandTotal), 0);
    const totalOutstanding = filtered.reduce((sum, b) => {
      const total = parseAmount(b.totalAmount ?? b.grandTotal);
      const paid = parseAmount(b.paidAmount ?? b.amountPaid);
      return sum + (total - paid);
    }, 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Bookings" value={totalBookings} icon={Calendar} />
          <SummaryCard title="Total Revenue" value={formatMoney(totalRevenue)} icon={DollarSign} />
          <SummaryCard title="Total Outstanding" value={formatMoney(totalOutstanding)} icon={CreditCard}
            trend={totalOutstanding > 0 ? 'Pending' : 'All Clear'} trendUp={totalOutstanding === 0} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search customer or reference..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id || row.reference}
          emptyMessage="No bookings found"
          columns={[
            { header: 'Event Date', accessor: 'eventDate', cell: row => formatDate(row.eventDate || row.date || row.createdAt) },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Customer', accessor: 'customerName', cell: row => <span className="font-medium text-gray-900">{row.customerName || row.customer?.name || 'Unknown'}</span> },
            { header: 'Package', accessor: 'packageName', cell: row => row.packageName || row.package?.name || '-' },
            { header: 'Hall', accessor: 'hallName', cell: row => row.hallName || row.hall?.name || '-' },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Amount', accessor: 'totalAmount', cell: row => formatMoney(parseAmount(row.totalAmount ?? row.grandTotal)) },
            { header: 'Paid', accessor: 'paidAmount', cell: row => formatMoney(parseAmount(row.paidAmount ?? row.amountPaid)) },
            { header: 'Balance', accessor: 'balance', cell: row => {
              const total = parseAmount(row.totalAmount ?? row.grandTotal);
              const paid = parseAmount(row.paidAmount ?? row.amountPaid);
              const bal = total - paid;
              return <span className={`font-semibold ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(bal)}</span>;
            }},
          ]}
        />
      </>
    );
  };

  const renderOutstanding = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.phone?.includes(search)
    );

    const totalOutstanding = filtered.reduce((sum, c) => sum + parseAmount(c.outstanding), 0);
    const totalCustomers = filtered.length;
    const avgOutstanding = totalCustomers > 0 ? totalOutstanding / totalCustomers : 0;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Outstanding" value={formatMoney(totalOutstanding)} icon={CreditCard} trend="Collect now" trendUp={false} />
          <SummaryCard title="Customers Due" value={totalCustomers} icon={Users} />
          <SummaryCard title="Avg per Customer" value={formatMoney(avgOutstanding)} icon={DollarSign} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search customer or phone..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="number" placeholder="Min Outstanding" value={minAmount} onChange={e => setMinAmount(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="number" placeholder="Max Outstanding" value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No outstanding receivables found"
          columns={[
            { header: 'Customer', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'Phone', accessor: 'phone', cell: row => <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400"/>{row.phone}</span> },
            { header: 'Bookings', accessor: 'bookings', cell: row => <span className="font-semibold">{row.bookings}</span> },
            { header: 'Total Amount', accessor: 'totalAmount', cell: row => formatMoney(row.totalAmount) },
            { header: 'Paid', accessor: 'paid', cell: row => formatMoney(row.paid) },
            { header: 'Outstanding', accessor: 'outstanding', cell: row => <span className="text-red-600 font-bold">{formatMoney(row.outstanding)}</span> },
            { header: 'Last Payment', accessor: 'lastPaymentDate', cell: row => formatDateShort(row.lastPaymentDate) },
            { header: 'Risk', accessor: 'risk', cell: row => <StatusBadge status={row.outstanding > 100000 ? 'overdue' : 'partial'} label={row.outstanding > 100000 ? 'HIGH RISK' : 'PENDING'} /> },
          ]}
        />
      </>
    );
  };

  const renderSalesCategory = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase())
    );

    const totalRevenue = filtered.reduce((sum, p) => sum + parseAmount(p.totalRevenue), 0);
    const totalBookings = filtered.reduce((sum, p) => sum + (p.totalBookings || 0), 0);
    const topCategory = filtered.length > 0 ? filtered.reduce((max, p) => p.totalRevenue > max.totalRevenue ? p : max, filtered[0]) : null;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Revenue" value={formatMoney(totalRevenue)} icon={DollarSign} />
          <SummaryCard title="Total Bookings" value={totalBookings} icon={Package} />
          <SummaryCard title="Top Category" value={topCategory?.name || '-'} icon={TrendingUp}
            trend={`${formatMoney(topCategory?.totalRevenue || 0)}`} trendUp={true} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search package or category..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <ReactSelect
            value={category}
            onChange={(val) => setCategory(val || '')}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'wedding', label: 'Wedding' },
              { value: 'corporate', label: 'Corporate' },
              { value: 'birthday', label: 'Birthday' },
              { value: 'dinner', label: 'Dinner' },
              { value: 'other', label: 'Other' }
            ]}
            placeholder="All Categories"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No sales data found"
          columns={[
            { header: 'Package / Category', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'Category', accessor: 'category', cell: row => <StatusBadge status={row.category?.toLowerCase()} label={row.category?.toUpperCase() || 'PACKAGE'} /> },
            { header: 'Bookings', accessor: 'totalBookings', cell: row => <span className="font-semibold">{row.totalBookings}</span> },
            { header: 'Total Revenue', accessor: 'totalRevenue', cell: row => formatMoney(row.totalRevenue) },
            { header: 'Avg per Booking', accessor: 'avgPerBooking', cell: row => formatMoney(row.avgPerBooking) },
            { header: '% of Total', accessor: 'percentOfTotal', cell: row => (
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div className="bg-[#C89B3C] h-2 rounded-full" style={{ width: `${Math.min(row.percentOfTotal || 0, 100)}%` }} />
                </div>
                <span className="text-xs">{(row.percentOfTotal || 0).toFixed(1)}%</span>
              </div>
            )},
          ]}
        />
      </>
    );
  };

  const renderMenuPerformance = () => {
    const filtered = data.filter(item =>
      !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalTimesUsed = filtered.reduce((sum, m) => sum + (m.timesUsed || 0), 0);
    const totalRevenue = filtered.reduce((sum, m) => sum + (m.revenueContribution || 0), 0);
    const topItem = filtered.length > 0 ? filtered.reduce((max, m) => m.timesUsed > max.timesUsed ? m : max, filtered[0]) : null;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Menu Items" value={totalItems} icon={ChefHat} />
          <SummaryCard title="Total Usage" value={totalTimesUsed.toLocaleString('en-PK')} icon={Package} />
          <SummaryCard title="Top Item" value={topItem?.name || '-'} icon={Star}
            trend={`${topItem?.timesUsed || 0} times`} trendUp={true} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <input type="text" placeholder="Search menu item..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <ReactSelect
            value={category}
            onChange={(val) => setCategory(val || '')}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'starter', label: 'Starter' },
              { value: 'main', label: 'Main Course' },
              { value: 'dessert', label: 'Dessert' },
              { value: 'beverage', label: 'Beverage' },
              { value: 'other', label: 'Other' }
            ]}
            placeholder="All Categories"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No menu performance data found"
          columns={[
            { header: 'Menu Item', accessor: 'name', cell: row => <span className="font-medium text-gray-900">{row.name}</span> },
            { header: 'Category', accessor: 'category', cell: row => <StatusBadge status={row.category?.toLowerCase()} label={row.category?.toUpperCase() || 'GENERAL'} /> },
            { header: 'Times Used', accessor: 'timesUsed', cell: row => <span className="font-semibold">{row.timesUsed || 0}</span> },
            { header: 'Price', accessor: 'price', cell: row => formatMoney(row.price || 0) },
            { header: 'Revenue', accessor: 'revenueContribution', cell: row => formatMoney(row.revenueContribution || 0) },
            { header: 'Popularity', accessor: 'popularity', cell: row => {
              const t = row.timesUsed || 0;
              return <StatusBadge status={t > 20 ? 'high' : t > 5 ? 'medium' : 'low'} label={t > 20 ? 'HIGH' : t > 5 ? 'MEDIUM' : 'LOW'} />;
            }},
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
      case 'customer-directory': return renderCustomerDirectory();
      case 'booking-history': return renderBookingHistory();
      case 'outstanding': return renderOutstanding();
      case 'sales-category': return renderSalesCategory();
      case 'menu-performance': return renderMenuPerformance();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CUSTOMER & SALES REPORTS</h1>
            <p className="text-sm text-gray-500 mt-1">Customer analytics, booking history, and sales performance reports</p>
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
        <h1 className="text-2xl font-bold text-gray-900">CUSTOMER & SALES REPORTS</h1>
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
                    ? 'bg-[#C89B3C] text-white shadow-sm'
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
        <p>UniSoft Enterprise ERP &mdash; Customer & Sales Reports Module</p>
      </div>
    </div>
  );
}