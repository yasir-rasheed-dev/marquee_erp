// ═══════════════════════════════════════════════════════════
// pages/Events/EventList.jsx
// ═══════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Calendar, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import eventApi from '../../services/eventApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';

export default function EventList() {
  const { currentBranch } = useBranch();
  
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Har page par kitne event types dikhane hain

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  const { 
    data: events, 
    loading, 
    refetch 
  } = useGlobalData(
    async (branchId) => {
      const res = await eventApi.getAll({ search, branchId: branchId || currentBranch?.id });
      return res?.data || res || [];
    },
    {
      dependencies: [search, currentBranch?.id],
      onError: () => toast.error('Failed to load events')
    }
  );

  // Search badalne par pehle page par reset karein
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        branchId: currentBranch?.id || 1
      };

      if (editingId) {
        await eventApi.update(editingId, payload);
        toast.success('Event updated successfully!');
      } else {
        await eventApi.create(payload);
        toast.success('Event created successfully!');
      }

      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', code: '', description: '', isActive: true });
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error saving event');
    }
  };

  const handleEdit = (event) => {
    setForm({
      name: event.name || '',
      code: event.code || '',
      description: event.description || '',
      isActive: event.isActive ?? true
    });
    setEditingId(event.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event type?')) return;
    try {
      await eventApi.delete(id);
      toast.success('Event deleted successfully!');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Cannot delete event');
    }
  };

  const eventList = Array.isArray(events) ? events : [];

  // Pagination Logic
  const totalPages = Math.ceil(eventList.length / itemsPerPage);
  
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return eventList.slice(start, start + itemsPerPage);
  }, [eventList, currentPage, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="min-h-screen p-6 relative" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-md text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Event Types Management</h1>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                Manage event categories (e.g., Wedding, Valima, Birthday) 
                {currentBranch && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#F4E7C9] text-[#8B6914] font-bold">
                    {currentBranch.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* VIEW MODE TOGGLE BUTTONS */}
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

            <button 
              onClick={() => { 
                setShowModal(true); 
                setEditingId(null); 
                setForm({ name: '', code: '', description: '', isActive: true }); 
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-md hover:scale-[1.02]"
            >
              <Plus size={18} /> Add Event Type
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8CC] p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event types by name or code..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Form Modal */}
        {showModal && (
          <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-[#E0D8CC] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-[#FAF8F4] flex items-center justify-between border-[#E0D8CC]">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-800">{editingId ? 'Edit Event Type' : 'New Event Type'}</h3>
                  <p className="text-xs text-[#A97A1F] mt-0.5 font-medium">📍 Branch: <strong>{currentBranch?.name}</strong></p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-200 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Event Name *</label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Wedding, Walima, Corporate Event"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Code</label>
                    <input 
                      value={form.code} 
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g., EVT-01"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A97A1F]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Description</label>
                    <textarea 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="Optional details..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A97A1F]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] shadow-sm hover:opacity-95">
                    {editingId ? 'Update Event Type' : 'Create Event Type'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content View: Grid or Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#A97A1F] animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading events...</p>
          </div>
        ) : eventList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E0D8CC] shadow-sm">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Event Types Found</h3>
            <p className="text-sm text-gray-500">Create event categories to use in your marquee bookings.</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              /* ── GRID CARD VIEW ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-2xl border border-[#E0D8CC] p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-900">{event.name}</h3>
                        {event.code && (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#F4E7C9] text-[#8B6914]">
                            {event.code}
                          </span>
                        )}
                      </div>
                      {event.description && <p className="text-xs text-gray-500 mt-1">{event.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(event)} title="Edit Event" className="p-2 rounded-xl hover:bg-amber-50 text-gray-600 hover:text-[#A97A1F] transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(event.id)} title="Delete Event" className="p-2 rounded-xl hover:bg-red-50 text-gray-600 hover:text-[#B71C1C] transition-all">
                        <Trash2 size={16} />
                      </button>
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
                        <th className="py-3.5 px-4">Event Name</th>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Description</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {paginatedEvents.map(event => (
                        <tr key={event.id} className="hover:bg-amber-50/30 transition-all">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {event.name}
                          </td>
                          <td className="py-3.5 px-4">
                            {event.code ? (
                              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#F4E7C9] text-[#8B6914]">
                                {event.code}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">
                            {event.description || 'No description provided'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEdit(event)} title="Edit Event" className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-600 hover:text-[#A97A1F] transition-all">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => handleDelete(event.id)} title="Delete Event" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-[#B71C1C] transition-all">
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
                  <strong className="text-gray-800">{Math.min(currentPage * itemsPerPage, eventList.length)}</strong> of{' '}
                  <strong className="text-gray-800">{eventList.length}</strong> events
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

      </div>
    </div>
  );
}