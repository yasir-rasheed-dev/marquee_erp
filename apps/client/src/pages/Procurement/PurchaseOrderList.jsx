// pages/Purchases/PurchaseOrderList.jsx
// COMPLETE - With Pagination + Cards/Table View + Return Modal + Payment

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, FileText, Calendar, Package, ArrowLeft,
  Check, AlertCircle, Building2, Loader2, Eye, Trash2, Edit2,
  Filter, TrendingUp, Clock, CheckCircle2, XCircle, Hash,
  Phone, DollarSign, MapPin, ChevronDown, Receipt, FileClock,
  Truck, RotateCcw, Weight, CreditCard, Banknote, Wallet,
  LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import purchaseApi from '../../services/purchaseApi';
import accountApi from '../../services/accountApi';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import ReactSelect from '../../components/ui/ReactSelect';

// ── Toast Hook ──
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold min-w-[300px]"
          style={{ background: t.type === 'success' ? '#2E7D32' : '#D32F2F' }}
        >
          {t.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
  return { addToast, ToastContainer };
};

// ── Status Options ──
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES = {
  DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: FileText },
  ISSUED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: FileClock },
  PARTIALLY_RECEIVED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Truck },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
};

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'JAZZCASH', 'EASYPAISA', 'CREDIT_CARD'];
const PAGE_SIZE = 6;

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const { addToast, ToastContainer } = useToast();

  // ── Data States ──
  const [orders, setOrders] = useState([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);

  // ── Filter & Pagination States ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ── View Mode: 'cards' or 'table' ──
  const [viewMode, setViewMode] = useState('cards');

  // ── View Modal States ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Return Modal States ──
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);

  // ── Return Payment States ──
  const [returnPaymentAmount, setReturnPaymentAmount] = useState(0);
  const [returnPaymentMode, setReturnPaymentMode] = useState('CASH');
  const [returnPaymentAccountId, setReturnPaymentAccountId] = useState('');
  const [returnPaymentDate, setReturnPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPartialReturnPayment, setIsPartialReturnPayment] = useState(false);

  // ── Fetch Orders ──
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await purchaseApi.orders.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        branchId,
        page: currentPage,
        limit: PAGE_SIZE
      });
      
      const data = res?.data?.data || res?.data || res || [];
      if (Array.isArray(data)) {
        setOrders(data);
        setTotalOrdersCount(data.length);
      } else if (data.items) {
        setOrders(data.items);
        setTotalOrdersCount(data.total || data.items.length);
      } else {
        setOrders(data);
        setTotalOrdersCount(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      if (err?.response?.status !== 429) {
        addToast('Failed to load purchase orders', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentBranch?.id, currentPage, addToast]);

  // ── Fetch Accounts ──
  const fetchAccounts = useCallback(async () => {
    try {
      const branchId = currentBranch?.id || user?.branchId || 1;
      const res = await accountApi.getAll({ status: 'ACTIVE', branchId });
      const data = res?.data?.data || res?.data || [];
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  }, [currentBranch?.id, user?.branchId]);

  // ── Reset page when search/filter changes ──
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchOrders(), 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  // Fetch accounts when return modal opens
  useEffect(() => {
    if (isReturnModalOpen) {
      fetchAccounts();
    }
  }, [isReturnModalOpen, fetchAccounts]);

  const totalPages = Math.ceil(totalOrdersCount / PAGE_SIZE);

  // ── Formatters ──
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // ── Stats ──
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((acc, o) => acc + parseFloat(o.totalAmount || 0), 0);
    const issued = orders.filter(o => o.status === 'ISSUED').length;
    const completed = orders.filter(o => o.status === 'COMPLETED').length;
    return { totalOrders, totalValue, issued, completed };
  }, [orders]);

  // ── View Modal ──
  const handleView = async (order) => {
    if (order.items && order.items.length > 0) {
      setSelectedOrder(order);
      setIsModalOpen(true);
      return;
    }
    try {
      setModalLoading(true);
      setIsModalOpen(true);
      const res = await purchaseApi.orders.getById(order.id);
      const data = res?.data?.data || res?.data;
      if (data) setSelectedOrder(data);
    } catch (err) {
      addToast('Failed to load order details', 'error');
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // ── Return Modal Handlers ──
  const handleOpenReturnModal = (order) => {
    setReturnOrder(order);
    setReturnItems(
      (order.items || []).map(it => ({
        inventoryId: it.inventoryId,
        name: it.inventory?.name || `Item #${it.inventoryId}`,
        originalQty: parseFloat(it.quantity || 0),
        returnQty: 0,
        unitPrice: parseFloat(it.unitPrice || 0),
        unit: it.unit || 'pcs',
        reason: '',
      }))
    );
    setReturnReason('');
    setReturnPaymentAmount(0);
    setReturnPaymentMode('CASH');
    setReturnPaymentAccountId('');
    setReturnPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPartialReturnPayment(false);
    setIsReturnModalOpen(true);
  };

  const handleCloseReturnModal = () => {
    setIsReturnModalOpen(false);
    setReturnOrder(null);
    setReturnItems([]);
    setReturnReason('');
    setReturnPaymentAmount(0);
    setReturnPaymentAccountId('');
  };

  const handleReturnQtyChange = (index, value) => {
    setReturnItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], returnQty: parseFloat(value) || 0 };
      return next;
    });
  };

  const handleReturnReasonChange = (index, value) => {
    setReturnItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], reason: value };
      return next;
    });
  };

  const returnTotal = useMemo(() => {
    return returnItems.reduce((acc, it) => acc + (it.returnQty * it.unitPrice), 0);
  }, [returnItems]);

  const selectedReturnAccount = useMemo(() => {
    if (!returnPaymentAccountId) return null;
    return accounts.find(a => a.id === parseInt(returnPaymentAccountId)) || null;
  }, [returnPaymentAccountId, accounts]);

  const returnPaymentDue = useMemo(() => {
    return Math.max(0, returnTotal - returnPaymentAmount);
  }, [returnTotal, returnPaymentAmount]);

  // ── Handle Return Submit ──
  const handleReturnSubmit = async () => {
    const validItems = returnItems.filter(it => it.returnQty > 0);
    if (validItems.length === 0) {
      addToast('Please enter return quantity for at least one item', 'error');
      return;
    }
    if (!returnReason.trim() && validItems.some(it => !it.reason.trim())) {
      addToast('Please provide a return reason', 'error');
      return;
    }

    if (returnPaymentAmount > 0 && !returnPaymentAccountId) {
      addToast('Please select an account to receive the refund', 'error');
      return;
    }
    if (returnPaymentAmount > returnTotal) {
      addToast('Return payment amount cannot exceed total return amount', 'error');
      return;
    }

    setReturnSaving(true);
    try {
      const branchId = currentBranch?.id || 1;
      const payload = {
        supplierId: returnOrder.supplierId,
        reason: returnReason || 'Purchase return against PO',
        branchId,
        items: validItems.map(it => ({
          inventoryId: it.inventoryId,
          quantity: it.returnQty,
          unitPrice: it.unitPrice,
          reason: it.reason || returnReason || 'Defective/Damaged item',
        })),
        payment: {
          amount: returnPaymentAmount,
          mode: returnPaymentMode,
          accountId: returnPaymentAmount > 0 ? parseInt(returnPaymentAccountId) : null,
          paymentDate: returnPaymentDate ? new Date(returnPaymentDate).toISOString() : null,
          isPartial: isPartialReturnPayment && returnPaymentAmount < returnTotal,
          dueAmount: returnPaymentDue,
          type: 'CREDIT'
        }
      };

      const res = await purchaseApi.returns.create(payload);
      const returnNo = res?.data?.data?.returnNo || res?.data?.returnNo || 'processed';
      
      if (returnPaymentAmount > 0) {
        addToast(`Return ${returnNo} processed! ${formatCurrency(returnPaymentAmount)} credited to account`);
      } else {
        addToast(`Purchase Return ${returnNo} processed successfully!`);
      }
      
      handleCloseReturnModal();
      fetchOrders();
    } catch (err) {
      console.error('Return error:', err);
      addToast(err?.response?.data?.message || 'Failed to process return', 'error');
    } finally {
      setReturnSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      await purchaseApi.orders.update(id, { status: 'CANCELLED' });
      addToast('Purchase order cancelled successfully');
      fetchOrders();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Cannot cancel order', 'error');
    }
  };

  // ── Status Badge Helper ──
  const StatusBadge = ({ status }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
        <Icon size={12} /> {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  // ── Render Order Card ──
  const renderOrderCard = (order) => (
    <div key={order.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-[#2563EB]" />
              <span className="font-bold font-mono text-gray-800 text-sm">{order.poNo}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
              {order.supplier?.name || '—'}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        
        <div className="space-y-1.5 text-xs text-gray-600 mb-4 border-t border-b border-gray-50 py-3">
          <p className="flex items-center gap-2">
            <Calendar size={13} className="text-gray-400" /> 
            <span>{formatDate(order.createdAt)}</span>
            {order.expectedDate && (
              <span className="text-amber-600 text-[10px]">(Due: {formatDate(order.expectedDate)})</span>
            )}
          </p>
          <p className="flex items-center gap-2">
            <Package size={13} className="text-gray-400" /> 
            <span>{order.items?.length || 0} items</span>
          </p>
          {order.purchaseBills && order.purchaseBills.length > 0 && (
            <p className="flex items-center gap-2">
              <Receipt size={13} className="text-emerald-500" /> 
              <span className="text-emerald-700 font-bold">{order.purchaseBills.length} Bill(s) linked</span>
            </p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Total</span>
          <span className="text-lg font-bold font-mono text-[#2563EB]">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between border-t border-gray-100 mt-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(order)}
            title="View Details"
            className="p-2 rounded-xl hover:bg-amber-100 text-[#2563EB] transition-all"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenReturnModal(order)}
            title="Process Return"
            className="p-2 rounded-xl hover:bg-red-100 text-red-600 transition-all"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => handleDelete(order.id)}
            title="Cancel Order"
            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"
          >
            <XCircle size={16} />
          </button>
        </div>
        <button
          onClick={() => navigate(`/procurement/purchase-orders/${order.id}`)}
          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          View Details
        </button>
      </div>
    </div>
  );

  // ── Render Order Table Row ──
  const renderOrderTableRow = (order) => (
    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-[#2563EB]" />
          <span className="font-bold font-mono text-gray-800 text-xs">{order.poNo}</span>
        </div>
        {order.notes && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">{order.notes}</p>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-bold text-gray-800 block">{order.supplier?.name || '—'}</span>
        <span className="text-[10px] text-gray-400 font-mono">{order.supplier?.phone || ''}</span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar size={12} className="text-gray-400" />
          <span className="text-xs font-medium">{formatDate(order.createdAt)}</span>
        </div>
        {order.expectedDate && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock size={10} className="text-amber-500" />
            <span className="text-[10px] text-amber-600 font-medium">Exp: {formatDate(order.expectedDate)}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold">
          <Package size={10} /> {order.items?.length || 0}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-bold font-mono text-gray-800">{formatCurrency(order.totalAmount)}</span>
        {parseFloat(order.discount || 0) > 0 && (
          <span className="text-[10px] text-emerald-600 block">- {formatCurrency(order.discount)} disc</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-3.5">
        {order.purchaseBills && order.purchaseBills.length > 0 ? (
          <div className="flex flex-col gap-1">
            {order.purchaseBills.map(bill => (
              <div key={bill.id} className="flex items-center gap-1.5">
                <Receipt size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-700">{bill.billNo}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-gray-400 font-medium">No Bill</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleView(order)}
            title="View Details"
            className="p-2 rounded-xl hover:bg-amber-100 text-[#2563EB] transition-all"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenReturnModal(order)}
            title="Process Return"
            className="p-2 rounded-xl hover:bg-red-100 text-red-600 transition-all"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => handleDelete(order.id)}
            title="Cancel Order"
            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"
          >
            <XCircle size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />

      {/* ═══════════════════════════════════════════════════════════
          STICKY HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="border-b backdrop-blur-xl bg-white/90 sticky top-0 z-30 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/procurement')}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Purchase Orders</h1>
              <p className="text-xs font-medium text-gray-500">
                Manage POs, track supplier orders and monitor receiving status
                {currentBranch && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100/80 text-[#8B6914] font-bold">
                    📍 {currentBranch.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/procurement/purchase-orders/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:scale-[1.02]"
            >
              <Plus size={18} /> New Order
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* ═══════════════════════════════════════════════════════════
            STATS CARDS
            ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#2563EB]">
              <FileText size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total POs</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{totalOrdersCount}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total Value</span>
              <span className="text-lg font-bold font-mono text-gray-800">{formatCurrency(stats.totalValue)}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
              <FileClock size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Issued</span>
              <span className="text-2xl font-bold font-mono text-orange-700">{stats.issued}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Completed</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">{stats.completed}</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FILTERS BAR + VIEW TOGGLE
            ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO number, notes or supplier name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <div className="pl-10">
                <ReactSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val || '')}
                  options={STATUS_OPTIONS.map(opt => ({
                    value: opt.value,
                    label: opt.label
                  }))}
                  placeholder="Filter by Status"
                  isSearchable={true}
                  isClearable={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'cards' ? 'bg-[#2563EB] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="Card View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-[#2563EB] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="Table View"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            CONTENT: LOADING / EMPTY / CARDS / TABLE
            ═══════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading purchase orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300 shadow-sm">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Purchase Orders Found</h3>
            <p className="text-sm text-gray-500">Get started by creating your first purchase order.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/procurement/purchase-orders/create')}
                className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2"
              >
                <Plus size={14} /> Create Order
              </button>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(renderOrderCard)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-bold">PO Number</th>
                    <th className="text-left px-4 py-3 font-bold">Supplier</th>
                    <th className="text-left px-4 py-3 font-bold">Date</th>
                    <th className="text-center px-4 py-3 font-bold">Items</th>
                    <th className="text-right px-4 py-3 font-bold">Total</th>
                    <th className="text-center px-4 py-3 font-bold">Status</th>
                    <th className="text-left px-4 py-3 font-bold">Linked Bills</th>
                    <th className="text-right px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(renderOrderTableRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PAGINATION
            ═══════════════════════════════════════════════════════════ */}
        {!loading && orders.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 bg-white px-4 py-3 rounded-2xl border border-slate-300 shadow-sm">
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
              <span className="font-semibold text-gray-700">
                {Math.min(currentPage * PAGE_SIZE, totalOrdersCount)}
              </span> of{' '}
              <span className="font-semibold text-gray-700">{totalOrdersCount}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 10) {
                    pageNum = i + 1;
                  } else if (currentPage <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 4) {
                    pageNum = totalPages - 9 + i;
                  } else {
                    pageNum = currentPage - 5 + i;
                  }
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-[#2563EB] text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 10 && currentPage < totalPages - 4 && (
                  <span className="text-gray-400 px-1">…</span>
                )}
                {totalPages > 10 && currentPage < totalPages - 4 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all text-gray-600 hover:bg-gray-100`}
                  >
                    {totalPages}
                  </button>
                )}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          VIEW ORDER DETAIL MODAL
          ═══════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-[#2563EB]">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">Purchase Order Details</h2>
                  <p className="text-xs text-[#2563EB] mt-0.5 font-medium">
                    📍 Branch: <strong>{currentBranch?.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
                  <p className="mt-3 text-sm font-bold text-gray-600">Loading details...</p>
                </div>
              ) : selectedOrder ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">PO Number</span>
                      <p className="text-lg font-bold font-mono text-gray-900">{selectedOrder.poNo}</p>
                    </div>
                    <StatusBadge status={selectedOrder.status} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Subtotal</span>
                      <span className="text-sm font-bold font-mono text-amber-900">{formatCurrency(selectedOrder.subTotal)}</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Tax</span>
                      <span className="text-sm font-bold font-mono text-blue-900">{formatCurrency(selectedOrder.taxAmount)}</span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Discount</span>
                      <span className="text-sm font-bold font-mono text-emerald-900">{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="text-[10px] uppercase font-bold text-red-700 block">Grand Total</span>
                      <span className="text-sm font-bold font-mono text-red-900">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                  {selectedOrder.supplier && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-2">
                        <Building2 size={14} /> Supplier Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold">Name:</span>
                          <span className="font-bold text-gray-800">{selectedOrder.supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-gray-400" />
                          <span className="font-mono text-gray-700">{selectedOrder.supplier.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-gray-700">{selectedOrder.supplier.city || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedOrder.purchaseBills && selectedOrder.purchaseBills.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <h4 className="text-xs font-bold uppercase text-emerald-700 mb-2 flex items-center gap-2">
                        <Receipt size={14} /> Linked Purchase Bills (GRN)
                      </h4>
                      <div className="space-y-2">
                        {selectedOrder.purchaseBills.map(bill => (
                          <div key={bill.id} className="flex items-center gap-4 text-xs">
                            <span className="font-bold text-emerald-900">{bill.billNo}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold uppercase">{bill.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <Package size={14} /> Order Items
                      </h4>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-left px-3 py-2 font-bold">Item</th>
                              <th className="text-right px-3 py-2 font-bold">Qty</th>
                              <th className="text-right px-3 py-2 font-bold">Unit</th>
                              <th className="text-right px-3 py-2 font-bold">Unit Price</th>
                              <th className="text-right px-3 py-2 font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedOrder.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white transition-colors">
                                <td className="px-3 py-2 text-gray-800 font-bold">
                                  {item.inventory?.name || `Item #${item.inventoryId}`}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700">{item.quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{item.unit}</td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">{formatCurrency(item.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedOrder.notes && (
                    <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <span className="text-[10px] text-amber-700 font-bold uppercase block mb-1">Notes</span>
                      <p className="text-xs text-amber-900">{selectedOrder.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">No data available</div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PROCESS RETURN MODAL (WITH PAYMENT - CREDIT/ADD TO ACCOUNT)
          ═══════════════════════════════════════════════════════════ */}
      {isReturnModalOpen && returnOrder && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-red-200 overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-red-50 flex items-center justify-between border-red-100 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-600 text-white">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">Process Purchase Return</h2>
                  <p className="text-xs text-red-600 mt-0.5 font-medium">
                    PO: <strong>{returnOrder.poNo}</strong> · {returnOrder.supplier?.name}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseReturnModal} className="p-2 rounded-xl hover:bg-red-100 text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  General Return Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective items, expired goods, wrong delivery..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                  <Package size={14} /> Select Items to Return
                </h4>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600">
                        <th className="text-left px-3 py-2 font-bold">Item</th>
                        <th className="text-right px-3 py-2 font-bold">Original Qty</th>
                        <th className="text-right px-3 py-2 font-bold">Return Qty</th>
                        <th className="text-right px-3 py-2 font-bold">Unit Price</th>
                        <th className="text-right px-3 py-2 font-bold">Return Total</th>
                        <th className="text-left px-3 py-2 font-bold">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {returnItems.map((item, idx) => {
                        const rowTotal = item.returnQty * item.unitPrice;
                        return (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-3 py-2 text-gray-800 font-bold text-xs">
                              {item.name}
                              <span className="text-gray-400 font-normal ml-1">({item.unit})</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">{item.originalQty}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={item.originalQty}
                                value={item.returnQty || ''}
                                onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
                                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono text-right focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-red-600">{formatCurrency(rowTotal)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.reason}
                                onChange={(e) => handleReturnReasonChange(idx, e.target.value)}
                                placeholder="Item reason..."
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── RETURN PAYMENT SECTION ── */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase text-gray-700">
                      Refund / Credit Payment
                      <span className="text-[10px] font-normal text-gray-500 ml-1">
                        (Amount will be added/credited to account)
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPartialReturnPayment}
                        onChange={(e) => {
                          setIsPartialReturnPayment(e.target.checked);
                          if (!e.target.checked) {
                            setReturnPaymentAmount(returnTotal);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Partial Refund
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Refund Amount
                      <span className="text-[10px] font-normal text-emerald-600 ml-1">(Credit)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">+</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max={returnTotal}
                        value={returnPaymentAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReturnPaymentAmount(val > returnTotal ? returnTotal : val);
                        }}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                        placeholder="0.00"
                      />
                    </div>
                    {returnPaymentAmount > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Refund Due:</span>
                        <span className="font-bold font-mono text-emerald-600">
                          {formatCurrency(returnPaymentDue)}
                        </span>
                        {isPartialReturnPayment && returnPaymentDue > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Partial</span>
                        )}
                        {returnPaymentDue === 0 && returnPaymentAmount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold">Full Refund</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Refund Mode</label>
                    <ReactSelect
                      value={returnPaymentMode}
                      onChange={(val) => setReturnPaymentMode(val || 'CASH')}
                      options={PAYMENT_MODES.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))}
                      placeholder="Select Mode"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Credit To Account {returnPaymentAmount > 0 && <span className="text-red-500">*</span>}
                      <span className="text-[10px] font-normal text-emerald-600 ml-1">(Money added here)</span>
                    </label>
                    <ReactSelect
                      value={returnPaymentAccountId}
                      onChange={(val) => setReturnPaymentAccountId(val || '')}
                      options={[
                        { value: '', label: '-- Select Account --' },
                        ...accounts.map(acc => ({
                          value: String(acc.id),
                          label: `${acc.bankName || acc.accountName || 'Account'} — ${acc.accountNumber || 'N/A'} (Bal: ${formatCurrency(acc.currentBalance ?? acc.initialBalance ?? 0)})`
                        }))
                      ]}
                      placeholder="Select Account"
                      isSearchable={true}
                      isClearable={false}
                    />
                    {selectedReturnAccount && returnPaymentAmount > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Current Balance:</span>
                        <span className="font-bold font-mono text-gray-700">
                          {formatCurrency(selectedReturnAccount.currentBalance ?? selectedReturnAccount.initialBalance ?? 0)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          → +{formatCurrency(returnPaymentAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Refund Date</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={returnPaymentDate}
                        onChange={(e) => setReturnPaymentDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {returnPaymentAmount > 0 && selectedReturnAccount && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote size={14} className="text-emerald-600" />
                      <span className="text-xs font-bold uppercase text-gray-700">Refund Summary (Credit)</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">To Account:</span>
                        <span className="font-bold text-gray-800 block">{selectedReturnAccount.bankName || selectedReturnAccount.accountName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Refund:</span>
                        <span className="font-bold font-mono text-emerald-600 block">+{formatCurrency(returnPaymentAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mode:</span>
                        <span className="font-bold text-gray-800 block">{returnPaymentMode.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">New Balance:</span>
                        <span className="font-bold font-mono text-emerald-700 block">
                          {formatCurrency((selectedReturnAccount.currentBalance ?? selectedReturnAccount.initialBalance ?? 0) + returnPaymentAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReturnPaymentAmount(returnTotal);
                      setIsPartialReturnPayment(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                  >
                    Refund Full Amount
                  </button>
                  {returnTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.floor(returnTotal / 2);
                        setReturnPaymentAmount(half);
                        setIsPartialReturnPayment(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                    >
                      Refund 50%
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReturnPaymentAmount(0);
                      setIsPartialReturnPayment(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    Clear Refund
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 bg-red-50 rounded-xl px-4 border border-red-100">
                <span className="text-sm font-bold text-red-800">Total Return Amount</span>
                <span className="text-2xl font-bold font-mono text-red-600">{formatCurrency(returnTotal)}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-[11px] text-gray-500">
                  <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                  <span>Stock will be deducted immediately. Supplier ledger balance will be reduced by return amount.</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-emerald-600">
                  <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>Refund amount will be <strong>added/credited</strong> to the selected account.</span>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-gray-50 flex items-center justify-end gap-3 border-gray-200 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={handleCloseReturnModal}
                className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                disabled={returnSaving || returnTotal <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
              >
                {returnSaving ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                {returnSaving ? 'Processing...' : returnPaymentAmount > 0 ? 'Process Return & Refund' : 'Process Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}