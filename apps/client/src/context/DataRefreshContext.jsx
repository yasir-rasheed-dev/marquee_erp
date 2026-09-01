// context/DataRefreshContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useBranch } from './BranchContext';
import authApi from '../services/authApi';
import toast from 'react-hot-toast';

const DataRefreshContext = createContext();

// ── Module-level refresh tracking ──
let globalRefreshPromise = null;

export const DataRefreshProvider = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const { currentBranch, currentCompany, refreshBranchData, loadBranches } = useBranch();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [pendingRefresh, setPendingRefresh] = useState(false);

  // Prevent duplicate refreshes
  const refreshInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Core: Refresh all data on branch/company change ──
  const refreshAllData = useCallback(async (options = {}) => {
    const { silent = false, force = false, reason = 'manual' } = options;

    if (!user) {
      return { success: false, message: 'No user logged in' };
    }

    if (refreshInProgressRef.current && !force) {
      console.log('⏳ Refresh already in progress, queuing...');
      setPendingRefresh(true);
      return { success: false, message: 'Refresh already in progress' };
    }

    // Use global promise deduplication
    if (globalRefreshPromise && !force) {
      try {
        return await globalRefreshPromise;
      } catch (err) {
        // Continue with new refresh if previous failed
      }
    }

    refreshInProgressRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    setPendingRefresh(false);

    if (!silent) {
      toast.loading('Refreshing data...', { id: 'data-refresh', duration: 10000 });
    }

    const startTime = Date.now();

    // Create the refresh promise
    const refreshPromise = (async () => {
      const results = {
        user: false,
        branch: false,
        branches: false,
        company: false,
      };

      try {
        // 1. Refresh user data (to get latest permissions/branch mappings)
        try {
          const userData = await refreshUser();
          if (userData) {
            results.user = true;
            console.log('✅ User data refreshed');
          }
        } catch (err) {
          console.warn('⚠️ User refresh failed:', err.message);
        }

        // 2. Refresh branch list (in case new branches added/removed)
        try {
          const branchResult = await loadBranches(true); // force reload
          if (branchResult?.success) {
            results.branches = true;
            console.log('✅ Branches list refreshed');
          }
        } catch (err) {
          console.warn('⚠️ Branches refresh failed:', err.message);
        }

        // 3. Refresh current branch detailed data
        if (currentBranch?.id) {
          try {
            const branchDetail = await refreshBranchData();
            if (branchDetail) {
              results.branch = true;
              console.log('✅ Branch data refreshed:', currentBranch.name);
            }
          } catch (err) {
            console.warn('⚠️ Branch detail refresh failed:', err.message);
          }
        }

        // 4. Refresh company-related data if applicable
        if (currentCompany?.id) {
          try {
            // You can add company-specific API calls here
            // e.g., await authApi.getCompanyDetails(currentCompany.id);
            results.company = true;
            console.log('✅ Company context verified:', currentCompany.name);
          } catch (err) {
            console.warn('⚠️ Company refresh failed:', err.message);
          }
        }

        const duration = Date.now() - startTime;
        const success = results.user || results.branch || results.branches;

        if (mountedRef.current) {
          setLastRefreshTime(new Date());
        }

        if (!silent) {
          if (success) {
            toast.success('Data refreshed!', {
              id: 'data-refresh',
              duration: 2000,
              position: 'top-right',
            });
          } else {
            toast.error('Partial refresh completed', {
              id: 'data-refresh',
              duration: 3000,
            });
          }
        }

        console.log(`🔄 Refresh completed in ${duration}ms`, results);
        return { success: true, results, duration, reason };

      } catch (err) {
        console.error('❌ Refresh all data error:', err);
        const errorMsg = err.message || 'Failed to refresh data';
        
        if (mountedRef.current) {
          setRefreshError(errorMsg);
        }

        if (!silent) {
          toast.error(errorMsg, {
            id: 'data-refresh',
            duration: 3000,
          });
        }

        return { success: false, error: errorMsg, reason };
      } finally {
        refreshInProgressRef.current = false;
        globalRefreshPromise = null;
        
        // Handle any pending refresh that was queued
        if (mountedRef.current && pendingRefresh) {
          setPendingRefresh(false);
          // Small delay then refresh again if something changed while we were refreshing
          setTimeout(() => {
            if (mountedRef.current) {
              refreshAllData({ silent: true, reason: 'pending-catchup' });
            }
          }, 500);
        }
      }
    })();

    globalRefreshPromise = refreshPromise;
    return await refreshPromise;
  }, [user, currentBranch, currentCompany, refreshUser, refreshBranchData, loadBranches, pendingRefresh]);

  // ── Quick refresh: Only branch-specific data ──
  const refreshBranchOnly = useCallback(async (options = {}) => {
    const { silent = false } = options;
    
    if (!currentBranch?.id) {
      return { success: false, message: 'No branch selected' };
    }

    try {
      if (!silent) {
        toast.loading('Refreshing branch data...', { id: 'branch-refresh', duration: 5000 });
      }

      const results = await Promise.allSettled([
        refreshBranchData(),
        loadBranches(true),
      ]);

      const success = results.some(r => r.status === 'fulfilled' && r.value);

      if (!silent) {
        toast.success('Branch data updated!', {
          id: 'branch-refresh',
          duration: 1500,
        });
      }

      return { success, results };
    } catch (err) {
      console.error('❌ Branch-only refresh error:', err);
      if (!silent) {
        toast.error('Failed to refresh branch data', { id: 'branch-refresh' });
      }
      return { success: false, error: err.message };
    }
  }, [currentBranch, refreshBranchData, loadBranches]);

  // ── Listen for branch changes ──
  useEffect(() => {
    const handleBranchChanged = async (e) => {
      console.log('🔄 Branch change detected, refreshing data...', e.detail);
      await refreshAllData({ 
        silent: true, 
        reason: 'branch-changed',
        force: true 
      });
    };

    const handleCompanyChanged = async (e) => {
      console.log('🏢 Company change detected, refreshing data...', e.detail);
      await refreshAllData({ 
        silent: true, 
        reason: 'company-changed',
        force: true 
      });
    };

    const handleBranchDataRefreshed = (e) => {
      // Another component refreshed branch data, update our timestamp
      if (mountedRef.current) {
        setLastRefreshTime(new Date());
      }
    };

    window.addEventListener('branchChanged', handleBranchChanged);
    window.addEventListener('companyChanged', handleCompanyChanged);
    window.addEventListener('branchDataRefreshed', handleBranchDataRefreshed);

    return () => {
      window.removeEventListener('branchChanged', handleBranchChanged);
      window.removeEventListener('companyChanged', handleCompanyChanged);
      window.removeEventListener('branchDataRefreshed', handleBranchDataRefreshed);
    };
  }, [refreshAllData]);

  // ── Auto-refresh on mount if user exists ──
  useEffect(() => {
    mountedRef.current = true;
    
    if (user?.id && currentBranch?.id) {
      // Delay slightly to let initial renders settle
      const timer = setTimeout(() => {
        refreshAllData({ silent: true, reason: 'mount' });
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
      };
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []); // Only on mount

  // ── Refresh when user comes back online ──
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online, refreshing data...');
      toast.success('Back online! Refreshing data...', { duration: 2000 });
      refreshAllData({ silent: true, reason: 'back-online' });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshAllData]);

  // ── Visibility change (tab switch back) ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastRefreshTime) {
        const timeSinceLastRefresh = Date.now() - new Date(lastRefreshTime).getTime();
        // If last refresh was more than 5 minutes ago, refresh again
        if (timeSinceLastRefresh > 5 * 60 * 1000) {
          console.log('👁️ Tab visible after long time, refreshing...');
          refreshAllData({ silent: true, reason: 'visibility-return' });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastRefreshTime, refreshAllData]);

  const value = {
    isRefreshing,
    lastRefreshTime,
    refreshError,
    pendingRefresh,
    refreshAllData,
    refreshBranchOnly,
    refreshUser: refreshUser,
  };

  return (
    <DataRefreshContext.Provider value={value}>
      {children}
    </DataRefreshContext.Provider>
  );
};

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within DataRefreshProvider');
  }
  return context;
};

export default DataRefreshContext;