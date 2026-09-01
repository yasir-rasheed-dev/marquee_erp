import { Bell, Search, Settings, ChevronDown, LogOut, User, Building2, Check, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import toast from 'react-hot-toast';

const Header = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { 
    branches, 
    currentBranch, 
    switchBranch, 
    loading: branchLoading, 
    refreshBranchData,
    setCurrentBranch 
  } = useBranch();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const branchButtonRef = useRef(null);
  const [branchDropdownPos, setBranchDropdownPos] = useState(null);

  // ── Sync with BranchContext and localStorage on mount ──
  useEffect(() => {
    // First check if we have a branch in localStorage
    const storedBranch = localStorage.getItem('selectedBranch');
    if (storedBranch) {
      try {
        const branch = JSON.parse(storedBranch);
        // Check if this branch exists in the branches list
        const exists = branches.some(b => b.id === branch.id);
        if (exists) {
          setSelectedBranch(branch);
          // Also update context if needed
          if (!currentBranch || currentBranch.id !== branch.id) {
            setCurrentBranch(branch);
          }
          return;
        } else {
          // Branch doesn't exist anymore, remove from localStorage
          localStorage.removeItem('selectedBranch');
        }
      } catch (e) {
        localStorage.removeItem('selectedBranch');
      }
    }

    // If no stored branch or branch doesn't exist, use currentBranch from context
    if (currentBranch) {
      setSelectedBranch(currentBranch);
      // Store it for persistence
      localStorage.setItem('selectedBranch', JSON.stringify(currentBranch));
    }
  }, [branches, currentBranch, setCurrentBranch]);

  // ── Handle Branch Change ──
  const handleBranchChange = async (branch) => {
    if (isSwitching || selectedBranch?.id === branch.id) {
      setIsDropdownOpen(false);
      return;
    }

    setIsSwitching(true);
    setIsDropdownOpen(false);

    try {
      // 1. Switch branch in context (toast is handled inside switchBranch)
      await switchBranch(branch);
      
      // 2. Update selected branch state
      setSelectedBranch(branch);
      
      // 3. Persist to localStorage
      localStorage.setItem('selectedBranch', JSON.stringify(branch));

      // 4. Trigger refresh for all components
      window.dispatchEvent(new CustomEvent('branchChanged', { 
        detail: { branchId: branch.id, branchName: branch.name }
      }));

      // 5. If on dashboard, force refresh
      if (location.pathname === '/dashboard') {
        window.location.reload(); // Only reload if on dashboard to refresh all data
      }

    } catch (error) {
      console.error('Branch switch error:', error);
      toast.error('Failed to switch branch. Please try again.');
    } finally {
      setIsSwitching(false);
    }
  };

  // ── Handle Logout ──
  const handleLogout = async () => {
    try {
      // Clear branch selection on logout
      localStorage.removeItem('selectedBranch');
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  // ── Calculate branch dropdown position (bulletproof) ──
  useEffect(() => {
    if (!isDropdownOpen) return;
    const updatePos = () => {
      if (branchButtonRef.current) {
        const rect = branchButtonRef.current.getBoundingClientRect();
        setBranchDropdownPos({
          top: rect.bottom + 8,
          left: rect.left,
          width: Math.max(rect.width, 288),
        });
      }
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isDropdownOpen]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Get user initials ──
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ── Get current branch name ──
  const getBranchName = () => {
    if (selectedBranch) return selectedBranch.name;
    if (currentBranch) return currentBranch.name;
    return branchLoading ? 'Loading...' : 'Select Branch';
  };

  // ── Refresh current branch data ──
  const handleRefreshBranch = async () => {
    if (selectedBranch) {
      toast.loading('Refreshing branch data...', { id: 'refresh-branch' });
      try {
        await refreshBranchData();
        toast.success('Branch data refreshed!', { id: 'refresh-branch', duration: 2000 });
        // Trigger refresh for all components
        window.dispatchEvent(new CustomEvent('branchDataRefreshed', {
          detail: { branchId: selectedBranch.id }
        }));
      } catch (error) {
        toast.error('Failed to refresh branch data', { id: 'refresh-branch' });
      }
    }
  };

  return (
    <header 
      className={`fixed top-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-[#ECE8DF] 
        flex items-center justify-between px-6 z-40 transition-all duration-300
        ${sidebarCollapsed ? 'left-[80px]' : 'left-[280px]'}`}
    >
      {/* ── Left Side: Search + Branch Selector ── */}
      <div className="flex items-center gap-4 flex-1">
        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input 
            type="text" 
            placeholder="Search anything..."
            className="w-full pl-9 pr-4 py-2 text-sm text-[#1F2937] bg-[#FAF8F4] border border-[#ECE8DF] rounded-xl 
              focus:bg-white focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/20 transition-all duration-300 
              placeholder:text-[#9CA3AF] outline-none"
          />
        </div>

        {/* ── Branch Selector ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            ref={branchButtonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={branchLoading || isSwitching}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-[#ECE8DF] bg-white 
              hover:border-[#C89B3C] transition-all duration-300 shadow-sm 
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isSwitching ? 'animate-pulse' : ''}`}
          >
            {isSwitching ? (
              <RefreshCw className="w-4 h-4 text-[#C89B3C] animate-spin" />
            ) : (
              <Building2 className="w-4 h-4 text-[#C89B3C]" />
            )}
            <span className="text-sm font-medium text-[#1F2937] max-w-[120px] truncate">
              {isSwitching ? 'Switching...' : getBranchName()}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && branchDropdownPos &&
            createPortal(
              <div
                ref={dropdownRef}
                className="bg-white rounded-xl border border-[#ECE8DF] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-2 max-h-72 overflow-y-auto"
                style={{
                  position: 'fixed',
                  top: branchDropdownPos.top,
                  left: branchDropdownPos.left,
                  width: branchDropdownPos.width,
                  zIndex: 99999,
                }}
              >
                <div className="px-4 py-2 border-b border-[#F0ECE6] flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Select Branch</p>
                  <span className="text-[10px] text-[#6B7280]">{branches.length} branches</span>
                </div>
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchChange(branch)}
                    disabled={isSwitching}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all hover:bg-[#FAF8F4] 
                      ${selectedBranch?.id === branch.id ? 'bg-[#F4E7C9]' : ''}
                      ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className={`w-4 h-4 shrink-0 ${selectedBranch?.id === branch.id ? 'text-[#C89B3C]' : 'text-[#6B7280]'}`} />
                      <span className={`font-medium truncate ${selectedBranch?.id === branch.id ? 'text-[#1F2937]' : 'text-[#4A4A4A]'}`}>
                        {branch.name}
                      </span>
                      {branch.isMain && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#F4E7C9] text-[#8B6914] shrink-0">
                          Main
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {branch._count?.users > 0 && (
                        <span className="text-[10px] text-[#6B7280]">
                          {branch._count.users} users
                        </span>
                      )}
                      {selectedBranch?.id === branch.id && (
                        <Check className="w-4 h-4 text-[#C89B3C]" />
                      )}
                    </div>
                  </button>
                ))}
                {branches.length === 0 && !branchLoading && (
                  <div className="px-4 py-6 text-center">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-[#B0A89C]" />
                    <p className="text-sm text-[#6B7280]">No branches available</p>
                    <button 
                      onClick={() => navigate('/settings/branches')}
                      className="mt-2 text-xs font-medium text-[#C89B3C] hover:underline"
                    >
                      Create a branch
                    </button>
                  </div>
                )}
                {branchLoading && (
                  <div className="px-4 py-4 text-center">
                    <div className="w-5 h-5 border-2 border-[#C89B3C] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-[#6B7280] mt-2">Loading branches...</p>
                  </div>
                )}
              </div>,
              document.body
            )}
        </div>

        {/* ── Current Branch Badge ── */}
        {selectedBranch && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4E7C9] border border-[#C89B3C]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] animate-pulse" />
            <span className="text-xs font-medium text-[#8B6914]">
              {selectedBranch.name}
            </span>
            <button 
              onClick={handleRefreshBranch}
              className="ml-1 p-0.5 rounded-full hover:bg-[#C89B3C]/20 transition-colors"
              title="Refresh branch data"
            >
              <RefreshCw className="w-3 h-3 text-[#8B6914]" />
            </button>
          </div>
        )}
      </div>

      {/* ── Right Side: Actions + Profile ── */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button className="relative p-2.5 rounded-xl hover:bg-[#F7F2E8] transition-all duration-300 group">
          <Bell className="w-5 h-5 text-[#6B7280] group-hover:text-[#C89B3C] transition-colors" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#D64545] rounded-full border-2 border-white shadow-[0_0_8px_rgba(214,69,69,0.4)]" />
        </button>

        {/* Settings */}
        <button 
          onClick={() => navigate('/settings/company')}
          className="p-2.5 rounded-xl hover:bg-[#F7F2E8] transition-all duration-300 group"
        >
          <Settings className="w-5 h-5 text-[#6B7280] group-hover:text-[#C89B3C] transition-colors" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[#ECE8DF] mx-1" />

        {/* ── User Profile ── */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 pl-2 group cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-[#C89B3C] to-[#DDB35A] 
              flex items-center justify-center text-white font-semibold text-sm 
              shadow-[0_4px_12px_rgba(200,155,60,0.25)] group-hover:shadow-[0_4px_16px_rgba(200,155,60,0.35)] 
              transition-all duration-300`}
            >
              {getUserInitials()}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-[#1F2937]">{user?.name || 'User'}</p>
              <p className="text-xs text-[#6B7280] capitalize">{user?.role || 'Staff'}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#6B7280] group-hover:text-[#C89B3C] transition-all duration-300 ${
              isProfileOpen ? 'rotate-180' : ''
            }`} />
          </div>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-[#ECE8DF] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-[#F0ECE6]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C89B3C] to-[#DDB35A] 
                    flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(200,155,60,0.2)]">
                    {getUserInitials()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1F2937] truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-[#6B7280] capitalize">{user?.role || 'Staff'}</p>
                    <p className="text-xs text-[#6B7280] truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </div>

              {/* Branch Info */}
              <div className="px-4 py-2 border-b border-[#F0ECE6]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-xs font-medium text-[#4A4A4A]">
                    Branch: <span className="font-bold text-[#1F2937]">{selectedBranch?.name || 'Not assigned'}</span>
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate('/settings/company');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#4A4A4A] hover:bg-[#FAF8F4] transition-all"
              >
                <User className="w-4 h-4" />
                My Profile
              </button>
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate('/settings/company');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#4A4A4A] hover:bg-[#FAF8F4] transition-all"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              
              {/* Admin Only: Branch Management */}
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/settings/branches');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#4A4A4A] hover:bg-[#FAF8F4] transition-all"
                >
                  <Building2 className="w-4 h-4" />
                  Manage Branches
                </button>
              )}
              
              <div className="border-t border-[#F0ECE6] my-1" />
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B71C1C] hover:bg-[#FFEBEE] transition-all font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;