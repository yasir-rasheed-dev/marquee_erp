// ═══════════════════════════════════════════════════════════
// pages/Suppliers/SupplierLedger.jsx (Dedicated Page for History & Ledger)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supplierApi from '../../services/supplierApi';
import { 
  ArrowLeft, Phone, Mail, MapPin, FileText, ShoppingBag, 
  RotateCcw, CreditCard, Wallet, History 
} from 'lucide-react';
import ReactSelect from '../../components/ui/ReactSelect';

export default function SupplierLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'orders' | 'returns' | 'payments'
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    accountId: '',        // <-- ADD
    purchaseBillId: '',   // <-- ADD
    reference: '',
    notes: ''
  });

  const fetchSupplierDetails = async () => {
    try {
      setLoading(true);
      const branchId = JSON.parse(localStorage.getItem('selectedBranch') || '{}')?.id;
      const res = await supplierApi.getById(id, { params: { branchId } });
      const supplierData = res.data?.data || res.data || res;
      setSupplier(supplierData);
    } catch (error) {
      console.error('Error fetching supplier ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && id !== ':id') {
      fetchSupplierDetails();
    }
  }, [id]);

  const [paying, setPaying] = useState(false);

  // ── ReactSelect Options ──
  const paymentMethodOptions = useMemo(() => [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'jazzcash', label: 'JazzCash' },
    { value: 'easypaisa', label: 'EasyPaisa' }
  ], []);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Valid amount is required');
      return;
    }
    setPaying(true);
    try {
      await supplierApi.recordPayment({
        supplierId: parseInt(id),
        amount: parseFloat(paymentData.amount),
        method: paymentData.method,
        accountId: paymentData.accountId ? parseInt(paymentData.accountId) : undefined,
        purchaseBillId: paymentData.purchaseBillId ? parseInt(paymentData.purchaseBillId) : undefined,
        reference: paymentData.reference,
        notes: paymentData.notes
      });
      setIsPaymentModalOpen(false);
      setPaymentData({ amount: '', method: 'cash', accountId: '', purchaseBillId: '', reference: '', notes: '' });
      fetchSupplierDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading supplier history...</div>;
  if (!supplier) return <div className="text-center py-20 text-red-500">Supplier not found</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/procurement/suppliers')} 
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Suppliers
      </button>

      {/* ── Header Card ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-[#2563EB] rounded-full border border-amber-200">
              {supplier.type}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
            {supplier.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {supplier.phone}</span>}
            {supplier.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {supplier.email}</span>}
            {supplier.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {supplier.city}</span>}
          </div>
        </div>

        <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100 w-full md:w-auto justify-between">
          <div>
            <span className="text-xs text-gray-400 block font-bold uppercase">Current Balance Owed</span>
            <span className={`text-xl font-bold font-mono ${supplier.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Rs. {parseFloat(supplier.currentBalance || 0).toLocaleString()}
            </span>
          </div>
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition shadow-sm"
          >
            <CreditCard className="w-4 h-4" /> Pay Now
          </button>
        </div>
      </div>

      {/* ── Tabs Header ── */}
      <div className="flex border-b border-gray-200 mb-6 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bills')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'bills' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <FileText className="w-4 h-4" /> Purchase Bills ({supplier.purchaseBills?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <ShoppingBag className="w-4 h-4" /> Purchase Orders ({supplier.purchaseOrders?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'returns' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <RotateCcw className="w-4 h-4" /> Returns ({supplier.returns?.length || 0})
        </button>
        {/* ✅ PAYMENTS TAB */}
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <Wallet className="w-4 h-4" /> Payments ({supplier.payments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'ledger' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <History className="w-4 h-4" /> Complete Ledger ({supplier.supplierLedgers?.length || 0})
        </button>
      </div>

      {/* ── Tab: Purchase Bills ── */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {supplier.purchaseBills?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No purchase bills found for this supplier.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b">
                    <th className="p-4">Bill No</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Due Amount</th>
                    <th className="p-4">Vehicle / Transport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {supplier.purchaseBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-semibold text-blue-600">{bill.billNo}</td>
                      <td className="p-4 text-gray-500">{new Date(bill.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${bill.status === 'PAID' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-800 font-mono">Rs. {parseFloat(bill.totalAmount).toLocaleString()}</td>
                      <td className="p-4 text-red-600 font-semibold font-mono">Rs. {parseFloat(bill.dueAmount).toLocaleString()}</td>
                      <td className="p-4 text-gray-500">{bill.vehicleNo || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Purchase Orders ── */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {supplier.purchaseOrders?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No purchase orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b">
                    <th className="p-4">PO No</th>
                    <th className="p-4">Order Date</th>
                    <th className="p-4">Expected Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {supplier.purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-semibold text-blue-600">{po.poNo}</td>
                      <td className="p-4 text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-gray-500">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-800 font-mono">Rs. {parseFloat(po.totalAmount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Returns ── */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {supplier.returns?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No return records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b">
                    <th className="p-4">Return No</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {supplier.returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-semibold text-red-600">{ret.returnNo}</td>
                      <td className="p-4 text-gray-500">{new Date(ret.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-gray-600">{ret.reason || 'Defective item return'}</td>
                      <td className="p-4 font-bold text-gray-800 font-mono">Rs. {parseFloat(ret.totalAmount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ✅ TAB: PAYMENTS HISTORY */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {supplier.payments?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              No payment records found for this supplier.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b">
                    <th className="p-4">Payment No</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Amount Paid</th>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {supplier.payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-semibold text-green-600">{pay.paymentNo}</td>
                      <td className="p-4 text-gray-500">{new Date(pay.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold capitalize">
                          {pay.method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-green-600 font-mono">Rs. {parseFloat(pay.amount).toLocaleString()}</td>
                      <td className="p-4 text-gray-500">{pay.reference || '—'}</td>
                      <td className="p-4 text-gray-500 max-w-xs truncate" title={pay.notes}>{pay.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Summary Footer */}
              <div className="bg-gray-50 p-4 border-t flex justify-end items-center gap-4">
                <span className="text-sm text-gray-500">Total Payments:</span>
                <span className="text-lg font-bold text-green-600 font-mono">
                  Rs. {supplier.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Complete Ledger ── */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {supplier.supplierLedgers?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              No ledger entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Running Balance</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {supplier.supplierLedgers.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 text-gray-500 font-mono">{new Date(entry.date).toLocaleDateString('en-PK')}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          entry.type === 'PAYMENT_MADE' ? 'bg-green-50 text-green-600' :
                          entry.type === 'BILL_RECEIVED' ? 'bg-red-50 text-red-600' :
                          entry.type === 'RETURN_ISSUED' ? 'bg-orange-50 text-orange-600' :
                          entry.type === 'PO_CREATED' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {entry.type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-bold font-mono text-gray-800">Rs. {parseFloat(entry.amount).toLocaleString()}</td>
                      <td className="p-4 font-bold font-mono text-gray-600">Rs. {parseFloat(entry.balance).toLocaleString()}</td>
                      <td className="p-4 text-gray-500 max-w-xs truncate" title={entry.notes}>{entry.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Record Payment to {supplier.name}</h2>
            
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.) *</label>
                <input 
                  type="number" step="any" required value={paymentData.amount} 
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter payment amount"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <ReactSelect
                  options={paymentMethodOptions}
                  value={paymentMethodOptions.find(opt => opt.value === paymentData.method) || null}
                  onChange={opt => setPaymentData({ ...paymentData, method: opt?.value || 'cash' })}
                  placeholder="Select Method"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account ID (for bank deduct)</label>
                <input 
                  type="number" 
                  value={paymentData.accountId} 
                  onChange={(e) => setPaymentData({ ...paymentData, accountId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Leave empty for cash"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link to Bill ID (optional)</label>
                <input 
                  type="number" 
                  value={paymentData.purchaseBillId} 
                  onChange={(e) => setPaymentData({ ...paymentData, purchaseBillId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Bill ID to link payment"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Cheque No / Transaction ID</label>
                <input 
                  type="text" value={paymentData.reference} 
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Optional reference details"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea 
                  value={paymentData.notes} 
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="2" placeholder="Any extra notes..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={paying}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition"
                >
                  {paying ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}