import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Pencil, Trash2, Eye, Search, 
  Building2, Phone, Mail, MapPin, 
  CheckCircle, XCircle, AlertCircle,
  X, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import authApi from '../../services/authApi';  // ✅ Fixed import
import { useAuth } from '../../context/AuthContext';

const BranchList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [viewBranch, setViewBranch] = useState(null);

  // ── Fetch Branches ──
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchBranches();
    }
  }, [user]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await authApi.getBranches();  // ✅ Fixed
      if (response.success) {
        setBranches(response.branches);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete Branch ──
  const handleDelete = async () => {
    try {
      const response = await authApi.deleteBranch(deleteId);  // ✅ Fixed
      if (response.success) {
        toast.success('Branch deleted successfully!');
        fetchBranches();
        setDeleteId(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Toggle Status ──
  const toggleStatus = async (id, currentStatus) => {
    try {
      const response = await authApi.updateBranch(id, {  // ✅ Fixed
        isActive: !currentStatus
      });
      if (response.success) {
        toast.success(`Branch ${!currentStatus ? 'activated' : 'deactivated'}!`);
        fetchBranches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  // ── Filter Branches ──
  const filteredBranches = branches.filter(branch =>
    branch.name?.toLowerCase().includes(search.toLowerCase()) ||
    branch.email?.toLowerCase().includes(search.toLowerCase()) ||
    branch.address?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#334155' }}>Loading branches...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Branches</h1>
              <p className="text-sm font-medium" style={{ color: '#334155' }}>Manage your business locations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBranches}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{ backgroundColor: '#F8F5F0' }}
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" style={{ color: '#334155' }} />
            </button>
            <button
              onClick={() => navigate('/branches/add')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{branches.length}</p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Branches</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#1B5E20' }}>{branches.filter(b => b.isActive).length}</p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Active</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#475569' }}>{branches.filter(b => !b.isActive).length}</p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Inactive</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300">
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>
              {branches.reduce((sum, b) => sum + (b._count?.users || 0), 0)}
            </p>
            <p className="text-xs font-medium" style={{ color: '#334155' }}>Total Users</p>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
            <input
              type="text"
              placeholder="Search branches by name, email or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm font-medium"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                color: '#0F172A',
                focusRingColor: 'rgba(37,99,235,0.2)'
              }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                  <th className="text-left px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Branch</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Contact</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Users</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Status</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E2E8F0' }}>
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#B0A89C' }} />
                      <p className="text-sm font-medium" style={{ color: '#475569' }}>No branches found</p>
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
                            {branch.name}
                            {branch.id === 1 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#FEF3C7', color: '#8B6914' }}>
                                Main
                              </span>
                            )}
                          </p>
                          {branch.address && (
                            <p className="text-xs font-medium flex items-center gap-1 mt-0.5" style={{ color: '#475569' }}>
                              <MapPin className="w-3 h-3" /> {branch.address}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {branch.email && (
                          <p className="text-sm font-medium flex items-center gap-1" style={{ color: '#334155' }}>
                            <Mail className="w-3 h-3" /> {branch.email}
                          </p>
                        )}
                        {branch.phone && (
                          <p className="text-sm font-medium flex items-center gap-1 mt-0.5" style={{ color: '#334155' }}>
                            <Phone className="w-3 h-3" /> {branch.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold" style={{ color: '#0F172A' }}>
                          {branch._count?.users || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(branch.id, branch.isActive)}
                          disabled={branch.id === 1}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-0 transition-all ${
                            branch.isActive 
                              ? 'bg-[#E8F5E9] text-[#1B5E20] hover:bg-[#C8E6C9]' 
                              : 'bg-[#F1F5F9] text-slate-400 hover:bg-[#E8E0D8]'
                          } ${branch.id === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={branch.id === 1 ? 'Main branch cannot be deactivated' : 'Click to toggle status'}
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewBranch(branch)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: '#475569' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF3C7'; e.currentTarget.style.color = '#2563EB'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/branches/${branch.id}/edit`)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: '#475569' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF3C7'; e.currentTarget.style.color = '#2563EB'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                            title="Edit Branch"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(branch.id)}
                            disabled={branch.id === 1}
                            className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                              branch.id === 1 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            style={{ color: branch.id === 1 ? '#B0A89C' : '#475569' }}
                            onMouseEnter={(e) => {
                              if (branch.id !== 1) {
                                e.currentTarget.style.backgroundColor = '#FFEBEE';
                                e.currentTarget.style.color = '#B71C1C';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (branch.id !== 1) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#475569';
                              }
                            }}
                            title={branch.id === 1 ? 'Cannot delete main branch' : 'Delete Branch'}
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
      {viewBranch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#CBD5E1' }}>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: '#2563EB' }} />
                <h3 className="text-lg font-bold" style={{ color: '#0F172A' }}>{viewBranch.name}</h3>
                {viewBranch.id === 1 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#FEF3C7', color: '#8B6914' }}>
                    Main
                  </span>
                )}
              </div>
              <button onClick={() => setViewBranch(null)} className="p-1 rounded-lg hover:bg-[#F1F5F9] transition-all">
                <X className="w-5 h-5" style={{ color: '#334155' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {viewBranch.address && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
                  <MapPin className="w-4 h-4 mt-0.5" style={{ color: '#475569' }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#475569' }}>Address</p>
                    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{viewBranch.address}</p>
                  </div>
                </div>
              )}
              {viewBranch.phone && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
                  <Phone className="w-4 h-4 mt-0.5" style={{ color: '#475569' }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#475569' }}>Phone</p>
                    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{viewBranch.phone}</p>
                  </div>
                </div>
              )}
              {viewBranch.email && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
                  <Mail className="w-4 h-4 mt-0.5" style={{ color: '#475569' }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#475569' }}>Email</p>
                    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{viewBranch.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
                <Building2 className="w-4 h-4 mt-0.5" style={{ color: '#475569' }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#475569' }}>Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-0 ${
                    viewBranch.isActive ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-[#F1F5F9] text-slate-400'
                  }`}>
                    {viewBranch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
                  <p className="text-xs font-bold" style={{ color: '#475569' }}>Users</p>
                  <p className="text-lg font-bold" style={{ color: '#0F172A' }}>{viewBranch._count?.users || 0}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
                  <p className="text-xs font-bold" style={{ color: '#475569' }}>Menus</p>
                  <p className="text-lg font-bold" style={{ color: '#0F172A' }}>{viewBranch._count?.menus || 0}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewBranch(null);
                  navigate(`/branches/${viewBranch.id}/edit`);
                }}
                className="w-full py-3 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-[1.02]"
              >
                <Pencil className="w-4 h-4 inline mr-2" />
                Edit Branch
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
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>Delete Branch?</h3>
            <p className="text-sm font-medium mb-4" style={{ color: '#334155' }}>
              This will permanently delete this branch. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm transition-all hover:bg-[#F1F5F9]"
                style={{ borderColor: '#CBD5E1', color: '#334155' }}
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

export default BranchList;