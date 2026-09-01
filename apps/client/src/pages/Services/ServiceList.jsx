// ═══════════════════════════════════════════════════════════
// pages/Services/ServiceList.jsx (Cards Grid, Table View Toggle, Summary Stats, Search & Filters, Pagination)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, History, X, Search, Filter, 
  Layers, DollarSign, BookmarkCheck, LayoutGrid, Table as TableIcon,
  Clock, Tag, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import serviceApi, { PRICING_TYPES, formatServicePrice } from '../../services/serviceApi';
import { useBranch } from '../../context/BranchContext';
import ReactSelect from '../../components/ui/ReactSelect';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ServiceList = () => {
  const { currentBranch } = useBranch();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPricingType, setSelectedPricingType] = useState('ALL'); // NAYA FILTER: Hourly / Fixed

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // History / Usage State
  const [selectedServiceHistory, setSelectedServiceHistory] = useState(null);
  const [serviceBookings, setServiceBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    category: 'General', 
    costPrice: '', 
    salePrice: '', 
    description: '',
    pricingType: PRICING_TYPES.FIXED,
    minimumHours: ''
  });

  useEffect(() => {
    fetchServices();
  }, [currentBranch]);

  // Search ya Filters change hone par page 1 par reset karein
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedPricingType]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await serviceApi.getAll({ branchId });
      const list = Array.isArray(res) ? res : (res.data || res.data?.data || []);
      setServices(list);
    } catch (err) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ 
      name: '', 
      code: '', 
      category: 'General', 
      costPrice: '', 
      salePrice: '', 
      description: '',
      pricingType: PRICING_TYPES.FIXED,
      minimumHours: ''
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (service) => {
    setIsEditing(true);
    setCurrentId(service.id);
    setFormData({
      name: service.name || '',
      code: service.code || '',
      category: service.category || 'General',
      costPrice: service.costPrice || '',
      salePrice: service.salePrice || '',
      description: service.description || '',
      pricingType: service.pricingType || PRICING_TYPES.FIXED,
      minimumHours: service.minimumHours || ''
    });
    setShowModal(true);
  };

  // Open History / Usage Modal
  const handleOpenHistory = async (service) => {
    setSelectedServiceHistory(service);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await serviceApi.getById(service.id);
      const serviceData = res.data?.data || res.data || res;
      setServiceBookings(serviceData.bookings || service.bookings || []);
    } catch (err) {
      console.error('Failed to load usage history:', err);
      toast.error('Failed to load service usage history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const branchId = currentBranch?.id || 1;
      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        branchId
      };

      if (payload.pricingType === PRICING_TYPES.FIXED) {
        payload.minimumHours = null;
      } else {
        payload.minimumHours = Number(payload.minimumHours) || 1;
      }

      if (isEditing) {
        await serviceApi.update(currentId, payload);
        toast.success('Service updated successfully!');
      } else {
        await serviceApi.create(payload);
        toast.success('Service created successfully!');
      }

      setShowModal(false);
      fetchServices();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save service');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await serviceApi.delete(id);
      toast.success('Service deleted successfully!');
      fetchServices();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete service');
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = services.map(s => s.category || 'General');
    return ['ALL', ...new Set(cats)];
  }, [services]);

  // Filter & Search services (Category + Pricing Type filter added)
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'ALL' || (s.category || 'General') === selectedCategory;
      const matchesPricingType = selectedPricingType === 'ALL' || s.pricingType === selectedPricingType;
      
      return matchesSearch && matchesCategory && matchesPricingType;
    });
  }, [services, searchTerm, selectedCategory, selectedPricingType]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    const totalServices = services.length;
    const totalBookings = services.reduce((acc, s) => acc + (s._count?.bookings || 0), 0);
    const avgPrice = totalServices > 0 ? services.reduce((acc, s) => acc + Number(s.salePrice || 0), 0) / totalServices : 0;
    const hourlyCount = services.filter(s => s.pricingType === PRICING_TYPES.HOURLY).length;
    return { totalServices, totalBookings, avgPrice, hourlyCount };
  }, [services]);

  // ── Price Badge Component ──
  const PriceBadge = ({ service }) => {
    const isHourly = service.pricingType === PRICING_TYPES.HOURLY;
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${isHourly ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
        {isHourly ? <Clock size={12} /> : <Tag size={12} />}
        <span>{formatServicePrice(service)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 relative pb-12" style={{ backgroundColor: '#F5F2EB' }}>
      
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Branch Services Management</h1>
          <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
            Manage DJ, Photography, Decoration & view event usage history
            {currentBranch && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#F4E7C9] text-[#8B6914] font-bold">
                📍 {currentBranch.name}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-[#E0D8CC] flex items-center shadow-sm">
            <button 
              onClick={() => setViewMode('grid')} 
              title="Grid Card View"
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#A97A1F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')} 
              title="Table View"
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#A97A1F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <TableIcon size={18} />
            </button>
          </div>

          <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white flex items-center gap-2 shadow-md">
            <Plus className="w-4 h-4" /> Add New Service
          </Button>
        </div>
      </div>

      {/* SUMMARY CARDS / TOTAL STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E0D8CC] shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-[#A97A1F]">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Services</p>
            <p className="text-xl font-bold font-mono text-gray-800">{stats.totalServices}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-[#E0D8CC] shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 text-green-700">
            <BookmarkCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Bookings</p>
            <p className="text-xl font-bold font-mono text-green-800">{stats.totalBookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E0D8CC] shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Hourly Services</p>
            <p className="text-xl font-bold font-mono text-blue-800">{stats.hourlyCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E0D8CC] shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg. Sale Price</p>
            <p className="text-xl font-bold font-mono text-purple-800">Rs {Math.round(stats.avgPrice).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8CC] p-4 flex flex-col sm:flex-row items-center gap-3">
        {/* SEARCH INPUT */}
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services by name or code..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A97A1F] text-sm"
          />
        </div>

        {/* CATEGORY FILTER */}
        <div className="flex items-center gap-2 w-full sm:w-48">
          <Filter size={16} className="text-gray-400 hidden sm:block shrink-0" />
          <ReactSelect
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val || 'ALL')}
            options={categories.map(cat => ({ 
              value: cat, 
              label: cat === 'ALL' ? 'All Categories' : cat 
            }))}
            placeholder="Category"
            isSearchable={true}
            isClearable={false}
          />
        </div>

        {/* PRICING TYPE FILTER (Hourly / Fixed) */}
        <div className="w-full sm:w-44">
          <ReactSelect
            value={selectedPricingType}
            onChange={(val) => setSelectedPricingType(val || 'ALL')}
            options={[
              { value: 'ALL', label: 'All Pricing Types' },
              { value: PRICING_TYPES.FIXED, label: '🏷️ Fixed Rate' },
              { value: PRICING_TYPES.HOURLY, label: '⏱️ Per Hour' },
            ]}
            placeholder="Pricing Type"
            isSearchable={false}
            isClearable={false}
          />
        </div>
      </div>

      {/* CONTENT VIEW: GRID OR TABLE */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#A97A1F] animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          <p className="mt-4 text-sm font-bold text-gray-600">Loading services...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E0D8CC] shadow-sm">
          <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-800 mb-1">No Services Found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or filter options.</p>
          <Button onClick={handleOpenCreate} className="mt-4 bg-[#A97A1F] text-white">
            <Plus className="w-4 h-4 inline mr-1" /> Add New Service
          </Button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* ── GRID CARD VIEW ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedServices.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-[#E0D8CC] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {s.code && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-[#A97A1F] border border-amber-200">
                            {s.code}
                          </span>
                        )}
                        <h3 className="font-bold text-base text-gray-900 mt-1 truncate">{s.name}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-[#A97A1F] font-bold rounded-full text-xs whitespace-nowrap">
                        {s._count?.bookings || 0} Bookings
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-gray-500">Category: <span className="text-gray-700">{s.category || 'General'}</span></span>
                    </div>
                    
                    {s.description && <p className="text-xs text-gray-500 line-clamp-2 mb-4">{s.description}</p>}

                    {/* PRICE DISPLAY */}
                    <div className="mb-4">
                      <PriceBadge service={s} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#FAF8F4] p-3 rounded-xl border border-[#E0D8CC] mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Cost Price</span>
                        <span className="text-xs font-mono font-bold text-gray-700">{Number(s.costPrice || 0).toLocaleString()} PKR</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Sale Price</span>
                        <span className="text-xs font-mono font-bold text-[#A97A1F]">{Number(s.salePrice || 0).toLocaleString()} PKR</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0ECE6] flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenHistory(s)} title="View Usage History" className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenEdit(s)} title="Edit Service" className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} title="Delete Service" className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenHistory(s)} className="border-[#E0D8CC] text-xs">
                      View History
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── TABLE VIEW ── */
            <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#E0D8CC] text-xs font-bold text-gray-600 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Service Details</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Pricing</th>
                      <th className="py-3.5 px-4 text-right">Cost Price</th>
                      <th className="py-3.5 px-4 text-right">Sale Price</th>
                      <th className="py-3.5 px-4 text-center">Bookings</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {paginatedServices.map(s => (
                      <tr key={s.id} className="hover:bg-amber-50/30 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{s.name}</div>
                          {s.code && <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A97A1F]">{s.code}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-gray-600">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">{s.category || 'General'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <PriceBadge service={s} />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-gray-600">
                          {Number(s.costPrice || 0).toLocaleString()} PKR
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-[#A97A1F]">
                          {Number(s.salePrice || 0).toLocaleString()} PKR
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 bg-amber-50 text-[#A97A1F] font-bold rounded-full text-xs">
                            {s._count?.bookings || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleOpenHistory(s)} title="View Usage History" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-all">
                              <History size={15} />
                            </button>
                            <button onClick={() => handleOpenEdit(s)} title="Edit Service" className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-all">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} title="Delete Service" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all">
                              <Trash2 size={15} />
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

          {/* ── PAGINATION CONTROLS ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#E0D8CC] shadow-sm">
              <span className="text-xs text-gray-500 font-medium">
                Showing <strong className="text-gray-800">{((currentPage - 1) * itemsPerPage) + 1}</strong> to{' '}
                <strong className="text-gray-800">{Math.min(currentPage * itemsPerPage, filteredServices.length)}</strong> of{' '}
                <strong className="text-gray-800">{filteredServices.length}</strong> services
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-xs font-semibold px-2 text-gray-700">
                  {currentPage} / {totalPages}
                </span>

                <button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT MODAL & HISTORY MODAL SAME AS BEFORE */}
      {showModal && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl border border-[#E0D8CC] my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3 bg-[#FAF8F4] -mx-5 -mt-5 p-4 rounded-t-2xl sm:rounded-t-3xl border-[#E0D8CC]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800">{isEditing ? 'Edit Service' : 'Add New Service'}</h2>
                <p className="text-xs text-[#A97A1F] font-medium mt-0.5">📍 Branch: <strong>{currentBranch?.name}</strong></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-200"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold block mb-1 text-gray-700">Service Name *</label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1 text-gray-700">Category</label>
                <Input 
                  value={formData.category} 
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-2 text-gray-700">Pricing Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingType: PRICING_TYPES.FIXED, minimumHours: '' })}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      formData.pricingType === PRICING_TYPES.FIXED
                        ? 'bg-green-50 border-green-300 text-green-700 ring-2 ring-green-200'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Tag size={14} /> Fixed Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingType: PRICING_TYPES.HOURLY, minimumHours: formData.minimumHours || 1 })}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      formData.pricingType === PRICING_TYPES.HOURLY
                        ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-200'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Clock size={14} /> Per Hour
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold block mb-1 text-gray-700">Cost Price (PKR)</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={formData.costPrice} 
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-gray-700">
                    {formData.pricingType === PRICING_TYPES.HOURLY ? 'Rate per Hour (PKR) *' : 'Sale Price (PKR) *'}
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={formData.salePrice} 
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              {formData.pricingType === PRICING_TYPES.HOURLY && (
                <div>
                  <label className="text-xs font-bold block mb-1 text-gray-700">Minimum Hours *</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      min="1"
                      max="24"
                      value={formData.minimumHours} 
                      onChange={(e) => setFormData({ ...formData, minimumHours: e.target.value })} 
                      required={formData.pricingType === PRICING_TYPES.HOURLY}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">hours minimum</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Customer will be charged for at least this many hours.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold block mb-1 text-gray-700">Description / Notes</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]"
                  rows="2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-sm">
                  {isEditing ? 'Update Service' : 'Save Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-[#E0D8CC] my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3 bg-[#FAF8F4] -mx-5 -mt-5 p-4 rounded-t-2xl sm:rounded-t-3xl border-[#E0D8CC]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800">Service Usage History</h2>
                <p className="text-xs text-gray-500">Bookings utilizing: <span className="font-bold text-[#A97A1F]">{selectedServiceHistory?.name}</span></p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-[#999] hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loadingHistory ? (
                <p className="text-center py-6 text-gray-500">Loading usage history...</p>
              ) : serviceBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No bookings found for this service yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b text-gray-700 text-xs uppercase">
                    <tr>
                      <th className="p-3">Booking # / Title</th>
                      <th className="p-3">Guest Name</th>
                      <th className="p-3">Event Date</th>
                      <th className="p-3 text-right">Qty / Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {serviceBookings.map((sb, idx) => {
                      const bInfo = sb.booking || sb;
                      return (
                        <tr key={sb.id || idx} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-800">
                            {bInfo.bookingNo || `BK-${bInfo.id}`}
                            <span className="block text-xs font-normal text-gray-500">{bInfo.title}</span>
                          </td>
                          <td className="p-3 text-gray-700">{bInfo.guestName}</td>
                          <td className="p-3 text-gray-600">{bInfo.eventDate ? new Date(bInfo.eventDate).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-3 text-right font-mono">
                            <span className="font-bold">{sb.quantity || 1}x</span> — Rs {(Number(sb.totalPrice) || 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button variant="outline" onClick={() => setShowHistoryModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceList;