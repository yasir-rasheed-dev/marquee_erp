import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, PlusCircle, Search, Eye, X, Send, 
  Building2, Calendar, Package, ArrowUpRight, ArrowDownLeft, Box, DollarSign 
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import inventoryApi from '../../services/inventoryApi';
import stockTransactionApi from '../../services/stockTransactionApi';
import authApi from '../../services/authApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';
import ReactSelect from '../../components/ui/ReactSelect';

export default function StockAdjustment() {
  const { currentBranch } = useBranch();
  const [searchParams] = useSearchParams();
  const itemSearchParam = searchParams.get('search') || '';

  const [search, setSearch] = useState(itemSearchParam);
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State for New Transaction
  const [form, setForm] = useState({ 
    inventoryId: '', 
    type: 'PURCHASE', 
    quantity: '', 
    costPrice: '', 
    notes: '', 
    toBranchId: '',
    isBoxMode: false 
  });

  useEffect(() => {
    if (itemSearchParam) {
      setSearch(itemSearchParam);
    }
  }, [itemSearchParam]);

  // 1. Fetch Stock Transactions History
  const { data: transactions, refetch: refetchTransactions } = useGlobalData(
    async (bId) => {
      const res = await stockTransactionApi.getAll({ search, branchId: bId || currentBranch?.id });
      return res?.data || res || [];
    },
    { dependencies: [search] }
  );

  // 2. Fetch Inventory Items
  const { data: items } = useGlobalData(async (bId) => {
    const res = await inventoryApi.getAll({ branchId: bId || currentBranch?.id });
    return res?.data || res || [];
  });

  // 3. Fetch Branches
  const { data: branchesData } = useGlobalData(async () => {
    const res = await authApi.getBranches(); 
    return res?.branches || res?.data || [];
  });

  const txList = Array.isArray(transactions) ? transactions : [];
  const itemList = Array.isArray(items) ? items : [];
  const branchArray = Array.isArray(branchesData) ? branchesData : (branchesData?.branches || []);

  const itemMap = new Map(itemList.map(i => [String(i.id), i]));
  const selectedItem = itemMap.get(String(form.inventoryId)) || null;
  const availableBranches = branchArray.filter(b => String(b.id) !== String(currentBranch?.id));

  // ReactSelect Options
  const itemOptions = useMemo(() => 
    itemList.map(i => ({
      value: String(i.id),
      label: `${i.name} ${i.code ? `(${i.code})` : ''} — Stock: ${formatStockDisplay(i)}`
    })), 
  [itemList]);

  const typeOptions = useMemo(() => [
    { value: 'PURCHASE', label: 'Purchase (Stock In)' },
    { value: 'SALE', label: 'Sale (Stock Out)' },
    { value: 'ADJUSTMENT', label: 'Manual Adjustment' },
    { value: 'WASTAGE', label: 'Wastage / Damage' },
    { value: 'TRANSFER_OUT', label: 'Transfer Out to Another Branch' }
  ], []);

  const branchOptions = useMemo(() => 
    availableBranches.map(b => ({
      value: String(b.id),
      label: b.name
    })), 
  [availableBranches]);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.inventoryId || !form.quantity) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      let finalQty = parseFloat(form.quantity) || 0;
      let finalCostPrice = form.costPrice ? parseFloat(form.costPrice) : undefined;
      let conversionNote = '';

      if (form.isBoxMode && selectedItem?.isBoxEnabled && selectedItem?.unitsPerBox > 1) {
        const boxesCount = finalQty;
        finalQty = boxesCount * selectedItem.unitsPerBox;
        conversionNote = ` [Converted from ${boxesCount} Packs/Boxes (${selectedItem.unitsPerBox} units/box)]`;

        if (finalCostPrice !== undefined) {
          finalCostPrice = finalCostPrice / selectedItem.unitsPerBox;
        }
      }

      const payload = {
        inventoryId: parseInt(form.inventoryId),
        type: form.type,
        quantity: finalQty,
        costPrice: finalCostPrice !== undefined ? finalCostPrice : (selectedItem?.avgCostPrice || 0),
        notes: (form.notes?.trim() || '') + conversionNote,
        toBranchId: form.toBranchId ? parseInt(form.toBranchId) : undefined,
        branchId: currentBranch?.id
      };

      await inventoryApi.doTransaction(payload);
      toast.success('Stock transaction recorded successfully!');
      setForm({ inventoryId: '', type: 'PURCHASE', quantity: '', costPrice: '', notes: '', toBranchId: '', isBoxMode: false });
      setShowModal(false);
      refetchTransactions();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'PURCHASE':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">Purchase</span>;
      case 'SALE':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">Sale</span>;
      case 'WASTAGE':
        return <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200">Wastage / Damage</span>;
      case 'TRANSFER_OUT':
        return <span className="px-2.5 py-1 bg-amber-50 text-[#A97A1F] rounded-lg text-xs font-bold border border-amber-200">Transfer</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">Adjustment</span>;
    }
  };

  const formatStockDisplay = (item) => {
    if (!item || !item.manageStock) return `${item?.currentStock || 0} ${item?.unit || ''}`;
    if (!item.isBoxEnabled || item.unitsPerBox <= 1) return `${item.currentStock} ${item.unit}`;
    const packs = Math.floor(Number(item.currentStock) / item.unitsPerBox);
    const pcs = Number(item.currentStock) % item.unitsPerBox;
    return `${packs} Packs ${pcs > 0 ? `& ${pcs} pcs` : ''} (Total: ${item.currentStock})`;
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] text-white shadow-md">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Stock Transactions & Adjustments</h1>
              <p className="text-sm text-gray-600">
                Track purchases, wastage, and manual stock logs for <span className="font-semibold text-[#A97A1F]">{currentBranch?.name || 'Selected Branch'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition-all"
          >
            <PlusCircle size={18} /> New Stock Transaction
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] mb-6 shadow-sm flex items-center justify-between">
          <div className="relative w-full">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search transactions by item name, type, or notes..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
            />
          </div>
          {itemSearchParam && (
            <button 
              onClick={() => { setSearch(''); window.history.replaceState({}, '', window.location.pathname); }} 
              className="ml-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl whitespace-nowrap"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-[#E0D8CC] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F2EB] border-b border-[#E0D8CC] text-gray-700 font-semibold">
                <tr>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4 text-right">Cost Price</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txList.length > 0 ? (
                  txList.map(tx => {
                    const resolvedItem = tx.inventoryItem || itemMap.get(String(tx.inventoryId)) || {};
                    return (
                      <tr key={tx.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="p-4 text-gray-600 font-mono text-xs flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-800">{resolvedItem.name || tx.itemName || 'Unknown Item'}</div>
                          <div className="text-xs text-gray-400 font-mono">{resolvedItem.code || '—'}</div>
                        </td>
                        <td className="p-4">{getTypeBadge(tx.type)}</td>
                        <td className="p-4 text-center font-mono font-bold text-gray-800">
                          {tx.quantity} <span className="text-xs text-gray-400 font-normal">{resolvedItem.unit || ''}</span>
                        </td>
                        <td className="p-4 text-right font-mono text-gray-700">
                          Rs {Number(tx.costPrice || resolvedItem.avgCostPrice || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setSelectedTx({ ...tx, resolvedItem })} 
                            title="View Complete Details" 
                            className="p-2 hover:bg-amber-100 rounded-xl text-gray-600 transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <Eye size={16} className="text-[#A97A1F]" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-400">
                      No stock transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔍 Details Modal */}
        {selectedTx && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Package className="text-[#A97A1F]" size={20} />
                  Transaction Details
                </h3>
                <button onClick={() => setSelectedTx(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">Item Details</p>
                  <div className="font-bold text-gray-900 text-base">{selectedTx.resolvedItem?.name || 'N/A'}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">SKU: {selectedTx.resolvedItem?.code || '—'}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-amber-200">Category: {selectedTx.resolvedItem?.category || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Transaction Type</p>
                    <div className="mt-1">{getTypeBadge(selectedTx.type)}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Quantity Recorded</p>
                    <p className="font-mono font-bold text-gray-900 text-base mt-0.5">
                      {selectedTx.quantity} {selectedTx.resolvedItem?.unit || ''}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Remarks / Notes</p>
                  <p className="text-gray-700 italic text-xs">{selectedTx.notes || 'No remarks provided.'}</p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
                <button onClick={() => setSelectedTx(null)} className="px-5 py-2.5 bg-gray-800 text-white font-semibold rounded-xl text-sm hover:bg-gray-900">
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 New Transaction Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-2xl max-w-lg w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <RefreshCw className="text-[#A97A1F]" size={20} />
                  New Stock Transaction
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select Item *</label>
                  <ReactSelect
                    options={itemOptions}
                    value={itemOptions.find(opt => opt.value === form.inventoryId) || null}
                    onChange={opt => setForm({...form, inventoryId: opt?.value || ''})}
                    placeholder="-- Choose Inventory Item --"
                    isRequired
                  />
                  {selectedItem && (
                    <div className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span>Current Stock: <b>{formatStockDisplay(selectedItem)}</b></span>
                        <span>Per Unit Cost: <b>Rs {selectedItem.avgCostPrice}</b></span>
                      </div>
                      {selectedItem.isBoxEnabled && selectedItem.unitsPerBox > 1 && (
                        <div className="text-amber-900 font-medium text-[11px] border-t border-amber-200/60 pt-1 mt-0.5">
                          Pack Info: 1 Pack = <b>{selectedItem.unitsPerBox} units</b> | Whole Pack Cost: <b>Rs {(Number(selectedItem.avgCostPrice) * selectedItem.unitsPerBox).toLocaleString()}</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type *</label>
                  <ReactSelect
                    options={typeOptions}
                    value={typeOptions.find(opt => opt.value === form.type) || null}
                    onChange={opt => setForm({...form, type: opt?.value || 'PURCHASE'})}
                    placeholder="-- Select Transaction Type --"
                  />
                </div>

                {selectedItem?.isBoxEnabled && selectedItem?.unitsPerBox > 1 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.isBoxMode} 
                        onChange={e => setForm({...form, isBoxMode: e.target.checked})} 
                        className="w-4 h-4 rounded text-[#A97A1F]" 
                      />
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Box size={14} /> Enter in Packs / Boxes (Price & Qty will apply for whole pack)
                      </span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity * ({form.isBoxMode ? 'Packs / Boxes' : selectedItem?.unit || 'Units'})
                    </label>
                    <input 
                      type="number" 
                      step="0.001" 
                      placeholder="0.000" 
                      value={form.quantity} 
                      onChange={e => setForm({...form, quantity: e.target.value})} 
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono font-bold text-[#A97A1F]" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {form.isBoxMode ? 'Whole Pack Cost Price (Rs)' : 'Per Unit Cost Price (Rs)'}
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder={selectedItem ? (form.isBoxMode ? `Box Default: ${selectedItem.avgCostPrice * selectedItem.unitsPerBox}` : `Unit Default: ${selectedItem.avgCostPrice}`) : '0.00'} 
                      value={form.costPrice} 
                      onChange={e => setForm({...form, costPrice: e.target.value})} 
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono" 
                    />
                  </div>
                </div>

                {form.type === 'TRANSFER_OUT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Destination Branch Name *</label>
                    <ReactSelect
                      options={branchOptions}
                      value={branchOptions.find(opt => opt.value === form.toBranchId) || null}
                      onChange={opt => setForm({...form, toBranchId: opt?.value || ''})}
                      placeholder="-- Select Target Branch --"
                      isRequired
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Reason</label>
                  <textarea 
                    placeholder="Add remarks or explanation..." 
                    value={form.notes} 
                    onChange={e => setForm({...form, notes: e.target.value})} 
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none" 
                    rows={2} 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm">Cancel</button>
                  <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-semibold rounded-xl shadow-md text-sm flex items-center gap-2">
                    <Send size={15} /> {loading ? 'Processing...' : 'Submit Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}