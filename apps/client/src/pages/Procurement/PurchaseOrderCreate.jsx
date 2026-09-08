// pages/Purchases/PurchaseOrderCreate.jsx
// Payment section COMPLETELY REMOVED

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Calendar, FileText, Package, ArrowLeft,
  Check, AlertCircle, Building2, Loader2, Calculator,
  ChevronDown, Hash, Phone, DollarSign, Weight
} from 'lucide-react';
import purchaseApi from '../../services/purchaseApi';
import supplierApi from '../../services/supplierApi';
import apiClient from '../../services/apiClient';
import { useBranch } from '../../context/BranchContext';
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

const DEFAULT_ITEM = {
  inventoryId: '',
  quantity: 1,
  unitPrice: 0,
  unit: 'pcs',
};

const DEFAULT_FORM = {
  supplierId: '',
  expectedDate: '',
  notes: '',
  taxAmount: 0,
  discount: 0,
  // ❌ PAYMENT FIELDS REMOVED
};

export default function PurchaseOrderCreate() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { addToast, ToastContainer } = useToast();

  // ── Data States ──
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Form States ──
  const [form, setForm] = useState(DEFAULT_FORM);
  const [items, setItems] = useState([{ ...DEFAULT_ITEM }]);
  const [errors, setErrors] = useState({});

  // ── Derived: Selected Supplier Detail ──
  const selectedSupplier = useMemo(() => {
    if (!form.supplierId) return null;
    return suppliers.find(s => s.id === parseInt(form.supplierId)) || null;
  }, [form.supplierId, suppliers]);

  // ── Fetch Suppliers ──
  const fetchSuppliers = useCallback(async () => {
    try {
      const branchId = currentBranch?.id || 1;
      const res = await supplierApi.getAll({ branchId });
      const data = res?.data?.data || res?.data || [];
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      addToast('Failed to load suppliers', 'error');
    }
  }, [currentBranch?.id, addToast]);

  // ── Fetch Inventory ──
  const fetchInventory = useCallback(async () => {
    try {
      const branchId = currentBranch?.id || 1;
      const res = await apiClient.get('/inventory', {
        params: { branchId, limit: 1000 }
      });
      const data = res?.data?.data || res?.data || [];
      setInventoryItems(data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      addToast('Failed to load inventory items', 'error');
    }
  }, [currentBranch?.id, addToast]);

  // ── Initial Load ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([fetchSuppliers(), fetchInventory()]);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchSuppliers, fetchInventory]);

  // ── Calculations ──
  const subTotal = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
    }, 0);
  }, [items]);

  const taxAmount = parseFloat(form.taxAmount || 0);
  const discountAmount = parseFloat(form.discount || 0);
  const totalAmount = useMemo(() => {
    return Math.max(0, subTotal + taxAmount - discountAmount);
  }, [subTotal, taxAmount, discountAmount]);

  // ── Formatters ──
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);

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
    if (!form.supplierId) {
      newErrors.supplier = 'Please select a supplier';
    }
    items.forEach((item, idx) => {
      if (!item.inventoryId) {
        newErrors[`item_${idx}`] = 'Select an item';
      }
      if (parseFloat(item.quantity) <= 0) {
        newErrors[`item_${idx}`] = 'Quantity must be greater than 0';
      }
      if (parseFloat(item.unitPrice) < 0) {
        newErrors[`item_${idx}`] = 'Unit price cannot be negative';
      }
    });

    // ❌ PAYMENT VALIDATION REMOVED

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
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
        supplierId: parseInt(form.supplierId),
        expectedDate: form.expectedDate ? new Date(form.expectedDate).toISOString() : null,
        notes: form.notes,
        taxAmount: parseFloat(form.taxAmount || 0),
        discount: parseFloat(form.discount || 0),
        branchId,
        items: items.map(i => ({
          inventoryId: parseInt(i.inventoryId),
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          unit: i.unit || 'pcs',
        })),
        // ❌ PAYMENT DATA REMOVED
      };

      const res = await purchaseApi.orders.create(payload);
      const poNo = res?.data?.data?.poNo || res?.data?.poNo || 'created';
      
      addToast(`Purchase Order ${poNo} created successfully!`);

      // Reset form
      setForm(DEFAULT_FORM);
      setItems([{ ...DEFAULT_ITEM }]);
      setErrors({});

      setTimeout(() => navigate('/procurement/purchase-orders'), 800);
    } catch (err) {
      console.error('Create PO error:', err);
      addToast(err?.response?.data?.message || 'Failed to create purchase order', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading Screen ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          <p className="mt-4 text-sm font-bold text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

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
              onClick={() => navigate('/procurement/purchase-orders')}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
              title="Back to List"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Create Purchase Order</h1>
              <p className="text-xs font-medium text-gray-500">
                Issue a new PO to supplier, add items, taxes & discounts
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
              type="button"
              onClick={() => navigate('/procurement/purchase-orders')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* ═══════════════════════════════════════════════════════════
            TOP STATS CARDS (Payment Stats Removed)
            ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#2563EB]">
              <Package size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Items</span>
              <span className="text-xl font-bold font-mono text-gray-800">{items.length}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Calculator size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Subtotal</span>
              <span className="text-lg font-bold font-mono text-gray-800">{formatCurrency(subTotal)}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total</span>
              <span className="text-xl font-bold font-mono text-[#2563EB]">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Building2 size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Supplier</span>
              <span className="text-sm font-bold text-gray-800 truncate max-w-[120px] block">
                {selectedSupplier ? selectedSupplier.name : 'Not Selected'}
              </span>
            </div>
          </div>
          {/* ❌ PAYMENT STATS CARD REMOVED */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ═══════════════════════════════════════════════════════════
              SECTION 1: SUPPLIER & META INFO
              ═══════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-300 bg-slate-50 flex items-center gap-2">
              <Building2 size={16} className="text-[#2563EB]" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Supplier & Order Details</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  Select Supplier <span className="text-red-500">*</span>
                </label>
                <ReactSelect
                  value={form.supplierId}
                  onChange={(val) => {
                    setForm(prev => ({ ...prev, supplierId: val || '' }));
                    if (errors.supplier) setErrors(prev => { const n = { ...prev }; delete n.supplier; return n; });
                  }}
                  options={[
                    { value: '', label: '-- Choose Supplier --' },
                    ...suppliers.map(sup => ({
                      value: String(sup.id),
                      label: `${sup.name} ${sup.phone ? `(${sup.phone})` : ''}`
                    }))
                  ]}
                  placeholder="Choose Supplier"
                  isSearchable={true}
                  isClearable={false}
                />
                {errors.supplier && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.supplier}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Expected Delivery Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={form.expectedDate}
                    onChange={(e) => setForm(prev => ({ ...prev, expectedDate: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Order Notes</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional remarks..."
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            </div>

            {selectedSupplier && (
              <div className="mx-5 mb-5 p-4 rounded-xl bg-amber-50 border border-amber-100 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">{selectedSupplier.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">{selectedSupplier.code || 'No Code'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">
                    Balance: {formatCurrency(selectedSupplier.currentBalance)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-200 text-amber-800">
                  {selectedSupplier.type}
                </span>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 2: ORDER ITEMS TABLE
              ═══════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-[#2563EB]" />
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Order Items</h2>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#8B6914] text-xs font-bold hover:bg-[#2563EB]/20 transition-all"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-bold w-[35%]">Inventory Item</th>
                    <th className="text-left px-4 py-3 font-bold w-[15%]">Quantity</th>
                    <th className="text-left px-4 py-3 font-bold w-[12%]">Unit</th>
                    <th className="text-left px-4 py-3 font-bold w-[15%]">Unit Price</th>
                    <th className="text-right px-4 py-3 font-bold w-[15%]">Total</th>
                    <th className="text-center px-4 py-3 font-bold w-[8%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const rowTotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
                    const invDetail = item.inventoryId
                      ? inventoryItems.find(i => i.id === parseInt(item.inventoryId))
                      : null;
                    const hasError = !!errors[`item_${index}`];

                    return (
                      <tr key={index} className={`hover:bg-slate-50/50 transition-colors ${hasError ? 'bg-red-50/50' : ''}`}>
                        <td className="px-4 py-3 align-top">
                          <ReactSelect
                            value={item.inventoryId}
                            onChange={(val) => handleItemChange(index, 'inventoryId', val || '')}
                            options={[
                              { value: '', label: 'Select Item...' },
                              ...inventoryItems.map(inv => ({
                                value: String(inv.id),
                                label: `${inv.name} (Stock: ${inv.currentStock || 0})`
                              }))
                            ]}
                            placeholder="Select Item"
                            isSearchable={true}
                            isClearable={false}
                          />
                          {invDetail && (
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">
                              Current Stock: <span className="font-mono font-bold text-gray-600">{invDetail.currentStock || 0}</span> {invDetail.unit}
                            </p>
                          )}
                          {hasError && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors[`item_${index}`]}</p>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                          />
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="relative">
                            <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rs</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          <span className="text-sm font-bold font-mono text-gray-800 block">
                            {formatCurrency(rowTotal)}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                            title="Remove Row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-slate-300 bg-gray-50/50">
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#2563EB]/40 text-[#8B6914] text-xs font-bold hover:bg-[#2563EB]/5 hover:border-[#2563EB] transition-all"
              >
                <Plus size={16} /> Add Another Item
              </button>
            </div>
          </div>

          {/* ❌ SECTION 3: PAYMENT SECTION COMPLETELY REMOVED */}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 3: TOTALS & ACTIONS (Payment removed)
              ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-300 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} className="text-[#2563EB]" /> Adjustments
              </h3>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Tax Amount (Rs)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rs</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.taxAmount}
                    onChange={(e) => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Discount (Rs)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rs</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.discount}
                    onChange={(e) => setForm(prev => ({ ...prev, discount: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-300 shadow-sm p-5 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-[#2563EB]" /> Order Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Subtotal</span>
                  <span className="text-sm font-bold font-mono text-gray-800">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Tax Amount</span>
                  <span className="text-sm font-bold font-mono text-gray-800">+ {formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Discount</span>
                  <span className="text-sm font-bold font-mono text-emerald-600">- {formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-amber-50 rounded-xl px-4 border border-amber-100">
                  <span className="text-sm font-bold text-amber-800">Total Amount</span>
                  <span className="text-2xl font-bold font-mono text-[#2563EB]">{formatCurrency(totalAmount)}</span>
                </div>
                {/* ❌ PAYMENT LINES REMOVED */}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/procurement/purchase-orders')}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95 transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {saving ? 'Creating Order...' : 'Save Purchase Order'}
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}