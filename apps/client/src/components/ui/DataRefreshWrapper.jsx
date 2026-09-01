import React, { useEffect } from 'react';
import { useDataRefresh } from '../../context/DataRefreshContext';
import { baseApi } from '../../services/baseApi';

const DataRefreshWrapper = ({ children }) => {
  const { refreshKey, lastUpdated } = useDataRefresh();

  useEffect(() => {
    // 🧹 Force clear baseApi cache immediately on branch switch
    baseApi.clearCache();
    
    try {
      sessionStorage.removeItem('cachedData');
    } catch (e) {
      // Ignore
    }

    console.log('🔄 Branch switched / Data refreshed:', {
      branchId: lastUpdated?.branchId,
      source: lastUpdated?.source,
      time: lastUpdated?.time
    });
  }, [refreshKey, lastUpdated]);

  return children;
};

export default DataRefreshWrapper;