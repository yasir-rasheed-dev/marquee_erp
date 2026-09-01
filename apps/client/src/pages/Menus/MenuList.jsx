import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Pencil, Trash2, Eye, 
  ChefHat, TrendingUp, DollarSign, X,
  Crown, Sparkles
} from 'lucide-react';
import { baseApi } from '../../services/baseApi';
import useGlobalData from '../../hooks/useGlobalData';
import { useBranch } from '../../context/BranchContext';

const MenuList = () => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteId, setDeleteId] = useState(null);
  const [viewMenu, setViewMenu] = useState(null);

  // ── Fetch Menus using global data hook ──
  const { 
    data: menus, 
    loading, 
    error, 
    refetch 
  } = useGlobalData(
    async (branchId) => {
      const response = await baseApi.get('/menus', { branchId });
      return response.menus || response.data || response || [];
    },
    {
      onError: (err) => {
        console.error('❌ Menu fetch error:', err);
        if (err.status === 401) {
          navigate('/login');
        }
      }
    }
  );

  // ── Delete Menu ──
  const handleDelete = async () => {
    try {
      await baseApi.delete(`/menus/${deleteId}`);
      setDeleteId(null);
      refetch();
    } catch (err) {
      console.error('❌ Delete error:', err);
      alert(err.message || 'Delete failed!');
    }
  };

  // ── Filter Menus ──
  const filteredMenus = (menus || []).filter((m) => {
    const matchesSearch = 
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (val) => {
    if (!val) return 'Rs 0';
    return `Rs ${parseFloat(val).toLocaleString('en-PK')}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-[#1B5E20]/10 text-[#1B5E20] border-[#1B5E20]/20',
      inactive: 'bg-[#7A7A7A]/10 text-[#4A4A4A] border-[#7A7A7A]/20',
      draft: 'bg-[#E67E22]/10 text-[#E67E22] border-[#E67E22]/20',
    };
    return styles[status] || styles.draft;
  };

  const getItemCount = (menu) => {
    return menu.categories?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0;
  };

  // ── Error State ──
  if (error) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="text-center">
          <p className="text-red-500 font-medium">Error loading menus: {error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-6 py-2 rounded-xl bg-[#A97A1F] text-white hover:bg-[#8B6914] transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#A97A1F] animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#4A4A4A' }}>Loading menus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-7xl mx-auto">
        {/* ── Premium Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Menu Master</h1>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                All menus with categories & items
                {currentBranch && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#F4E7C9] text-[#8B6914]">
                    {currentBranch.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="px-4 py-2.5 rounded-xl font-semibold transition-all border border-[#E0D8CC] hover:border-[#A97A1F] hover:bg-[#FAF8F4]"
              style={{ color: '#4A4A4A' }}
              title="Refresh data"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => navigate('/menus/add')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:shadow-[0_4px_20px_rgba(169,122,31,0.4)] hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Menu
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#F4E7C9' }}>
                <ChefHat className="w-5 h-5" style={{ color: '#A97A1F' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{(menus || []).length}</p>
                <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Total Menus</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#E8F5E9' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#1B5E20' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{(menus || []).filter(m => m.status === 'active').length}</p>
                <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Active Menus</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#F4E7C9' }}>
                <DollarSign className="w-5 h-5" style={{ color: '#A97A1F' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{formatPrice((menus || []).reduce((s, m) => s + parseFloat(m.totalSalePrice || 0), 0))}</p>
                <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Total Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC] p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7A7A7A' }} />
              <input 
                type="text" 
                placeholder="Search by name or code..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
              />
            </div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#FAF8F4', borderBottom: '1px solid #E0D8CC' }}>
                  <th className="text-left px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Menu</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Categories</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Items</th>
                  <th className="text-right px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Cost</th>
                  <th className="text-right px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Sale</th>
                  <th className="text-right px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Margin</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Status</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#F0ECE6' }}>
                {filteredMenus.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <ChefHat className="w-12 h-12 mx-auto mb-3" style={{ color: '#B0A89C' }} />
                      <p className="text-sm font-medium" style={{ color: '#7A7A7A' }}>No menus found</p>
                    </td>
                  </tr>
                ) : (
                  filteredMenus.map((menu) => (
                    <tr key={menu.id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold" style={{ color: '#1A1A1A' }}>{menu.name}</p>
                          {menu.code && <p className="text-xs font-medium mt-0.5" style={{ color: '#7A7A7A' }}>Code: {menu.code}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold" style={{ color: '#1A1A1A' }}>{menu.categories?.length || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-bold" style={{ color: '#1A1A1A' }}>{getItemCount(menu)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#1A1A1A' }}>{formatPrice(menu.totalCostPrice)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#A97A1F' }}>{formatPrice(menu.totalSalePrice)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${parseFloat(menu.profitMargin) > 0 ? 'text-[#1B5E20]' : 'text-[#B71C1C]'}`}>
                          {menu.profitMargin ? `${parseFloat(menu.profitMargin)}%` : '0%'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(menu.status)}`}>
                          {menu.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setViewMenu(menu)} 
                            className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-[#F4E7C9]"
                            style={{ color: '#7A7A7A' }}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => navigate(`/menus/add?edit=${menu.id}`)} 
                            className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-[#F4E7C9]"
                            style={{ color: '#7A7A7A' }}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteId(menu.id)} 
                            className="p-1.5 rounded-lg transition-all hover:scale-110 hover:bg-[#FFEBEE]"
                            style={{ color: '#7A7A7A' }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── View Modal ── */}
      {viewMenu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E0D8CC' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#A97A1F' }} />
                <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{viewMenu.name}</h3>
              </div>
              <button onClick={() => setViewMenu(null)} className="p-1 rounded-lg hover:bg-[#F5F2EB] transition-all">
                <X className="w-5 h-5" style={{ color: '#4A4A4A' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F5F2EB' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#7A7A7A' }}>Code</p>
                  <p className="font-bold" style={{ color: '#1A1A1A' }}>{viewMenu.code || '-'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F5F2EB' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#7A7A7A' }}>Status</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(viewMenu.status)}`}>
                    {viewMenu.status}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => {
                  const id = viewMenu.id;
                  setViewMenu(null);
                  navigate(`/menus/add?edit=${id}`);
                }}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-md hover:scale-[1.02]"
              >
                Edit Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FFEBEE' }}>
              <Trash2 className="w-7 h-7" style={{ color: '#B71C1C' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>Delete Menu?</h3>
            <p className="text-sm font-medium mb-6" style={{ color: '#4A4A4A' }}>This will permanently delete the menu and all its categories & items.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteId(null)} 
                className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm transition-all hover:bg-[#F5F2EB]"
                style={{ borderColor: '#E0D8CC', color: '#4A4A4A' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                style={{ backgroundColor: '#B71C1C' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuList;