// src/pages/Onboarding/Onboarding.jsx
// Simple, clean, minimalist System Setup Checklist

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, ArrowRight, RefreshCw, 
  HelpCircle, Sparkles, Building2
} from 'lucide-react';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';

const Onboarding = () => {
  const navigate = useNavigate();
  const {
    loading,
    steps,
    totalSteps,
    completedSteps,
    percentage,
    refreshStatus
  } = useOnboardingStatus();

  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'

  const filteredSteps = steps.filter((s) => {
    if (filter === 'pending') return !s.isCompleted;
    if (filter === 'completed') return s.isCompleted;
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-2">
      {/* ── Simple Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            System Setup Checklist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete the essential steps below before creating bookings and issuing contracts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Checking...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Clean Progress Bar Card ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="font-semibold text-slate-800">
            Setup Progress: {completedSteps} of {totalSteps} Completed
          </span>
          <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
            {percentage}% Ready
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* ── Filter Buttons ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Steps ({totalSteps})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pending ({totalSteps - completedSteps})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'completed'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Completed ({completedSteps})
        </button>
      </div>

      {/* ── Clean Step List ── */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-xs overflow-hidden">
        {filteredSteps.map((step) => {
          const isDone = step.isCompleted;

          return (
            <div
              key={step.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
            >
              {/* Step info */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : step.order}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">
                      {step.title}
                    </h3>

                    {step.isCritical && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded">
                        Required
                      </span>
                    )}

                    {isDone ? (
                      <span className="px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200">
                        ✓ {step.countLabel}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-md">
                        Not added yet
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    {step.whyNeeded}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end shrink-0 pl-10 sm:pl-0">
                <button
                  type="button"
                  onClick={() => navigate(step.route)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    isDone
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <span>Go</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredSteps.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No steps found for this filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
