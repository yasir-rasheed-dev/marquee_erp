import React, { useState } from 'react';
import { History, Search, ArrowRightLeft, Send, Package, Plus, X, Building2, Calendar, Eye } from 'lucide-react';
import stockTransferApi from '../../services/stockTransferApi';
import inventoryApi from '../../services/inventoryApi';
import authApi from '../../services/authApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import ReactSelect from '../../components/ui/ReactSelect';
import toast from 'react-hot-toast';

export default function StockTransferHistory() {
  const { currentBranch } = useBranch();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [loading, setLoading] = useState(false);

  // Transfer Form State
  const [form, setForm] = useState({ inventoryId: '', toBranchId: '', quantity: '', notes: '' });

  // Fetch transfer history
  const { data: transfers, refetch: refetchHistory } = useGlobalData(
    async (bId) => {
      const branchIdVal = bId?.branchId || bId?.id || bId || currentBranch?.id || currentBranch?.branchId;
      const res = await stockTransferApi.getAll({ search, branchId: branchIdVal });
      return res?.data || res || [];
    },
    { dependencies: [search] }
  );

  // Fetch items for transfer selection & mapping
  const { data: items } = useGlobalData(async (bId) => {
    const branchIdVal = bId?.branchId || bId?.id || bId || currentBranch?.id || currentBranch?.branchId;
    const res = await inventoryApi.getAll({ branchId: branchIdVal });
    return res?.data || res || [];
});

  // Fetch branches for mapping IDs to Names
  const { data: branchesData } = useGlobalData(async () => {
    const res = await authApi.getBranches(); 
    return res?.branches || res?.data || [];
  });

  const transferList = Array.isArray(transfers) ? transfers : [];
  const itemList = Array.isArray(items) ? items : [];
  const branchArray = Array.isArray(branchesData) ? branchesData : (branchesData?.branches || []);

  // 🔍 Maps for instant ID-to-Name resolution
  const itemMap = new Map(itemList.map(i => [String(i.id), i]));
  const branchMap = new Map(branchArray.map(b => [String(b.id), b]));

  const selectedItem = itemMap.get(String(form.inventoryId)) || null;
  const availableBranches = branchArray.filter(b => String(b.id) !== String(currentBranch?.id));

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!form.inventoryId || !form.toBranchId || !form.quantity) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (String(form.toBranchId) === String(currentBranch?.id)) {
      toast.error('Cannot transfer stock to the same branch.');
      return;
    }

    const qty = parseFloat(form.quantity);
    if (selectedItem && qty > Number(selectedItem.currentStock)) {
      toast.error(`Transfer quantity exceeds available stock (${selectedItem.currentStock} ${selectedItem.unit})`);
      return;
    }

    setLoading(true);
    try {
      await inventoryApi.doTransaction({
        inventoryId: parseInt(form.inventoryId),
        type: 'TRANSFER_OUT',
        quantity: qty,
        toBranchId: parseInt(form.toBranchId),
        notes: form.notes?.trim() || null,
        branchId: currentBranch?.id
      });
      toast.success('Stock transferred successfully!');
      setForm({ inventoryId: '', toBranchId: '', quantity: '', notes: '' });
      setShowModal(false);
      refetchHistory();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] text-white shadow-md">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Stock Transfer History & Ledger</h1>
              <p className="text-sm text-gray-600">
                Manage and track dispatches for <span className="font-semibold text-[#A97A1F]">{currentBranch?.name || 'Selected Branch'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition-all"
          >
            <Plus size={18} /> New Stock Transfer
          </button>
        </div>

        {/* Search Filter */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] mb-6 shadow-sm">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search transfers by item name, branch, or remarks..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
            />
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-[#E0D8CC] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F2EB] border-b border-[#E0D8CC] text-gray-700 font-semibold">
                <tr>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Item Transferred</th>
                  <th className="p-4">From Branch</th>
                  <th className="p-4">To Branch</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transferList.length > 0 ? (
                  transferList.map(tx => {
                    const resolvedItem = tx.inventoryItem || itemMap.get(String(tx.inventoryId)) || {};
                    const fromBranchObj = tx.fromBranch || branchMap.get(String(tx.fromBranchId)) || {};
                    const toBranchObj = tx.toBranch || branchMap.get(String(tx.toBranchId)) || {};

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
                        <td className="p-4">
                          <span className="flex items-center gap-1.5 font-medium text-gray-800">
                            <Building2 size={14} className="text-[#A97A1F]" />
                            {fromBranchObj.name || `Branch #${tx.fromBranchId}`}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1.5 font-medium text-gray-800">
                            <Building2 size={14} className="text-emerald-600" />
                            {toBranchObj.name || `Branch #${tx.toBranchId}`}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-[#A97A1F]">
                          {tx.quantity} <span className="text-xs text-gray-500 font-normal">{resolvedItem.unit || ''}</span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setSelectedTransfer({ ...tx, resolvedItem, fromBranchObj, toBranchObj })} 
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
                      No stock transfer history found. Click "New Stock Transfer" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔍 Complete Detail Modal with Resolved Names */}
        {selectedTransfer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
              
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Package className="text-[#A97A1F]" size={20} />
                  Transfer Transaction Details
                </h3>
                <button onClick={() => setSelectedTransfer(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">Transferred Item</p>
                  <div className="font-bold text-gray-900 text-base">{selectedTransfer.resolvedItem?.name || selectedTransfer.itemName || 'N/A'}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">SKU: {selectedTransfer.resolvedItem?.code || '—'}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-amber-200">Category: {selectedTransfer.resolvedItem?.category || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">From Branch (Sender)</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{selectedTransfer.fromBranchObj?.name || `Branch #${selectedTransfer.fromBranchId}`}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">To Branch (Receiver)</p>
                    <p className="font-semibold text-emerald-700 mt-0.5">{selectedTransfer.toBranchObj?.name || `Branch #${selectedTransfer.toBranchId}`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Quantity Transferred</p>
                    <p className="font-mono font-bold text-[#A97A1F] text-base mt-0.5">
                      {selectedTransfer.quantity} {selectedTransfer.resolvedItem?.unit || ''}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Timestamp</p>
                    <p className="font-mono text-xs text-gray-700 mt-1">{new Date(selectedTransfer.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Remarks / Dispatch Notes</p>
                  <p className="text-gray-700 italic text-xs">{selectedTransfer.notes || 'No remarks provided.'}</p>
                </div>

              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedTransfer(null)} 
                  className="px-5 py-2.5 bg-gray-800 text-white font-semibold rounded-xl text-sm hover:bg-gray-900 transition-all"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 🚀 New Transfer Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
              
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <ArrowRightLeft className="text-[#A97A1F]" size={20} />
                  New Inter-Branch Stock Transfer
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select Item to Transfer *</label>
                  <ReactSelect
  value={form.inventoryId}
  onChange={(val) => setForm({...form, inventoryId: val || ''})}
  options={[
    { value: '', label: '-- Choose Inventory Item --' },
    ...itemList.map(i => ({
      value: String(i.id),
      label: `${i.name} ${i.code ? `(${i.code})` : ''} — Available: ${i.currentStock} ${i.unit}`
    }))
  ]}
  placeholder="Choose Inventory Item"
  isSearchable={true}
  isClearable={false}
/>
                  
                  {selectedItem && (
                    <div className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Package size={14} className="text-[#A97A1F]" />
                        Available Stock: <b>{selectedItem.currentStock} {selectedItem.unit}</b>
                      </span>
                      <span className="font-mono text-gray-500">Category: {selectedItem.category}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Destination Branch Name *</label>
                  <ReactSelect
  value={form.toBranchId}
  onChange={(val) => setForm({...form, toBranchId: val || ''})}
  options={availableBranches.map(b => ({
    value: String(b.id),
    label: b.name
  }))}
  placeholder="Select Target Branch"
  isSearchable={true}
  isClearable={false}
/>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transfer Quantity * ({selectedItem?.unit || 'Units'})</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    placeholder="0.000" 
                    value={form.quantity} 
                    onChange={e => setForm({...form, quantity: e.target.value})} 
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30 font-mono" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transfer Notes / Remarks</label>
                  <textarea 
                    placeholder="Reason or dispatch details..." 
                    value={form.notes} 
                    onChange={e => setForm({...form, notes: e.target.value})} 
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
                    rows={2} 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={15} />
                    {loading ? 'Executing...' : 'Execute Transfer'}
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