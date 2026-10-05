// src/components/dashboard/OnboardingWidget.jsx
// Quick Setup & System Readiness Card for Main Dashboard

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, 
  ChevronDown, ChevronUp, Compass, ExternalLink, ShieldCheck
} from 'lucide-react';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';

const OnboardingWidget = () => {
  const navigate = useNavigate();
  const {
    loading,
    steps,
    totalSteps,
    completedSteps,
    percentage,
    criticalStepsCount,
    completedCriticalCount,
    isReadyForBooking
  } = useOnboardingStatus();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('marquee_onboarding_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('marquee_onboarding_collapsed', String(next));
  };

  // Only show if not 100% or user hasn't completely dismissed
  const pendingSteps = steps.filter(s => !s.isCompleted);

  // If 100% completed and user collapsed, keep it minimal
  return (
    <div className="w-full bg-gradient-to-r from-blue-900/10 via-slate-900/5 to-blue-950/10 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                System Readiness & Onboarding
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                {percentage}% Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {completedSteps} of {totalSteps} modules configured ({completedCriticalCount}/{criticalStepsCount} critical required)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <span>Full Setup Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title={collapsed ? 'Expand Guide' : 'Collapse Guide'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="mt-3 w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* ── Expandable Step Shortcuts ── */}
      {!collapsed && (
        <div className="mt-4 pt-4 border-t border-slate-200/80">
          <div className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center justify-between">
            <span>
              {pendingSteps.length > 0 ? 'Pending Setup Action Items:' : 'All Setup Items Configured!'}
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              Direct access with [ Go → ]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(pendingSteps.length > 0 ? pendingSteps.slice(0, 3) : steps.slice(0, 3)).map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${step.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {step.countLabel}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(step.route)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 transition-colors shrink-0"
                >
                  <span>Go</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingWidget;
