import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, X, Building2, 
  MapPin, Phone, Mail, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import authApi from '../../services/authApi';  // ✅ Fixed import
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const BranchForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const { refreshBranches } = useBranch();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  });

  // ── Check authentication ──
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ── Fetch branch data for edit ──
  useEffect(() => {
    if (isEditMode && user) {
      fetchBranch();
    }
  }, [id, user]);

  const fetchBranch = async () => {
    try {
      setPageLoading(true);
      const response = await authApi.getBranch(id);  // ✅ Fixed
      if (response.success) {
        const branch = response.branch;
        setFormData({
          name: branch.name || '',
          address: branch.address || '',
          phone: branch.phone || '',
          email: branch.email || '',
          isActive: branch.isActive !== undefined ? branch.isActive : true
        });
      }
    } catch (err) {
      toast.error('Failed to load branch data');
      navigate('/settings/branches');
    } finally {
      setPageLoading(false);
    }
  };

  // ── Handle Change ──
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ── Handle Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      
      if (isEditMode) {
        response = await authApi.updateBranch(id, formData);  // ✅ Fixed
      } else {
        response = await authApi.createBranch(formData);  // ✅ Fixed
      }
      
      if (response.success) {
        toast.success(response.message || 'Branch saved successfully!');
        
        // ✅ Refresh user and branch context
        await refreshUser();
        await refreshBranches();
        
        // ✅ Navigate back to branch list
        setTimeout(() => {
          navigate('/settings/branches');
        }, 1500);
      }
    } catch (err) {
      console.error('❌ Branch save error:', err);
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#334155' }}>Loading branch...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-3xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/settings/branches')}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: '#F8F5F0' }}
          >
            <ArrowLeft size={20} style={{ color: '#334155' }} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                {isEditMode ? 'Edit Branch' : 'Add Branch'}
              </h1>
              <p className="text-sm font-medium" style={{ color: '#334155' }}>
                {isEditMode ? 'Update branch information' : 'Create a new branch location'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-300 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Branch Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Branch Name <span style={{ color: '#B71C1C' }}>*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter branch name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter branch address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Status
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium" style={{ color: '#334155' }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border focus:ring-2"
                    style={{
                      borderColor: '#CBD5E1',
                      accentColor: '#2563EB'
                    }}
                  />
                  Active
                </label>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  formData.isActive ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-[#F1F5F9] text-slate-400'
                }`}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
              <button
                type="button"
                onClick={() => navigate('/settings/branches')}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-[#F1F5F9]"
                style={{ border: '1px solid #CBD5E1', color: '#334155' }}
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline mr-2" />
                    {isEditMode ? 'Update Branch' : 'Create Branch'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Info Box ── */}
        {isEditMode && (
          <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
            <p className="text-xs font-medium" style={{ color: '#475569' }}>
              <Building2 className="w-4 h-4 inline mr-1.5" style={{ color: '#2563EB' }} />
              Branch ID: <span className="font-bold" style={{ color: '#0F172A' }}>#{id}</span>
              {formData.isActive ? (
                <span className="ml-3 text-[#1B5E20]">● Active</span>
              ) : (
                <span className="ml-3 text-slate-400">● Inactive</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchForm;