// ═══════════════════════════════════════════════════════════
// pages/accounts/PaymentVoucher.jsx
// Payment Voucher Form (Standalone Inline View with In/Out)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Trash2, X, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

const DEFAULT_CATEGORIES = [
  { key: 'VENDOR_PAYMENT', label: 'Vendor Payment' },
  { key: 'SALARY', label: 'Salary' },
  { key: 'EXPENSE', label: 'Expense' },
  { key: 'BOOKING_REFUND', label: 'Booking Refund' },
  { key: 'TRANSFER_OUT', label: 'Transfer Out' },
  { key: 'TRANSFER_IN', label: 'Transfer In' },
  { key: 'OTHER', label: 'Other' },
];

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'JAZZCASH', 'EASYPAISA', 'CREDIT_CARD'];

export default function PaymentVoucher() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Custom Categories State ──
  const [customCategories, setCustomCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    type: 'DEBIT', // DEBIT = Paid Out (Expense), CREDIT = Received In (Income)
    category: 'VENDOR_PAYMENT',
    description: '',
    referenceNumber: '',
    paymentMode: 'CASH',
    paidTo: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // ── Merge default + custom categories (MUST be defined BEFORE categoryOptions) ──
  const allCategories = useMemo(() => {
    return [
      ...DEFAULT_CATEGORIES.map(c => ({ key: c.key, label: c.label, isCustom: false })),
      ...customCategories.map(c => ({ key: c.name, label: c.name, isCustom: true, id: c.id }))
    ];
  }, [customCategories]);

  // ── ReactSelect Options ──
  const accountOptions = useMemo(() => [
    { value: '', label: '-- Select Account --' },
    ...accounts.map(a => ({
      value: String(a.id),
      label: `${a.bankName} — ${a.accountNumber} (Bal: ${formatCurrency(a.currentBalance ?? a.initialBalance)})`
    }))
  ], [accounts]);

  const categoryOptions = useMemo(() => 
    allCategories.map(c => ({ value: c.key, label: c.label }))
  , [allCategories]);

  const paymentModeOptions = useMemo(() => 
    PAYMENT_MODES.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))
  , []);

  // ── Fetch Custom Categories ──
  const fetchCustomCategories = async () => {
    try {
      const res = await accountApi.getCustomCategories({ type: form.type });
      const cats = res.data?.data || res.data || [];
      if (Array.isArray(cats)) setCustomCategories(cats);
    } catch (err) {
      console.error('Failed to load custom categories:', err);
    }
  };

  // ── Fetch Active Accounts ──
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const activeBranchId = currentBranch?.id || user?.branchId || 1;
      const accRes = await accountApi.getAll({ status: 'ACTIVE', branchId: activeBranchId });

      if (accRes?.data?.success) setAccounts(accRes.data.data || []);
      else if (Array.isArray(accRes?.data)) setAccounts(accRes.data);
      else if (Array.isArray(accRes)) setAccounts(accRes);
    } catch (err) {
      if (err?.response?.status !== 429) {
        toast.error('Failed to load accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchCustomCategories();
  }, [currentBranch?.id, form.type]);

  const selectedAccount = accounts.find(a => String(a.id) === String(form.accountId));

  // ── Custom Category Handlers ──
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCategoryLoading(true);
    try {
      const res = await accountApi.createCustomCategory({ name: newCategoryName.trim(), type: form.type });
      toast.success('Category added successfully!');
      
      const createdCatName = res?.data?.data?.name || res?.data?.name || newCategoryName.trim();
      
      setNewCategoryName('');
      await fetchCustomCategories();

      setForm(prev => ({ ...prev, category: createdCatName }));
      setShowCategoryModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add category');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this custom category?')) return;
    try {
      await accountApi.deleteCustomCategory(id);
      toast.success('Category deleted!');
      fetchCustomCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete category');
    }
  };

  const resetForm = () => {
    setForm({
      accountId: '',
      amount: '',
      type: 'DEBIT',
      category: 'VENDOR_PAYMENT',
      description: '',
      referenceNumber: '',
      paymentMode: 'CASH',
      paidTo: '',
      transactionDate: new Date().toISOString().split('T')[0],
    });
  };

  // ── Handle Submit Voucher (Create) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accountId) { toast.error('Select an account'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter valid amount'); return; }
    if (!form.description) { toast.error('Enter description'); return; }

    try {
      const submitData = {
        type: form.type,
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description.trim(),
        referenceNumber: form.referenceNumber?.trim() || null,
        paymentMode: form.paymentMode,
        paidTo: form.paidTo?.trim() || null,
        transactionDate: form.transactionDate,
        branchId: currentBranch?.id || user?.branchId || 1
      };

      await accountApi.addTransaction(form.accountId, submitData);
      toast.success(form.type === 'DEBIT' ? 'Payment voucher recorded successfully!' : 'Receipt voucher recorded successfully!');

      resetForm();
      fetchAccounts(); // Balance update hone par refresh karein
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error saving payment voucher');
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#A97A1F] animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#4A4A4A' }}>Loading Accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 space-y-6">
        
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Payment / Receipt Voucher</h1>
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4A4A' }}>
                  Record incoming and outgoing financial vouchers
                  {currentBranch && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#F4E7C9] text-[#8B6914] font-bold">
                      {currentBranch.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Inline Form Card ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#E0D8CC] overflow-hidden">
          <div className="px-6 py-4 border-b bg-[#FAF8F4] flex items-center justify-between border-[#E0D8CC]">
            <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
              Voucher Entry Form
            </h3>
            <p className="text-xs font-medium" style={{ color: '#A97A1F' }}>
              📍 Branch: <strong>{currentBranch?.name || 'Current Branch'}</strong>
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <form onSubmit={handleSubmit} id="voucherForm" className="space-y-4">
              
              {/* ── Transaction Type Selector (In / Out) ── */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                  Transaction Type <span style={{ color: '#B71C1C' }}>*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: 'DEBIT' }))}
                    className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                      form.type === 'DEBIT'
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>📤 Paid Out (Expense / Out)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: 'CREDIT' }))}
                    className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                      form.type === 'CREDIT'
                        ? 'bg-green-50 border-green-300 text-green-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>📥 Received In (Income / In)</span>
                  </button>
                </div>
              </div>

              {/* Account Dropdown */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                  {form.type === 'DEBIT' ? 'Pay From Account' : 'Receive To Account'} <span style={{ color: '#B71C1C' }}>*</span>
                </label>
                <ReactSelect
                  options={accountOptions}
                  value={form.accountId}
                  onChange={val => setForm({ ...form, accountId: val || '' })}
                  placeholder="-- Select Account --"
                />
                {selectedAccount && (
                  <p className="text-xs font-mono font-bold mt-1.5 text-[#A97A1F]">
                    Available Balance: {formatCurrency(selectedAccount.currentBalance ?? selectedAccount.initialBalance)}
                  </p>
                )}
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                    Amount (Rs) <span style={{ color: '#B71C1C' }}>*</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    step="0.01" 
                    required 
                    value={form.amount} 
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono font-bold"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>
                      Category <span style={{ color: '#B71C1C' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[11px] font-bold text-[#A97A1F] hover:underline flex items-center gap-1"
                    >
                      <FolderPlus size={12} /> Add Category
                    </button>
                  </div>
                  <ReactSelect
                    options={categoryOptions}
                    value={form.category}
                    onChange={val => setForm({ ...form, category: val || 'VENDOR_PAYMENT' })}
                    placeholder="Select Category"
                  />
                </div>
              </div>

              {/* Paid To & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                    {form.type === 'DEBIT' ? 'Paid To' : 'Received From'}
                  </label>
                  <input 
                    value={form.paidTo} 
                    onChange={e => setForm({ ...form, paidTo: e.target.value })}
                    placeholder="Person or entity name"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Reference #</label>
                  <input 
                    value={form.referenceNumber} 
                    onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                    placeholder="Cheque #, Txn ID"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                  />
                </div>
              </div>

              {/* Payment Mode & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Payment Mode</label>
                  <ReactSelect
                    options={paymentModeOptions}
                    value={form.paymentMode}
                    onChange={val => setForm({ ...form, paymentMode: val || 'CASH' })}
                    placeholder="Select Payment Mode"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Date</label>
                  <input 
                    type="date" 
                    value={form.transactionDate} 
                    onChange={e => setForm({ ...form, transactionDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white"
                    style={{ borderColor: '#E0D8CC', color: '#1A1A1A' }} 
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                  Description <span style={{ color: '#B71C1C' }}>*</span>
                </label>
                <textarea 
                  required
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="What is this transaction for?"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                />
              </div>
            </form>
          </div>

          <div className="px-6 py-4 border-t bg-[#FAF8F4] flex items-center justify-end gap-3 border-[#E0D8CC]">
            <button 
              type="button" 
              onClick={resetForm} 
              className="px-5 py-2.5 rounded-xl border font-bold text-sm bg-gray-50 hover:bg-gray-100 transition-all text-gray-700"
            >
              Reset
            </button>
            <button 
              type="submit" 
              form="voucherForm" 
              className="px-7 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] shadow-md hover:scale-[1.01] transition-all"
            >
              Record Voucher
            </button>
          </div>
        </div>

        {/* ── Manage Categories Modal ── */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#E0D8CC] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E0D8CC] bg-[#FAF8F4] flex items-center justify-between">
                <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Manage Categories</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: '#E0D8CC' }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim() || categoryLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-bold text-sm disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-bold uppercase text-gray-400 mb-2">Default Categories</p>
                  {DEFAULT_CATEGORIES.map(c => (
                    <div key={c.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-[#E0D8CC]">
                      <span className="text-sm font-medium text-gray-700">{c.label}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">System</span>
                    </div>
                  ))}
                  
                  {customCategories.length > 0 && (
                    <>
                      <p className="text-xs font-bold uppercase text-gray-400 mb-2 mt-4">Custom Categories</p>
                      {customCategories.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50 border border-[#E0D8CC]">
                          <span className="text-sm font-medium text-gray-800">{c.name}</span>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}