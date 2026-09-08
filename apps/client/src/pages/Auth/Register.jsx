// pages/Register.jsx - Updated with Company fields
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Mail, Lock, Phone, 
  Crown, ArrowRight, Eye, EyeOff,
  CheckCircle, AlertCircle, Building2, MapPin
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading, error, user } = useAuth();
  
  const [formData, setFormData] = useState({
    // ── Company Fields ──
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    
    // ── Admin Fields ──
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'admin'  // ✅ Default admin
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  // ── Redirect if already logged in ──
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // ── Handle Change ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  // ── Validate Form ──
  const validateForm = () => {
    // Company validation
    if (!formData.companyName.trim()) {
      setLocalError('Company name is required');
      return false;
    }
    
    // Admin validation
    if (!formData.name.trim()) {
      setLocalError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setLocalError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    return true;
  };

  // ── Handle Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess(false);

    if (!validateForm()) return;

    // ✅ Complete data - Company + Admin
    const submitData = {
      // Company Data
      companyName: formData.companyName.trim(),
      companyAddress: formData.companyAddress.trim() || null,
      companyPhone: formData.companyPhone.trim() || null,
      
      // Admin Data
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: 'admin',  // ✅ Always admin for registration
      phone: formData.phone || null
    };

    console.log('📤 Sending registration data:', submitData);
    
    const result = await register(submitData);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } else {
      setLocalError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_4px_16px_rgba(37,99,235,0.3)]">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                Marquee<span className="text-blue-600">ERP</span>
              </h1>
              <p className="text-xs font-medium" style={{ color: '#475569' }}>Marquee Management System</p>
            </div>
          </div>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-300 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Register Your Company</h2>
            <p className="text-sm font-medium" style={{ color: '#475569' }}>
              Create your company account and get started
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#E8F5E9' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#1B5E20' }} />
              <span className="text-sm font-medium" style={{ color: '#1B5E20' }}>
                Company registered successfully! Redirecting...
              </span>
            </div>
          )}

          {/* Error Message */}
          {(localError || error) && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#FFEBEE' }}>
              <AlertCircle className="w-5 h-5" style={{ color: '#B71C1C' }} />
              <span className="text-sm font-medium" style={{ color: '#B71C1C' }}>
                {localError || error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── COMPANY SECTION ── */}
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#2563EB' }}>
                Company Details
              </p>
            </div>

            {/* Company Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Company Name <span style={{ color: '#B71C1C' }}>*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g., Grand Palace Marquee"
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

            {/* Company Address */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Company Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4" style={{ color: '#475569' }} />
                <textarea
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Enter company address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm resize-none"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Company Phone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Company Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="tel"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  placeholder="042-1234567"
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

            {/* ── ADMIN SECTION ── */}
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#2563EB' }}>
                Admin Account
              </p>
            </div>

            {/* Admin Full Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Admin Name <span style={{ color: '#B71C1C' }}>*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter admin full name"
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

            {/* Admin Email */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Admin Email <span style={{ color: '#B71C1C' }}>*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@company.com"
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

            {/* Password */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Password <span style={{ color: '#B71C1C' }}>*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" style={{ color: '#475569' }} />
                  ) : (
                    <Eye className="w-4 h-4" style={{ color: '#475569' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Confirm Password <span style={{ color: '#B71C1C' }}>*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    focusRingColor: 'rgba(37,99,235,0.2)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" style={{ color: '#475569' }} />
                  ) : (
                    <Eye className="w-4 h-4" style={{ color: '#475569' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Admin Phone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>
                Admin Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0300-1234567"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 rounded-xl font-bold text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering Company...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Register Company <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium" style={{ color: '#475569' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-bold transition-colors hover:underline text-blue-600">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-medium mt-4" style={{ color: '#475569' }}>
          © 2026 Marquee Management System — All rights reserved
        </p>
      </div>
    </div>
  );
};

export default Register;