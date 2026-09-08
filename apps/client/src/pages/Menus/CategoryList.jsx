// pages/Menus/CategoryList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Tag, Search, X, LayoutGrid, Table as TableIcon } from 'lucide-react';
import categoryApi from '../../services/categoryApi';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';

export default function CategoryList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Change per requirement

  // Reset to page 1 on search or view mode change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, viewMode]);

  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    description: '', 
    color: '#2563EB', 
    icon: ''
  });

  // ── Fetch Categories with scope: 'MENU' (Auto Branch Sync) ──
  const { 
    data: categories, 
    loading, 
    error, 
    refetch 
  } = useGlobalData(
    async (branchId) => {
      const res = await categoryApi.getAll({ 
        search,
        scope: 'MENU', // STRICTLY MENU SCOPE
        branchId: branchId || currentBranch?.id || null
      });
      return res?.data || res || [];
    },
    {
      dependencies: [search],
      onError: (err) => {
        console.error('Fetch error:', err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else if (err.response?.status === 400) {
          toast.error('Please select a branch first.');
        } else {
          toast.error('Failed to load menu categories');
        }
      }
    }
  );

  // ── Handle Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submitData = { 
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        color: form.color || '#2563EB',
        icon: form.icon || null,
        scope: 'MENU'
      };
      
      // Assign branchId & companyId from current context
      if (currentBranch?.id) {
        submitData.branchId = Number(currentBranch.id);
        const rawCompanyId = currentBranch?.companyId || currentBranch?.company?.id || user?.companyId || user?.company?.id;
        submitData.companyId = rawCompanyId ? Number(rawCompanyId) : undefined;
      } else if (user?.branchId) {
        submitData.branchId = Number(user.branchId);
        const rawCompanyId = user?.companyId || user?.company?.id;
        submitData.companyId = rawCompanyId ? Number(rawCompanyId) : undefined;
      } else {
        submitData.branchId = 1; 
        submitData.companyId = 1;
      }
      
      if (!submitData.companyId) {
        toast.error('Company ID not found. Please reselect branch.');
        return;
      }

      if (editingId) {
        await categoryApi.update(editingId, submitData);
        toast.success('Menu category updated successfully!');
      } else {
        await categoryApi.create(submitData);
        toast.success('Menu category created successfully!');
      }
      
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', code: '', description: '', color: '#2563EB', icon: '' });
      refetch();
    } catch (e) { 
      if (e.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(e?.response?.data?.message || 'Error saving category');
      }
    }
  };

  // ── Handle Edit ──
  const handleEdit = (cat) => {
    setForm({ 
      name: cat.name, 
      code: cat.code || '', 
      description: cat.description || '', 
      color: cat.color || '#2563EB', 
      icon: cat.icon || ''
    });
    setEditingId(cat.id);
    setShowModal(true);
  };

  // ── Handle Delete ──
  const handleDelete = async (id) => {
    if (!confirm('Delete this menu category?')) return;
    try {
      await categoryApi.delete(id);
      toast.success('Menu category deleted successfully!');
      refetch();
    } catch (e) { 
      if (e.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(e?.response?.data?.message || 'Cannot delete — items attached');
      }
    }
  };

  // ── Loading State ──
  if (loading && !categories) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#334155' }}>Loading menu categories...</p>
        </div>
      </div>
    );
  }

  const categoryList = Array.isArray(categories) ? categories : [];
  const categoryCount = categoryList.length;
  const activeCategories = categoryList.filter(c => c.isActive !== false);
  const totalItems = categoryList.reduce((sum, item) => sum + (item._count?.items || item._count?.menuItems || 0), 0);

  // Pagination Math
  const totalPages = Math.ceil(categoryCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategories = categoryList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-6xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Menu Categories</h1>
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#334155' }}>
                  Manage categories specific to menu items 
                  {currentBranch && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100/80 text-[#8B6914] font-bold">
                      {currentBranch.name}
                    </span>
                  )}
                </p>
              </div>
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
              onClick={() => { 
                setShowModal(true); 
                setEditingId(null); 
                setForm({ name: '', code: '', description: '', color: '#2563EB', icon: '' }); 
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-[1.02]"
            >
              <Plus size={18} /> Add Menu Category
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{categoryCount}</p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Categories</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#1B5E20' }}>
              {activeCategories.length}
            </p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Active Categories</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>
              {totalItems}
            </p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Linked Menu Items</p>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 p-4 mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu categories by name or code..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#CBD5E1', 
                color: '#0F172A'
              }} 
            />
          </div>
        </div>

        {/* ── Modal Pop-up Form ── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-300 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                    {editingId ? 'Edit Menu Category' : 'New Menu Category'}
                  </h3>
                  <p className="text-sm font-medium" style={{ color: '#334155' }}>
                    {editingId ? 'Update category details' : 'Create a new menu category'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#2563EB' }}>
                    📍 Will be saved in: <strong>{currentBranch?.name || 'Current Branch'}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-[#F1F5F9] transition-all text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                    Category Name <span style={{ color: '#B71C1C' }}>*</span>
                  </label>
                  <input 
                    required 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Main Course, Rice, BBQ"
                    className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                    style={{ 
                      borderColor: '#CBD5E1', 
                      backgroundColor: '#FFFFFF', 
                      color: '#0F172A'
                    }} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                    Code
                  </label>
                  <input 
                    value={form.code} 
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g., MENU-CAT-01"
                    className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm font-mono"
                    style={{ 
                      borderColor: '#CBD5E1', 
                      backgroundColor: '#FFFFFF', 
                      color: '#0F172A'
                    }} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={form.color} 
                      onChange={(e) => setForm({ ...form, color: e.target.value })} 
                      className="w-12 h-12 rounded-xl cursor-pointer border border-slate-300 p-1" 
                    />
                    <span className="text-sm font-medium" style={{ color: '#475569' }}>{form.color}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                    Description
                  </label>
                  <textarea 
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    rows={2}
                    placeholder="Add a description for this menu category"
                    className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm resize-none"
                    style={{ 
                      borderColor: '#CBD5E1', 
                      backgroundColor: '#FFFFFF', 
                      color: '#0F172A'
                    }} 
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-gray-100 bg-gray-50 border border-slate-300"
                    style={{ color: '#334155' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
                  >
                    {editingId ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Content View: Grid or Table ── */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedCategories.map(cat => (
              <div key={cat.id} 
                className="bg-white rounded-xl border border-slate-300 p-3 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-[1.02]"
                style={{ borderLeft: `3px solid ${cat.color || '#2563EB'}` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                      style={{ backgroundColor: cat.color || '#2563EB' }}>
                      {cat.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>{cat.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium" style={{ color: '#475569' }}>
                          {cat._count?.menuItems || cat._count?.items || 0} menu items
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button 
                      onClick={() => handleEdit(cat)} 
                      className="p-1 rounded-lg transition-all hover:scale-110 hover:bg-amber-100/80 hover:text-[#2563EB]"
                      style={{ color: '#475569' }}
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id)} 
                      className="p-1 rounded-lg transition-all hover:scale-110 hover:bg-[#FFEBEE] hover:text-[#B71C1C]"
                      style={{ color: '#475569' }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-[10px] font-medium mt-1.5 line-clamp-1" style={{ color: '#475569' }}>{cat.description}</p>
                )}
                {cat.code && (
                  <p className="text-[9px] font-mono mt-0.5" style={{ color: '#B0A89C' }}>Code: {cat.code}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Category Name</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-center">Items Count</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-amber-50/30 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                            style={{ backgroundColor: cat.color || '#2563EB' }}>
                            {cat.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-bold text-gray-900">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {cat.code ? (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100/80 text-[#8B6914]">
                            {cat.code}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">
                        {cat.description || 'No description provided'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-amber-50 text-[#2563EB] font-bold rounded-full text-xs">
                          {cat._count?.menuItems || cat._count?.items || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(cat)} title="Edit Category" className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB] transition-all">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(cat.id)} title="Delete Category" className="p-1.5 rounded-lg hover:bg-red-50 text-[#B71C1C] transition-all">
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

        {/* ── Pagination Controls ── */}
        {categoryCount > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="text-xs text-gray-600 font-medium">
              Showing <span className="font-bold text-gray-800">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(startIndex + itemsPerPage, categoryCount)}</span> of{' '}
              <span className="font-bold text-gray-800">{categoryCount}</span> categories
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-gray-700 hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-sm scale-105'
                        : 'bg-white border border-slate-300 text-gray-600 hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-gray-700 hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {categoryList.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300">
            <Tag className="w-16 h-16 mx-auto mb-4" style={{ color: '#B0A89C' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>No Menu Categories Found</h3>
            <p className="text-sm font-medium" style={{ color: '#475569' }}>
              {search ? 'Try adjusting your search' : 'Create your first menu category to get started'}
            </p>
            {!search && (
              <button 
                onClick={() => { setShowModal(true); setEditingId(null); setForm({ name: '', code: '', description: '', color: '#2563EB', icon: '' }); }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
              >
                <Plus size={16} /> Add Menu Category
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}