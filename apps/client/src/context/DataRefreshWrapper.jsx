// components/DataRefreshWrapper.jsx
import React, { useEffect, useRef } from 'react';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * DataRefreshWrapper
 * 
 * Ye component app ke andar wrap kiya jata hai. Ye ensure karta hai ke:
 * 1. Jab bhi branch switch ho, saari data automatically refresh ho
 * 2. Loading states properly handle hon
 * 3. Error cases mein fallback ho
 * 4. Multiple rapid switches ko debounce kiya jaye
 */
const DataRefreshWrapper = ({ children }) => {
  const { isRefreshing, refreshAllData, refreshBranchOnly } = useDataRefresh();
  const { currentBranch, currentCompany, isSwitching: isBranchSwitching } = useBranch();
  const { user, loading: authLoading } = useAuth();

  const previousBranchId = useRef(null);
  const previousCompanyId = useRef(null);
  const initialLoadDone = useRef(false);
  const debounceTimer = useRef(null);

  // ── Handle branch switch: Auto refresh data ──
  useEffect(() => {
    if (authLoading || !user?.id) return;
    if (!currentBranch?.id) return;

    const currentBranchId = currentBranch.id;
    const currentCompanyId = currentCompany?.id;

    // Skip on initial mount (DataRefreshProvider handles that)
    if (!initialLoadDone.current) {
      previousBranchId.current = currentBranchId;
      previousCompanyId.current = currentCompanyId;
      initialLoadDone.current = true;
      return;
    }

    // Check if branch actually changed
    const branchChanged = previousBranchId.current !== currentBranchId;
    const companyChanged = previousCompanyId.current !== currentCompanyId;

    if (branchChanged || companyChanged) {
      // Clear any pending debounce
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Debounce rapid switches (user might be clicking through branches quickly)
      debounceTimer.current = setTimeout(async () => {
        // Show user-friendly message
        if (branchChanged) {
          toast(`Loading ${currentBranch.name} data...`, {
            icon: '🏢',
            duration: 2000,
            position: 'top-right',
          });
        }

        // Refresh all data for new branch/company
        try {
          await refreshAllData({ 
            silent: true, 
            force: true,
            reason: branchChanged ? 'wrapper-branch-change' : 'wrapper-company-change'
          });
        } catch (err) {
          console.error('❌ Wrapper refresh failed:', err);
          toast.error('Failed to load branch data. Please refresh manually.', {
            duration: 4000,
          });
        }

        // Update refs
        previousBranchId.current = currentBranchId;
        previousCompanyId.current = currentCompanyId;
      }, 300); // 300ms debounce
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [currentBranch?.id, currentCompany?.id, user?.id, authLoading, refreshAllData]);

  // ── Handle branch switching loading state ──
  useEffect(() => {
    if (isBranchSwitching) {
      document.body.style.cursor = 'wait';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      document.body.style.cursor = 'default';
    };
  }, [isBranchSwitching]);

  // ── Keyboard shortcut: Ctrl+R for manual refresh ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+R or Cmd+Shift+R for full refresh
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        toast.promise(
          refreshAllData({ silent: false, force: true, reason: 'keyboard-shortcut' }),
          {
            loading: 'Refreshing all data...',
            success: 'Data refreshed successfully!',
            error: 'Failed to refresh data',
          }
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshAllData]);

  // ── Expose refresh function globally for debugging ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__refreshAppData = refreshAllData;
      window.__refreshBranchData = refreshBranchOnly;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__refreshAppData;
        delete window.__refreshBranchData;
      }
    };
  }, [refreshAllData, refreshBranchOnly]);

  return (
    <>
      {/* Optional: Global loading indicator when refreshing */}
      {(isRefreshing || isBranchSwitching) && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #f59e0b, #1E40AF)',
            zIndex: 9999,
            animation: 'dataRefreshPulse 1.5s ease-in-out infinite',
          }}
        >
          <style>{`
            @keyframes dataRefreshPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      )}
      {children}
    </>
  );
};

export default DataRefreshWrapper;