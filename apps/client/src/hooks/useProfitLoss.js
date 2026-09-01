// hooks/useProfitLoss.js
import { useState, useCallback } from 'react';
import reportApi from '../services/reportApi';

export const useProfitLoss = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = useCallback(async ({ fromDate, toDate, branchId }) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await reportApi.getProfitLoss({ fromDate, toDate, branchId });
      
      if (result.success) {
        setReport(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
    } catch (err) {
      setError(err.message);
      console.error('P&L Hook Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQuickSummary = useCallback(async ({ fromDate, toDate }) => {
    setLoading(true);
    try {
      const result = await reportApi.getQuickSummary({ fromDate, toDate });
      return result.success ? result.data : null;
    } catch (err) {
      console.error('Quick Summary Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    report,
    loading,
    error,
    generateReport,
    generateQuickSummary,
    isProfit: report ? report.netProfit >= 0 : null,
  };
};