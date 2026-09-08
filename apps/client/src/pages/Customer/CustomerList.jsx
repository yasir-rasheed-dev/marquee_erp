// ═══════════════════════════════════════════════════════════
// pages/Customers/CustomerList.jsx (With Complete Event Ledger & Filters)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Plus, Edit2, Trash2, History, Phone, 
  Mail, MapPin, Calendar, Check, AlertCircle, ShieldAlert, X, Building, Filter 
} from 'lucide-react';
import customerApi from '../../services/customerApi';
import { useBranch } from '../../context/BranchContext';
import { usePermissions } from '../../hooks/usePermissions';

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

export default function CustomerList() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { addToast, ToastContainer } = useToast();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('ALL'); // ALL, WITH_BOOKINGS, NO_BOOKINGS
  const [loading, setLoading] = useState(true);

  // History Ledger Drawer State
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);

  const fetchCustomers = async (searchQuery = '', cityQuery = '') => {
    try {
      setLoading(true);
      const res = await customerApi.getAll({ search: searchQuery, city: cityQuery, branchId: currentBranch?.id || 1 });
      setCustomers(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      if (err?.response?.status !== 429) {
        addToast('Failed to load customers', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search, cityFilter);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, cityFilter, currentBranch?.id]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customerApi.delete(id);
      addToast('Customer deleted successfully!');
      fetchCustomers(search, cityFilter);
    } catch (err) {
      toast.error('Failed to delete customer');
    }
  };

  const handleViewHistory = async (id) => {
    try {
      const res = await customerApi.getById(id);
      setSelectedCustomerHistory(res?.data?.data || res?.data);
    } catch (err) {
      addToast('Failed to load customer history ledger', 'error');
    }
  };

  // Filter Logic
  const filteredCustomers = customers.filter(c => {
    const bCount = c._count?.bookings || 0;
    if (bookingFilter === 'WITH_BOOKINGS' && bCount === 0) return false;
    if (bookingFilter === 'NO_BOOKINGS' && bCount > 0) return false;
    return true;
  });

  const totalCustomers = customers.length;
  const activeWithBookings = customers.filter(c => (c._count?.bookings || 0) > 0).length;
  const totalBookingsCount = customers.reduce((acc, c) => acc + (c._count?.bookings || 0), 0);

  const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] text-white shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Customer Directory</h1>
              <p className="text-sm text-gray-600">Manage clients and view complete event booking ledgers for <span className="text-[#2563EB] font-semibold">{currentBranch?.name}</span></p>
            </div>
          </div>
          {canCreate('customers') && (
            <button onClick={() => navigate('/customers/add')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition-all">
              <Plus size={18} /> Add New Customer
            </button>
          )}
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-[#2563EB]"><Users size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Customers</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{totalCustomers}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Calendar size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Clients with Bookings</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">{activeWithBookings}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Building size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Events Booked</span>
              <span className="text-2xl font-bold font-mono text-blue-700">{totalBookingsCount}</span>
            </div>
          </div>
        </div>

        {/* ADVANCED FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email or CNIC..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div>
            <input type="text" value={cityFilter} onChange={e => setCityFilter(e.target.value)} placeholder="Filter by City (e.g. Hasilpur)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div>
            <select value={bookingFilter} onChange={e => setBookingFilter(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none font-medium">
              <option value="ALL">All Clients (Default)</option>
              <option value="WITH_BOOKINGS">Clients With Bookings Only</option>
              <option value="NO_BOOKINGS">Clients Without Bookings</option>
            </select>
          </div>
        </div>

        {/* CUSTOMER TABLE */}
        <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-300 text-gray-700 font-semibold">
              <tr>
                <th className="p-4">Customer Details</th>
                <th className="p-4">City / Address</th>
                <th className="p-4">CNIC</th>
                <th className="p-4 text-center">Bookings Count</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading customers...</td></tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-base">{cust.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 mt-1 font-mono">
                        <span className="flex items-center gap-1"><Phone size={12} className="text-[#2563EB]" /> {cust.phone}</span>
                        {cust.email && <span className="flex items-center gap-1"><Mail size={12} className="text-[#2563EB]" /> {cust.email}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-gray-700">
                      <div className="font-semibold">{cust.city || 'N/A'}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{cust.address || 'No address provided'}</div>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-600">{cust.cnic || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-amber-50 text-[#2563EB] rounded-full text-xs font-bold border border-amber-200">
                        {cust._count?.bookings || 0} Bookings
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleViewHistory(cust.id)} title="View Complete History & Ledger" className="px-3 py-1.5 bg-amber-100 text-[#2563EB] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-amber-200 transition-all">
                          <History size={14} /> History Ledger
                        </button>
                        {canEdit('customers') && (
                          <button onClick={() => navigate(`/customers/edit/${cust.id}`)} title="Edit" className="p-2 hover:bg-blue-100 rounded-xl text-blue-600 transition-all"><Edit2 size={15} /></button>
                        )}
                        {canDelete('customers') && (
                          <button onClick={() => handleDelete(cust.id)} title="Delete" className="p-2 hover:bg-red-100 rounded-xl text-red-600 transition-all"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CUSTOMER HISTORY & COMPLETE EVENT LEDGER MODAL */}
        {selectedCustomerHistory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl p-6 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <h3 className="font-bold text-xl text-gray-800">{selectedCustomerHistory.name} — Complete Event History Ledger</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">Phone: {selectedCustomerHistory.phone} | CNIC: {selectedCustomerHistory.cnic || 'N/A'} | City: {selectedCustomerHistory.city || 'N/A'}</p>
                </div>
                <button onClick={() => setSelectedCustomerHistory(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"><X size={20} /></button>
              </div>

              {selectedCustomerHistory.emergencyContacts?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex flex-wrap gap-4 items-center">
                  <span className="font-bold flex items-center gap-1"><ShieldAlert size={14} /> Emergency Contacts:</span>
                  {selectedCustomerHistory.emergencyContacts.map((ec, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-xl border border-amber-200 font-medium">
                      {ec.name} ({ec.relation || 'Contact'}): <strong className="font-mono">{ec.phone}</strong>
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={16} className="text-[#2563EB]" /> Booked Halls, Events, Menus & Bill Ledger</h4>

                {selectedCustomerHistory.bookings?.length > 0 ? (
                  selectedCustomerHistory.bookings.map(b => (
                    <div key={b.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-2 border-b border-gray-200">
                        <div>
                          <span className="font-bold text-gray-900 text-base">{b.bookingNo} — Event Type: <span className="text-[#2563EB] uppercase">{b.eventType}</span></span>
                          <span className="text-xs text-gray-500 block mt-0.5">
                            📅 <strong>Event Date:</strong> {new Date(b.eventDate).toDateString()} | 🕒 <strong>Slot:</strong> {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-gray-500 block mt-0.5">
                            👥👥 <strong>Guest Count:</strong> {b.guestCount} Guests | 🏛️ <strong>Hall:</strong> {b.hall?.name || 'N/A'} | Status: <strong className="uppercase text-emerald-700">{b.status}</strong> </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block font-bold uppercase">Total Bill Amount</span>
                          <span className="font-mono font-bold text-emerald-700 text-lg">{formatCurrency(b.totalAmount)}</span>
                          <span className="text-xs text-gray-500 block">Paid: {formatCurrency(b.paidAmount)} | Due: {formatCurrency(b.dueAmount)}</span>
                        </div>
                      </div>

                      {/* Attached Menus & Dishes */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">Attached Menus & Dishes Consumed:</span>
                        <div className="flex flex-wrap gap-2">
                          {b.menus?.length > 0 ? b.menus.map((bm, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white border border-gray-200 rounded-xl text-xs font-medium shadow-sm">
                              🍽️ {bm.menu?.name || 'Dish Package'} ({bm.quantity} Portions) — Rs {Number(bm.totalPrice).toLocaleString()}
                            </span>
                          )) : <span className="text-xs text-gray-400">No specific menus attached</span>}
                        </div>
                      </div>

                      {/* Attached Services */}
                      {b.services?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Additional Services Booked:</span>
                          <div className="flex flex-wrap gap-2">
                            {b.services.map((serv, idx) => (
                              <span key={idx} className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 shadow-sm">
                                🎵 {serv.service?.name || serv.serviceName || 'Extra Service'} ({serv.quantity}x) — Rs {Number(serv.totalPrice).toLocaleString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl text-sm">
                    No hall or event bookings recorded for this customer yet.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setSelectedCustomerHistory(null)} className="px-6 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold shadow-md">Close Ledger</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}