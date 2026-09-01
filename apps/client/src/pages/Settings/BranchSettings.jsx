import React, { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Eye, Search, 
  Building2, Phone, Mail, MapPin, 
  ArrowLeft, Save, X, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import authApi from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const BranchSettings = () => {
  const { user, refreshUser } = useAuth();
  const { refreshBranches } = useBranch();
  
  // View states: 'list' | 'add' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [viewBranch, setViewBranch] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  });

  // ── Fetch Branches ──
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await authApi.getBranches();
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

  // ── Open Add Form ──
  const handleOpenAdd = () => {
    setFormData({ name: '', address: '', phone: '', email: '', isActive: true });
    setSelectedBranchId(null);
    setViewMode('add');
  };

  // ── Open Edit Form ──
  const handleOpenEdit = async (branch) => {
    setSelectedBranchId(branch.id);
    setFormData({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive !== undefined ? branch.isActive : true
    });
    setViewMode('edit');
  };

  // ── Handle Form Input Change ──
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ── Submit Form (Create / Update) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      let response;
      if (viewMode === 'edit') {
        response = await authApi.updateBranch(selectedBranchId, formData);
      } else {
        response = await authApi.createBranch(formData);
      }

      if (response.success) {
        toast.success(response.message || 'Branch saved successfully!');
        await refreshUser();
        await refreshBranches();
        fetchBranches();
        setViewMode('list'); // Back to list view
      }
    } catch (err) {
      console.error('❌ Branch save error:', err);
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete Branch ──
  const handleDelete = async () => {
    try {
      const response = await authApi.deleteBranch(deleteId);
      if (response.success) {
        toast.success('Branch deleted successfully!');
        fetchBranches();
        await refreshBranches();
        setDeleteId(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Toggle Status ──
  const toggleStatus = async (id, currentStatus) => {
    try {
      const response = await authApi.updateBranch(id, { isActive: !currentStatus });
      if (response.success) {
        toast.success(`Branch ${!currentStatus ? 'activated' : 'deactivated'}!`);
        fetchBranches();
        await refreshBranches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  // Filter branches
  const filteredBranches = branches.filter(branch =>
    branch.name?.toLowerCase().includes(search.toLowerCase()) ||
    branch.email?.toLowerCase().includes(search.toLowerCase()) ||
    branch.address?.toLowerCase().includes(search.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════
  // RENDER: ADD / EDIT FORM VIEW
  // ══════════════════════════════════════════════════════════
  if (viewMode === 'add' || viewMode === 'edit') {
    const isEdit = viewMode === 'edit';
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl transition-all hover:scale-105"
              style={{ backgroundColor: '#F8F5F0' }}
            >
              <ArrowLeft size={20} style={{ color: '#4A4A4A' }} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                  {isEdit ? 'Edit Branch' : 'Add Branch'}
                </h1>
                <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                  {isEdit ? 'Update branch information' : 'Create a new branch location'}
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#E0D8CC] p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>
                  Branch Name <span style={{ color: '#B71C1C' }}>*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7A7A7A' }} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter branch name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7A7A7A' }} />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter branch address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7A7A7A' }} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7A7A7A' }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium" style={{ color: '#4A4A4A' }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border focus:ring-2"
                      style={{ borderColor: '#E0D8CC', accentColor: '#A97A1F' }}
                    />
                    Active
                  </label>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${formData.isActive ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-[#F5F2EB] text-[#7A7A7A]'}`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#F0ECE6' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-[#F5F2EB]"
                  style={{ border: '1px solid #E0D8CC', color: '#4A4A4A' }}
                >
                  <X className="w-4 h-4 inline mr-2" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:scale-[1.02] disabled:opacity-70"
                >
                  {formLoading ? 'Saving...' : <><Save className="w-4 h-4 inline mr-2" /> {isEdit ? 'Update Branch' : 'Create Branch'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RENDER: BRANCH LIST VIEW
  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Branches</h1>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Manage your business locations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBranches}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{ backgroundColor: '#F8F5F0' }}
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" style={{ color: '#4A4A4A' }} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{branches.length}</p>
            <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Total Branches</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <p className="text-2xl font-bold" style={{ color: '#1B5E20' }}>{branches.filter(b => b.isActive).length}</p>
            <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Active</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <p className="text-2xl font-bold" style={{ color: '#7A7A7A' }}>{branches.filter(b => !b.isActive).length}</p>
            <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Inactive</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC]">
            <p className="text-2xl font-bold" style={{ color: '#A97A1F' }}>
              {branches.reduce((sum, b) => sum + (b._count?.users || 0), 0)}
            </p>
            <p className="text-xs font-medium" style={{ color: '#4A4A4A' }}>Total Users</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC] p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7A7A7A' }} />
            <input
              type="text"
              placeholder="Search branches by name, email or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none text-sm font-medium"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#E0D8CC] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#FAF8F4', borderBottom: '1px solid #E0D8CC' }}>
                  <th className="text-left px-6 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Branch</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Contact</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Users</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Status</th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold uppercase" style={{ color: '#4A4A4A' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#F0ECE6' }}>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm font-medium" style={{ color: '#7A7A7A' }}>Loading branches...</td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#B0A89C' }} />
                      <p className="text-sm font-medium" style={{ color: '#7A7A7A' }}>No branches found</p>
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                          {branch.name}
                          {branch.id === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#F4E7C9', color: '#8B6914' }}>Main</span>
                          )}
                        </p>
                        {branch.address && (
                          <p className="text-xs font-medium flex items-center gap-1 mt-0.5" style={{ color: '#7A7A7A' }}>
                            <MapPin className="w-3 h-3" /> {branch.address}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {branch.email && <p className="text-sm font-medium flex items-center gap-1" style={{ color: '#4A4A4A' }}><Mail className="w-3 h-3" /> {branch.email}</p>}
                        {branch.phone && <p className="text-sm font-medium flex items-center gap-1 mt-0.5" style={{ color: '#4A4A4A' }}><Phone className="w-3 h-3" /> {branch.phone}</p>}
                      </td>
                      <td className="px-6 py-4 text-center font-bold" style={{ color: '#1A1A1A' }}>{branch._count?.users || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(branch.id, branch.isActive)}
                          disabled={branch.id === 1}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            branch.isActive ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-[#F5F2EB] text-[#7A7A7A]'
                          } ${branch.id === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewBranch(branch)} className="p-1.5 rounded-lg hover:bg-[#F4E7C9] hover:text-[#A97A1F] transition-all" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEdit(branch)} className="p-1.5 rounded-lg hover:bg-[#F4E7C9] hover:text-[#A97A1F] transition-all" title="Edit Branch">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(branch.id)} disabled={branch.id === 1} className={`p-1.5 rounded-lg transition-all ${branch.id === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FFEBEE] hover:text-[#B71C1C]'}`} title="Delete Branch">
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

        {/* View Details Modal */}
        {viewBranch && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#E0D8CC' }}>
                <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{viewBranch.name}</h3>
                <button onClick={() => setViewBranch(null)} className="p-1 rounded-lg hover:bg-[#F5F2EB]"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <p className="text-sm"><strong>Address:</strong> {viewBranch.address || 'N/A'}</p>
                <p className="text-sm"><strong>Phone:</strong> {viewBranch.phone || 'N/A'}</p>
                <p className="text-sm"><strong>Email:</strong> {viewBranch.email || 'N/A'}</p>
                <p className="text-sm"><strong>Status:</strong> {viewBranch.isActive ? 'Active' : 'Inactive'}</p>
              </div>
              <button onClick={() => { setViewBranch(null); handleOpenEdit(viewBranch); }} className="w-full py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#A97A1F] to-[#C89B3C]">
                Edit Branch
              </button>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
              <h3 className="text-lg font-bold mb-2">Delete Branch?</h3>
              <p className="text-sm mb-4 text-gray-600">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border rounded-xl font-bold">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchSettings;