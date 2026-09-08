// // ═══════════════════════════════════════════════════════════
// // pages/Events/EventList.jsx (Direct Modal Add & Edit)
// // ═══════════════════════════════════════════════════════════

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//   Plus, Search, Pencil, Trash2, Eye, 
//   Calendar, Tag, Palette, X, Check,
//   Crown, Sparkles, Star
// } from 'lucide-react';
// import eventApi from '../../services/eventApi';
// import { useAuth } from '../../context/AuthContext';
// import toast from 'react-hot-toast';

// const EventList = () => {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const [events, setEvents] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [deleteId, setDeleteId] = useState(null);
//   const [viewEvent, setViewEvent] = useState(null);
//   const [branchInfo, setBranchInfo] = useState(null);

//   // ── Form Modal States for Add/Edit ──
//   const [showFormModal, setShowFormModal] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [formData, setFormData] = useState({
//     name: '',
//     code: '',
//     description: '',
//     color: '#2563EB',
//     icon: ''
//   });

//   // ── Get current branch from localStorage ──
//   const getCurrentBranch = () => {
//     try {
//       const saved = localStorage.getItem('selectedBranch');
//       return saved ? JSON.parse(saved) : null;
//     } catch (e) {
//       return null;
//     }
//   };

//   // ── Check Authentication ──
//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       navigate('/login');
//     }
//   }, [navigate]);

//   // ── Fetch Events ──
//   const fetchEvents = async () => {
//     setLoading(true);
//     try {
//       const branch = getCurrentBranch();
//       const branchId = branch?.id || 1;

//       const res = await eventApi.getAll({ branchId });
      
//       let eventsData = [];
//       if (res?.data && Array.isArray(res.data)) {
//         eventsData = res.data;
//       } else if (Array.isArray(res)) {
//         eventsData = res;
//       }
      
//       setEvents(eventsData);
//       if (branch) setBranchInfo(branch);
//     } catch (e) {
//       console.error('❌ Fetch error:', e);
//       toast.error('Failed to load events');
//       setEvents([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchEvents();
//   }, []);

//   // ── Handle Open Add Modal ──
//   const handleOpenAdd = () => {
//     setEditingId(null);
//     setFormData({ name: '', code: '', description: '', color: '#2563EB', icon: '' });
//     setShowFormModal(true);
//   };

//   // ── Handle Open Edit Modal ──
//   const handleOpenEdit = (event) => {
//     setEditingId(event.id);
//     setFormData({
//       name: event.name || '',
//       code: event.code || '',
//       description: event.description || '',
//       color: event.color || '#2563EB',
//       icon: event.icon || ''
//     });
//     setShowFormModal(true);
//   };

//   // ── Submit Form (Create or Update) ──
//   const handleFormSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const branch = getCurrentBranch();
//       const payload = {
//         ...formData,
//         branchId: branch?.id || 1
//       };

//       if (editingId) {
//         await eventApi.update(editingId, payload);
//         toast.success('Event updated successfully!');
//       } else {
//         await eventApi.create(payload);
//         toast.success('Event created successfully!');
//       }

//       setShowFormModal(false);
//       setEditingId(null);
//       fetchEvents();
//     } catch (e) {
//       toast.error(e?.response?.data?.message || 'Failed to save event');
//     }
//   };

//   // ── Delete Event ──
//   const handleDelete = async () => {
//     try {
//       await eventApi.delete(deleteId);
//       toast.success('Event deleted successfully!');
//       setDeleteId(null);
//       fetchEvents();
//     } catch (e) {
//       toast.error(e?.message || 'Delete failed');
//     }
//   };

//   // ── Toggle Status ──
//   const toggleStatus = async (id, currentStatus) => {
//     try {
//       await eventApi.update(id, { isActive: !currentStatus });
//       toast.success(`Event ${!currentStatus ? 'activated' : 'deactivated'}!`);
//       fetchEvents();
//     } catch (e) {
//       toast.error(e?.message || 'Status update failed');
//     }
//   };

//   // ── Filter Events ──
//   const filteredEvents = events.filter((e) => {
//     const matchesSearch = 
//       e.name?.toLowerCase().includes(search.toLowerCase()) ||
//       e.code?.toLowerCase().includes(search.toLowerCase()) ||
//       e.description?.toLowerCase().includes(search.toLowerCase());
//     return matchesSearch;
//   });

//   // ── Loading ──
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
//         <div className="text-center">
//           <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
//           <p className="mt-4 text-sm font-medium" style={{ color: '#334155' }}>Loading events...</p>
//         </div>
//       </div>
//     );
//   }

//   const activeEvents = events.filter(e => e.isActive !== false);

//   return (
//     <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
//       <div className="max-w-7xl mx-auto space-y-6">
        
//         {/* ── Header ── */}
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div className="flex items-center gap-3">
//             <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
//               <Crown className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Events</h1>
//               <p className="text-sm font-medium" style={{ color: '#334155' }}>
//                 Manage event types • {branchInfo?.name || 'All Branches'}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={handleOpenAdd}
//             className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-[1.02]"
//           >
//             <Plus className="w-4 h-4" />
//             Add Event
//           </button>
//         </div>

//         {/* ── Stats ── */}
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
//             <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{events.length}</p>
//             <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Events</p>
//           </div>
//           <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
//             <p className="text-2xl font-bold" style={{ color: '#1B5E20' }}>{activeEvents.length}</p>
//             <p className="text-xs font-medium" style={{ color: '#334155' }}>Active</p>
//           </div>
//           <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
//             <p className="text-2xl font-bold" style={{ color: '#475569' }}>{events.filter(e => e.isActive === false).length}</p>
//             <p className="text-xs font-medium" style={{ color: '#334155' }}>Inactive</p>
//           </div>
//         </div>

//         {/* ── Search ── */}
//         <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 p-4">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
//             <input 
//               type="text" 
//               placeholder="Search events by name, code or description..." 
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all"
//               style={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A' }}
//             />
//           </div>
//         </div>

//         {/* ── Grid ── */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//           {filteredEvents.length === 0 ? (
//             <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-300">
//               <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: '#B0A89C' }} />
//               <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>No Events Found</h3>
//               <p className="text-sm font-medium" style={{ color: '#475569' }}>
//                 {search ? 'Try adjusting your search' : 'Create your first event type'}
//               </p>
//               {!search && (
//                 <button 
//                   onClick={handleOpenAdd}
//                   className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
//                 >
//                   <Plus size={16} /> Add Event
//                 </button>
//               )}
//             </div>
//           ) : (
//             filteredEvents.map((event) => (
//               <div 
//                 key={event.id} 
//                 className="bg-white rounded-2xl border border-slate-300 p-4 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-[1.02]"
//                 style={{ borderLeft: `4px solid ${event.color || '#2563EB'}` }}
//               >
//                 <div className="flex items-start justify-between">
//                   <div className="flex items-center gap-2">
//                     <div 
//                       className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
//                       style={{ backgroundColor: event.color || '#2563EB' }}
//                     >
//                       {event.icon ? (
//                         <span className="text-lg">{event.icon}</span>
//                       ) : (
//                         event.name?.charAt(0).toUpperCase() || '?'
//                       )}
//                     </div>
//                     <div>
//                       <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>{event.name}</h3>
//                       {event.code && (
//                         <p className="text-xs font-mono" style={{ color: '#475569' }}>{event.code}</p>
//                       )}
//                     </div>
//                   </div>
//                   <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
//                     event.isActive !== false 
//                       ? 'bg-[#E8F5E9] text-[#1B5E20]' 
//                       : 'bg-[#F1F5F9] text-slate-400'
//                   }`}>
//                     {event.isActive !== false ? 'Active' : 'Inactive'}
//                   </span>
//                 </div>

//                 {event.description && (
//                   <p className="text-xs font-medium mt-2 line-clamp-2" style={{ color: '#475569' }}>
//                     {event.description}
//                   </p>
//                 )}

//                 <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
//                   <button 
//                     onClick={() => toggleStatus(event.id, event.isActive)}
//                     className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-amber-100/80"
//                     style={{ color: '#475569' }}
//                     title="Toggle Status"
//                   >
//                     <Check className="w-4 h-4" />
//                   </button>
//                   <button 
//                     onClick={() => setViewEvent(event)} 
//                     className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-amber-100/80"
//                     style={{ color: '#475569' }}
//                     title="View"
//                   >
//                     <Eye className="w-4 h-4" />
//                   </button>
//                   <button 
//                     onClick={() => handleOpenEdit(event)} 
//                     className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-amber-100/80"
//                     style={{ color: '#475569' }}
//                     title="Edit"
//                   >
//                     <Pencil className="w-4 h-4" />
//                   </button>
//                   <button 
//                     onClick={() => setDeleteId(event.id)} 
//                     className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-[#FFEBEE]"
//                     style={{ color: '#475569' }}
//                     title="Delete"
//                   >
//                     <Trash2 className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {/* ── Add / Edit Modal Form ── */}
//       {showFormModal && (
//         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-300">
//             <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
//               <div>
//                 <h3 className="font-bold text-xl text-gray-800">{editingId ? 'Edit Event Type' : 'Add New Event Type'}</h3>
//                 <p className="text-xs text-[#2563EB] mt-0.5 font-medium">📍 Branch: <strong>{branchInfo?.name || 'Main Branch'}</strong></p>
//               </div>
//               <button onClick={() => setShowFormModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
//                 <X className="w-5 h-5" />
//               </button>
//             </div>
//             <form onSubmit={handleFormSubmit} className="space-y-4">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <label className="text-xs font-bold text-gray-700 mb-1 block">Event Name *</label>
//                   <input 
//                     required 
//                     value={formData.name} 
//                     onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
//                     placeholder="e.g. Wedding, Walima" 
//                     className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none" 
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-bold text-gray-700 mb-1 block">Code</label>
//                   <input 
//                     value={formData.code} 
//                     onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
//                     placeholder="e.g. EVT-01" 
//                     className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none" 
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="text-xs font-bold text-gray-700 mb-1 block">Description</label>
//                 <textarea 
//                   value={formData.description} 
//                   onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
//                   placeholder="Optional details..." 
//                   rows={2} 
//                   className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none" 
//                 />
//               </div>

//               <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
//                 <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold">Cancel</button>
//                 <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl shadow-md text-sm">
//                   {editingId ? 'Update Event Type' : 'Save Event Type'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ── View Modal ── */}
//       {viewEvent && (
//         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-300">
//             <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
//               <div className="flex items-center gap-2">
//                 <Sparkles className="w-5 h-5 text-[#2563EB]" />
//                 <h3 className="text-lg font-bold text-gray-800">{viewEvent.name}</h3>
//               </div>
//               <button onClick={() => setViewEvent(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
//                 <X className="w-5 h-5" />
//               </button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div className="flex items-center gap-4">
//                 <div 
//                   className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
//                   style={{ backgroundColor: viewEvent.color || '#2563EB' }}
//                 >
//                   {viewEvent.icon || viewEvent.name?.charAt(0).toUpperCase()}
//                 </div>
//                 <div>
//                   <p className="text-xs font-bold text-gray-400 uppercase">Code</p>
//                   <p className="font-mono font-bold text-gray-800 text-base">{viewEvent.code || '-'}</p>
//                 </div>
//               </div>
//               {viewEvent.description && (
//                 <div className="rounded-2xl p-4 bg-slate-50/50 border border-gray-100">
//                   <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Description</p>
//                   <p className="text-sm text-gray-700">{viewEvent.description}</p>
//                 </div>
//               )}
//               <div className="flex items-center justify-between">
//                 <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
//                 <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
//                   viewEvent.isActive !== false 
//                     ? 'bg-[#E8F5E9] text-[#1B5E20]' 
//                     : 'bg-[#F1F5F9] text-slate-400'
//                 }`}>
//                   {viewEvent.isActive !== false ? 'Active' : 'Inactive'}
//                 </span>
//               </div>
//               <button 
//                 onClick={() => {
//                   const ev = viewEvent;
//                   setViewEvent(null);
//                   handleOpenEdit(ev);
//                 }}
//                 className="w-full py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:opacity-95"
//               >
//                 Edit Event Type
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Delete Confirmation Modal ── */}
//       {deleteId && (
//         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-300">
//             <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50 text-red-600">
//               <Trash2 className="w-7 h-7" />
//             </div>
//             <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Event Type?</h3>
//             <p className="text-sm text-gray-500 mb-6">
//               This will permanently delete this event type from the system.
//             </p>
//             <div className="flex gap-3">
//               <button 
//                 onClick={() => setDeleteId(null)} 
//                 className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50"
//               >
//                 Cancel
//               </button>
//               <button 
//                 onClick={handleDelete} 
//                 className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-sm"
//               >
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EventList;