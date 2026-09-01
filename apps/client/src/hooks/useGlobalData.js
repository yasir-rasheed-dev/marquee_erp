// hooks/useGlobalData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';

// ── Module-level cache & deduplication ──
const globalCache = new Map();
const pendingRequests = new Map();
const DEFAULT_CACHE_TTL = 30000; // 30 seconds
const DEFAULT_STALE_TTL = 5 * 60 * 1000; // 5 minutes

const generateCacheKey = (fetcherName, params, branchId, companyId) => {
  const paramsKey = JSON.stringify(params || {});
  return `${fetcherName}::${branchId || 'nobranch'}::${companyId || 'nocompany'}::${paramsKey}`;
};

const getCached = (key, ttl = DEFAULT_CACHE_TTL) => {
  const cached = globalCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttl) {
    globalCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCached = (key, data) => {
  globalCache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (pattern) => {
  if (!pattern) {
    globalCache.clear();
    return;
  }
  for (const key of globalCache.keys()) {
    if (key.includes(pattern)) {
      globalCache.delete(key);
    }
  }
};

/**
 * useGlobalData — Dual Signature Hook
 * 
 * SIGNATURE 1 (Legacy — used in your app):
 *   const { data, loading, refetch } = useGlobalData(
 *     async (branchId) => { ... },
 *     { dependencies: [search, currentBranch?.id], onError: fn }
 *   );
 * 
 * SIGNATURE 2 (Modern):
 *   const { data, loading, refetch } = useGlobalData(
 *     api.getBookings,
 *     { status: 'confirmed' },
 *     { cacheTime: 30000 }
 *   );
 */
const useGlobalData = (fetcherOrApi, paramsOrOptions = {}, maybeOptions = {}) => {
  const { currentBranch, currentCompany, loading: branchLoading } = useBranch();
  const { user, loading: authLoading } = useAuth();

  // ═══════════════════════════════════════════════════════
  // DETECT WHICH SIGNATURE IS BEING USED
  // ═══════════════════════════════════════════════════════
  const isLegacySignature = 
    typeof paramsOrOptions === 'object' &&
    paramsOrOptions !== null &&
    !maybeOptions?.cacheTime && // not passing modern options in 3rd arg
    (
      Array.isArray(paramsOrOptions.dependencies) ||
      typeof paramsOrOptions.onError === 'function' ||
      typeof paramsOrOptions.onSuccess === 'function' ||
      paramsOrOptions.enabled !== undefined
    );

  let fetcher, params, options;

  if (isLegacySignature) {
    // ── LEGACY: useGlobalData(fetcher, options) ──
    fetcher = fetcherOrApi;
    params = {};
    options = {
      dependencies: paramsOrOptions.dependencies || [],
      onError: paramsOrOptions.onError,
      onSuccess: paramsOrOptions.onSuccess,
      enabled: paramsOrOptions.enabled !== false,
      cacheTime: paramsOrOptions.cacheTime || DEFAULT_CACHE_TTL,
      staleTime: paramsOrOptions.staleTime || DEFAULT_STALE_TTL,
      retryCount: paramsOrOptions.retryCount || 1,
      retryDelay: paramsOrOptions.retryDelay || 1000,
      refetchOnBranchChange: paramsOrOptions.refetchOnBranchChange !== false,
      silent: paramsOrOptions.silent || false,
      transform: paramsOrOptions.transform,
      skipBranchCheck: paramsOrOptions.skipBranchCheck || false,
    };
  } else {
    // ── MODERN: useGlobalData(apiFunction, params, options) ──
    fetcher = fetcherOrApi;
    params = paramsOrOptions || {};
    options = {
      enabled: maybeOptions.enabled !== false,
      cacheTime: maybeOptions.cacheTime || DEFAULT_CACHE_TTL,
      staleTime: maybeOptions.staleTime || DEFAULT_STALE_TTL,
      retryCount: maybeOptions.retryCount || 1,
      retryDelay: maybeOptions.retryDelay || 1000,
      refetchOnBranchChange: maybeOptions.refetchOnBranchChange !== false,
      refetchOnWindowFocus: maybeOptions.refetchOnWindowFocus || false,
      silent: maybeOptions.silent || false,
      transform: maybeOptions.transform,
      onSuccess: maybeOptions.onSuccess,
      onError: maybeOptions.onError,
      skipBranchCheck: maybeOptions.skipBranchCheck || false,
    };
  }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Only enable when branch is ready (unless skipBranchCheck)
  const isBranchReady = options.skipBranchCheck || !!currentBranch?.id;
  const isAuthReady = !!user?.id && !authLoading;
  const isReady = options.enabled && isAuthReady && !branchLoading && isBranchReady;

  // Generate cache key
  const fetcherName = fetcher?.name || fetcher?.toString?.().slice(0, 50) || 'anonymous';
  const cacheKey = generateCacheKey(
    fetcherName,
    isLegacySignature ? options.dependencies : params,
    currentBranch?.id,
    currentCompany?.id
  );

  // ═══════════════════════════════════════════════════════
  // CORE FETCH
  // ═══════════════════════════════════════════════════════
  const fetchData = useCallback(async (opts = {}) => {
    const { force = false, skipCache = false, isBackground = false } = opts;

    if (!fetcher) {
      return { success: false, message: 'No fetcher provided' };
    }

    if (!isReady && !force) {
      return { success: false, message: 'Not ready — waiting for branch/auth' };
    }

    // Prevent duplicate concurrent fetches
    if (fetchingRef.current && !force) {
      const existing = pendingRequests.get(cacheKey);
      if (existing) {
        try { return await existing; } catch (e) { /* continue */ }
      }
    }

    // Check cache
    if (!skipCache && !force) {
      const cached = getCached(cacheKey, options.cacheTime);
      if (cached) {
        const isDataStale = lastFetchTimeRef.current 
          ? (Date.now() - lastFetchTimeRef.current > options.staleTime)
          : false;
        
        if (mountedRef.current) {
          setData(cached);
          setError(null);
          if (isDataStale) setIsStale(true);
        }
        
        if (isDataStale && !isBackground) {
          fetchData({ force: true, isBackground: true }).catch(() => {});
        }
        return { success: true, data: cached, fromCache: true };
      }
    }

    try {
      fetchingRef.current = true;
      if (!isBackground && mountedRef.current) {
        setLoading(true);
      }

      // ── CALL FETCHER BASED ON SIGNATURE ──
      let result;
      
      if (isLegacySignature) {
        // Legacy: fetcher(branchId) — passes branchId as first arg
        result = await fetcher(currentBranch?.id);
      } else {
        // Modern: fetcher(params) — passes merged params object
        const requestParams = { ...params };
        if (currentBranch?.id) requestParams.branchId = currentBranch.id;
        if (currentCompany?.id) requestParams.companyId = currentCompany.id;
        result = await fetcher(requestParams);
      }

      pendingRequests.delete(cacheKey);

      if (!mountedRef.current) return { success: true, data: result };

      let finalData = result;

      // Handle common API wrappers
      if (result?.success !== undefined) {
        finalData = result.data ?? result.branches ?? result.bookings ?? 
                    result.halls ?? result.assets ?? result.transactions ?? 
                    result.items ?? result.users ?? result.sales ?? 
                    result.events ?? result.result ?? result;
      }

      // Apply transform
      if (options.transform && typeof options.transform === 'function') {
        finalData = options.transform(finalData);
      }

      setData(finalData);
      setError(null);
      setIsStale(false);
      lastFetchTimeRef.current = Date.now();
      setCached(cacheKey, finalData);

      if (options.onSuccess && typeof options.onSuccess === 'function') {
        options.onSuccess(finalData);
      }

      return { success: true, data: finalData };

    } catch (err) {
      console.error(`❌ useGlobalData error [${fetcherName}]:`, err);
      pendingRequests.delete(cacheKey);

      if (!mountedRef.current) return { success: false, error: err };

      const errorMsg = err?.response?.data?.message || err.message || 'Failed to fetch data';
      setError(errorMsg);

      if (options.onError && typeof options.onError === 'function') {
        options.onError(err);
      }

      return { success: false, error: err, message: errorMsg };
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [
    fetcher,
    isLegacySignature,
    isReady,
    cacheKey,
    currentBranch?.id,
    currentCompany?.id,
    // For legacy, include dependencies in deps
    ...(isLegacySignature ? options.dependencies : []),
    // For modern, stringify params
    ...(isLegacySignature ? [] : [JSON.stringify(params)]),
  ]);

  // ── Retry wrapper ──
  const fetchWithRetry = useCallback(async (opts = {}) => {
    let lastError;
    for (let i = 0; i <= options.retryCount; i++) {
      try {
        const result = await fetchData(opts);
        if (result.success) return result;
        lastError = result.error;
      } catch (err) {
        lastError = err;
      }
      if (i < options.retryCount) {
        await new Promise(r => setTimeout(r, options.retryDelay * (i + 1)));
      }
    }
    throw lastError;
  }, [fetchData, options.retryCount, options.retryDelay]);

  // ── Public refetch ──
  const refetch = useCallback(async (opts = {}) => {
    return await fetchWithRetry({ force: true, ...opts });
  }, [fetchWithRetry]);

  // ── Mutate (optimistic update) ──
  const mutate = useCallback((newData) => {
    if (typeof newData === 'function') {
      setData(prev => newData(prev));
    } else {
      setData(newData);
      setCached(cacheKey, newData);
    }
  }, [cacheKey]);

  // ═══════════════════════════════════════════════════════
  // INITIAL FETCH
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    mountedRef.current = true;
    
    if (isReady && fetcher) {
      const timer = setTimeout(() => {
        fetchWithRetry().catch(() => {});
      }, 100);
      
      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
      };
    }
    
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, fetcher, cacheKey, ...(isLegacySignature ? options.dependencies : [JSON.stringify(params)])]);

  // ═══════════════════════════════════════════════════════
  // REFETCH ON BRANCH CHANGE
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!options.refetchOnBranchChange || !initialLoadDone.current) return;
    
    const handleBranchChanged = () => {
      console.log(`🔄 useGlobalData [${fetcherName}]: Branch changed, refetching...`);
      fetchWithRetry({ force: true, skipCache: true }).catch(() => {});
    };

    window.addEventListener('branchChanged', handleBranchChanged);
    return () => window.removeEventListener('branchChanged', handleBranchChanged);
  }, [options.refetchOnBranchChange, fetcherName, fetchWithRetry]);

  // ═══════════════════════════════════════════════════════
  // WINDOW FOCUS REFETCH (modern only)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!options.refetchOnWindowFocus || !isReady) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = lastFetchTimeRef.current 
          ? Date.now() - lastFetchTimeRef.current 
          : Infinity;
        
        if (timeSinceLastFetch > options.staleTime) {
          fetchWithRetry({ force: true, isBackground: true }).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [options.refetchOnWindowFocus, isReady, options.staleTime, fetchWithRetry]);

  // ═══════════════════════════════════════════════════════
  // GLOBAL REFRESH EVENT
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const handleGlobalRefresh = (e) => {
      const { reason, silent: eventSilent } = e.detail || {};
      console.log(`🔄 useGlobalData [${fetcherName}]: Global refresh (${reason})`);
      fetchWithRetry({ 
        force: true, 
        skipCache: true,
        isBackground: eventSilent !== false 
      }).catch(() => {});
    };

    window.addEventListener('globalDataRefresh', handleGlobalRefresh);
    return () => window.removeEventListener('globalDataRefresh', handleGlobalRefresh);
  }, [fetchWithRetry, fetcherName]);

  // Track initial load
  useEffect(() => {
    if (data !== null || error !== null) {
      initialLoadDone.current = true;
    }
  }, [data, error]);

  return {
    data,
    loading: loading || branchLoading,
    error,
    isStale,
    refetch,
    mutate,
    // Backward compatibility aliases
    isLoading: loading || branchLoading,
    isError: !!error,
    isSuccess: !!data && !error,
  };
};

// ── Static utilities ──
useGlobalData.clearCache = clearCache;
useGlobalData.clearAllCache = () => globalCache.clear();

export default useGlobalData;