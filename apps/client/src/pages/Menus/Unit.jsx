// pages/Menus/UnitManagement.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Search, X, Scale, LayoutGrid, Table as TableIcon,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import unitApi from '../../services/unitApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';
import ReactSelect from '../../components/ui/ReactSelect';

export default function UnitManagement() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // 🔹 Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [form, setForm] = useState({
    name: '',
    symbol: '',
    type: 'POS',
    scope: 'MENU',
    description: '',
    isActive: true
  });

  // Auto-sync data on branch change with scope: 'MENU'
  const { 
    data: units, 
    loading, 
    refetch 
  } = useGlobalData(
    async (branchId) => {
      const res = await unitApi.getAll({ 
        search, 
        scope: 'MENU',
        branchId: branchId || currentBranch?.id 
      });
      return res?.data || res || [];
    },
    {
      dependencies: [search],
      onError: (err) => {
        toast.error('Failed to load menu units');
      }
    }
  );

  const unitList = useMemo(() => (Array.isArray(units) ? units : []), [units]);

  // 🔹 Calculate Paginated Items
  const totalItems = unitList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return unitList.slice(start, start + itemsPerPage);
  }, [unitList, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Search per page 1 reset karein
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        scope: 'MENU',
        branchId: currentBranch?.id
      };

      if (editingId) {
        await unitApi.update(editingId, payload);
        toast.success('Menu unit updated successfully!');
      } else {
        await unitApi.create(payload);
        toast.success('Menu unit created successfully!');
      }

      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', symbol: '', type: 'POS', scope: 'MENU', description: '', isActive: true });
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error saving menu unit');
    }
  };

  const handleEdit = (unit) => {
    setForm({
      name: unit.name || '',
      symbol: unit.symbol || '',
      type: unit.type || 'POS',
      scope: 'MENU',
      description: unit.description || '',
      isActive: unit.isActive ?? true
    });
    setEditingId(unit.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this menu unit?')) return;
    try {
      await unitApi.delete(id);
      toast.success('Menu unit deleted successfully!');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Cannot delete unit — items attached');
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Menu Units Management</h1>
              <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#4A4A4A' }}>
                Manage measurement units for menu items (e.g., Plate, Degh, Portion)
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
                setForm({ name: '', symbol: '', type: 'POS', scope: 'MENU', description: '', isActive: true }); 
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:scale-[1.02]"
            >
              <Plus size={18} /> Add Menu Unit
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC] p-4 mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A7A7A' }} />
            <input 
              type="text" 
              value={search} 
              onChange={handleSearchChange}
              placeholder="Search menu units by name or symbol..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none text-sm"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }} 
            />
          </div>
        </div>

        {/* Modal Pop-up Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-[#E0D8CC] animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
                    {editingId ? 'Edit Menu Unit' : 'New Menu Unit'}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: '#A97A1F' }}>
                    📍 Will be saved in branch: <strong>{currentBranch?.name || 'Current Branch'}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-2 rounded-xl hover:bg-[#F5F2EB] transition-all text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                    Unit Name <span style={{ color: '#B71C1C' }}>*</span>
                  </label>
                  <input 
                    required 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Plate, Degh, Portion, Bowl"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                      Symbol
                    </label>
                    <input 
                      value={form.symbol} 
                      onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                      placeholder="e.g., plt, degh"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono"
                      style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                      Type <span style={{ color: '#B71C1C' }}>*</span>
                    </label>
                    <ReactSelect
                      value={form.type}
                      onChange={(val) => setForm({ ...form, type: val || 'POS' })}
                      options={[
                        { value: 'POS', label: 'Menu / POS Serving' },
                        { value: 'BOTH', label: 'Both' }
                      ]}
                      placeholder="Select Type"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                    Description
                  </label>
                  <textarea 
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="Optional details..."
                    className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FFFFFF', color: '#1A1A1A' }} 
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#F0ECE6' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm bg-gray-50 hover:bg-gray-100 transition-all"
                    style={{ color: '#4A4A4A' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:scale-[1.02] transition-all"
                  >
                    {editingId ? 'Update Menu Unit' : 'Create Menu Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content View: Grid or Table */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedUnits.map(unit => (
              <div key={unit.id} className="bg-white rounded-xl border border-[#E0D8CC] p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base" style={{ color: '#1A1A1A' }}>{unit.name}</h3>
                    {unit.symbol && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#F4E7C9] text-[#8B6914]">
                        {unit.symbol}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {unit.type || 'POS'}
                    </span>
                    {unit.description && <span className="text-xs truncate max-w-[150px]" style={{ color: '#7A7A7A' }}>{unit.description}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(unit)} className="p-1.5 rounded-lg hover:bg-[#F4E7C9] text-gray-600 hover:text-[#A97A1F]">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(unit.id)} className="p-1.5 rounded-lg hover:bg-[#FFEBEE] text-gray-600 hover:text-[#B71C1C]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F4] border-b border-[#E0D8CC] text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Unit Name</th>
                    <th className="py-3.5 px-4">Symbol</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedUnits.map(unit => (
                    <tr key={unit.id} className="hover:bg-amber-50/30 transition-all">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {unit.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {unit.symbol ? (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#F4E7C9] text-[#8B6914]">
                            {unit.symbol}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {unit.type || 'POS'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">
                        {unit.description || 'No description provided'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(unit)} title="Edit Unit" className="p-1.5 rounded-lg hover:bg-amber-50 text-[#A97A1F] transition-all">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(unit.id)} title="Delete Unit" className="p-1.5 rounded-lg hover:bg-red-50 text-[#B71C1C] transition-all">
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

        {unitList.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E0D8CC]">
            <Scale className="w-16 h-16 mx-auto mb-4" style={{ color: '#B0A89C' }} />
            <h3 className="text-lg font-bold mb-2">No Menu Units Found</h3>
            <p className="text-sm text-gray-500">Create measurement units to use in menu and items.</p>
          </div>
        )}

        {/* 🔹 Pagination Footer Controls */}
        {totalItems > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E0D8CC] shadow-sm">
            <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
              <span>
                Showing <strong className="text-gray-800">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</strong> to{' '}
                <strong className="text-gray-800">{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of{' '}
                <strong className="text-gray-800">{totalItems}</strong> entries
              </span>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#FAF8F4] border border-[#E0D8CC] rounded-lg px-2 py-1 text-xs font-bold text-gray-700 outline-none focus:border-[#A97A1F]"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-[#E0D8CC] bg-white text-gray-600 hover:bg-[#F5F2EB] disabled:opacity-40 disabled:hover:bg-white transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FAF8F4] border border-[#E0D8CC] text-[#8B6914]">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-[#E0D8CC] bg-white text-gray-600 hover:bg-[#F5F2EB] disabled:opacity-40 disabled:hover:bg-white transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}