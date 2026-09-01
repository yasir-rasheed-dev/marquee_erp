import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, UserPlus, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, toggleTestMode, user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Redirect if already logged in ──
 useEffect(() => {
  if (user) {
    const intended = localStorage.getItem('intendedRoute') || '/dashboard';
    localStorage.removeItem('intendedRoute');
    navigate(intended);
  }
}, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(form.email, form.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="w-full max-w-md rounded-2xl border p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]" style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC' }}>
        
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_16px_rgba(169,122,31,0.3)]">
            <Crown className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
            Raath <span style={{ color: '#A97A1F' }}>ERP</span>
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: '#7A7A7A' }}>Marquee Management System</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm font-medium" style={{ backgroundColor: '#FFEBEE', color: '#B71C1C' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold mb-1.5 block" style={{ color: '#4A4A4A' }}>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@raath.com"
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20 transition-all"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
            />
          </div>

          <div>
            <label className="text-sm font-bold mb-1.5 block" style={{ color: '#4A4A4A' }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20 transition-all"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E0D8CC', color: '#1A1A1A' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-all"
                style={{ color: '#7A7A7A' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition-all bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)] hover:shadow-[0_4px_20px_rgba(169,122,31,0.4)] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading || authLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <><LogIn size={16} /> Sign In</>
            )}
          </button>
        </form>

        {/* ── Register Link ── */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium" style={{ color: '#7A7A7A' }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-bold transition-all hover:underline inline-flex items-center gap-1"
              style={{ color: '#A97A1F' }}
            >
              <UserPlus size={14} /> Create Account
            </Link>
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="mt-6 pt-4 border-t flex items-center gap-3" style={{ borderColor: '#F0ECE6' }}>
          <div className="flex-1 h-px" style={{ backgroundColor: '#F0ECE6' }} />
          <span className="text-xs font-medium" style={{ color: '#B0A89C' }}>OR</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#F0ECE6' }} />
        </div>

        {/* ── Test Mode Toggle ── */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              toggleTestMode(true);
              navigate('/dashboard');
            }}
            className="text-xs font-medium px-4 py-2 rounded-xl transition-all hover:scale-[1.02]"
            style={{ backgroundColor: '#F5F2EB', color: '#4A4A4A' }}
          >
            🧪 Enter Test Mode (No Login)
          </button>
          <p className="text-[10px] font-medium mt-1.5" style={{ color: '#B0A89C' }}>
            Test mode mein sab pages access honge bina login ke
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-medium" style={{ color: '#B0A89C' }}>
            © 2026 Raath ERP — All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}