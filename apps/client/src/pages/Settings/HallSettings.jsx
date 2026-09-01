import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Search, X, Building, Clock, Users, 
  DollarSign, Check, LayoutGrid, Table as TableIcon 
} from 'lucide-react';
import hallApi from '../../services/hallApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';

const PRICING_OPTIONS = [
  { key: 'per_seat', label: 'Per Seat Only', desc: 'Charge per guest (price × guests)' },
  { key: 'fixed', label: 'Full Hall Fixed', desc: 'Fixed charge regardless of guests' },
  { key: 'both', label: 'Both Modes', desc: 'Let user choose at booking time' }
];

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK')}`;

export default function HallSettings() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    capacity: '',
    price: '', // Fixed Price or Base Price
    perSeatPrice: '', // Per Seat Rate
    pricingType: 'per_seat',
    isActive: true,
    sessions: [{ name: 'Morning', startTime: '09:00', endTime: '14:00', duration: 300 }]
  });

  // Auto-sync data on branch change
  const { 
    data: halls, 
    loading, 
    refetch 
  } = useGlobalData(
    async (branchId) => {
      const res = await hallApi.getAll({ search, branchId: branchId || currentBranch?.id });
      return res?.data || res || [];
    },
    {
      dependencies: [search],
      onError: () => toast.error('Failed to load halls')
    }
  );

  // Auto-calculate duration when start/end time changes
  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const handleAddSession = () => {
    setForm(prev => ({
      ...prev,
      sessions: [...prev.sessions, { name: '', startTime: '', endTime: '', duration: 120 }]
    }));
  };

  const handleRemoveSession = (index) => {
    if (form.sessions.length <= 1) {
      toast.error('At least one session required');
      return;
    }
    setForm(prev => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== index)
    }));
  };

  const handleSessionChange = (index, field, value) => {
    const updatedSessions = [...form.sessions];
    updatedSessions[index][field] = value;
    
    if (field === 'startTime' || field === 'endTime') {
      const start = field === 'startTime' ? value : updatedSessions[index].startTime;
      const end = field === 'endTime' ? value : updatedSessions[index].endTime;
      updatedSessions[index].duration = calculateDuration(start, end);
    }
    
    setForm(prev => ({ ...prev, sessions: updatedSessions }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      code: '',
      description: '',
      capacity: '',
      price: '',
      perSeatPrice: '',
      pricingType: 'per_seat',
      isActive: true,
      sessions: [{ name: 'Morning', startTime: '09:00', endTime: '14:00', duration: 300 }]
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Hall name is required');
      return;
    }
    if (!form.capacity || Number(form.capacity) <= 0) {
      toast.error('Valid capacity is required');
      return;
    }

    if (form.pricingType === 'fixed' && (!form.price || Number(form.price) < 0)) {
      toast.error('Valid fixed price is required');
      return;
    }
    if ((form.pricingType === 'per_seat' || form.pricingType === 'both') && (!form.perSeatPrice || Number(form.perSeatPrice) <= 0)) {
      toast.error('Valid per-seat price is required');
      return;
    }

    for (const s of form.sessions) {
      if (!s.name || !s.startTime || !s.endTime) {
        toast.error('All session fields are required');
        return;
      }
      if (s.startTime >= s.endTime) {
        toast.error(`Session "${s.name}": End time must be after start time`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code?.trim() || null,
        description: form.description?.trim() || null,
        capacity: parseInt(form.capacity) || 0,
        price: form.pricingType === 'per_seat' 
          ? parseFloat(form.perSeatPrice) || 0 
          : parseFloat(form.price || 0),
        perSeatPrice: form.pricingType !== 'fixed' ? parseFloat(form.perSeatPrice) || null : null,
        pricingType: form.pricingType,
        isActive: form.isActive,
        branchId: currentBranch?.id,
        sessions: form.sessions.map(s => ({
          name: s.name.trim(),
          startTime: s.startTime,
          endTime: s.endTime,
          duration: parseInt(s.duration) || calculateDuration(s.startTime, s.endTime),
          isActive: true
        }))
      };

      if (editingId) {
        await hallApi.update(editingId, payload);
        toast.success('Hall updated successfully!');
      } else {
        await hallApi.create(payload);
        toast.success('Hall created successfully!');
      }

      setShowForm(false);
      resetForm();
      refetch();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Error saving hall');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (hall) => {
    setForm({
      name: hall.name || '',
      code: hall.code || '',
      description: hall.description || '',
      capacity: hall.capacity?.toString() || '',
      price: hall.pricingType === 'fixed' || hall.pricingType === 'both' ? hall.price?.toString() || '' : '',
      perSeatPrice: hall.perSeatPrice?.toString() || (hall.pricingType === 'per_seat' ? hall.price?.toString() || '' : ''),
      pricingType: hall.pricingType || 'per_seat',
      isActive: hall.isActive ?? true,
      sessions: hall.sessions?.length > 0 
        ? hall.sessions.map(s => ({
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            duration: s.duration
          }))
        : [{ name: 'Morning', startTime: '09:00', endTime: '14:00', duration: 300 }]
    });
    setEditingId(hall.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will also delete all sessions.')) return;
    try {
      await hallApi.delete(id);
      toast.success('Hall deleted!');
      refetch();
    } catch (e) {
      toast.error('Cannot delete — bookings may exist');
    }
  };

  const hallList = Array.isArray(halls) ? halls : [];
  
  const filteredHalls = useMemo(() => {
    if (!search.trim()) return hallList;
    const q = search.toLowerCase();
    return hallList.filter(h => 
      h.name?.toLowerCase().includes(q) || 
      h.code?.toLowerCase().includes(q)
    );
  }, [hallList, search]);

  const getPricingBadge = (type) => {
    const styles = {
      per_seat: 'bg-blue-50 text-blue-700 border-blue-200',
      fixed: 'bg-purple-50 text-purple-700 border-purple-200',
      both: 'bg-amber-50 text-amber-700 border-amber-200'
    };
    const labels = { per_seat: 'Per Seat', fixed: 'Fixed', both: 'Both' };
    return { className: styles[type] || styles.per_seat, label: labels[type] || type };
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Hall & Venue Management</h1>
              <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4A4A' }}>
                Configure halls, pricing modes & sessions
                {currentBranch && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#F4E7C9] text-[#8B6914] font-bold">
                    {currentBranch.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-[#E0D8CC] rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#A97A1F] text-white' : 'text-gray-500 hover:text-gray-800'}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[#A97A1F] text-white' : 'text-gray-500 hover:text-gray-800'}`}
                title="Table View"
              >
                <TableIcon size={18} />
              </button>
            </div>

            <button 
              onClick={() => { 
                resetForm();
                setShowForm(true); 
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:scale-[1.02]"
            >
              <Plus size={18} /> Add Hall
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8CC] p-4 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A7A7A' }} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search halls by name or code..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20 text-sm"
              style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC', color: '#1A1A1A' }} 
            />
          </div>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl border border-[#E0D8CC] w-full max-w-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
                    {editingId ? 'Edit Hall' : 'New Hall'}
                  </h3>
                  <p className="text-xs mt-1 font-medium" style={{ color: '#A97A1F' }}>
                    📍 Branch: <strong>{currentBranch?.name}</strong>
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-[#F5F2EB] transition-colors">
                  <X className="w-5 h-5" style={{ color: '#4A4A4A' }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                      Hall Name *
                    </label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g., Royal Ballroom" 
                      className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                      style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                      Code
                    </label>
                    <input 
                      value={form.code} 
                      onChange={(e) => setForm({ ...form, code: e.target.value })} 
                      placeholder="e.g., HALL-01" 
                      className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                      style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                      Capacity *
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      value={form.capacity} 
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })} 
                      placeholder="500" 
                      className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                      style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                    />
                  </div>
                </div>

                {/* Pricing Type */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#4A4A4A' }}>
                    Pricing Mode *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PRICING_OPTIONS.map(opt => (
                      <label 
                        key={opt.key}
                        className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all ${
                          form.pricingType === opt.key 
                            ? 'border-[#A97A1F] bg-amber-50/60' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="radio" 
                            name="pricingType"
                            checked={form.pricingType === opt.key}
                            onChange={() => setForm({ ...form, pricingType: opt.key })}
                            className="accent-[#A97A1F] w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800">{opt.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Conditional Pricing Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF8F4] p-4 rounded-xl border border-[#E0D8CC]">
                  {(form.pricingType === 'per_seat' || form.pricingType === 'both') && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">
                        Price Per Seat (Rs) *
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        required
                        value={form.perSeatPrice} 
                        onChange={(e) => setForm({ ...form, perSeatPrice: e.target.value })} 
                        placeholder="e.g., 150" 
                        className="w-full px-4 py-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                        style={{ borderColor: '#E0D8CC' }} 
                      />
                      {form.capacity && form.perSeatPrice && (
                        <p className="text-[11px] text-[#A97A1F] font-semibold mt-1">
                          Estimated Total ({form.capacity} seats × Rs {form.perSeatPrice}): {formatCurrency(Number(form.capacity) * Number(form.perSeatPrice))}
                        </p>
                      )}
                    </div>
                  )}

                  {(form.pricingType === 'fixed' || form.pricingType === 'both') && (
                    <div className={form.pricingType === 'both' ? '' : 'sm:col-span-2'}>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">
                        {form.pricingType === 'both' ? 'Alternative Fixed Hall Price (Rs)' : 'Fixed Hall Price (Rs) *'}
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        required={form.pricingType === 'fixed'}
                        value={form.price} 
                        onChange={(e) => setForm({ ...form, price: e.target.value })} 
                        placeholder="e.g., 50000" 
                        className="w-full px-4 py-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                        style={{ borderColor: '#E0D8CC' }} 
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                    Description
                  </label>
                  <textarea 
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    rows={2} 
                    placeholder="Optional details about the hall..." 
                    className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                  />
                </div>

                {/* Sessions Builder */}
                <div className="border-t pt-5" style={{ borderColor: '#F0ECE6' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} style={{ color: '#A97A1F' }} />
                      <h4 className="font-bold text-sm" style={{ color: '#1A1A1A' }}>Hall Sessions / Time Slots</h4>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAddSession} 
                      className="px-3 py-1.5 bg-[#F4E7C9] text-[#8B6914] rounded-lg text-xs font-bold hover:bg-[#EEDBB5] transition-colors"
                    >
                      + Add Session
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    {form.sessions.map((session, index) => (
                      <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-[#FAF8F4] p-3 rounded-xl border border-[#E0D8CC]">
                        <input 
                          placeholder="Session Name" 
                          value={session.name} 
                          onChange={(e) => handleSessionChange(index, 'name', e.target.value)} 
                          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                          style={{ borderColor: '#E0D8CC' }} 
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">From</span>
                          <input 
                            type="time" 
                            value={session.startTime} 
                            onChange={(e) => handleSessionChange(index, 'startTime', e.target.value)} 
                            className="px-2.5 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                            style={{ borderColor: '#E0D8CC' }} 
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">To</span>
                          <input 
                            type="time" 
                            value={session.endTime} 
                            onChange={(e) => handleSessionChange(index, 'endTime', e.target.value)} 
                            className="px-2.5 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                            style={{ borderColor: '#E0D8CC' }} 
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Dur</span>
                          <input 
                            type="number" 
                            min="15"
                            value={session.duration} 
                            onChange={(e) => handleSessionChange(index, 'duration', e.target.value)} 
                            className="w-16 px-2.5 py-2 rounded-lg border text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                            style={{ borderColor: '#E0D8CC' }} 
                          />
                          <span className="text-[10px] text-gray-500">m</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSession(index)} 
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove session"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#F0ECE6' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#E0D8CC' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <span className="animate-pulse">Saving...</span>
                    ) : editingId ? (
                      <><Check size={16} /> Update Hall</>
                    ) : (
                      <><Plus size={16} /> Create Hall</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Halls Content View */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 animate-spin" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHalls.map(hall => {
              const badge = getPricingBadge(hall.pricingType);
              return (
                <div key={hall.id} className="bg-white rounded-2xl border border-[#E0D8CC] p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base truncate" style={{ color: '#1A1A1A' }}>{hall.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {hall.code && <span className="text-xs font-mono text-gray-400">{hall.code}</span>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={() => handleEdit(hall)} 
                          className="p-1.5 rounded-lg hover:bg-[#F4E7C9] text-gray-500 hover:text-[#A97A1F] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(hall.id)} 
                          className="p-1.5 rounded-lg hover:bg-[#FFEBEE] text-gray-500 hover:text-[#B71C1C] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600 mb-3">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                        <Users size={13} /> {hall.capacity} Capacity
                      </span>
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700">
                        <DollarSign size={13} /> {formatCurrency(hall.price)}
                      </span>
                      {hall.perSeatPrice && (
                        <span className="text-[10px] text-gray-400">({formatCurrency(hall.perSeatPrice)}/seat)</span>
                      )}
                    </div>

                    {hall.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{hall.description}</p>
                    )}

                    {/* Sessions */}
                    <div className="bg-[#FAF8F4] rounded-xl p-3 border border-[#E0D8CC]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                        <Clock size={11} /> Sessions ({hall.sessions?.length || 0})
                      </p>
                      <div className="space-y-1.5">
                        {hall.sessions?.map(s => (
                          <div key={s.id} className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-800">{s.name}</span>
                            <span className="font-mono text-gray-500 bg-white px-2 py-0.5 rounded-md border border-[#E0D8CC]">
                              {s.startTime} - {s.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F4] border-b border-[#E0D8CC] text-xs uppercase tracking-wider font-bold text-gray-600">
                    <th className="p-4">Hall Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Pricing Mode</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Price / Rate</th>
                    <th className="p-4">Sessions</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0D8CC] text-sm">
                  {filteredHalls.map(hall => {
                    const badge = getPricingBadge(hall.pricingType);
                    return (
                      <tr key={hall.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">
                          {hall.name}
                          {hall.description && <p className="text-xs font-normal text-gray-400 truncate max-w-xs">{hall.description}</p>}
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-500">{hall.code || '—'}</td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-gray-700">{hall.capacity}</td>
                        <td className="p-4 font-semibold text-green-700">
                          {formatCurrency(hall.price)}
                          {hall.perSeatPrice && <span className="block text-[11px] font-normal text-gray-400">({formatCurrency(hall.perSeatPrice)} / seat)</span>}
                        </td>
                        <td className="p-4">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg font-medium">
                            {hall.sessions?.length || 0} sessions
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleEdit(hall)} 
                              className="p-1.5 rounded-lg hover:bg-[#F4E7C9] text-gray-500 hover:text-[#A97A1F] transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(hall.id)} 
                              className="p-1.5 rounded-lg hover:bg-[#FFEBEE] text-gray-500 hover:text-[#B71C1C] transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredHalls.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E0D8CC]">
            <Building className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>No Halls Found</h3>
            <p className="text-sm text-gray-500">Create your first banquet hall with sessions.</p>
          </div>
        )}
      </div>
    </div>
  );
}