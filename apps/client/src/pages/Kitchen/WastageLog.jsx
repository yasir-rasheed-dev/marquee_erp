import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2, AlertTriangle, Search, Filter, Plus, X, Calendar,
  Package, DollarSign, TrendingDown, History, BarChart3,
  Loader2, ChevronDown, ChevronUp, Flame, Skull, Droplets,
  Box, User, Clock
} from 'lucide-react';
import wastageLogApi from '../../services/wastageLogApi';
import inventoryApi from '../../services/inventoryApi';
import { useBranch } from '../../context/BranchContext';
import ReactSelect from '../../components/ui/ReactSelect';
import toast from 'react-hot-toast';

const REASON_CONFIG = {
  expired:     { label: 'Expired',     color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Clock },
  spoiled:     { label: 'Spoiled',     color: 'bg-red-50 text-red-700 border-red-200', icon: Skull },
  damaged:     { label: 'Damaged',     color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: AlertTriangle },
  overproduction: { label: 'Overproduction', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Box },
  burned:      { label: 'Burned',      color: 'bg-red-50 text-red-700 border-red-200', icon: Flame },
  dropped:     { label: 'Dropped',     color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Droplets },
  theft:       { label: 'Theft',       color: 'bg-purple-50 text-purple-700 border-purple-200', icon: AlertTriangle },
  other:       { label: 'Other',       color: 'bg-gray-50 text-gray-600 border-gray-200', icon: Package }
};

const REASON_OPTIONS = [
  { value: 'expired', label: 'Expired' },
  { value: 'spoiled', label: 'Spoiled' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'overproduction', label: 'Overproduction' },
  { value: 'burned', label: 'Burned' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'theft', label: 'Theft' },
  { value: 'other', label: 'Other' }
];

export default function WastageLog() {
  const { currentBranch } = useBranch();
  
  // ── Data ──
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalWastageCost: 0, totalQuantity: 0 });

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ── Modals ──
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // ── Selected ──
  const [selectedLog, setSelectedLog] = useState(null);

  // ── Inventory ──
  const [inventoryItems, setInventoryItems] = useState([]);

  // ── Form ──
  const [form, setForm] = useState({
    inventoryId: '',
    quantity: '',
    unit: 'kg',
    reason: 'burned',
    description: '',
    bookingId: ''
  });

  // ── Report ──
  const [reportData, setReportData] = useState([]);
  const [reportGroupBy, setReportGroupBy] = useState('reason');
  const [reportLoading, setReportLoading] = useState(false);
    // ── ReactSelect Options ──
  const reasonOptions = useMemo(() => [
    { value: '', label: 'All Reasons' },
    ...REASON_OPTIONS.map(r => ({ value: r.value, label: r.label }))
  ], []);

  const inventoryItemOptions = useMemo(() =>
    inventoryItems.map((item) => ({
      value: String(item.id),
      label: `${item.name} (${item.unit}) — Stock: ${Number(item.currentStock || 0).toLocaleString()}`
    }))
  , [inventoryItems]);

  const unitOptions = useMemo(() => [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'ltr', label: 'ltr' },
    { value: 'pcs', label: 'pcs' },
    { value: 'degh', label: 'degh' }
  ], []);

  const reportGroupOptions = useMemo(() => [
    { value: 'reason', label: 'Group by Reason' },
    { value: 'inventory', label: 'Group by Item' },
    { value: 'date', label: 'Group by Date' }
  ], []);

  const [saving, setSaving] = useState(false);

  // ── Load ──
  useEffect(() => {
    if (currentBranch?.id) {
      fetchLogs();
      fetchInventory();
    }
  }, [currentBranch?.id]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { branchId: currentBranch?.id || 1 };
      if (search) params.search = search;
      if (reasonFilter) params.reason = reasonFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await wastageLogApi.getAll(params);
      const data = res?.data || {};
      setLogs(data.data || []);
      setSummary(data.summary || { totalWastageCost: 0, totalQuantity: 0 });
    } catch (err) {
      console.error('fetchLogs error:', err);
      toast.error('Failed to load wastage logs');
    } finally {
      setLoading(false);
    }
  };

   const fetchInventory = async () => {
    try {
      const branchId = currentBranch?.id || 1;
      const res = await inventoryApi.getAll({ branchId, limit: 1000 });
      console.log('🔍 Inventory API raw res:', res);
      
      // inventoryApi already returns res.data (unwrapped)
      // Response can be: { success: true, data: [...] } OR { data: [...] } OR [...]
      const items = Array.isArray(res) 
        ? res 
        : (res?.data || res?.items || []);
        
      console.log('✅ Parsed inventory items:', items);
      setInventoryItems(items);
    } catch (err) {
      console.error('fetchInventory error:', err);
      toast.error('Failed to load inventory items');
    }
  };

  // ── Open Detail ──
  const openDetail = async (log) => {
    try {
      setLoading(true);
      const res = await wastageLogApi.getById(log.id);
      setSelectedLog(res?.data?.data || null);
      setShowDetail(true);
    } catch (err) {
      toast.error('Failed to load log details');
    } finally {
      setLoading(false);
    }
  };

  // ── Open Report ──
  const openReport = async () => {
    setShowReport(true);
    await fetchReport();
  };

  const fetchReport = async () => {
    try {
      setReportLoading(true);
      const params = { groupBy: reportGroupBy };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await wastageLogApi.getReport(params);
      setReportData(res?.data?.data || []);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Create ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.inventoryId || !form.quantity || !form.reason) {
      toast.error('Inventory item, quantity, and reason are required');
      return;
    }
    try {
      setSaving(true);
      await wastageLogApi.create({
        inventoryId: parseInt(form.inventoryId),
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        reason: form.reason,
        description: form.description || undefined,
        bookingId: form.bookingId ? parseInt(form.bookingId) : undefined
      });
      toast.success('Wastage log created and stock deducted');
      setShowCreate(false);
      setForm({ inventoryId: '', quantity: '', unit: 'kg', reason: 'burned', description: '', bookingId: '' });
      fetchLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create wastage log');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (log) => {
    if (!window.confirm(`Delete wastage log for "${log.inventory?.name || 'Unknown'}"?`)) return;
    try {
      await wastageLogApi.delete(log.id);
      toast.success('Wastage log deleted');
      fetchLogs();
      if (showDetail && selectedLog?.id === log.id) {
        setShowDetail(false);
        setSelectedLog(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Filters ──
  const applyFilters = () => fetchLogs();
  const clearFilters = () => {
    setSearch('');
    setReasonFilter('');
    setStartDate('');
    setEndDate('');
    setTimeout(fetchLogs, 0);
  };

  const getInventoryUnit = (id) => {
    const item = inventoryItems.find(i => i.id === parseInt(id));
    return item?.unit || 'kg';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ═════════════════ HEADER ═════════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="text-[#2563EB]" size={28} />
            Wastage Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track inventory wastage, auto-deduct stock, and analyze loss patterns by reason.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openReport}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition flex items-center gap-2"
          >
            <BarChart3 size={16} /> Reports
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#966b1a] text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2"
          >
            <Plus size={18} /> Log Wastage
          </button>
        </div>
      </div>

      {/* ═════════════════ SUMMARY CARDS ═════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase font-semibold">Total Wastage Cost</div>
          <div className="text-2xl font-bold text-red-600 mt-1 font-mono">
            Rs {Number(summary.totalWastageCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase font-semibold">Total Quantity Wasted</div>
          <div className="text-2xl font-bold text-[#2563EB] mt-1 font-mono">
            {Number(summary.totalQuantity || 0).toLocaleString()} <span className="text-sm text-gray-400">units</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase font-semibold">Total Logs</div>
          <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">{logs.length}</div>
        </div>
      </div>

      {/* ═════════════════ FILTERS ═════════════════ */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search item or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-44">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reason</label>
          <ReactSelect
            options={reasonOptions}
            value={reasonOptions.find(opt => opt.value === reasonFilter) || null}
            onChange={opt => setReasonFilter(opt?.value || '')}
            placeholder="All Reasons"
          />
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
          />
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5"
          >
            <Filter size={14} /> Filter
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ═════════════════ LOGS TABLE ═════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin" />
            <span>Loading wastage logs...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F1F5F9] text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 rounded-tl-xl">Item</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Cost</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const reasonCfg = REASON_CONFIG[log.reason] || REASON_CONFIG.other;
                    const ReasonIcon = reasonCfg.icon;
                    return (
                      <tr key={log.id} className="hover:bg-amber-50/20 transition">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{log.inventory?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-400 font-mono">{log.inventory?.code}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-semibold text-[#2563EB]">
                            {Number(log.quantity).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">{log.unit}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${reasonCfg.color}`}>
                            <ReasonIcon size={12} />
                            {reasonCfg.label}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-gray-700">
                          Rs {Number(log.liveTotalCost || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-gray-500 text-xs">
                          {new Date(log.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openDetail(log)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="View Details"
                            >
                              <History size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(log)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-gray-400">
                      <Package size={40} className="mx-auto mb-3 opacity-30" />
                      <p>No wastage logs found.</p>
                      <p className="text-xs mt-1">Log your first wastage entry to start tracking.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═════════════════ CREATE MODAL ═════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={20} className="text-[#2563EB]" />
                Log Wastage
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Inventory Item</label>
                <ReactSelect
                  options={inventoryItemOptions}
                  value={inventoryItemOptions.find(opt => opt.value === form.inventoryId) || null}
                  onChange={opt => {
                    const id = opt?.value || '';
                    setForm({ ...form, inventoryId: id, unit: getInventoryUnit(id) });
                  }}
                  placeholder="-- Select Item --"
                  isRequired
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Quantity Wasted</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit</label>
                  <ReactSelect
                    options={unitOptions}
                    value={unitOptions.find(opt => opt.value === form.unit) || null}
                    onChange={opt => setForm({ ...form, unit: opt?.value || 'kg' })}
                    placeholder="Select Unit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Reason</label>
                <div className="grid grid-cols-4 gap-2">
                  {REASON_OPTIONS.map((r) => {
                    const cfg = REASON_CONFIG[r.value];
                    const Icon = cfg.icon;
                    const isActive = form.reason === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm({ ...form, reason: r.value })}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition ${
                          isActive
                            ? 'border-[#2563EB] bg-amber-50 text-[#2563EB]'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={16} />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What happened? (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Booking ID (Optional)</label>
                <input
                  type="number"
                  placeholder="Link to booking event"
                  value={form.bookingId}
                  onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#966b1a] disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                  {saving ? 'Saving...' : 'Log Wastage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════ DETAIL MODAL ═════════════════ */}
      {showDetail && selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Wastage Details</h3>
              <button onClick={() => setShowDetail(false)} className="p-1.5 hover:bg-gray-200 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#F1F5F9] rounded-xl">
                  <Package size={20} className="text-[#2563EB]" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selectedLog.inventory?.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{selectedLog.inventory?.code}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase">Quantity</div>
                  <div className="text-lg font-bold text-[#2563EB] font-mono">
                    {Number(selectedLog.quantity).toLocaleString()} {selectedLog.unit}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase">Cost</div>
                  <div className="text-lg font-bold text-red-600 font-mono">
                    Rs {Number(selectedLog.liveTotalCost || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-500 uppercase mb-1">Reason</div>
                {(() => {
                  const cfg = REASON_CONFIG[selectedLog.reason] || REASON_CONFIG.other;
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${cfg.color}`}>
                      <Icon size={14} />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {selectedLog.description && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                  <div className="text-xs text-amber-800 uppercase mb-1">Description</div>
                  <p className="text-sm text-amber-900">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.booking && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                  <div className="text-xs text-blue-800 uppercase mb-1">Linked Booking</div>
                  <p className="text-sm text-blue-900">
                    {selectedLog.booking.title} ({selectedLog.booking.bookingNo})
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t">
                <User size={12} />
                Logged by {selectedLog.createdBy?.name || 'Unknown'} on {new Date(selectedLog.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════ REPORT MODAL ═════════════════ */}
      {showReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-[#2563EB]" />
                Wastage Report
              </h3>
              <button onClick={() => setShowReport(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 border-b bg-gray-50/50 flex gap-3">
              <ReactSelect
                options={reportGroupOptions}
                value={reportGroupOptions.find(opt => opt.value === reportGroupBy) || null}
                onChange={opt => { setReportGroupBy(opt?.value || 'reason'); setTimeout(fetchReport, 0); }}
                placeholder="Group by"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {reportLoading ? (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
                  <Loader2 size={28} className="animate-spin" />
                  <span>Loading report...</span>
                </div>
              ) : reportData.length > 0 ? (
                <div className="space-y-3">
                  {reportData.map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <TrendingDown size={16} className="text-red-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {row.reason || row.inventoryName || row.date || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">{row.count} log(s)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 font-mono">
                          Rs {Number(row.totalCost).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {Number(row.totalQuantity).toLocaleString()} units
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <BarChart3 size={36} className="mx-auto mb-2 opacity-30" />
                  <p>No data for selected period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

