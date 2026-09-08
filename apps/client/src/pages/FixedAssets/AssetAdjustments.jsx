import React, { useState, useMemo } from 'react';
import { 
  SlidersHorizontal, Plus, Search, RefreshCw, 
  Building2, Package, ShieldAlert, ArrowUpRight, ArrowDownLeft, X, Calendar 
} from 'lucide-react';
import assetApi from '../../services/assetApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';
import ReactSelect from '../../components/ui/ReactSelect';

export default function AssetAdjustments() {
  const { currentBranch } = useBranch();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const initialFormState = {
    assetId: '',
    type: 'ADJUSTMENT',
    quantity: '',
    notes: '',
    toBranchId: ''
  };

  const [form, setForm] = useState(initialFormState);

  // Fetch Assets for Dropdown selection
// Fetch Assets for Dropdown selection (Updated & Robust)
  // Fetch Assets for Dropdown selection (Robust Extraction)
  const { data: assetsRes } = useGlobalData(async () => {
    try {
      const res = await assetApi.getAll({ branch: currentBranch?.id });
      console.log('📦 Raw Assets Response:', res);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.assets)) return res.assets;
      return [];
    } catch (err) {
      console.error('Failed to fetch assets for dropdown:', err);
      return [];
    }
  }, [currentBranch]);

  const assetList = Array.isArray(assetsRes) ? assetsRes : [];

  // Fetch Asset Transactions History
  const { data: txRes, refetch } = useGlobalData(async () => {
    // Agar backend par transactions get karne ka route ho toh call karein
    try {
      const res = await assetApi.getTransactions({ branch: currentBranch?.id, type: typeFilter });
      return res?.data || res?.transactions || [];
    } catch (e) {
      return []; // Fallback agar route pending ho
    }
  }, [typeFilter, currentBranch]);

  const transactionList = Array.isArray(txRes) ? txRes : [];

  // ── ReactSelect Options ──
  const typeFilterOptions = useMemo(() => [
    { value: 'ALL', label: 'All Transaction Types' },
    { value: 'PURCHASE', label: ' Purchases / Additions' },
    { value: 'ADJUSTMENT', label: 'Damages / Reductions' },
    { value: 'TRANSFER_OUT', label: ' Transfers' }
  ], []);

  const assetOptions = useMemo(() => [
    { value: '', label: '-- Choose Asset --' },
    ...assetList.map(item => ({
      value: String(item.id),
      label: `${item.name} (${item.code || 'No Code'}) — Available: ${item.quantity}`
    }))
  ], [assetList]);

  const transactionTypeOptions = useMemo(() => [
    { value: 'ADJUSTMENT', label: '📉 Reduce / Damage / Loss' },
    { value: 'ADD', label: '📈 Add / New Purchase' },
    { value: 'TRANSFER_OUT', label: '🔄 Transfer to Branch' }
  ], []);

  // Handle Adjustment Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await assetApi.createTransaction({
        ...form,
        quantity: parseInt(form.quantity) || 1,
        assetId: parseInt(form.assetId)
      });
      toast.success('Asset adjustment logged successfully!');
      setShowModal(false);
      setForm(initialFormState);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process adjustment');
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'PURCHASE':
      case 'ADD':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 w-fit"><ArrowUpRight size={13} /> Purchase / Addition</span>;
      case 'ADJUSTMENT':
      case 'REDUCE':
      case 'DAMAGED_LOG':
        return <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1 w-fit"><ArrowDownLeft size={13} /> Damage / Loss / Reduce</span>;
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 w-fit"><RefreshCw size={13} /> Branch Transfer</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] text-white shadow-md">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Asset Adjustments & Logs</h1>
              <p className="text-sm text-gray-600">
                Track damages, loss, purchases, and branch transfers for <span className="font-semibold text-[#2563EB]">{currentBranch?.name || 'Selected Branch'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setShowModal(true); setForm(initialFormState); }} 
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition-all"
          >
            <Plus size={18} /> New Adjustment / Log
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 mb-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search transaction logs by notes..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" 
            />
          </div>
          <div>
            <ReactSelect
              options={typeFilterOptions}
              value={typeFilterOptions.find(opt => opt.value === typeFilter) || null}
              onChange={opt => setTypeFilter(opt?.value || 'ALL')}
              placeholder="All Transaction Types"
            />
          </div>
        </div>

        {/* Modal Box for New Adjustment */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-300">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-[#2563EB]" />
                  Register Asset Adjustment / Transaction
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select Asset *</label>
                  <ReactSelect
                    options={assetOptions}
                    value={assetOptions.find(opt => opt.value === form.assetId) || null}
                    onChange={opt => setForm({...form, assetId: opt?.value || ''})}
                    placeholder="-- Choose Asset --"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type *</label>
                    <ReactSelect
                      options={transactionTypeOptions}
                      value={transactionTypeOptions.find(opt => opt.value === form.type) || null}
                      onChange={opt => setForm({...form, type: opt?.value || 'ADJUSTMENT'})}
                      placeholder="Select Type"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={form.quantity} 
                      onChange={e => setForm({...form, quantity: e.target.value})} 
                      placeholder="e.g. 2" 
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#2563EB]/30" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason / Remarks / Notes *</label>
                  <textarea 
                    required
                    rows="2"
                    value={form.notes} 
                    onChange={e => setForm({...form, notes: e.target.value})} 
                    placeholder="e.g. 2 chairs broken in conference room..." 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB]/30"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl text-sm shadow-md">
                    Save Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F1F5F9] border-b border-slate-300 text-gray-700 font-semibold">
                <tr>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Asset Name</th>
                  <th className="p-4">Transaction Type</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactionList.length > 0 ? (
                  transactionList.map(tx => (
                    <tr key={tx.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 text-xs text-gray-500 flex items-center gap-1.5 pt-5">
                        <Calendar size={13} className="text-[#2563EB]" />
                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {tx.asset?.name || 'Asset #' + tx.assetId}
                        <div className="text-xs text-gray-400 font-mono">{tx.asset?.code || ''}</div>
                      </td>
                      <td className="p-4">
                        {getTypeBadge(tx.type)}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-gray-800">
                        {tx.quantity}
                      </td>
                      <td className="p-4 text-gray-600 text-xs">
                        {tx.notes || 'No remarks provided'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">
                      No asset adjustment logs found. Click "New Adjustment / Log" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}