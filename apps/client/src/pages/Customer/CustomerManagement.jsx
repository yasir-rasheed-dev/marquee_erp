// ═══════════════════════════════════════════════════════════
// pages/Customers/CustomerManagement.jsx (Cards Grid, Table View Toggle, Summary Stats, Advanced Filters, History Ledger & Pagination)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Users, ShieldAlert, 
  Check, AlertCircle, Eye, Phone, Mail, MapPin, Calendar, Building, Building2, 
  CreditCard, UserCircle, Filter, History, LayoutGrid, Table as TableIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import customerApi from '../../services/customerApi';
import { useBranch } from '../../context/BranchContext';
import ReactSelect from '../../components/ui/ReactSelect';

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

const DEFAULT_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  cnic: '',
  address: '',
  city: '',
  notes: '',
  customerType: 'individual',
  businessName: '',
  businessType: '',
  contactPersonName: '',
  contactPersonPhone: '',
  contactPersonDesignation: '',
  billingAddress: '',
  creditLimit: '',
  paymentTerms: 'immediate',
  emergencyContacts: [{ name: '', relation: '', phone: '', isPrimary: true }]
};

export default function CustomerManagement() {
  const { currentBranch } = useBranch();
  const { addToast, ToastContainer } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('ALL'); // ALL, WITH_BOOKINGS, NO_BOOKINGS

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal states for Create, Edit, View & History Ledger
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [saving, setSaving] = useState(false);

  // History Ledger State
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);

  const [form, setForm] = useState(DEFAULT_CUSTOMER);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await customerApi.getAll({ search, city: cityFilter, branchId });
      setCustomers(res?.data?.data || res?.data || res || []);
    } catch (e) {
      console.error('Failed to fetch customers:', e);
      if (e?.response?.status !== 429) {
        addToast('Failed to load customers', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, currentBranch?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Search/Filter badalne par Page 1 par reset ho jaye
  useEffect(() => {
    setCurrentPage(1);
  }, [search, cityFilter, bookingFilter]);

  const handleOpenModal = async (mode, customerId = null) => {
    setModalMode(mode);
    setSelectedCustomerId(customerId);

    if (mode === 'create') {
      setForm(DEFAULT_CUSTOMER);
      setIsModalOpen(true);
    } else if (customerId) {
      try {
        setIsModalOpen(true);
        const branchId = currentBranch?.id || 1;
        const res = await customerApi.getById(customerId, { branchId });
        const cust = res?.data?.data || res?.data;
        if (cust) {
          setForm({
            name: cust.name || '',
            phone: cust.phone || '',
            email: cust.email || '',
            cnic: cust.cnic || '',
            address: cust.address || '',
            city: cust.city || '',
            notes: cust.notes || '',
            customerType: cust.customerType || 'individual',
            businessName: cust.businessName || '',
            businessType: cust.businessType || '',
            contactPersonName: cust.contactPersonName || '',
            contactPersonPhone: cust.contactPersonPhone || '',
            contactPersonDesignation: cust.contactPersonDesignation || '',
            billingAddress: cust.billingAddress || '',
            creditLimit: cust.creditLimit?.toString() || '',
            paymentTerms: cust.paymentTerms || 'immediate',
            emergencyContacts: cust.emergencyContacts?.length > 0 ? cust.emergencyContacts : [{ name: '', relation: '', phone: '', isPrimary: true }]
          });
        }
      } catch (err) {
        addToast('Failed to load customer details', 'error');
        setIsModalOpen(false);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomerId(null);
  };

  const handleViewHistory = async (customerId) => {
    try {
      const branchId = currentBranch?.id || 1;
      const res = await customerApi.getById(customerId, { branchId });
      setSelectedCustomerHistory(res?.data?.data || res?.data);
    } catch (err) {
      addToast('Failed to load customer history ledger', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      addToast('Name and phone are required', 'error');
      return;
    }
    if (form.customerType !== 'individual' && !form.businessName.trim()) {
      addToast('Business name is required for organizations', 'error');
      return;
    }

    setSaving(true);
    try {
      const branchId = currentBranch?.id || 1;
      const payload = { ...form, branchId };

      if (modalMode === 'edit') {
        await customerApi.update(selectedCustomerId, payload);
        addToast('Customer updated successfully!');
      } else {
        await customerApi.create(payload);
        addToast('Customer created successfully!');
      }
      handleCloseModal();
      fetchCustomers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      const branchId = currentBranch?.id || 1;
      await customerApi.delete(id, { branchId });
      addToast('Customer deleted successfully!');
      fetchCustomers();
    } catch (e) {
      addToast('Cannot delete customer', 'error');
    }
  };

  // Filter Logic for Bookings Count
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const bCount = c._count?.bookings || 0;
      if (bookingFilter === 'WITH_BOOKINGS' && bCount === 0) return false;
      if (bookingFilter === 'NO_BOOKINGS' && bCount > 0) return false;
      return true;
    });
  }, [customers, bookingFilter]);

  // Pagination Computations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeWithBookings = customers.filter(c => (c._count?.bookings || 0) > 0).length;
    const totalBookingsCount = customers.reduce((acc, c) => acc + (c._count?.bookings || 0), 0);
    return { totalCustomers, activeWithBookings, totalBookingsCount };
  }, [customers]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val || 0);

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />

      {/* TOP HEADER */}
      <div className="border-b backdrop-blur-xl bg-white/90 sticky top-0 z-30 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Customer Management</h1>
              <p className="text-xs font-medium text-gray-500">
                Manage client profiles, catering preferences and complete event booking ledgers
                {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100/80 text-[#8B6914] font-bold">📍 {currentBranch.name}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* VIEW MODE TOGGLE BUTTONS */}
            <div className="bg-white p-1 rounded-xl border border-slate-300 flex items-center shadow-sm">
              <button 
                onClick={() => setViewMode('grid')} 
                title="Grid Card View"
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                title="Table View"
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <TableIcon size={18} />
              </button>
            </div>

            <button 
              onClick={() => handleOpenModal('create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:scale-[1.02]"
            >
              <Plus size={18} /> Add Customer
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-[#2563EB]"><Users size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Customers</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{stats.totalCustomers}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Calendar size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Clients with Bookings</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">{stats.activeWithBookings}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Building size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Events Booked</span>
              <span className="text-2xl font-bold font-mono text-blue-700">{stats.totalBookingsCount}</span>
            </div>
          </div>
        </div>

        {/* ADVANCED FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email or CNIC..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
            />
          </div>
          <div>
            <input 
              type="text" 
              value={cityFilter} 
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by City (e.g. Hasilpur)" 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
            />
          </div>
          <div>
            <ReactSelect
              value={bookingFilter}
              onChange={(val) => setBookingFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Clients (Default)' },
                { value: 'WITH_BOOKINGS', label: 'Clients With Bookings Only' },
                { value: 'NO_BOOKINGS', label: 'Clients Without Bookings' }
              ]}
              placeholder="Filter by Bookings"
              isSearchable={false}
              isClearable={false}
            />
          </div>
        </div>

        {/* CONTENT VIEW: GRID OR TABLE */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300 shadow-sm">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Customers Found</h3>
            <p className="text-sm text-gray-500">Get started by creating your first client record.</p>
            <button onClick={() => handleOpenModal('create')} className="mt-4 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm">
              <Plus size={14} className="inline mr-1" /> Add Customer
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── CARDS GRID VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCustomers.map(cust => (
              <div key={cust.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900 truncate">{cust.name}</h3>
                        {cust.customerType && cust.customerType !== 'individual' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            {cust.customerType}
                          </span>
                        )}
                      </div>
                      {cust.businessName && <p className="text-xs text-blue-700 font-semibold truncate">{cust.businessName}</p>}
                      {cust.cnic && <span className="text-[10px] font-mono text-gray-400 block">CNIC: {cust.cnic}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {cust.city && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-[#2563EB] border border-amber-200">
                          {cust.city}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px]">
                        {cust._count?.bookings || 0} Bookings
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                    <p className="flex items-center gap-2"><Phone size={13} className="text-gray-400" /> <span className="font-mono font-bold">{cust.phone}</span></p>
                    {cust.email && <p className="flex items-center gap-2"><Mail size={13} className="text-gray-400" /> {cust.email}</p>}
                    {cust.address && <p className="flex items-center gap-2"><MapPin size={13} className="text-gray-400" /> <span className="line-clamp-1">{cust.address}</span></p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleViewHistory(cust.id)} title="View Event History Ledger" className="p-2 rounded-xl hover:bg-amber-100 text-[#2563EB] transition-all"><History size={16} /></button>
                    <button onClick={() => handleOpenModal('edit', cust.id)} title="Edit Customer" className="p-2 rounded-xl hover:bg-amber-50 text-[#2563EB] transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(cust.id)} title="Delete Customer" className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"><Trash2 size={16} /></button>
                  </div>
                  <button onClick={() => handleOpenModal('view', cust.id)} className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Type / City</th>
                    <th className="py-3.5 px-4 text-center">Bookings</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-amber-50/30 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{cust.name}</div>
                        {cust.businessName && <div className="text-xs text-blue-700 font-semibold">{cust.businessName}</div>}
                        {cust.cnic && <div className="text-[10px] font-mono text-gray-400">CNIC: {cust.cnic}</div>}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 font-mono font-bold"><Phone size={12} className="text-gray-400" /> {cust.phone}</div>
                        {cust.email && <div className="flex items-center gap-1.5"><Mail size={12} className="text-gray-400" /> {cust.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block w-fit ${cust.customerType === 'individual' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {cust.customerType || 'individual'}
                        </span>
                        {cust.city && <span className="text-xs text-gray-500 block">📍 {cust.city}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-xs">
                          {cust._count?.bookings || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleViewHistory(cust.id)} title="View Event History Ledger" className="p-1.5 rounded-lg hover:bg-amber-100 text-[#2563EB] transition-all"><History size={15} /></button>
                          <button onClick={() => handleOpenModal('edit', cust.id)} title="Edit Customer" className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB] transition-all"><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(cust.id)} title="Delete Customer" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all"><Trash2 size={15} /></button>
                          <button onClick={() => handleOpenModal('view', cust.id)} className="ml-2 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            View
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

        {/* ── PAGINATION BAR ── */}
        {!loading && filteredCustomers.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of{' '}
              <span className="font-bold text-gray-800">{filteredCustomers.length}</span> customers
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-sm'
                            : 'border border-slate-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* CUSTOMER CREATE / EDIT / VIEW MODAL */}
      {isModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-[#2563EB]">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">
                    {modalMode === 'create' && 'Add New Customer'}
                    {modalMode === 'edit' && 'Edit Customer Details'}
                    {modalMode === 'view' && 'Customer Profile Details'}
                  </h2>
                  <p className="text-xs text-[#2563EB] mt-0.5 font-medium">📍 Branch: <strong>{currentBranch?.name}</strong></p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600"><X size={20} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              <form onSubmit={handleSubmit} id="customerForm" className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Full Name *</label>
                    <input required disabled={modalMode === 'view'} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Muhammad Ali" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Phone Number *</label>
                    <input required disabled={modalMode === 'view'} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="03001234567" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Email Address</label>
                    <input type="email" disabled={modalMode === 'view'} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="ali@gmail.com" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">CNIC</label>
                    <input disabled={modalMode === 'view'} value={form.cnic} onChange={e => setForm({...form, cnic: e.target.value})} placeholder="31102-1234567-1" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">City</label>
                    <input disabled={modalMode === 'view'} value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Hasilpur" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Complete Address</label>
                    <input disabled={modalMode === 'view'} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street 3, Main Bazaar" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">General Notes / Catering Preferences</label>
                  <textarea disabled={modalMode === 'view'} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="VIP client notes..." rows={3} className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50 resize-none" />
                </div>

                {/* ── Customer Type Toggle ── */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <label className="text-xs font-bold text-gray-700 block">Customer Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'individual', label: 'Individual', icon: Users },
                      { key: 'organization', label: 'Organization', icon: Building2 },
                    ].map(type => (
                      <label key={type.key} className={`cursor-pointer border-2 rounded-xl p-2.5 text-center transition-all ${form.customerType === type.key ? 'border-[#2563EB] bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <input type="radio" name="customerType" className="hidden" checked={form.customerType === type.key} onChange={() => setForm({...form, customerType: type.key})} disabled={modalMode === 'view'} />
                        <type.icon size={16} className="mx-auto mb-1" style={{ color: form.customerType === type.key ? '#2563EB' : '#9CA3AF' }} />
                        <span className="text-[11px] font-bold block">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── B2B Fields (show when not individual) ── */}
                {form.customerType !== 'individual' && (
                  <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={16} className="text-blue-700" />
                      <span className="text-xs font-bold text-blue-900 uppercase">Organization Details</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Business / Organization Name *</label>
                        <input required={form.customerType !== 'individual'} disabled={modalMode === 'view'} value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} placeholder="e.g. FAST University, HBL Bank" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Business Type</label>
                        <ReactSelect
                          value={form.businessType || ''}
                          onChange={(val) => setForm({...form, businessType: val || ''})}
                          options={[
                            { value: '', label: '-- Select --' },
                            { value: 'it_company', label: 'IT Company' },
                            { value: 'bank', label: 'Bank / Financial' },
                            { value: 'university', label: 'University / College' },
                            { value: 'ngo', label: 'NGO / Trust' },
                            { value: 'hospital', label: 'Hospital / Clinic' },
                            { value: 'govt_dept', label: 'Govt Department' },
                            { value: 'other', label: 'Other' }
                          ]}
                          placeholder="Select Business Type"
                          isSearchable={true}
                          isClearable={false}
                          isDisabled={modalMode === 'view'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Billing Address</label>
                        <input disabled={modalMode === 'view'} value={form.billingAddress} onChange={e => setForm({...form, billingAddress: e.target.value})} placeholder="If different from main address" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                      </div>
                    </div>

                    <div className="border-t border-blue-200 pt-3">
                      <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5 mb-3"><UserCircle size={14} /> Primary Contact Person</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Contact Name</label>
                          <input disabled={modalMode === 'view'} value={form.contactPersonName} onChange={e => setForm({...form, contactPersonName: e.target.value})} placeholder="e.g. Ali Raza" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Contact Phone</label>
                          <input disabled={modalMode === 'view'} value={form.contactPersonPhone} onChange={e => setForm({...form, contactPersonPhone: e.target.value})} placeholder="03001234567" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Designation</label>
                          <input disabled={modalMode === 'view'} value={form.contactPersonDesignation} onChange={e => setForm({...form, contactPersonDesignation: e.target.value})} placeholder="e.g. Admin Manager" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-blue-200 pt-3">
                      <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5 mb-3"><CreditCard size={14} /> Financial Terms</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Credit Limit (Rs)</label>
                          <input type="number" disabled={modalMode === 'view'} value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})} placeholder="e.g. 500000" className="w-full p-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Payment Terms</label>
                          <ReactSelect
                            value={form.paymentTerms || 'immediate'}
                            onChange={(val) => setForm({...form, paymentTerms: val || 'immediate'})}
                            options={[
                              { value: 'immediate', label: 'Immediate' },
                              { value: 'net15', label: 'Net 15 Days' },
                              { value: 'net30', label: 'Net 30 Days' },
                              { value: 'net60', label: 'Net 60 Days' }
                            ]}
                            placeholder="Select Payment Terms"
                            isSearchable={false}
                            isClearable={false}
                            isDisabled={modalMode === 'view'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contacts */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-amber-900 uppercase flex items-center gap-1.5"><ShieldAlert size={15} /> Emergency Contacts</span>
                    {modalMode !== 'view' && (
                      <button type="button" onClick={() => setForm({...form, emergencyContacts: [...form.emergencyContacts, { name: '', relation: '', phone: '', isPrimary: false }]})} className="px-3 py-1.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm">+ Add Contact</button>
                    )}
                  </div>

                  {form.emergencyContacts.map((ec, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                      <div className="md:col-span-4"><input disabled={modalMode === 'view'} value={ec.name} onChange={e => { const list = [...form.emergencyContacts]; list[idx].name = e.target.value; setForm({...form, emergencyContacts: list}); }} placeholder="Contact Name" className="w-full p-2.5 border rounded-xl text-sm disabled:bg-gray-50" /></div>
                      <div className="md:col-span-3"><input disabled={modalMode === 'view'} value={ec.relation} onChange={e => { const list = [...form.emergencyContacts]; list[idx].relation = e.target.value; setForm({...form, emergencyContacts: list}); }} placeholder="Relation (e.g. Brother)" className="w-full p-2.5 border rounded-xl text-sm disabled:bg-gray-50" /></div>
                      <div className="md:col-span-4"><input disabled={modalMode === 'view'} value={ec.phone} onChange={e => { const list = [...form.emergencyContacts]; list[idx].phone = e.target.value; setForm({...form, emergencyContacts: list}); }} placeholder="Phone" className="w-full p-2.5 border rounded-xl text-sm font-mono disabled:bg-gray-50" /></div>
                      {modalMode !== 'view' && (
                        <div className="md:col-span-1 text-center"><button type="button" onClick={() => setForm({...form, emergencyContacts: form.emergencyContacts.filter((_, i) => i !== idx)}) } className="text-red-600 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button></div>
                      )}
                    </div>
                  ))}
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300 sticky bottom-0 z-20">
              <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-50">Close</button>
              {modalMode !== 'view' && (
                <button type="submit" form="customerForm" disabled={saving} className="px-7 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95">
                  {saving ? 'Saving...' : (modalMode === 'edit' ? 'Update Customer' : 'Save Customer')}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* CUSTOMER HISTORY & COMPLETE EVENT LEDGER MODAL */}
      {selectedCustomerHistory && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-gray-800">{selectedCustomerHistory.name} — Complete Event History Ledger</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Phone: {selectedCustomerHistory.phone} | CNIC: {selectedCustomerHistory.cnic || 'N/A'} | City: {selectedCustomerHistory.city || 'N/A'}</p>
              </div>
              <button onClick={() => setSelectedCustomerHistory(null)} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
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
                            👥👥 <strong>Guest Count:</strong> {b.guestCount} Guests | 🏛️ <strong>Hall:</strong> {b.hall?.name || 'N/A'} | Status: <strong className="uppercase text-emerald-700">{b.status}</strong> 
                          </span>
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
            </div>

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300 sticky bottom-0 z-20">
              <button onClick={() => setSelectedCustomerHistory(null)} className="px-6 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-gray-700">Close Ledger</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}