import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, X, Tag, Box, Layers, BookmarkCheck, DollarSign, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import itemApi from '../../services/itemApi';
import categoryApi from '../../services/categoryApi';
import unitApi from '../../services/unitApi';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import ReactSelect from '../../components/ui/ReactSelect';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

export default function ItemList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const { canCreate, canEdit, canDelete } = usePermissions();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    categoryId: '', 
    description: '', 
    unit: 'Degh', 
    costPrice: '', 
    salePrice: '',
    isBulkUnit: true,
    conversionRate: '50', 
    subUnitName: 'plate'
  });

  // ── Debounce Search to prevent 429 Rate Limit ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterCategory]);

  // ── Fetch Items, Menu Categories & Menu Units using useGlobalData hook with debounced search ──
  const { 
    data: fetchResult, 
    loading, 
    error, 
    refetch 
  } = useGlobalData(
    async (branchId) => {
      const activeBranchId = branchId || currentBranch?.id || 1;
      
      const [itemsRes, catRes, unitRes] = await Promise.all([
        itemApi.getAll({ 
          search: debouncedSearch, 
          categoryId: filterCategory,
          branchId: activeBranchId
        }),
        categoryApi.getAll({ 
          scope: 'MENU', 
          branchId: activeBranchId
        }),
        unitApi.getAll({
          scope: 'MENU', 
          branchId: activeBranchId
        })
      ]);
      
      let itemsData = [];
      if (itemsRes?.data && Array.isArray(itemsRes.data)) {
        itemsData = itemsRes.data;
      } else if (Array.isArray(itemsRes)) {
        itemsData = itemsRes;
      }
      
      let categoriesData = [];
      if (catRes?.data && Array.isArray(catRes.data)) {
        categoriesData = catRes.data;
      } else if (Array.isArray(catRes)) {
        categoriesData = catRes;
      } else if (catRes?.categories && Array.isArray(catRes.categories)) {
        categoriesData = catRes.categories;
      }

      let unitsData = [];
      if (unitRes?.data && Array.isArray(unitRes.data)) {
        unitsData = unitRes.data;
      } else if (Array.isArray(unitRes)) {
        unitsData = unitRes;
      }

      return { items: itemsData, categories: categoriesData, units: unitsData };
    },
    {
      dependencies: [debouncedSearch, filterCategory],
      onError: (err) => {
        if (err?.response?.status !== 429) {
          console.error('❌ Fetch error:', err);
          toast.error('Failed to load menu items data');
        }
      }
    }
  );

  const items = fetchResult?.items || [];
  const categories = fetchResult?.categories || [];
  const units = fetchResult?.units || [];

  // ── Pagination Calculation ──
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  // ── Handle Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submitData = { 
        name: form.name.trim(),
        code: form.code?.trim() || null,
        categoryId: parseInt(form.categoryId),
        description: form.description || null,
        unit: form.unit || 'Degh',
        costPrice: parseFloat(form.costPrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        isBulkUnit: Boolean(form.isBulkUnit),
        conversionRate: parseFloat(form.conversionRate) || 1,
        subUnitName: form.subUnitName?.trim() || 'plate'
      };
      
      if (currentBranch?.id) {
        submitData.branchId = currentBranch.id;
      } else if (user?.branchId) {
        submitData.branchId = user.branchId;
      } else {
        submitData.branchId = 1;
      }

      if (editingId) {
        await itemApi.update(editingId, submitData);
        toast.success('Menu item updated successfully!');
      } else {
        await itemApi.create(submitData);
        toast.success('Menu item created successfully!');
      }
      
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', code: '', categoryId: '', description: '', unit: 'Degh', costPrice: '', salePrice: '', isBulkUnit: true, conversionRate: '50', subUnitName: 'plate' });
      refetch();
    } catch (e) { 
      toast.error(e?.message || 'Error saving menu item');
    }
  };

  // ── Handle Edit ──
  const handleEdit = (item) => {
    setForm({ 
      name: item.name, 
      code: item.code || '', 
      categoryId: item.categoryId?.toString() || '', 
      description: item.description || '', 
      unit: item.unit || 'Degh', 
      costPrice: item.costPrice?.toString() || '', 
      salePrice: item.salePrice?.toString() || '',
      isBulkUnit: item.isBulkUnit ?? true,
      conversionRate: item.conversionRate?.toString() || '50',
      subUnitName: item.subUnitName || 'plate'
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  // ── Handle Delete ──
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await itemApi.delete(id);
      toast.success('Menu item deleted successfully!');
      refetch();
    } catch (e) { 
      const errorMsg = e?.response?.data?.message || e?.message || 'Cannot delete item — it is linked to recipes or orders';
      toast.error(errorMsg);
    }
  };

  // Summary Statistics
  const stats = useMemo(() => {
    const itemCount = items.length;
    const activeItems = items.filter(i => i.isActive !== false).length;
    const totalCost = items.reduce((sum, i) => sum + parseFloat(i.costPrice || 0), 0);
    const totalSale = items.reduce((sum, i) => sum + parseFloat(i.salePrice || 0), 0);
    return { itemCount, activeItems, totalCost, totalSale };
  }, [items]);

  // ── Loading ──
  if (loading && !fetchResult) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#334155' }}>Loading menu items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">
        
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Menu Items Master</h1>
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#334155' }}>
                  Manage dishes, plates, and bulk items (e.g., Degh Biryani with Plate Conversions)
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

            {canCreate('menus_items') && (
              <button 
                onClick={() => { 
                  setShowModal(true); 
                  setEditingId(null); 
                  setForm({ name: '', code: '', categoryId: '', description: '', unit: 'Degh', costPrice: '', salePrice: '', isBulkUnit: true, conversionRate: '50', subUnitName: 'plate' }); 
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
              >
                <Plus size={18} /> Add Menu Item
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-[#2563EB]"><Layers size={24} /></div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{stats.itemCount}</p>
              <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Menu Items</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><BookmarkCheck size={24} /></div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#1B5E20' }}>{stats.activeItems}</p>
              <p className="text-xs font-medium" style={{ color: '#334155' }}>Active Items</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-600"><DollarSign size={24} /></div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#B71C1C' }}>Rs {stats.totalCost.toFixed(0)}</p>
              <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Cost Value</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-[#2563EB]"><DollarSign size={24} /></div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>Rs {stats.totalSale.toFixed(0)}</p>
              <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Sale Value</p>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search menu items by name or code..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A' }} 
              />
            </div>
            <ReactSelect
              value={filterCategory}
              onChange={(val) => setFilterCategory(val || '')}
              options={[
                { value: '', label: 'All Menu Categories' },
                ...categories.map(c => ({ value: String(c.id), label: c.name }))
              ]}
              placeholder="All Menu Categories"
              isSearchable={true}
              isClearable={false}
            />
          </div>
        </div>

        {/* ── Modal Pop-up Form ── */}
        {showModal && (
          <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
                <div>
                  <h3 className="font-bold text-base sm:text-lg" style={{ color: '#0F172A' }}>
                    {editingId ? 'Edit Menu Item' : 'New Menu Item'}
                  </h3>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: '#2563EB' }}>
                    📍 Will be saved in: <strong>{currentBranch?.name || 'Current Branch'}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-2 rounded-xl hover:bg-gray-200 text-gray-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <form onSubmit={handleSubmit} id="itemForm" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                      Item Name <span style={{ color: '#B71C1C' }}>*</span>
                    </label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Chicken Biryani, Mutton Korma"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Code</label>
                    <input 
                      value={form.code} 
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g., MENU-001"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                      Category <span style={{ color: '#B71C1C' }}>*</span>
                    </label>
                    <ReactSelect
                      value={form.categoryId}
                      onChange={(val) => setForm({ ...form, categoryId: val || '' })}
                      options={[
                        { value: '', label: 'Select Menu Category' },
                        ...categories.map(c => ({ value: String(c.id), label: c.name }))
                      ]}
                      placeholder="Select Menu Category"
                      isSearchable={true}
                      isClearable={false}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                      Base Unit (e.g. Degh) <span style={{ color: '#B71C1C' }}>*</span>
                    </label>
                    <ReactSelect
                      value={form.unit}
                      onChange={(val) => setForm({ ...form, unit: val || 'Degh' })}
                      options={[
                        { value: 'Degh', label: 'Degh' },
                        { value: 'Bowl', label: 'Bowl' },
                        { value: 'Plate', label: 'Plate' },
                        { value: 'Kg', label: 'Kg' },
                        ...units.map(u => ({ 
                          value: u.name, 
                          label: `${u.name} ${u.symbol ? `(${u.symbol})` : ''}` 
                        }))
                      ]}
                      placeholder="Select Base Unit"
                      isSearchable={true}
                      isClearable={false}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Cost Price (Rs)</label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={form.costPrice} 
                      onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                      Sale Price (Rs) <span style={{ color: '#B71C1C' }}>*</span>
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      required
                      value={form.salePrice} 
                      onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>

                  {/* 📦 Bulk Conversion Settings */}
                  <div className="md:col-span-2 p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.isBulkUnit} 
                        onChange={e => setForm({...form, isBulkUnit: e.target.checked})} 
                        className="w-4 h-4 rounded text-[#2563EB]" 
                      />
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Box size={15} /> Enable Bulk Unit Breakdown (e.g. 1 Degh contains X Plates)
                      </span>
                    </label>

                    {form.isBulkUnit && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Sub-Unit Name (e.g. plate, portion)</label>
                          <input 
                            type="text" 
                            value={form.subUnitName} 
                            onChange={e => setForm({...form, subUnitName: e.target.value})} 
                            placeholder="plate" 
                            className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Conversion Rate (Servings per 1 {form.unit || 'Degh'})</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={form.conversionRate} 
                            onChange={e => setForm({...form, conversionRate: e.target.value})} 
                            placeholder="50" 
                            className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-[#2563EB]" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Description</label>
                    <textarea 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      placeholder="Add a description for this menu item"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none"
                      style={{ borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A' }} 
                    />
                  </div>
                </form>
              </div>

              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300 sticky bottom-0 z-20">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border font-bold text-sm bg-gray-50 hover:bg-gray-100 transition-all">Cancel</button>
                <button type="submit" form="itemForm" className="px-7 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB]">
                  {editingId ? 'Update Menu Item' : 'Create Menu Item'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── Content View: Grid or Table ── */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading menu items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300">
            <Tag className="w-16 h-16 mx-auto mb-4" style={{ color: '#B0A89C' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>No Menu Items Found</h3>
            <p className="text-sm font-medium" style={{ color: '#475569' }}>{search ? 'Try adjusting your search' : 'Create your first menu item or degh to get started'}</p>
            {!search && (
              <button 
                onClick={() => { setShowModal(true); setEditingId(null); setForm({ name: '', code: '', categoryId: '', description: '', unit: 'Degh', costPrice: '', salePrice: '', isBulkUnit: true, conversionRate: '50', subUnitName: 'plate' }); }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
              >
                <Plus size={16} /> Add Menu Item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              /* ── GRID CARD VIEW ── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-bold text-base text-gray-900">{item.name}</h3>
                          <div className="text-xs font-mono text-gray-400">{item.code || '—'}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: item.category?.color ? `${item.category.color}20` : '#FEF3C7', color: item.category?.color || '#2563EB' }}>
                          {item.category?.name || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 mb-4 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-bold uppercase">Unit:</span>
                          <span className="font-bold text-[#8B6914]">{item.unit || 'Degh'}</span>
                        </div>
                        {item.isBulkUnit && (
                          <div className="text-[11px] text-gray-500 font-medium text-right">
                            1 {item.unit || 'Degh'} = {item.conversionRate} {item.subUnitName || 'plates'}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Cost Price</span>
                          <span className="text-xs font-mono font-bold" style={{ color: '#B71C1C' }}>Rs {parseFloat(item.costPrice || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Sale Price</span>
                          <span className="text-xs font-mono font-bold" style={{ color: '#1B5E20' }}>Rs {parseFloat(item.salePrice || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {canEdit('menus_items') && (
                          <button onClick={() => handleEdit(item)} className="p-2 rounded-xl hover:bg-amber-50 text-[#2563EB] transition-all" title="Edit">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete('menus_items') && (
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {canEdit('menus_items') && (
                        <button onClick={() => handleEdit(item)} className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          Configure
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── TABLE VIEW ── */
              <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Item Name</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Unit Specs</th>
                        <th className="py-3.5 px-4 text-right">Cost Price</th>
                        <th className="py-3.5 px-4 text-right">Sale Price</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {paginatedItems.map(item => (
                        <tr key={item.id} className="hover:bg-amber-50/30 transition-all">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{item.name}</div>
                            <div className="text-xs font-mono text-gray-400">{item.code || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: item.category?.color ? `${item.category.color}20` : '#FEF3C7', color: item.category?.color || '#2563EB' }}>
                              {item.category?.name || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">
                            <span className="font-bold text-[#8B6914]">{item.unit || 'Degh'}</span>
                            {item.isBulkUnit && (
                              <div className="text-[10px] text-gray-400">
                                1 {item.unit || 'Degh'} = {item.conversionRate} {item.subUnitName || 'plates'}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-red-700">
                            Rs {parseFloat(item.costPrice || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-green-700">
                            Rs {parseFloat(item.salePrice || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit('menus_items') && (
                                <button onClick={() => handleEdit(item)} title="Edit Item" className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB] transition-all">
                                  <Edit2 size={15} />
                                </button>
                              )}
                              {canDelete('menus_items') && (
                                <button onClick={() => handleDelete(item.id)} title="Delete Item" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all">
                                  <Trash2 size={15} />
                                </button>
                              )}
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
            {totalItems > 0 && (
              <div className="bg-white rounded-2xl border border-slate-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 text-xs text-gray-600 font-medium">
                  <span>
                    Showing <strong className="text-gray-900">{startIndex + 1}</strong> to <strong className="text-gray-900">{Math.min(endIndex, totalItems)}</strong> of <strong className="text-gray-900">{totalItems}</strong> entries
                  </span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span>Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-300 bg-white text-gray-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="text-gray-400 px-1 text-xs">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`w-9 h-9 text-xs font-bold rounded-xl transition-all ${
                                currentPage === page
                                  ? 'bg-[#2563EB] text-white shadow-sm'
                                  : 'bg-white border border-slate-300 text-gray-700 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-300 bg-white text-gray-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}