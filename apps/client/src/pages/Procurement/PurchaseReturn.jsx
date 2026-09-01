// ═══════════════════════════════════════════════════════════
// pages/Purchases/PurchaseReturnList.jsx
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, RotateCcw, Calendar, Package, ArrowLeft,
  Check, AlertCircle, Building2, Loader2, Eye,
  Filter, Clock, CheckCircle2, XCircle, Hash,
  Phone, MapPin, ChevronDown, Receipt,
  TrendingDown
} from 'lucide-react';
import purchaseApi from '../../services/purchaseApi';
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
};

export default function PurchaseReturnList() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { addToast, ToastContainer } = useToast();

  // ── Data States ──
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filter States ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── View Modal States ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Fetch Returns ──
  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await purchaseApi.returns.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        branchId,
      });
      const data = res?.data?.data || res?.data || [];
      setReturns(data);
    } catch (err) {
      console.error('Failed to fetch returns:', err);
      if (err?.response?.status !== 429) {
        addToast('Failed to load purchase returns', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentBranch?.id, addToast]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchReturns(), 300);
    return () => clearTimeout(timer);
  }, [fetchReturns]);

  // ── Formatters ──
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // ── Stats ──
  const stats = useMemo(() => {
    const totalReturns = returns.length;
    const totalValue = returns.reduce((acc, r) => acc + parseFloat(r.totalAmount || 0), 0);
    const pending = returns.filter(r => r.status === 'PENDING').length;
    const completed = returns.filter(r => r.status === 'COMPLETED').length;
    return { totalReturns, totalValue, pending, completed };
  }, [returns]);

  // ── View Modal ──
  const handleView = async (ret) => {
    if (ret.items && ret.items.length > 0) {
      setSelectedReturn(ret);
      setIsModalOpen(true);
      return;
    }
    try {
      setModalLoading(true);
      setIsModalOpen(true);
      const res = await purchaseApi.returns.getById(ret.id);
      const data = res?.data?.data || res?.data;
      if (data) setSelectedReturn(data);
    } catch (err) {
      addToast('Failed to load return details', 'error');
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReturn(null);
  };

  // ── Delete / Cancel ──
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this purchase return?')) return;
    try {
      await purchaseApi.returns.update(id, { status: 'CANCELLED' });
      addToast('Purchase return cancelled successfully');
      fetchReturns();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Cannot cancel return', 'error');
    }
  };

  // ── Status Badge Helper ──
  const StatusBadge = ({ status }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
        <Icon size={12} /> {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#F5F2EB' }}>
      <ToastContainer />

      {/* ═══════════════════════════════════════════════════════════
          STICKY HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="border-b backdrop-blur-xl bg-white/90 sticky top-0 z-30 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/procurement')}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-red-500 shadow-[0_4px_12px_rgba(220,38,38,0.3)] text-white">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Purchase Returns</h1>
              <p className="text-xs font-medium text-gray-500">
                Track all debit notes, returned goods and supplier credit history
                {currentBranch && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 font-bold">
                    📍 {currentBranch.name}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* ═══════════════════════════════════════════════════════════
            STATS CARDS
            ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <RotateCcw size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total Returns</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{stats.totalReturns}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
              <TrendingDown size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Return Value</span>
              <span className="text-lg font-bold font-mono text-gray-800">{formatCurrency(stats.totalValue)}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Pending</span>
              <span className="text-2xl font-bold font-mono text-amber-700">{stats.pending}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center gap-3">
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
            FILTERS BAR
            ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by return number, supplier name or reason..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
            />
          </div>
          <div className="relative">
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
        </div>

        {/* ═══════════════════════════════════════════════════════════
            CONTENT: LOADING / EMPTY / TABLE
            ═══════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-red-600 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#DC2626' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading purchase returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E0D8CC] shadow-sm">
            <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Purchase Returns Found</h3>
            <p className="text-sm text-gray-500">There are no purchase returns recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-bold">Return #</th>
                    <th className="text-left px-4 py-3 font-bold">Supplier</th>
                    <th className="text-left px-4 py-3 font-bold">Date</th>
                    <th className="text-center px-4 py-3 font-bold">Items</th>
                    <th className="text-right px-4 py-3 font-bold">Total</th>
                    <th className="text-center px-4 py-3 font-bold">Status</th>
                    <th className="text-left px-4 py-3 font-bold">Reason</th>
                    <th className="text-right px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map(ret => (
                    <tr key={ret.id} className="hover:bg-[#FAF8F4]/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Hash size={14} className="text-red-600" />
                          <span className="font-bold font-mono text-gray-800 text-xs">{ret.returnNo || ret.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-gray-800 block">{ret.supplier?.name || '—'}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{ret.supplier?.phone || ''}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar size={12} className="text-gray-400" />
                          <span className="text-xs font-medium">{formatDate(ret.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={10} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400 font-medium">{formatDateTime(ret.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold">
                          <Package size={10} /> {ret.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold font-mono text-gray-800">{formatCurrency(ret.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={ret.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-600 truncate max-w-[160px] block" title={ret.reason}>
                          {ret.reason || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleView(ret)}
                            title="View Details"
                            className="p-2 rounded-xl hover:bg-red-100 text-red-600 transition-all"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(ret.id)}
                            title="Cancel Return"
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          VIEW RETURN DETAIL MODAL
          ═══════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-red-200 overflow-hidden my-auto">

            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-red-50 flex items-center justify-between border-red-100 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-600 text-white">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">
                    Purchase Return Details
                  </h2>
                  <p className="text-xs text-red-600 mt-0.5 font-medium">
                    📍 Branch: <strong>{currentBranch?.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-xl hover:bg-red-100 text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-full border-4 border-t-red-600 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#DC2626' }} />
                  <p className="mt-3 text-sm font-bold text-gray-600">Loading details...</p>
                </div>
              ) : selectedReturn ? (
                <>
                  {/* Return Meta & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Return Number</span>
                      <p className="text-lg font-bold font-mono text-gray-900">{selectedReturn.returnNo || `#${selectedReturn.id}`}</p>
                    </div>
                    <StatusBadge status={selectedReturn.status} />
                  </div>

                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="text-[10px] uppercase font-bold text-red-700 block">Total Qty</span>
                      <span className="text-sm font-bold font-mono text-red-900">
                        {selectedReturn.items?.reduce((acc, i) => acc + parseFloat(i.quantity || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <span className="text-[10px] uppercase font-bold text-orange-700 block">Items Count</span>
                      <span className="text-sm font-bold font-mono text-orange-900">{selectedReturn.items?.length || 0}</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="text-[10px] uppercase font-bold text-red-700 block">Grand Total</span>
                      <span className="text-sm font-bold font-mono text-red-900">{formatCurrency(selectedReturn.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Supplier Info */}
                  {selectedReturn.supplier && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-2">
                        <Building2 size={14} /> Supplier Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold">Name:</span>
                          <span className="font-bold text-gray-800">{selectedReturn.supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-gray-400" />
                          <span className="font-mono text-gray-700">{selectedReturn.supplier.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-gray-700">{selectedReturn.supplier.city || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Return Reason */}
                  {selectedReturn.reason && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <h4 className="text-xs font-bold uppercase text-amber-700 mb-1 flex items-center gap-2">
                        <AlertCircle size={14} /> Return Reason
                      </h4>
                      <p className="text-xs text-amber-900 font-medium">{selectedReturn.reason}</p>
                    </div>
                  )}

                  {/* Items Table */}
                  {selectedReturn.items && selectedReturn.items.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <Package size={14} /> Returned Items
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
                              <th className="text-left px-3 py-2 font-bold">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedReturn.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white transition-colors">
                                <td className="px-3 py-2 text-gray-800 font-bold">
                                  {item.inventory?.name || `Item #${item.inventoryId}`}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700">{item.quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{item.unit}</td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">{formatCurrency(item.totalPrice || item.quantity * item.unitPrice)}</td>
                                <td className="px-3 py-2 text-gray-600 text-[10px]">{item.reason || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      <span>Created: <strong className="text-gray-700">{formatDateTime(selectedReturn.createdAt)}</strong></span>
                    </div>
                    {selectedReturn.updatedAt && (
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>Updated: <strong className="text-gray-700">{formatDateTime(selectedReturn.updatedAt)}</strong></span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">No data available</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-gray-50 flex items-center justify-end gap-3 border-gray-200 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={handleCloseModal}
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