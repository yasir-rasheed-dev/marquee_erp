// pages/Suppliers/SupplierManagement.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Search, X, Building2, ShieldAlert, 
  Check, AlertCircle, Phone, Mail, MapPin, History, DollarSign,
  CreditCard, Receipt, Package, RotateCcw, Wallet, LayoutGrid,
  List, ChevronLeft, ChevronRight
} from 'lucide-react';
import supplierApi from '../../services/supplierApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useBranch } from '../../context/BranchContext';

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold min-w-[280px]"
          style={{ background: t.type === 'success' ? '#2E7D32' : '#D32F2F' }}>
          {t.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
  return { addToast, ToastContainer };
};

const DEFAULT_SUPPLIER = {
  name: '',
  code: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  type: 'WHOLESALE',
  openingBalance: 0
};

const DEFAULT_PAYMENT = {
  amount: '',
  method: 'cash',
  accountId: '',
  purchaseBillId: '',
  reference: '',
  notes: ''
};

const PAGE_SIZE = 6;

export default function SupplierManagement() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { addToast, ToastContainer } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSuppliersCount, setTotalSuppliersCount] = useState(0);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // View mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('cards');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(DEFAULT_PAYMENT);
  const [paying, setPaying] = useState(false);

  const [form, setForm] = useState(DEFAULT_SUPPLIER);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await supplierApi.getAll({ 
        search, 
        type: typeFilter, 
        branchId,
        page: currentPage,
        limit: PAGE_SIZE
      });
      
      // Handle different response formats
      const data = res?.data?.data || res?.data || res || [];
      
      if (Array.isArray(data)) {
        setSuppliers(data);
        setTotalSuppliersCount(data.length);
      } else if (data.items) {
        setSuppliers(data.items);
        setTotalSuppliersCount(data.total || data.items.length);
      } else {
        setSuppliers(data);
        setTotalSuppliersCount(data.length);
      }
    } catch (e) {
      console.error('Failed to fetch suppliers:', e);
      if (e?.response?.status !== 429) {
        addToast('Failed to load suppliers', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, currentBranch?.id, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const totalPages = Math.ceil(totalSuppliersCount / PAGE_SIZE);

  const handleOpenModal = async (mode, supplierId = null) => {
    setModalMode(mode);
    setSelectedSupplierId(supplierId);
    setSelectedSupplier(null);

    if (mode === 'create') {
      setForm(DEFAULT_SUPPLIER);
      setIsModalOpen(true);
    } else if (supplierId) {
      try {
        setIsModalOpen(true);
        const res = await supplierApi.getById(supplierId);
        const supp = res?.data?.data || res?.data;
        if (supp) {
          setSelectedSupplier(supp);
          setForm({
            name: supp.name || '',
            code: supp.code || '',
            contactPerson: supp.contactPerson || '',
            phone: supp.phone || '',
            email: supp.email || '',
            address: supp.address || '',
            city: supp.city || '',
            type: supp.type || 'WHOLESALE',
            openingBalance: supp.openingBalance || 0
          });
        }
      } catch (err) {
        addToast('Failed to load supplier details', 'error');
        setIsModalOpen(false);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplierId(null);
    setSelectedSupplier(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      addToast('Name and phone are required', 'error');
      return;
    }
    if (form.phone.trim().length !== 11) {
      addToast('Phone number must be exactly 11 digits (e.g. 03001234567)', 'error');
      return;
    }

    setSaving(true);
    try {
      const branchId = currentBranch?.id || 1;
      const payload = { ...form, branchId };

      if (modalMode === 'edit') {
        await supplierApi.update(selectedSupplierId, payload);
        addToast('Supplier updated successfully!');
      } else {
        await supplierApi.create(payload);
        addToast('Supplier created successfully!');
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await supplierApi.delete(id);
      addToast('Supplier deleted successfully!');
      fetchSuppliers();
    } catch (e) {
      addToast(e?.response?.data?.message || 'Cannot delete supplier', 'error');
    }
  };

  const handleOpenPayment = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentForm({ ...DEFAULT_PAYMENT, supplierId: supplier.id });
    setIsPaymentModalOpen(true);
  };

  const handleClosePayment = () => {
    setIsPaymentModalOpen(false);
    setPaymentForm(DEFAULT_PAYMENT);
    setSelectedSupplier(null);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      addToast('Valid amount is required', 'error');
      return;
    }

    setPaying(true);
    try {
      await supplierApi.recordPayment({
        supplierId: selectedSupplier.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        accountId: paymentForm.accountId ? parseInt(paymentForm.accountId) : undefined,
        purchaseBillId: paymentForm.purchaseBillId ? parseInt(paymentForm.purchaseBillId) : undefined,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });
      addToast(`Payment of Rs ${Number(paymentForm.amount).toLocaleString()} recorded successfully!`);
      handleClosePayment();
      fetchSuppliers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setPaying(false);
    }
  };

  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalOwed = suppliers.reduce((acc, s) => acc + parseFloat(s.currentBalance || 0), 0);
    const activeWholesale = suppliers.filter(s => s.type === 'WHOLESALE').length;
    return { totalSuppliers, totalOwed, activeWholesale };
  }, [suppliers]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const typeFilterOptions = useMemo(() => [
    { value: '', label: 'All Supplier Types (Default)' },
    { value: 'WHOLESALE', label: 'Wholesale' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'IMPORTER', label: 'Importer' },
    { value: 'FARMER_VENDOR', label: 'Farmer / Vendor' }
  ], []);

  const supplierTypeOptions = useMemo(() => [
    { value: 'WHOLESALE', label: 'Wholesale' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'IMPORTER', label: 'Importer' },
    { value: 'FARMER_VENDOR', label: 'Farmer / Vendor' }
  ], []);

  const paymentMethodOptions = useMemo(() => [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'jazzcash', label: 'JazzCash' },
    { value: 'easypaisa', label: 'EasyPaisa' },
    { value: 'online', label: 'Online' }
  ], []);

  // Render supplier card
  const renderSupplierCard = (supp) => (
    <div key={supp.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-[#2563EB] border border-amber-200">
              {supp.type}
            </span>
            <h3 className="font-bold text-base text-gray-900 mt-1 truncate">{supp.name}</h3>
            {supp.code && <span className="text-[10px] font-mono text-gray-400">Code: {supp.code}</span>}
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-gray-400 uppercase block font-bold">Balance Owed</span>
            <span className={`text-sm font-bold font-mono ${Number(supp.currentBalance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(supp.currentBalance)}
            </span>
          </div>
        </div>
        
        <div className="space-y-1.5 text-xs text-gray-600 mb-4 border-t border-b border-gray-50 py-3">
          <p className="flex items-center gap-2"><Phone size={13} className="text-gray-400" /> <span className="font-mono font-bold">{supp.phone}</span></p>
          {supp.email && <p className="flex items-center gap-2"><Mail size={13} className="text-gray-400" /> {supp.email}</p>}
          {supp.city && <p className="flex items-center gap-2"><MapPin size={13} className="text-gray-400" /> {supp.city}</p>}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold">
            <Package size={10} /> {supp._count?.purchaseOrders || 0} POs
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-bold">
            <Receipt size={10} /> {supp._count?.purchaseBills || 0} Bills
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold">
            <RotateCcw size={10} /> {supp._count?.returns || 0} Returns
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold">
            <Wallet size={10} /> {supp._count?.payments || 0} Payments
          </span>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/procurement/suppliers/${supp.id}/ledger`)} title="View Complete History Ledger" className="p-2 rounded-xl hover:bg-amber-100 text-[#2563EB] transition-all">
            <History size={16} />
          </button>
          <button onClick={() => handleOpenPayment(supp)} title="Record Payment" className="p-2 rounded-xl hover:bg-green-100 text-green-700 transition-all">
            <CreditCard size={16} />
          </button>
          <button onClick={() => handleOpenModal('edit', supp.id)} title="Edit Supplier" className="p-2 rounded-xl hover:bg-amber-50 text-[#2563EB] transition-all">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(supp.id)} title="Delete Supplier" className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all">
            <Trash2 size={16} />
          </button>
        </div>
        <button onClick={() => handleOpenModal('view', supp.id)} className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          View Profile
        </button>
      </div>
    </div>
  );

  // Render supplier table row
  const renderSupplierTableRow = (supp) => (
    <tr key={supp.id} className="hover:bg-amber-50/50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3">
        <div>
          <div className="font-semibold text-gray-800">{supp.name}</div>
          {supp.code && <div className="text-[10px] font-mono text-gray-400">Code: {supp.code}</div>}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-[#2563EB] border border-amber-200">
          {supp.type}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Phone size={14} className="text-gray-400" />
          <span className="font-mono">{supp.phone}</span>
        </div>
        {supp.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail size={12} className="text-gray-400" />
            <span>{supp.email}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
            <Package size={10} /> {supp._count?.purchaseOrders || 0}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
            <Receipt size={10} /> {supp._count?.purchaseBills || 0}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold">
            <Wallet size={10} /> {supp._count?.payments || 0}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-sm font-bold font-mono ${Number(supp.currentBalance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {formatCurrency(supp.currentBalance)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => navigate(`/procurement/suppliers/${supp.id}/ledger`)} title="Ledger" className="p-1.5 rounded-lg hover:bg-amber-100 text-[#2563EB] transition-all">
            <History size={15} />
          </button>
          <button onClick={() => handleOpenPayment(supp)} title="Payment" className="p-1.5 rounded-lg hover:bg-green-100 text-green-700 transition-all">
            <CreditCard size={15} />
          </button>
          <button onClick={() => handleOpenModal('edit', supp.id)} title="Edit" className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB] transition-all">
            <Edit2 size={15} />
          </button>
          <button onClick={() => handleDelete(supp.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all">
            <Trash2 size={15} />
          </button>
          <button onClick={() => handleOpenModal('view', supp.id)} title="View" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-all">
            <Search size={15} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />

      <div className="border-b backdrop-blur-xl bg-white/90 sticky top-0 z-30 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Supplier & Vendor Management</h1>
              <p className="text-xs font-medium text-gray-500">
                Manage raw material suppliers, track outstanding balances and purchasing ledger histories
                {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100/80 text-[#8B6914] font-bold">📍 {currentBranch.name}</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleOpenModal('create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:scale-[1.02]"
          >
            <Plus size={18} /> Add Supplier
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-[#2563EB]"><Building2 size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Suppliers</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{totalSuppliersCount}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-600"><DollarSign size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Balance Owed</span>
              <span className="text-xl font-bold font-mono text-red-700">{formatCurrency(stats.totalOwed)}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><ShieldAlert size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Wholesale Vendors</span>
              <span className="text-2xl font-bold font-mono text-blue-700">{stats.activeWholesale}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by supplier name, phone, email or code..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
            />
          </div>
          <div>
            <ReactSelect
              options={typeFilterOptions}
              value={typeFilter}
              onChange={opt => setTypeFilter(opt || '')}
              placeholder="All Supplier Types (Default)"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
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

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading suppliers...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300 shadow-sm">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Suppliers Found</h3>
            <p className="text-sm text-gray-500">Get started by creating your first supplier profile.</p>
            <button onClick={() => handleOpenModal('create')} className="mt-4 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm">
              <Plus size={14} className="inline mr-1" /> Add Supplier
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          // ── Cards View ──
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(renderSupplierCard)}
          </div>
        ) : (
          // ── Table View ──
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-300">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Contact</th>
                    <th className="text-center px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Activity</th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Balance</th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map(renderSupplierTableRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && suppliers.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 bg-white px-4 py-3 rounded-2xl border border-slate-300 shadow-sm">
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
              <span className="font-semibold text-gray-700">
                {Math.min(currentPage * PAGE_SIZE, totalSuppliersCount)}
              </span> of{' '}
              <span className="font-semibold text-gray-700">{totalSuppliersCount}</span> suppliers
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      currentPage === page
                        ? 'bg-[#2563EB] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
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

      {/* ── MODALS (unchanged) ── */}
      {/* Supplier Create/Edit/View Modal */}
      {isModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto">
            
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-[#2563EB]">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">
                    {modalMode === 'create' && 'Add New Supplier'}
                    {modalMode === 'edit' && 'Edit Supplier Details'}
                    {modalMode === 'view' && 'Supplier Profile & Ledger'}
                  </h2>
                  <p className="text-xs text-[#2563EB] mt-0.5 font-medium">📍 Branch: <strong>{currentBranch?.name}</strong></p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              
              <form onSubmit={handleSubmit} id="supplierForm" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Supplier Name *</label>
                    <input required disabled={modalMode === 'view'} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Al-Madina Wholesale Market" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Supplier Code</label>
                    <input disabled={modalMode === 'view'} value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="SUP-001" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Phone Number *</label>
                    <input required disabled={modalMode === 'view'} value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11)})} maxLength={11} inputMode="numeric" placeholder="03001234567" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Email Address</label>
                    <input type="email" disabled={modalMode === 'view'} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="supplier@gmail.com" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Contact Person</label>
                    <input disabled={modalMode === 'view'} value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} placeholder="Manager Name" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">City</label>
                    <input disabled={modalMode === 'view'} value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Lahore / Hasilpur" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Complete Address</label>
                  <input disabled={modalMode === 'view'} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Grain Market, Shop #12" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Supplier Type</label>
                    <ReactSelect
                      options={supplierTypeOptions}
                      value={form.type}
                      onChange={opt => setForm({...form, type: opt || 'WHOLESALE'})}
                      placeholder="Select Type"
                      isDisabled={modalMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Opening Balance (Rs.)</label>
                    <input type="number" step="any" disabled={modalMode === 'view'} value={form.openingBalance} onChange={e => setForm({...form, openingBalance: e.target.value})} placeholder="0" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono disabled:bg-gray-50" />
                  </div>
                </div>
              </form>

              {modalMode === 'view' && selectedSupplier && (
                <div className="space-y-4 border-t border-slate-300 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Opening Balance</span>
                      <span className="text-sm font-bold font-mono text-amber-900">{formatCurrency(selectedSupplier.openingBalance)}</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="text-[10px] uppercase font-bold text-red-700 block">Current Balance</span>
                      <span className="text-sm font-bold font-mono text-red-900">{formatCurrency(selectedSupplier.currentBalance)}</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Total POs</span>
                      <span className="text-sm font-bold font-mono text-blue-900">{selectedSupplier._count?.purchaseOrders || 0}</span>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                      <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Bills</span>
                      <span className="text-sm font-bold font-mono text-purple-900">{selectedSupplier._count?.purchaseBills || 0}</span>
                    </div>
                  </div>

                  {selectedSupplier.supplierLedgers && selectedSupplier.supplierLedgers.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <History size={14} /> Recent Ledger Entries
                      </h4>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-left px-3 py-2 font-bold">Date</th>
                              <th className="text-left px-3 py-2 font-bold">Type</th>
                              <th className="text-right px-3 py-2 font-bold">Amount</th>
                              <th className="text-right px-3 py-2 font-bold">Balance</th>
                              <th className="text-left px-3 py-2 font-bold">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedSupplier.supplierLedgers.map(entry => (
                              <tr key={entry.id} className="hover:bg-white transition-colors">
                                <td className="px-3 py-2 text-gray-500 font-mono">{formatDate(entry.date)}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                    entry.type === 'PAYMENT_MADE' ? 'bg-green-100 text-green-700' :
                                    entry.type === 'BILL_RECEIVED' ? 'bg-red-100 text-red-700' :
                                    entry.type === 'RETURN_ISSUED' ? 'bg-orange-100 text-orange-700' :
                                    entry.type === 'PO_CREATED' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {entry.type?.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">{formatCurrency(entry.amount)}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-gray-600">{formatCurrency(entry.balance)}</td>
                                <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]" title={entry.notes}>{entry.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedSupplier.payments && selectedSupplier.payments.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <CreditCard size={14} /> Recent Payments
                      </h4>
                      <div className="space-y-2">
                        {selectedSupplier.payments.slice(0, 5).map(pay => (
                          <div key={pay.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                            <div>
                              <span className="text-xs font-bold text-gray-800">{pay.paymentNo}</span>
                              <span className="text-[10px] text-gray-400 ml-2">{formatDate(pay.createdAt)}</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-green-700">-{formatCurrency(pay.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300 sticky bottom-0 z-20">
              <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-50">Close</button>
              {modalMode !== 'view' && (
                <button type="submit" form="supplierForm" disabled={saving} className="px-7 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95">
                  {saving ? 'Saving...' : (modalMode === 'edit' ? 'Update Supplier' : 'Save Supplier')}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-300 overflow-hidden">
            
            <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-100 text-green-700">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-gray-800">Record Payment</h2>
                  <p className="text-[11px] text-gray-500 font-medium">To: <strong>{selectedSupplier.name}</strong></p>
                </div>
              </div>
              <button onClick={handleClosePayment} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Payment Amount (Rs.) *</label>
                <input 
                  type="number" 
                  step="any" 
                  required
                  autoFocus
                  value={paymentForm.amount} 
                  onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                  placeholder="5000" 
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Payment Method</label>
                  <ReactSelect
                    options={paymentMethodOptions}
                    value={paymentMethodOptions.find(opt => opt.value === paymentForm.method) || null}
                    onChange={opt => setPaymentForm({...paymentForm, method: opt?.value || 'cash'})}
                    placeholder="Select Method"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Bank Account ID</label>
                  <input 
                    type="number" 
                    value={paymentForm.accountId} 
                    onChange={e => setPaymentForm({...paymentForm, accountId: e.target.value})}
                    placeholder="Optional" 
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Link to Purchase Bill ID</label>
                <input 
                  type="number" 
                  value={paymentForm.purchaseBillId} 
                  onChange={e => setPaymentForm({...paymentForm, purchaseBillId: e.target.value})}
                  placeholder="Optional — for bill-wise payment" 
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Reference / Cheque #</label>
                <input 
                  type="text" 
                  value={paymentForm.reference} 
                  onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
                  placeholder="TRX-123 / CHQ-456" 
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Notes</label>
                <textarea 
                  value={paymentForm.notes} 
                  onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                  placeholder="Payment description..." 
                  rows={2}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <p className="text-[11px] text-amber-800 font-medium">
                  💡 <strong>Tip:</strong> Leave <em>Bank Account ID</em> empty for cash payments. 
                  For bank payments, enter a valid account ID to auto-deduct from that account and record in Day Book.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={handleClosePayment} className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={paying} className="px-7 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95">
                  {paying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}