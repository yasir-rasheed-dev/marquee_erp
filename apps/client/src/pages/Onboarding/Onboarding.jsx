// src/pages/Onboarding/Onboarding.jsx
// Dedicated System Readiness & Client Onboarding Hub

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  Building2, Landmark, Utensils, Scale, Box, Layers, BookOpenCheck,
  ConciergeBell, Boxes, CalendarPlus, ChevronRight, HelpCircle,
  Clock, ShieldAlert, Award, Compass, ExternalLink
} from 'lucide-react';
import { useOnboardingStatus, ONBOARDING_STAGES } from '../../hooks/useOnboardingStatus';
import { useBranch } from '../../context/BranchContext';

const getStepIcon = (id) => {
  switch (id) {
    case 'halls': return Building2;
    case 'accounts': return Landmark;
    case 'events': return Compass;
    case 'units': return Scale;
    case 'rawMaterials': return Box;
    case 'menuItems': return Layers;
    case 'recipes': return BookOpenCheck;
    case 'services': return ConciergeBell;
    case 'packages': return Boxes;
    case 'bookings': return CalendarPlus;
    default: return Sparkles;
  }
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const {
    loading,
    steps,
    totalSteps,
    completedSteps,
    percentage,
    criticalStepsCount,
    completedCriticalCount,
    isReadyForBooking,
    refreshStatus
  } = useOnboardingStatus();

  const [activeTab, setActiveTab] = useState('all');
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  const filteredSteps = steps.filter((s) => {
    if (filterPendingOnly && s.isCompleted) return false;
    if (activeTab === 'all') return true;
    return s.stage === activeTab;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Top Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E3A8A] text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Marquee ERP System Readiness Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Client Onboarding & Initial Setup Guide
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Configure your marquee step-by-step before taking bookings. Each step directly links to the respective module with live verification of your saved data.
            </p>
            {currentBranch?.name && (
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                <span>Active Branch:</span>
                <span className="font-semibold text-slate-200">{currentBranch.name}</span>
              </div>
            )}
          </div>

          {/* ── Readiness Progress Card ── */}
          <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-slate-900/60 border border-slate-700/80 backdrop-blur-sm min-w-[240px]">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-700"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-blue-500 transition-all duration-700 ease-out"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white">{percentage}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Ready</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <div className="text-xs font-semibold text-slate-200">
                {completedSteps} of {totalSteps} Steps Configured
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {completedCriticalCount} of {criticalStepsCount} Critical Required
              </div>
            </div>

            <button
              onClick={refreshStatus}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Checking status...' : 'Refresh Status'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Readiness Alert Banner ── */}
      {isReadyForBooking ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                System is Ready for Live Bookings! 🎉
              </h3>
              <p className="text-xs text-emerald-700">
                Your halls, accounts, and menu/packages are configured. You can start creating customer bookings and contracts right now.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/bookings/create')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            <span>Create Booking Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Foundational Setup Needed ({criticalStepsCount - completedCriticalCount} Critical Step(s) Pending)
              </h3>
              <p className="text-xs text-amber-700">
                To create a booking without errors, please configure at least 1 Hall and 1 Payment Account.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-md self-start sm:self-center">
            Action Required
          </span>
        </div>
      )}

      {/* ── Filters & Stage Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Stage Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ONBOARDING_STAGES.map((stage) => {
            const isActive = activeTab === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveTab(stage.id)}
                className={`
                  px-3 py-1.5 text-xs font-semibold rounded-lg transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}
                `}
              >
                {stage.label}
              </button>
            );
          })}
        </div>

        {/* Incomplete toggle */}
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
          <input
            type="checkbox"
            checked={filterPendingOnly}
            onChange={(e) => setFilterPendingOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span>Show Pending Only</span>
        </label>
      </div>

      {/* ── Steps List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSteps.map((step) => {
          const IconComponent = getStepIcon(step.id);
          const isDone = step.isCompleted;

          return (
            <div
              key={step.id}
              className={`
                relative flex flex-col justify-between p-5 rounded-xl border transition-all duration-200
                ${isDone
                  ? 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                  : 'bg-white border-blue-200/90 shadow-sm hover:shadow-md hover:border-blue-400 ring-1 ring-blue-50/50'}
              `}
            >
              {/* Header inside card */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors
                        ${isDone 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                          : 'bg-blue-50 text-blue-600 border border-blue-200'}
                      `}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">Step {step.order}</span>
                        {step.isCritical && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200">
                            Required
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{step.timeEst}</span>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {step.title}
                      </h3>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Configured</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800 border border-amber-200 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>

                {/* Live Count Detail */}
                <div className="my-2 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Live Status:</span>
                  <span className={`font-semibold ${isDone ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {step.countLabel}
                  </span>
                </div>

                {/* Explanation */}
                <p className="text-xs text-slate-600 leading-relaxed mb-2">
                  <span className="font-semibold text-slate-700">Why it matters: </span>
                  {step.whyNeeded}
                </p>

                {/* Quick Tip */}
                <p className="text-[11px] text-slate-500 italic bg-blue-50/40 p-2 rounded border border-blue-100/50">
                  💡 {step.emptyTip}
                </p>
              </div>

              {/* Action Footer with Prominent GO Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  {step.route}
                </span>

                <button
                  type="button"
                  onClick={() => navigate(step.route)}
                  className={`
                    group inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm
                    ${isDone
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow'}
                  `}
                >
                  <span>{isDone ? 'Manage / View' : 'Setup Now'}</span>
                  <span className="font-extrabold flex items-center gap-0.5">
                    <span>Go</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Knowledge & Best Practice Tip ── */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Optimal Onboarding Sequence (Marquee ERP Standard Workflow)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Order of execution:</strong> Halls & Accounts → Units & Raw Materials → Menu Items → Recipe Costing → Services & Packages → Live Bookings. By setting up recipes, whenever a customer books a package, the kitchen sheet automatically calculates exact ingredient quantities (e.g. 50kg Rice, 60kg Chicken) needed for the event!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
