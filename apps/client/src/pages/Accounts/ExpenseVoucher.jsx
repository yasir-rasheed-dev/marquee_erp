// ═══════════════════════════════════════════════════════════
// pages/accounts/ExpenseVoucher.jsx
// Create Expense (Debit Transaction) - Streamlined Form
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileMinus, ChevronLeft, ArrowUpRight,
  AlertCircle, CheckCircle2, FolderPlus, Plus, Trash2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import accountApi from '../../services/accountApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

const DEFAULT_EXPENSE_CATEGORIES = [
  { key: 'EXPENSE', label: 'General Expense' },
  { key: 'SALARY', label: 'Staff Salary' },
  { key: 'VENDOR_PAYMENT', label: 'Vendor / Supplier' },
  { key: 'BOOKING_REFUND', label: 'Customer Refund' },
  { key: 'OTHER', label: 'Miscellaneous' },
];

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'JAZZCASH', 'EASYPAISA', 'CREDIT_CARD'];

export default function ExpenseVoucher() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Custom Categories State ──
  const [customCategories, setCustomCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    type: 'DEBIT',
    category: 'EXPENSE',
    description: '',
    referenceNumber: '',
    paymentMode: 'CASH',
    paidTo: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // ── Fetch Custom Categories ──
  const fetchCustomCategories = async () => {
    try {
      const res = await accountApi.getCustomCategories({ type: 'DEBIT' });
      const cats = res.data?.data || res.data || [];
      if (Array.isArray(cats)) setCustomCategories(cats);
    } catch (err) {
      console.error('Failed to load custom categories:', err);
    }
  };

  useEffect(() => {
    const activeBranchId = currentBranch?.id || user?.branchId || 1;
    accountApi.getAll({ status: 'ACTIVE', branchId: activeBranchId }).then(res => {
      if (res.data?.success) setAccounts(res.data.data || []);
      else if (Array.isArray(res.data)) setAccounts(res.data);
    });
    fetchCustomCategories();
  }, [currentBranch?.id]);

  const selectedAccount = accounts.find(a => a.id === parseInt(form.accountId));

  // Merge default + custom categories
  const allCategories = useMemo(() => {
    return [
      ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({ key: c.key, label: c.label, isCustom: false })),
      ...customCategories.map(c => ({ key: c.name, label: c.name, isCustom: true, id: c.id }))
    ];
  }, [customCategories]);

  // ── ReactSelect Options ──
  const accountOptions = useMemo(() => [
    { value: '', label: '-- Select Source Account --' },
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

  // ── Custom Category Handlers ──
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCategoryLoading(true);
    try {
      const res = await accountApi.createCustomCategory({ name: newCategoryName.trim(), type: 'DEBIT' });
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
    if (!confirm('Delete this custom category?')) return;
    try {
      await accountApi.deleteCustomCategory(id);
      toast.success('Category deleted!');
      fetchCustomCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accountId) { toast.error('Select an account'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter valid amount'); return; }
    if (!form.description) { toast.error('Enter description'); return; }

    setLoading(true);
    try {
      const submitData = {
        type: 'DEBIT',
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
      setSuccess(true);
      toast.success('Expense voucher created!');
      setTimeout(() => {
        setSuccess(false);
        setForm({
          accountId: '',
          amount: '',
          type: 'DEBIT',
          category: 'EXPENSE',
          description: '',
          referenceNumber: '',
          paymentMode: 'CASH',
          paidTo: '',
          transactionDate: new Date().toISOString().split('T')[0]
        });
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#CBD5E1' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#334155' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-md">
                  <FileMinus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Expense Voucher</h1>
                  <p className="text-xs font-medium" style={{ color: '#475569' }}>
                    Record business expenses
                    {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100/80 text-[#8B6914] font-bold">{currentBranch.name}</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6">
        {success ? (
          <div className="bg-white rounded-3xl border p-8 text-center shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Expense Recorded!</h2>
            <p className="text-sm text-gray-500">Voucher saved successfully</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300">
              <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                New Expense Voucher Form
              </h3>
              <p className="text-xs font-medium" style={{ color: '#2563EB' }}>
                📍 Branch: <strong>{currentBranch?.name || 'Current Branch'}</strong>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleSubmit} id="expenseForm" className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                    Pay From Account <span style={{ color: '#B71C1C' }}>*</span>
                  </label>
                  <ReactSelect
                    options={accountOptions}
                    value={accountOptions.find(opt => opt.value === form.accountId) || null}
                    onChange={opt => setForm({ ...form, accountId: opt?.value || '' })}
                    placeholder="-- Select Source Account --"
                  />
                  {selectedAccount && (
                    <p className="text-xs font-mono font-bold mt-1 text-[#2563EB]">
                      Available Balance: {formatCurrency(selectedAccount.currentBalance ?? selectedAccount.initialBalance)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
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
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>
                        Expense Category <span style={{ color: '#B71C1C' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                      >
                        <FolderPlus size={12} /> Add Category
                      </button>
                    </div>
                    <ReactSelect
                      options={categoryOptions}
                      value={categoryOptions.find(opt => opt.value === form.category) || null}
                      onChange={opt => setForm({ ...form, category: opt?.value || 'EXPENSE' })}
                      placeholder="Select Category"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Paid To</label>
                    <input 
                      value={form.paidTo} 
                      onChange={e => setForm({ ...form, paidTo: e.target.value })}
                      placeholder="Vendor / Person name"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Reference #</label>
                    <input 
                      value={form.referenceNumber} 
                      onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                      placeholder="Bill #, Invoice #"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Payment Mode</label>
                    <ReactSelect
                      options={paymentModeOptions}
                      value={paymentModeOptions.find(opt => opt.value === form.paymentMode) || null}
                      onChange={opt => setForm({ ...form, paymentMode: opt?.value || 'CASH' })}
                      placeholder="Select Payment Mode"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Date</label>
                    <input 
                      type="date" 
                      value={form.transactionDate} 
                      onChange={e => setForm({ ...form, transactionDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white"
                      style={{ borderColor: '#CBD5E1', color: '#0F172A' }} 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                    Description <span style={{ color: '#B71C1C' }}>*</span>
                  </label>
                  <textarea 
                    required
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="What is this expense for?"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none"
                    style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                  />
                </div>

                {form.amount && selectedAccount && (
                  <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={16} className="text-red-600" />
                      <span className="text-xs font-bold uppercase text-red-700">Expense Preview</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">From: {selectedAccount.bankName}</span>
                      <span className="font-bold font-mono text-red-600">-{formatCurrency(form.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Balance After:</span>
                      <span className="font-bold font-mono text-gray-700">
                        {formatCurrency(parseFloat((selectedAccount.currentBalance ?? selectedAccount.initialBalance) || 0) - parseFloat(form.amount || 0))}
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300">
              <button 
                type="button" 
                onClick={() => setForm({
                  accountId: '',
                  amount: '',
                  type: 'DEBIT',
                  category: 'EXPENSE',
                  description: '',
                  referenceNumber: '',
                  paymentMode: 'CASH',
                  paidTo: '',
                  transactionDate: new Date().toISOString().split('T')[0],
                })} 
                className="px-5 py-2.5 rounded-xl border font-bold text-sm bg-gray-50 hover:bg-gray-100 transition-all text-gray-700"
              >
                Reset
              </button>
              <button 
                type="submit" 
                form="expenseForm" 
                disabled={loading}
                className="px-7 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowUpRight size={16} /> {loading ? 'Saving...' : 'Record Expense'}
              </button>
            </div>
          </div>
        )}

        {/* ── Manage Categories Modal ── */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Manage Categories</h3>
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
                    style={{ borderColor: '#CBD5E1' }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim() || categoryLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-bold text-sm disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-bold uppercase text-gray-400 mb-2">Default Categories</p>
                  {DEFAULT_EXPENSE_CATEGORIES.map(c => (
                    <div key={c.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-slate-300">
                      <span className="text-sm font-medium text-gray-700">{c.label}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">System</span>
                    </div>
                  ))}
                  
                  {customCategories.length > 0 && (
                    <>
                      <p className="text-xs font-bold uppercase text-gray-400 mb-2 mt-4">Custom Categories</p>
                      {customCategories.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50 border border-slate-300">
                          <span className="text-sm font-medium text-gray-800">{c.name}</span>
                          <button
                            type="button"
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