// pages/Purchases/GoodsReceivedNote.jsx
// COMPLETE FIXED - Blank page issue resolved

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, ArrowLeft, Check, AlertCircle, Building2, Loader2,
  Package, Hash, Phone, DollarSign, Calendar, Truck, PhoneCall,
  ChevronDown, Receipt, Weight, FileText, ClipboardCheck, MapPin,
  X, TrendingUp, Calculator, Eye, XCircle, Filter, Search, Clock, CheckCircle2,
  CreditCard, Banknote, Wallet, LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import purchaseApi from '../../services/purchaseApi';
import ReactSelect from '../../components/ui/ReactSelect';
import supplierApi from '../../services/supplierApi';
import accountApi from '../../services/accountApi';
import apiClient from '../../services/apiClient';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { formatPhone } from '../../utils/validators';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  PARTIALLY_PAID: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
};

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'JAZZCASH', 'EASYPAISA', 'CREDIT_CARD'];

const PAYMENT_MODE_TO_ACCOUNT_TYPE = {
  'CASH': 'CASH',
  'BANK_TRANSFER': 'BANK',
  'CHEQUE': 'BANK',
  'JAZZCASH': 'JAZZCASH',
  'EASYPAISA': 'EASYPAISA',
  'CREDIT_CARD': 'CREDIT'
};

const PAGE_SIZE = 6;

const DEFAULT_ITEM = {
  inventoryId: '',
  quantity: 1,
  unitPrice: 0,
  unit: 'pcs',
};

const DEFAULT_FORM = {
  supplierId: '',
  purchaseOrderId: '',
  dueDate: '',
  vehicleNo: '',
  driverPhone: '',
  shippingCost: 0,
  loadingCost: 0,
  otherExpense: 0,
  taxAmount: 0,
  discount: 0,
  notes: '',
  paymentAmount: 0,
  paymentMode: 'CASH',
  paymentAccountId: '',
  paymentDate: new Date().toISOString().split('T')[0],
};

// ── ✅ FIXED: poOptions with safe fallback ──
const poOptions = (purchaseOrders = []) => {
  if (!purchaseOrders || !Array.isArray(purchaseOrders)) {
    return [{ value: '', label: 'Direct Bill / Select PO' }];
  }
  return [
    { value: '', label: 'Direct Bill / Select PO' },
    ...purchaseOrders.map(po => ({
      value: String(po.id),
      label: `${po.poNo || 'PO'} — ${po.supplier?.name || 'Unknown Supplier'}`
    }))
  ];
};

export default function GoodsReceivedNote() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const { addToast, ToastContainer } = useToast();

  // ── Data States ──
  const [bills, setBills] = useState([]);
  const [totalBillsCount, setTotalBillsCount] = useState(0);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Filter & Pagination States ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ── View Mode ──
  const [viewMode, setViewMode] = useState('cards');

  // ── Modal States ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [viewModalLoading, setViewModalLoading] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // ── Form States ──
  const [form, setForm] = useState(DEFAULT_FORM);
  const [items, setItems] = useState([{ ...DEFAULT_ITEM }]);
  const [errors, setErrors] = useState({});

  // ── Derived ──
  const selectedSupplier = useMemo(() => {
    if (!form.supplierId) return null;
    return suppliers.find(s => s.id === parseInt(form.supplierId)) || null;
  }, [form.supplierId, suppliers]);

  const selectedPO = useMemo(() => {
    if (!form.purchaseOrderId) return null;
    return purchaseOrders.find(po => po.id === parseInt(form.purchaseOrderId)) || null;
  }, [form.purchaseOrderId, purchaseOrders]);

  const selectedAccount = useMemo(() => {
    if (!form.paymentAccountId) return null;
    return accounts.find(a => a.id === parseInt(form.paymentAccountId)) || null;
  }, [form.paymentAccountId, accounts]);

  const filteredAccounts = useMemo(() => {
    if (!form.paymentMode) return accounts;
    const requiredType = PAYMENT_MODE_TO_ACCOUNT_TYPE[form.paymentMode];
    if (!requiredType) return accounts;
    return accounts.filter(acc => acc.accountType === requiredType);
  }, [accounts, form.paymentMode]);

  const hasAccountsForMode = useMemo(() => {
    if (!form.paymentMode) return false;
    const requiredType = PAYMENT_MODE_TO_ACCOUNT_TYPE[form.paymentMode];
    if (!requiredType) return false;
    return accounts.some(acc => acc.accountType === requiredType);
  }, [accounts, form.paymentMode]);

  // ── Fetch Bills ──
  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await purchaseApi.bills.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        branchId,
        page: currentPage,
        limit: PAGE_SIZE
      });
      
      const data = res?.data?.data || res?.data || res || [];
      if (Array.isArray(data)) {
        setBills(data);
        setTotalBillsCount(data.length);
      } else if (data.items) {
        setBills(data.items);
        setTotalBillsCount(data.total || data.items.length);
      } else {
        setBills(data);
        setTotalBillsCount(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err);
      if (err?.response?.status !== 429) {
        addToast('Failed to load goods received notes', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentBranch?.id, currentPage, addToast]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchBills(), 300);
    return () => clearTimeout(timer);
  }, [fetchBills]);

  // Reset page on search/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(totalBillsCount / PAGE_SIZE);

  // ── Fetch Dependencies ──
  const fetchModalDependencies = useCallback(async () => {
    try {
      const branchId = currentBranch?.id || 1;
      const [supRes, invRes, poRes, accRes] = await Promise.all([
        supplierApi.getAll({ branchId }),
        apiClient.get('/inventory', { params: { branchId, limit: 1000 } }),
        purchaseApi.orders.getAll({ status: 'ISSUED', branchId }),
        accountApi.getAll({ status: 'ACTIVE', branchId })
      ]);
      setSuppliers(supRes?.data?.data || supRes?.data || []);
      setInventoryItems(invRes?.data?.data || invRes?.data || []);
      setPurchaseOrders(poRes?.data?.data || poRes?.data || []);
      setAccounts(accRes?.data?.data || accRes?.data || []);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
      // ✅ Don't show toast here, just log error
    }
  }, [currentBranch?.id]);

  // ── Modal Handlers ──
  const handleOpenModal = async () => {
    setForm(DEFAULT_FORM);
    setItems([{ ...DEFAULT_ITEM }]);
    setErrors({});
    setIsPartialPayment(false);
    await fetchModalDependencies();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // ── PO Auto-Populate ──
  const handlePOChange = (poId) => {
    setForm(prev => ({ ...prev, purchaseOrderId: poId }));
    if (!poId) return;

    const po = purchaseOrders.find(p => p.id === parseInt(poId));
    if (po) {
      setForm(prev => ({
        ...prev,
        supplierId: String(po.supplierId || ''),
        taxAmount: po.taxAmount || 0,
        discount: po.discount || 0,
      }));
      if (po.items && po.items.length > 0) {
        setItems(po.items.map(i => ({
          inventoryId: String(i.inventoryId || ''),
          quantity: i.quantity || 1,
          unitPrice: i.unitPrice || 0,
          unit: i.unit || 'pcs',
        })));
      }
    }
  };

  // ── Calculations ──
  const subTotal = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
    }, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    const ship = parseFloat(form.shippingCost || 0);
    const load = parseFloat(form.loadingCost || 0);
    const other = parseFloat(form.otherExpense || 0);
    const tax = parseFloat(form.taxAmount || 0);
    const disc = parseFloat(form.discount || 0);
    return Math.max(0, subTotal + ship + load + other + tax - disc);
  }, [subTotal, form]);

  const paymentAmount = parseFloat(form.paymentAmount || 0);
  const dueAmount = useMemo(() => {
    return Math.max(0, totalAmount - paymentAmount);
  }, [totalAmount, paymentAmount]);

  const hasSufficientBalance = useMemo(() => {
    if (!selectedAccount) return true;
    const balance = selectedAccount.currentBalance ?? selectedAccount.initialBalance ?? 0;
    return parseFloat(balance) >= paymentAmount;
  }, [selectedAccount, paymentAmount]);

  // ── Formatters ──
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // ── Item Handlers ──
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      if (field === 'inventoryId' && value) {
        const inv = inventoryItems.find(i => i.id === parseInt(value));
        if (inv) {
          next[index].unitPrice = inv.lastCostPrice || inv.avgCostPrice || 0;
          next[index].unit = inv.unit || 'pcs';
        }
      }
      return next;
    });
    if (errors[`item_${index}`]) {
      setErrors(prev => { const n = { ...prev }; delete n[`item_${index}`]; return n; });
    }
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { ...DEFAULT_ITEM }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      setItems([{ ...DEFAULT_ITEM }]);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Validation ──
  const validate = () => {
    const newErrors = {};
    if (!form.supplierId) newErrors.supplier = 'Please select a supplier';

    items.forEach((item, idx) => {
      if (!item.inventoryId) newErrors[`item_${idx}`] = 'Select an item';
      else if (parseFloat(item.quantity) <= 0) newErrors[`item_${idx}`] = 'Quantity must be > 0';
      else if (parseFloat(item.unitPrice) < 0) newErrors[`item_${idx}`] = 'Price cannot be negative';
    });

    if (paymentAmount > 0) {
      if (!form.paymentAccountId) {
        newErrors.paymentAccount = 'Please select a payment account';
      }
      if (paymentAmount > totalAmount) {
        newErrors.paymentAmount = 'Payment amount cannot exceed total amount';
      }
      if (!hasSufficientBalance) {
        newErrors.paymentAccount = 'Insufficient balance in selected account';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit Form ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please fix the errors before saving', 'error');
      return;
    }

    setSaving(true);
    try {
      const branchId = currentBranch?.id || 1;
      const payload = {
        purchaseOrderId: form.purchaseOrderId ? parseInt(form.purchaseOrderId) : null,
        supplierId: parseInt(form.supplierId),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        vehicleNo: form.vehicleNo,
        driverPhone: form.driverPhone,
        shippingCost: parseFloat(form.shippingCost || 0),
        loadingCost: parseFloat(form.loadingCost || 0),
        otherExpense: parseFloat(form.otherExpense || 0),
        taxAmount: parseFloat(form.taxAmount || 0),
        discount: parseFloat(form.discount || 0),
        notes: form.notes,
        branchId,
        items: items.map(i => ({
          inventoryId: parseInt(i.inventoryId),
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          unit: i.unit || 'pcs',
        })),
        payment: {
          amount: paymentAmount,
          mode: form.paymentMode,
          accountId: paymentAmount > 0 ? parseInt(form.paymentAccountId) : null,
          paymentDate: form.paymentDate ? new Date(form.paymentDate).toISOString() : null,
          isPartial: isPartialPayment && paymentAmount < totalAmount,
          dueAmount: dueAmount,
        }
      };

      const res = await purchaseApi.bills.create(payload);
      const billNo = res?.data?.data?.billNo || res?.data?.billNo || 'generated';
      const billStatus = res?.data?.data?.status || res?.data?.status || 'PENDING';
      
      if (billStatus === 'COMPLETED' || billStatus === 'PAID') {
        addToast(`✅ GRN ${billNo} generated & FULLY PAID!`);
      } else if (billStatus === 'PARTIALLY_PAID') {
        addToast(`⚠️ GRN ${billNo} generated with PARTIAL payment. Due: ${formatCurrency(dueAmount)}`);
      } else {
        addToast(`📋 GRN ${billNo} generated. Payment pending.`);
      }

      setIsModalOpen(false);
      fetchBills();
    } catch (err) {
      console.error('Create bill error:', err);
      addToast(err?.response?.data?.message || 'Failed to generate purchase bill', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── View Details ──
  const handleView = async (bill) => {
    if (bill.items && bill.items.length > 0) {
      setSelectedBill(bill);
      setIsViewModalOpen(true);
      return;
    }
    try {
      setViewModalLoading(true);
      setIsViewModalOpen(true);
      const res = await purchaseApi.bills.getById(bill.id);
      const data = res?.data?.data || res?.data;
      if (data) setSelectedBill(data);
    } catch (err) {
      addToast('Failed to load GRN details', 'error');
      setIsViewModalOpen(false);
    } finally {
      setViewModalLoading(false);
    }
  };

  // ── Cancel Bill ──
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this Goods Received Note?')) return;
    try {
      await purchaseApi.bills.update(id, { status: 'CANCELLED' });
      addToast('GRN cancelled successfully');
      fetchBills();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Cannot cancel GRN', 'error');
    }
  };

  // ── Status Badge ──
  const StatusBadge = ({ status }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
        <Icon size={12} /> {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  // ── Stats ──
  const stats = useMemo(() => {
    const totalBills = bills.length;
    const totalVal = bills.reduce((acc, b) => acc + parseFloat(b.totalAmount || 0), 0);
    const pending = bills.filter(b => b.status === 'PENDING' || b.status === 'PARTIALLY_PAID').length;
    const completed = bills.filter(b => b.status === 'COMPLETED' || b.status === 'PAID').length;
    return { totalBills, totalVal, pending, completed };
  }, [bills]);

  // ── Render Card ──
  const renderBillCard = (bill) => (
    <div key={bill.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-emerald-600" />
              <span className="font-bold font-mono text-gray-800 text-sm">{bill.billNo || `#${bill.id}`}</span>
              {bill.purchaseOrder && (
                <span className="text-[10px] text-gray-400 font-mono">PO: {bill.purchaseOrder.poNo}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{bill.supplier?.name || '—'}</p>
          </div>
          <StatusBadge status={bill.status} />
        </div>
        
        <div className="space-y-1.5 text-xs text-gray-600 mb-4 border-t border-b border-gray-50 py-3">
          <p className="flex items-center gap-2">
            <Calendar size={13} className="text-gray-400" /> 
            <span>{formatDate(bill.createdAt)}</span>
          </p>
          <p className="flex items-center gap-2">
            <Truck size={13} className="text-gray-400" /> 
            <span>{bill.vehicleNo || '—'}</span>
            {bill.driverPhone && <span className="text-gray-400">({bill.driverPhone})</span>}
          </p>
          <p className="flex items-center gap-2">
            <Package size={13} className="text-gray-400" /> 
            <span>{bill.items?.length || 0} items</span>
          </p>
          {bill.paymentAmount > 0 && (
            <p className="flex items-center gap-2 text-emerald-600">
              <CreditCard size={13} /> 
              <span className="font-bold">Paid: {formatCurrency(bill.paymentAmount)}</span>
            </p>
          )}
          {bill.dueAmount > 0 && (
            <p className="flex items-center gap-2 text-red-600">
              <AlertCircle size={13} /> 
              <span className="font-bold">Due: {formatCurrency(bill.dueAmount)}</span>
            </p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Total</span>
          <span className="text-lg font-bold font-mono text-emerald-700">{formatCurrency(bill.totalAmount)}</span>
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between border-t border-gray-100 mt-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(bill)}
            title="View Details"
            className="p-2 rounded-xl hover:bg-emerald-100 text-emerald-600 transition-all"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleCancel(bill.id)}
            title="Cancel GRN"
            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"
          >
            <XCircle size={16} />
          </button>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold ${bill.paymentAmount >= bill.totalAmount ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {bill.paymentAmount >= bill.totalAmount ? '✅ Paid' : '⚠️ Due'}
        </span>
      </div>
    </div>
  );

  // ── Render Table Row ──
  const renderBillTableRow = (bill) => (
    <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Receipt size={14} className="text-emerald-600" />
          <span className="font-bold font-mono text-gray-800 text-xs">{bill.billNo || `#${bill.id}`}</span>
        </div>
        {bill.purchaseOrder && (
          <span className="text-[10px] text-gray-400 font-mono block">PO: {bill.purchaseOrder.poNo}</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-bold text-gray-800 block">{bill.supplier?.name || '—'}</span>
        <span className="text-[10px] text-gray-400 font-mono">{bill.supplier?.phone || ''}</span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar size={12} className="text-gray-400" />
          <span className="text-xs font-medium">{formatDate(bill.createdAt)}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs font-medium text-gray-700 block">{bill.vehicleNo || '—'}</span>
        <span className="text-[10px] text-gray-400">{bill.driverPhone || ''}</span>
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold">
          <Package size={10} /> {bill.items?.length || 0}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-bold font-mono text-gray-800">{formatCurrency(bill.totalAmount)}</span>
        {bill.paymentAmount > 0 && (
          <span className="text-[10px] text-emerald-600 block">Paid: {formatCurrency(bill.paymentAmount)}</span>
        )}
        {bill.dueAmount > 0 && (
          <span className="text-[10px] text-red-600 block">Due: {formatCurrency(bill.dueAmount)}</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        <StatusBadge status={bill.status} />
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleView(bill)}
            title="View Details"
            className="p-2 rounded-xl hover:bg-emerald-100 text-emerald-600 transition-all"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleCancel(bill.id)}
            title="Cancel GRN"
            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"
          >
            <XCircle size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-emerald-600 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#059669' }} />
          <p className="mt-4 text-sm font-bold text-gray-600">Loading goods received notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />

      {/* ── HEADER ── */}
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
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] text-white">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Goods Received Notes (GRN)</h1>
              <p className="text-xs font-medium text-gray-500">
                Receive stock against POs, manage purchase bills and track shipments
                {currentBranch && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-bold">
                    📍 {currentBranch.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md hover:scale-[1.02]"
          >
            <Plus size={18} /> New GRN / Bill
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total GRNs</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{totalBillsCount}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total Value</span>
              <span className="text-lg font-bold font-mono text-gray-800">{formatCurrency(stats.totalVal)}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Pending</span>
              <span className="text-2xl font-bold font-mono text-amber-700">{stats.pending}</span>
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

        {/* ── FILTERS BAR + VIEW TOGGLE ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by bill number, supplier name, vehicle..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ReactSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={opt => setStatusFilter(opt || '')}
                placeholder="All Statuses"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'cards' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="Card View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="Table View"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        {bills.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300 shadow-sm">
            <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Goods Received Notes Found</h3>
            <p className="text-sm text-gray-500">Get started by generating your first GRN / bill.</p>
            <button
              onClick={handleOpenModal}
              className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 hover:bg-emerald-700"
            >
              <Plus size={14} /> New GRN / Bill
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bills.map(renderBillCard)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-bold">Bill / GRN #</th>
                    <th className="text-left px-4 py-3 font-bold">Supplier</th>
                    <th className="text-left px-4 py-3 font-bold">Date</th>
                    <th className="text-left px-4 py-3 font-bold">Vehicle</th>
                    <th className="text-center px-4 py-3 font-bold">Items</th>
                    <th className="text-right px-4 py-3 font-bold">Total</th>
                    <th className="text-center px-4 py-3 font-bold">Status</th>
                    <th className="text-right px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map(renderBillTableRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAGINATION ── */}
        {bills.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 bg-white px-4 py-3 rounded-2xl border border-slate-300 shadow-sm">
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
              <span className="font-semibold text-gray-700">
                {Math.min(currentPage * PAGE_SIZE, totalBillsCount)}
              </span> of{' '}
              <span className="font-semibold text-gray-700">{totalBillsCount}</span> GRNs
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
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
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

      {/* ── CREATE GRN MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-emerald-200 overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-emerald-50 flex items-center justify-between border-emerald-100 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">
                    Create Goods Received Note (GRN) & Bill
                  </h2>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    📍 Branch: <strong>{currentBranch?.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-xl hover:bg-emerald-100 text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Section 1: PO Import, Supplier & Shipment */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Import from Purchase Order</label>
                    <ReactSelect
                      options={poOptions(purchaseOrders)}
                      value={form.purchaseOrderId}
                      onChange={opt => handlePOChange(opt || '')}
                      placeholder="Direct Bill / Select PO"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select
                        value={form.supplierId}
                        onChange={(e) => {
                          setForm(prev => ({ ...prev, supplierId: e.target.value }));
                          if (errors.supplier) setErrors(prev => { const n = { ...prev }; delete n.supplier; return n; });
                        }}
                        className={`w-full pl-10 pr-8 py-2.5 border rounded-xl text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 ${errors.supplier ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'}`}
                      >
                        <option value="">-- Choose Supplier --</option>
                        {suppliers.map(sup => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name} {sup.phone ? `(${sup.phone})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.supplier && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.supplier}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Payment Due Date</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Vehicle Number</label>
                    <div className="relative">
                      <Truck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.vehicleNo}
                        onChange={(e) => setForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
                        placeholder="e.g. LE-1234"
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Driver Phone</label>
                    <div className="relative">
                      <PhoneCall size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={form.driverPhone}
                        onChange={(e) => setForm(prev => ({ ...prev, driverPhone: formatPhone(e.target.value) }))}
                        maxLength={12}
                        inputMode="numeric"
                        placeholder="0300-1234567 / 042-12345678"
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Notes / Remarks</label>
                    <div className="relative">
                      <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.notes}
                        onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Gate pass number, etc."
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Received Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-gray-600 flex items-center gap-2">
                    <Package size={14} /> Received Items *
                  </h3>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <Plus size={14} /> Add Item Row
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600">
                        <th className="text-left px-3 py-2.5 font-bold">Inventory Item</th>
                        <th className="text-right px-3 py-2.5 font-bold">Quantity</th>
                        <th className="text-left px-3 py-2.5 font-bold">Unit</th>
                        <th className="text-right px-3 py-2.5 font-bold">Unit Cost</th>
                        <th className="text-right px-3 py-2.5 font-bold">Total</th>
                        <th className="text-center px-3 py-2.5 font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item, index) => {
                        const rowTotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
                        const invDetail = item.inventoryId
                          ? inventoryItems.find(i => i.id === parseInt(item.inventoryId))
                          : null;
                        const hasError = !!errors[`item_${index}`];

                        return (
                          <tr key={index} className={`hover:bg-white transition-colors ${hasError ? 'bg-red-50/50' : ''}`}>
                            <td className="px-3 py-2.5">
                              <div className="relative">
                                <select
                                  value={item.inventoryId}
                                  onChange={(e) => handleItemChange(index, 'inventoryId', e.target.value)}
                                  className={`w-full px-2.5 py-2 border rounded-lg text-xs bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 ${hasError ? 'border-red-400' : 'border-gray-200'}`}
                                >
                                  <option value="">Select item...</option>
                                  {inventoryItems.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                      {inv.name} (Stock: {inv.currentStock || 0})
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>
                              {hasError && <p className="text-[10px] text-red-500 mt-0.5">{errors[`item_${index}`]}</p>}
                            </td>

                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                className="w-24 ml-auto px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>

                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                className="w-28 ml-auto px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>

                            <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-800">
                              {formatCurrency(rowTotal)}
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(index)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Payment Section */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase text-gray-700">Payment Details</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPartialPayment}
                        onChange={(e) => {
                          setIsPartialPayment(e.target.checked);
                          if (!e.target.checked && paymentAmount === 0) {
                            setForm(prev => ({ ...prev, paymentAmount: totalAmount }));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Partial Payment
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Payment Amount */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Payment Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rs</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max={totalAmount}
                        value={form.paymentAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setForm(prev => ({ ...prev, paymentAmount: val > totalAmount ? totalAmount : val }));
                          if (errors.paymentAmount) {
                            setErrors(prev => { const n = { ...prev }; delete n.paymentAmount; return n; });
                          }
                        }}
                        className={`w-full pl-8 pr-3 py-2.5 border ${errors.paymentAmount ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.paymentAmount && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.paymentAmount}</p>
                    )}
                    {paymentAmount > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Due:</span>
                        <span className="font-bold font-mono text-red-600">{formatCurrency(dueAmount)}</span>
                        {isPartialPayment && dueAmount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Partial</span>
                        )}
                        {dueAmount === 0 && paymentAmount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold">Fully Paid</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Payment Mode
                    </label>
                    <ReactSelect
                      value={form.paymentMode}
                      onChange={(val) => setForm(prev => ({ ...prev, paymentMode: val || 'CASH' }))}
                      options={PAYMENT_MODES.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))}
                      placeholder="Select Mode"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>

                  {/* Payment Account */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Payment Account {paymentAmount > 0 && <span className="text-red-500">*</span>}
                      {form.paymentMode && (
                        <span className="ml-2 text-[10px] font-normal text-gray-500">
                          ({form.paymentMode.replace(/_/g, ' ')} accounts only)
                        </span>
                      )}
                    </label>
                    
                    {(() => {
                      const requiredType = form.paymentMode ? PAYMENT_MODE_TO_ACCOUNT_TYPE[form.paymentMode] : null;
                      const filtered = requiredType ? accounts.filter(acc => acc.accountType === requiredType) : accounts;
                      const hasAccounts = filtered.length > 0;

                      return (
                        <>
                          <ReactSelect
                            value={form.paymentAccountId}
                            onChange={(val) => {
                              setForm(prev => ({ ...prev, paymentAccountId: val || '' }));
                              if (errors.paymentAccount) {
                                setErrors(prev => { const n = { ...prev }; delete n.paymentAccount; return n; });
                              }
                            }}
                            options={[
                              { value: '', label: !form.paymentMode 
                                ? '⚠️ First select Payment Mode' 
                                : !hasAccounts 
                                  ? `❌ No ${form.paymentMode.replace(/_/g, ' ')} account found!` 
                                  : '-- Select Account --'
                              },
                              ...filtered.map(acc => ({
                                value: String(acc.id),
                                label: `${acc.bankName || acc.accountName || 'Account'} — ${acc.accountNumber || 'N/A'} (Bal: ${formatCurrency(acc.currentBalance ?? acc.initialBalance ?? 0)})`
                              }))
                            ]}
                            placeholder={!form.paymentMode ? 'Select Payment Mode first' : 'Select Account'}
                            isSearchable={true}
                            isClearable={false}
                            isDisabled={!form.paymentMode || !hasAccounts}
                          />

                          {!form.paymentMode && (
                            <div className="mt-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                                <AlertCircle size={14} />
                                <span>Please select a <strong>Payment Mode</strong> first to see available accounts</span>
                              </p>
                            </div>
                          )}

                          {form.paymentMode && !hasAccounts && (
                            <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50">
                              <p className="text-xs text-red-600 flex items-center gap-1.5">
                                <AlertCircle size={14} />
                                <span>No <strong>{form.paymentMode.replace(/_/g, ' ')}</strong> account found! Please create one in <strong>Settings → Chart of Accounts</strong></span>
                              </p>
                            </div>
                          )}

                          {errors.paymentAccount && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.paymentAccount}</p>
                          )}

                          {selectedAccount && form.paymentMode && paymentAmount > 0 && (
                            <div className="mt-2.5 p-3 rounded-xl border border-green-200" style={{ backgroundColor: '#F0FDF4' }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 text-lg">✓</span>
                                  <div>
                                    <p className="text-sm font-bold text-gray-800">{selectedAccount.bankName || selectedAccount.accountName}</p>
                                    <p className="text-xs text-gray-500 font-mono">{selectedAccount.accountNumber}</p>
                                  </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{
                                  backgroundColor: (() => {
                                    const colors = {
                                      'CASH': '#FEF3C7',
                                      'BANK': '#DBEAFE',
                                      'JAZZCASH': '#FCE7F3',
                                      'EASYPAISA': '#D1FAE5',
                                      'CREDIT': '#EDE9FE'
                                    };
                                    return colors[selectedAccount.accountType] || '#F3F4F6';
                                  })(),
                                  color: (() => {
                                    const colors = {
                                      'CASH': '#1E3A8A',
                                      'BANK': '#1E40AF',
                                      'JAZZCASH': '#9D174D',
                                      'EASYPAISA': '#065F46',
                                      'CREDIT': '#5B21B6'
                                    };
                                    return colors[selectedAccount.accountType] || '#374151';
                                  })()
                                }}>
                                  {(() => {
                                    const labels = {
                                      'CASH': '💰 Cash',
                                      'BANK': '🏦 Bank',
                                      'JAZZCASH': '📱 JazzCash',
                                      'EASYPAISA': '📱 EasyPaisa',
                                      'CREDIT': '💳 Credit'
                                    };
                                    return labels[selectedAccount.accountType] || '📌 Other';
                                  })()}
                                </span>
                              </div>
                              {selectedAccount.currentBalance !== undefined && (
                                <div className="mt-1.5 pt-1.5 border-t border-green-100 flex justify-between">
                                  <span className="text-[10px] text-gray-500">Current Balance</span>
                                  <span className="text-xs font-bold font-mono" style={{ color: '#2563EB' }}>
                                    {formatCurrency(selectedAccount.currentBalance ?? selectedAccount.initialBalance ?? 0)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                      Payment Date
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={form.paymentDate}
                        onChange={(e) => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                {paymentAmount > 0 && selectedAccount && (
                  <div className={`p-3 rounded-xl border ${hasSufficientBalance ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote size={14} className={hasSufficientBalance ? 'text-emerald-600' : 'text-red-600'} />
                      <span className="text-xs font-bold uppercase text-gray-700">Payment Summary</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">From Account:</span>
                        <span className="font-bold text-gray-800 block">{selectedAccount.bankName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment:</span>
                        <span className={`font-bold font-mono block ${hasSufficientBalance ? 'text-emerald-600' : 'text-red-600'}`}>
                          -{formatCurrency(paymentAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mode:</span>
                        <span className="font-bold text-gray-800 block">{form.paymentMode.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Balance After:</span>
                        <span className={`font-bold font-mono block ${hasSufficientBalance ? 'text-gray-800' : 'text-red-600'}`}>
                          {formatCurrency((selectedAccount.currentBalance ?? selectedAccount.initialBalance ?? 0) - paymentAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, paymentAmount: totalAmount }));
                      setIsPartialPayment(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                  >
                    Pay Full Amount
                  </button>
                  {totalAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.floor(totalAmount / 2);
                        setForm(prev => ({ ...prev, paymentAmount: half }));
                        setIsPartialPayment(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                    >
                      Pay 50%
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, paymentAmount: 0 }));
                      setIsPartialPayment(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    Clear Payment
                  </button>
                </div>
              </div>

              {/* Section 4: Additional Costs & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-gray-600 flex items-center gap-1.5">
                    <Calculator size={14} /> Additional Costs & Adjustments
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Shipping</label>
                      <input
                        type="number" step="any" min="0"
                        value={form.shippingCost}
                        onChange={(e) => setForm(prev => ({ ...prev, shippingCost: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Loading</label>
                      <input
                        type="number" step="any" min="0"
                        value={form.loadingCost}
                        onChange={(e) => setForm(prev => ({ ...prev, loadingCost: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Other Expense</label>
                      <input
                        type="number" step="any" min="0"
                        value={form.otherExpense}
                        onChange={(e) => setForm(prev => ({ ...prev, otherExpense: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Tax</label>
                      <input
                        type="number" step="any" min="0"
                        value={form.taxAmount}
                        onChange={(e) => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Discount</label>
                      <input
                        type="number" step="any" min="0"
                        value={form.discount}
                        onChange={(e) => setForm(prev => ({ ...prev, discount: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-bold font-mono">{formatCurrency(subTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Additional Costs & Tax:</span>
                      <span className="font-bold font-mono">+ {formatCurrency(parseFloat(form.shippingCost||0) + parseFloat(form.loadingCost||0) + parseFloat(form.otherExpense||0) + parseFloat(form.taxAmount||0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-bold font-mono text-emerald-700">- {formatCurrency(parseFloat(form.discount||0))}</span>
                    </div>
                    {paymentAmount > 0 && (
                      <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2">
                        <span className="text-gray-600">Payment:</span>
                        <span className="font-bold font-mono text-emerald-600">- {formatCurrency(paymentAmount)}</span>
                      </div>
                    )}
                    {paymentAmount > 0 && dueAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due:</span>
                        <span className="font-bold font-mono text-red-600">{formatCurrency(dueAmount)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-emerald-200 flex items-center justify-between mt-4">
                    <span className="text-sm font-bold text-emerald-900 uppercase">Grand Total:</span>
                    <span className="text-xl font-bold font-mono text-emerald-700">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-md hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {paymentAmount > 0 ? 'Receive Goods & Make Payment' : 'Receive Goods & Generate Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW GRN MODAL ── */}
      {isViewModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-emerald-200 overflow-hidden my-auto">

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-emerald-50 flex items-center justify-between border-emerald-100 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">
                    Goods Received Note (GRN) Details
                  </h2>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    📍 Branch: <strong>{currentBranch?.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-xl hover:bg-emerald-100 text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {viewModalLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-full border-4 border-t-emerald-600 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#059669' }} />
                  <p className="mt-3 text-sm font-bold text-gray-600">Loading details...</p>
                </div>
              ) : selectedBill ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Bill / GRN Number</span>
                      <p className="text-lg font-bold font-mono text-gray-900">{selectedBill.billNo || `#${selectedBill.id}`}</p>
                    </div>
                    <StatusBadge status={selectedBill.status} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Subtotal</span>
                      <span className="text-sm font-bold font-mono text-emerald-900">{formatCurrency(selectedBill.subTotal)}</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Expenses</span>
                      <span className="text-sm font-bold font-mono text-blue-900">{formatCurrency(parseFloat(selectedBill.shippingCost||0)+parseFloat(selectedBill.loadingCost||0)+parseFloat(selectedBill.otherExpense||0))}</span>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Tax</span>
                      <span className="text-sm font-bold font-mono text-amber-900">{formatCurrency(selectedBill.taxAmount)}</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="text-[10px] uppercase font-bold text-red-700 block">Grand Total</span>
                      <span className="text-sm font-bold font-mono text-red-900">{formatCurrency(selectedBill.totalAmount)}</span>
                    </div>
                  </div>

                  {selectedBill.paymentAmount > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <h4 className="text-xs font-bold uppercase text-emerald-700 flex items-center gap-2 mb-2">
                        <CreditCard size={14} /> Payment Details
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Amount Paid</span>
                          <span className="font-bold font-mono text-emerald-700">{formatCurrency(selectedBill.paymentAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Mode</span>
                          <span className="font-bold text-gray-800">{selectedBill.paymentMode?.replace(/_/g, ' ') || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Due Amount</span>
                          <span className="font-bold font-mono text-red-600">{formatCurrency(selectedBill.dueAmount || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Status</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedBill.dueAmount === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {selectedBill.dueAmount === 0 ? 'Fully Paid' : 'Partial Payment'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedBill.supplier && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-2">
                        <Building2 size={14} /> Supplier Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold">Name:</span>
                          <span className="font-bold text-gray-800">{selectedBill.supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-gray-400" />
                          <span className="font-mono text-gray-700">{selectedBill.supplier.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-gray-700">{selectedBill.supplier.city || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedBill.items && selectedBill.items.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <Package size={14} /> Received Items
                      </h4>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-left px-3 py-2 font-bold">Item</th>
                              <th className="text-right px-3 py-2 font-bold">Qty</th>
                              <th className="text-right px-3 py-2 font-bold">Unit</th>
                              <th className="text-right px-3 py-2 font-bold">Unit Cost</th>
                              <th className="text-right px-3 py-2 font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedBill.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white transition-colors">
                                <td className="px-3 py-2 text-gray-800 font-bold">
                                  {item.inventory?.name || `Item #${item.inventoryId}`}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700">{item.quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{item.unit}</td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">{formatCurrency(item.totalPrice || item.quantity * item.unitPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">No data available</div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-gray-50 flex items-center justify-end gap-3 border-gray-200 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}