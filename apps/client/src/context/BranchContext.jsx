// context/BranchContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import authApi from '../services/authApi';
import toast from 'react-hot-toast';

const BranchContext = createContext();

// ── Request deduplication ──
let pendingRequest = null;
let requestCache = null;
const CACHE_TTL = 30000; // 30 seconds

const getCachedBranches = () => {
  if (requestCache && Date.now() - requestCache.timestamp < CACHE_TTL) {
    return requestCache.data;
  }
  return null;
};

const setCachedBranches = (data) => {
  requestCache = { data, timestamp: Date.now() };
};

export const BranchProvider = ({ children }) => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // Prevent duplicate concurrent calls
  const fetchingRef = useRef(false);
  const loadAttemptedRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Get current branch from localStorage ──
  const getStoredBranch = useCallback(() => {
    try {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  // ── Get current company from localStorage ──
  const getStoredCompany = useCallback(() => {
    try {
      const saved = localStorage.getItem('selectedCompany');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  // ── Load branches with deduplication ──
  const loadBranches = useCallback(async (force = false) => {
    if (!user) {
      setLoading(false);
      return { success: false, message: 'No user' };
    }

    // Check cache first
    if (!force) {
      const cached = getCachedBranches();
      if (cached) {
        setBranches(cached);
        // Restore current branch from localStorage
        const storedBranch = getStoredBranch();
        if (storedBranch) {
          const foundBranch = cached.find(b => b.id === storedBranch.id);
          if (foundBranch) {
            setCurrentBranch(prev => prev?.id === foundBranch.id ? prev : foundBranch);
          } else if (cached.length > 0) {
            setCurrentBranch(cached[0]);
            localStorage.setItem('selectedBranch', JSON.stringify(cached[0]));
          }
        } else if (cached.length > 0) {
          setCurrentBranch(cached[0]);
          localStorage.setItem('selectedBranch', JSON.stringify(cached[0]));
        }
        setLoading(false);
        return { success: true, data: cached };
      }
    }

    // Prevent duplicate calls
    if (fetchingRef.current && !force) {
      return { success: false, message: 'Already fetching' };
    }

    // Use pending request promise for deduplication
    if (pendingRequest && !force) {
      try {
        const result = await pendingRequest;
        return result;
      } catch (err) {
        // If pending request failed, continue with new request
      }
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Create the request promise
      const requestPromise = (async () => {
        const response = await authApi.getBranches();
        return response;
      })();

      pendingRequest = requestPromise;
      const response = await requestPromise;
      pendingRequest = null;

      if (response?.success) {
        const branchList = response.branches || response.data || [];
        
        // Cache the result
        setCachedBranches(branchList);
        
        if (mountedRef.current) {
          setBranches(branchList);
        }

        // Set current branch - prioritize stored branch
        const storedBranch = getStoredBranch();
        let selectedBranch = null;
        
        if (storedBranch) {
          const foundBranch = branchList.find(b => b.id === storedBranch.id);
          if (foundBranch) {
            selectedBranch = foundBranch;
          } else if (branchList.length > 0) {
            selectedBranch = branchList[0];
          }
        } else if (branchList.length > 0) {
          selectedBranch = branchList[0];
        }

        if (selectedBranch && mountedRef.current) {
          setCurrentBranch(prev => prev?.id === selectedBranch.id ? prev : selectedBranch);
          localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
        }

        // Set current company
        const storedCompany = getStoredCompany();
        if (storedCompany && mountedRef.current) {
          setCurrentCompany(prev => prev?.id === storedCompany.id ? prev : storedCompany);
        } else if (user?.companyId && mountedRef.current) {
          const company = {
            id: user.companyId,
            name: user.company?.name || 'Company'
          };
          setCurrentCompany(company);
          localStorage.setItem('selectedCompany', JSON.stringify(company));
        }

        if (mountedRef.current) {
          setLoading(false);
        }
        return { success: true, data: branchList };
      } else {
        const errorMsg = response?.message || 'Failed to load branches';
        if (mountedRef.current) {
          setError(errorMsg);
          setLoading(false);
        }
        return { success: false, message: errorMsg };
      }
    } catch (err) {
      console.error('❌ Load branches error:', err);
      const errorMsg = err.message || 'Failed to load branches';
      if (mountedRef.current) {
        setError(errorMsg);
        setLoading(false);
      }
      return { success: false, message: errorMsg };
    } finally {
      fetchingRef.current = false;
      if (pendingRequest === null) {
        // Only clear if it's our request
      }
    }
  }, [user, getStoredBranch, getStoredCompany]);

  // ── Load branches only once when user changes ──
  useEffect(() => {
    mountedRef.current = true;
    
    if (user?.id && !loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      loadBranches();
    } else if (!user) {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id]); // Only depend on user.id

  // ── Switch branch ──
  const switchBranch = useCallback(async (branch) => {
    if (!branch) return;
    
    if (isSwitching) {
      return { success: false, message: 'Already switching' };
    }
    
    if (currentBranch?.id === branch.id) {
      return { success: true, branch: currentBranch, message: 'Already on this branch' };
    }

    setIsSwitching(true);
    
    try {
      setCurrentBranch(branch);
      localStorage.setItem('selectedBranch', JSON.stringify(branch));
      
      if (branch.company && (!currentCompany || branch.company.id !== currentCompany.id)) {
        const company = {
          id: branch.company.id,
          name: branch.company.name
        };
        setCurrentCompany(company);
        localStorage.setItem('selectedCompany', JSON.stringify(company));
      }
      
      window.dispatchEvent(new CustomEvent('branchChanged', { 
        detail: { branchId: branch.id, branchName: branch.name }
      }));
      
      toast.success(`Switched to ${branch.name}`, {
        duration: 2000,
        position: 'top-right',
        id: 'branch-switch'
      });
      
      return { success: true, branch };
      
    } catch (err) {
      console.error('❌ Switch branch error:', err);
      toast.error(err.message || 'Failed to switch branch', {
        id: 'branch-switch-error'
      });
      throw err;
    } finally {
      setIsSwitching(false);
    }
  }, [currentBranch, currentCompany, isSwitching]);

  // ── Switch company ──
  const switchCompany = useCallback(async (company) => {
    if (!company) return;
    
    if (currentCompany?.id === company.id) {
      return { success: true, company: currentCompany };
    }

    try {
      setLoading(true);
      setCurrentCompany(company);
      localStorage.setItem('selectedCompany', JSON.stringify(company));
      
      const companyBranches = branches.filter(b => b.companyId === company.id);
      if (companyBranches.length > 0) {
        await switchBranch(companyBranches[0]);
      }
      
      window.dispatchEvent(new CustomEvent('companyChanged', { 
        detail: { companyId: company.id, companyName: company.name }
      }));
      
      toast.success(`Switched to ${company.name}`, {
        duration: 2000,
        position: 'top-right'
      });
      
    } catch (err) {
      console.error('❌ Switch company error:', err);
      toast.error(err.message || 'Failed to switch company');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [branches, currentCompany, switchBranch]);

  // ── Create new branch ──
  const createBranch = useCallback(async (branchData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.createBranch(branchData);
      
      if (response?.success) {
        const newBranch = response.branch || response.data;
        setBranches(prev => [...prev, newBranch]);
        // Invalidate cache
        requestCache = null;
        await switchBranch(newBranch);
        toast.success('Branch created successfully!');
        return newBranch;
      } else {
        throw new Error(response?.message || 'Failed to create branch');
      }
    } catch (err) {
      console.error('❌ Create branch error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create branch';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [switchBranch]);

  // ── Update branch ──
  const updateBranch = useCallback(async (id, branchData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.updateBranch(id, branchData);
      
      if (response?.success) {
        const updatedBranch = response.branch || response.data;
        setBranches(prev => prev.map(b => b.id === id ? updatedBranch : b));
        // Invalidate cache
        requestCache = null;
        
        if (currentBranch?.id === id) {
          setCurrentBranch(updatedBranch);
          localStorage.setItem('selectedBranch', JSON.stringify(updatedBranch));
        }
        
        toast.success('Branch updated successfully!');
        return updatedBranch;
      } else {
        throw new Error(response?.message || 'Failed to update branch');
      }
    } catch (err) {
      console.error('❌ Update branch error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update branch';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentBranch]);

  // ── Delete branch ──
  const deleteBranch = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.deleteBranch(id);
      
      if (response?.success) {
        setBranches(prev => prev.filter(b => b.id !== id));
        // Invalidate cache
        requestCache = null;
        
        if (currentBranch?.id === id) {
          const remainingBranches = branches.filter(b => b.id !== id);
          if (remainingBranches.length > 0) {
            await switchBranch(remainingBranches[0]);
          } else {
            setCurrentBranch(null);
            localStorage.removeItem('selectedBranch');
          }
        }
        toast.success('Branch deleted successfully!');
      } else {
        throw new Error(response?.message || 'Failed to delete branch');
      }
    } catch (err) {
      console.error('❌ Delete branch error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete branch';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [branches, currentBranch, switchBranch]);

  // ── Refresh branch data ──
  const refreshBranchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Invalidate cache and force reload
      requestCache = null;
      const result = await loadBranches(true);
      
      if (result?.success && currentBranch) {
        // Try to refresh current branch details if needed
        try {
          const response = await authApi.getBranch(currentBranch.id);
          if (response?.success) {
            const refreshedBranch = response.branch || response.data;
            setCurrentBranch(refreshedBranch);
            localStorage.setItem('selectedBranch', JSON.stringify(refreshedBranch));
          }
        } catch (err) {
          // Silent fail for branch detail refresh
          console.warn('Could not refresh branch details:', err);
        }
      }
      
      window.dispatchEvent(new CustomEvent('branchDataRefreshed', {
        detail: { branchId: currentBranch?.id }
      }));
      
      toast.success('Branch data refreshed!', {
        duration: 2000,
        position: 'top-right'
      });
      return true;
    } catch (err) {
      console.error('❌ Refresh branch data error:', err);
      const errorMsg = err.message || 'Failed to refresh branch data';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentBranch, loadBranches]);

  const refreshBranches = useCallback(async () => {
    requestCache = null;
    return await loadBranches(true);
  }, [loadBranches]);

  const getBranchesByCompany = useCallback((companyId) => {
    return branches.filter(b => b.companyId === companyId);
  }, [branches]);

  const getBranchById = useCallback((branchId) => {
    return branches.find(b => b.id === branchId) || null;
  }, [branches]);

  const hasBranchAccess = useCallback((branchId) => {
    if (isSuperAdmin?.()) return true;
    if (isAdmin?.()) {
      const branch = getBranchById(branchId);
      return branch && branch.companyId === currentCompany?.id;
    }
    return currentBranch?.id === branchId;
  }, [isAdmin, isSuperAdmin, currentBranch, currentCompany, getBranchById]);

  const hasCompanyAccess = useCallback((companyId) => {
    if (isSuperAdmin?.()) return true;
    return currentCompany?.id === companyId;
  }, [isSuperAdmin, currentCompany]);

  // ── Listen for branch changes from other tabs ──
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'selectedBranch' && e.newValue) {
        try {
          const branch = JSON.parse(e.newValue);
          if (branch && (!currentBranch || branch.id !== currentBranch.id)) {
            setCurrentBranch(branch);
            window.dispatchEvent(new CustomEvent('branchChanged', { 
              detail: { branchId: branch.id, branchName: branch.name }
            }));
          }
        } catch (err) {
          // Ignore parse error
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentBranch]);

  const value = {
    branches,
    currentBranch,
    currentCompany,
    loading,
    error,
    isSwitching,
    setCurrentBranch,
    switchBranch,
    switchCompany,
    createBranch,
    updateBranch,
    deleteBranch,
    refreshBranches,
    refreshBranchData,
    getBranchesByCompany,
    getBranchById,
    hasBranchAccess,
    hasCompanyAccess,
    isBranchSelected: !!currentBranch,
    isCompanySelected: !!currentCompany,
    branchCount: branches.length,
    companyCount: [...new Set(branches.map(b => b.companyId))].length,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
};

export default BranchContext;