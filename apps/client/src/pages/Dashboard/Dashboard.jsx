// pages/Dashboard/Dashboard.jsx — Modern Executive UI & Full Date Range Filtering
// ═════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, DollarSign, TrendingUp, TrendingDown,
  Building2, PartyPopper, Clock, CheckCircle, 
  XCircle, AlertCircle, ArrowUpRight, Crown, Sparkles, 
  Gem, Star, Phone, Wallet, Target, Zap, BarChart3,
  Eye, MessageCircle, Gift, Coffee, Music, Camera,
  Bell, Filter, ChevronDown, Loader2, Send, BellRing,
  RotateCcw, CalendarDays, X, Check, ArrowRight, ShieldCheck,
  CreditCard, UserCheck, Layers, PieChart as PieIcon
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

import { useBranch } from '../../context/BranchContext';

// ── API Services ──
import bookingApi from '../../services/bookingApi';
import hallApi from '../../services/hallApi';
import customerApi from '../../services/customerApi';
import eventApi from '../../services/eventApi';
import ReactSelect from '../../components/ui/ReactSelect';
import UpcomingRemindersDrawer from '../../components/bookings/UpcomingRemindersDrawer';
import WhatsAppModal from '../../components/common/WhatsAppModal';
import OnboardingWidget from '../../components/dashboard/OnboardingWidget';

// ── Helpers ──
const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val || 0);
const formatNumber = (val) => new Intl.NumberFormat('en-PK').format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

const toLocalDateStr = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  return toLocalDateStr(dateStr) === toLocalDateStr(new Date());
};

const getPresetDates = (preset) => {
  const now = new Date();
  if (preset === 'today') {
    const s = toLocalDateStr(now);
    return { start: s, end: s };
  }
  if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const s = toLocalDateStr(yest);
    return { start: s, end: s };
  }
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start: toLocalDateStr(start), end: toLocalDateStr(now) };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  return { start: '', end: '' };
};

// ── Request Deduplication ──
const pendingRequests = new Map();
const dedupedFetch = (key, fetchFn) => {
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const promise = fetchFn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const branchId = currentBranch?.id || 1;

  // ── Data States ──
  const [bookings, setBookings] = useState([]);
  const [halls, setHalls] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Date Range & Filter States ──
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hallFilter, setHallFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Modals & Drawers ──
  const [remindersDrawerOpen, setRemindersDrawerOpen] = useState(false);
  const [remindersData, setRemindersData] = useState({ total: 0, pendingCount: 0, sentCount: 0, bookings: [] });
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [selectedBookingForWhatsApp, setSelectedBookingForWhatsApp] = useState(null);

  // ── Fetch All Data ──
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, hallsRes, customersRes, eventsRes] = await Promise.all([
        dedupedFetch(`bookings-${branchId}`, () => bookingApi.getAll({ branchId }).catch(() => ({ data: { data: [] } }))),
        dedupedFetch(`halls-${branchId}`, () => hallApi.getAll({ branchId }).catch(() => ({ data: { data: [] } }))),
        dedupedFetch(`customers-${branchId}`, () => customerApi.getAll({ branchId }).catch(() => ({ data: { data: [] } }))),
        dedupedFetch(`events-${branchId}`, () => eventApi.getAll({ branchId }).catch(() => ({ data: { data: [] } }))),
      ]);

      const b = bookingsRes?.data?.data || bookingsRes?.data || bookingsRes || [];
      const h = hallsRes?.data?.data || hallsRes?.data || hallsRes || [];
      const c = customersRes?.data?.data || customersRes?.data || customersRes || [];
      const e = eventsRes?.data?.data || eventsRes?.data || eventsRes || [];

      setBookings(Array.isArray(b) ? b : []);
      setHalls(Array.isArray(h) ? h : []);
      setCustomers(Array.isArray(c) ? c : []);
      setEvents(Array.isArray(e) ? e : []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await bookingApi.getUpcomingReminders({ branchId, days: 2, pastDays: 2 });
      const resData = res?.data?.data || res?.data || res || {};
      setRemindersData(resData);
    } catch (e) {
      console.warn('Could not fetch reminders count:', e);
    }
  }, [branchId]);

  useEffect(() => {
    fetchDashboardData();
    fetchReminders();
  }, [fetchDashboardData, fetchReminders]);

  // ── Preset Date Range Handler ──
  const handlePresetSelect = (presetKey) => {
    setDatePreset(presetKey);
    if (presetKey === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const { start, end } = getPresetDates(presetKey);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleCustomDate = (type, val) => {
    setDatePreset('custom');
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
  };

  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setHallFilter('all');
    setEventTypeFilter('all');
    setStatusFilter('all');
  };

  // ── Filtered Bookings Logic ──
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b) return false;

      // 1. Date Range Filter on Event Date
      if (startDate || endDate) {
        if (!b.eventDate) return false;
        const bDateStr = toLocalDateStr(b.eventDate);
        if (startDate && bDateStr < startDate) return false;
        if (endDate && bDateStr > endDate) return false;
      }

      // 2. Hall Filter
      if (hallFilter !== 'all') {
        const bHallId = String(b.hallId || b.hall?.id || '');
        if (bHallId !== String(hallFilter)) return false;
      }

      // 3. Event Type Filter
      if (eventTypeFilter !== 'all' && b.eventType !== eventTypeFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, startDate, endDate, hallFilter, eventTypeFilter, statusFilter]);

  // ── Executive Stats Metrics ──
  const stats = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalPaid = filteredBookings.reduce((sum, b) => sum + (Number(b.paidAmount || b.advanceAmount) || 0), 0);
    const totalDue = Math.max(0, totalRevenue - totalPaid);
    const activeEvents = filteredBookings.filter(b => b.status === 'confirmed').length;
    const totalGuests = filteredBookings.reduce((sum, b) => sum + (Number(b.guestCount) || 0), 0);

    return {
      totalBookings,
      totalRevenue,
      totalPaid,
      totalDue,
      activeEvents,
      totalGuests,
      totalCustomers: customers.length
    };
  }, [filteredBookings, customers]);

  // ── Dynamic Event Types for Filter ──
  const eventTypes = useMemo(() => {
    return [...new Set(bookings.map(b => b.eventType).filter(Boolean))];
  }, [bookings]);

  // ── Revenue Chart Data ──
  const revenueData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data = months.map(m => ({ month: m, revenue: 0, bookings: 0, guests: 0 }));
    
    const sourceList = (startDate || endDate) ? filteredBookings : bookings;

    sourceList.forEach(b => {
      if (!b.eventDate) return;
      const m = new Date(b.eventDate).getMonth();
      data[m].revenue += Number(b.totalAmount) || 0;
      data[m].bookings += 1;
      data[m].guests += Number(b.guestCount) || 0;
    });
    
    return data;
  }, [bookings, filteredBookings, startDate, endDate]);

  // ── Hall Occupancy Breakdown ──
  const hallOccupancy = useMemo(() => {
    return halls.map(h => {
      const hallBookings = filteredBookings.filter(b => b.hallId === h.id || b.hall?.id === h.id);
      const guestSum = hallBookings.reduce((sum, b) => sum + (Number(b.guestCount) || 0), 0);
      const capacity = Number(h.capacity) || 100;
      const percent = Math.min(Math.round((hallBookings.length / Math.max(1, filteredBookings.length)) * 100), 100);

      return {
        id: h.id,
        name: h.name || 'Hall',
        bookings: hallBookings.length,
        guests: guestSum,
        capacity,
        percent
      };
    }).sort((a, b) => b.bookings - a.bookings);
  }, [halls, filteredBookings]);

  // ── Event Type Distribution Donut ──
  const eventTypeData = useMemo(() => {
    const counts = {};
    filteredBookings.forEach(b => {
      const type = b.eventType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    const colors = ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#64748B', '#475569', '#334155'];
    const total = filteredBookings.length || 1;

    return Object.entries(counts).map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      raw: value,
      color: colors[i % colors.length]
    }));
  }, [filteredBookings]);

  // ── Today's Live Venue Pulse ──
  const todaysProgress = useMemo(() => {
    const todayBookings = bookings.filter(b => isToday(b.eventDate));
    const eventsCount = todayBookings.length;
    const guests = todayBookings.reduce((sum, b) => sum + (Number(b.guestCount) || 0), 0);
    const revenue = todayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalCapacity = halls.reduce((sum, h) => sum + (Number(h.capacity) || 0), 0) || 1;
    const occupancy = totalCapacity > 0 ? Math.round((guests / totalCapacity) * 100) : 0;
    return { eventsCount, guests, revenue, occupancy };
  }, [bookings, halls]);

  // ── Schedule Table List ──
  const displaySchedule = useMemo(() => {
    const list = [...filteredBookings];
    list.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    return list.slice(0, 12);
  }, [filteredBookings]);

  const todayFormatted = new Date().toLocaleDateString('en-PK', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const isFilterActive = datePreset !== 'all' || startDate || endDate || hallFilter !== 'all' || eventTypeFilter !== 'all' || statusFilter !== 'all';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-300 shadow-lg max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Loading Dashboard</h3>
          <p className="text-xs text-slate-600 mt-1">Connecting to live venue intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-[#F1F5F9] min-h-screen">
      
      {/* ══════════════════════════════════════════════════════════════
          1. HEADER BAR: Title, Branch Badge, Today Date & Reminders
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-300 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                {currentBranch?.name || 'Main Palace'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Real-time analytics, booking schedules & venue intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">{todayFormatted}</span>
          </div>

          <button
            type="button"
            onClick={() => setRemindersDrawerOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs border ${
              remindersData.pendingCount > 0 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-blue-500/20' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Open WhatsApp Reminder Drawer (Kal & Parson ke Events)"
          >
            <BellRing className={`w-4 h-4 ${remindersData.pendingCount > 0 ? 'animate-bounce text-white' : 'text-slate-500'}`} />
            <span>Reminders</span>
            {remindersData.pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-blue-700 rounded-full text-[10px] font-black">
                {remindersData.pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            title="Refresh Live Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── System Readiness & Onboarding Hub Widget ── */}
      <OnboardingWidget />

      {/* ══════════════════════════════════════════════════════════════
          2. UPCOMING REMINDERS ALERT BANNER (If pending)
          ══════════════════════════════════════════════════════════════ */}
      {remindersData.pendingCount > 0 && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xs shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-950 text-sm">
                  {remindersData.pendingCount} Upcoming Event Reminders Pending
                </h4>
                <span className="text-[11px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-extrabold border border-blue-300">
                  Next 48 Hours
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                Kal aur parson ke programs ke customers ko WhatsApp reminders send karein taake balance clear ho aur arrangements confirm rahein.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRemindersDrawerOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 shrink-0"
          >
            <Send size={14} />
            <span>Open 1-Click Reminder Drawer</span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          3. DATE RANGE & FILTERS COMMAND BAR
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-300 p-5 shadow-xs space-y-4">
        
        {/* Row 1: Quick Preset Buttons + Custom Date Pickers */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Date Range:
            </span>
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: 'Last 7 Days' },
              { key: 'month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
              { key: 'year', label: 'This Year' },
            ].map(preset => {
              const active = datePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetSelect(preset.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Date Pickers: From & To */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDate('start', e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDate('end', e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handlePresetSelect('all')}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Clear Custom Date Range"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Hall, Event Type, Status) & Feedback */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="w-44">
              <ReactSelect
                value={hallFilter}
                onChange={setHallFilter}
                options={[
                  { value: 'all', label: 'All Halls' },
                  ...halls.filter(Boolean).map(h => ({ value: String(h.id), label: h.name }))
                ]}
                placeholder="Hall Filter"
                isSearchable={true}
                isClearable={false}
              />
            </div>

            <div className="w-44">
              <ReactSelect
                value={eventTypeFilter}
                onChange={setEventTypeFilter}
                options={[
                  { value: 'all', label: 'All Event Types' },
                  ...eventTypes.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))
                ]}
                placeholder="Event Type"
                isSearchable={true}
                isClearable={false}
              />
            </div>

            <div className="w-40">
              <ReactSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'tentative', label: 'Tentative' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
                placeholder="Status"
                isSearchable={true}
                isClearable={false}
              />
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Active Period Feedback Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300">
              Showing: <span className="text-blue-600 font-black">{filteredBookings.length}</span> Bookings
              {startDate && endDate && (
                <span className="text-slate-500 font-medium ml-1">({startDate} to {endDate})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          4. HERO KPI STAT METRIC CARDS (Uniform Executive Corporate Theme)
          ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Bookings */}
        <div 
          onClick={() => navigate('/bookings')}
          className="bg-white rounded-3xl border border-slate-300 p-5 hover:shadow-md transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-blue-600" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Period View
            </span>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Total Bookings</h3>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatNumber(stats.totalBookings)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span>Confirmed: <strong className="text-slate-900 font-bold">{stats.activeEvents}</strong></span>
            <span className="flex items-center gap-1 text-blue-600 font-bold group-hover:underline">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div 
          onClick={() => navigate('/reports/finance')}
          className="bg-white rounded-3xl border border-slate-300 p-5 hover:shadow-md transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-blue-600" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Total Inflow
            </span>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Gross Revenue</h3>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span>Collected: <strong className="text-slate-900 font-bold">{formatCurrency(stats.totalPaid)}</strong></span>
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              Due: {formatCurrency(stats.totalDue)}
            </span>
          </div>
        </div>

        {/* Total Guests Served */}
        <div 
          onClick={() => navigate('/events')}
          className="bg-white rounded-3xl border border-slate-300 p-5 hover:shadow-md transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-blue-600" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
              <PartyPopper className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Guests
            </span>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Expected Guests</h3>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatNumber(stats.totalGuests)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span>Across <strong className="text-slate-800">{stats.totalBookings}</strong> events</span>
            <span className="flex items-center gap-1 text-blue-600 font-bold group-hover:underline">
              Capacity Pulse
            </span>
          </div>
        </div>

        {/* Registered Clients */}
        <div 
          onClick={() => navigate('/customers')}
          className="bg-white rounded-3xl border border-slate-300 p-5 hover:shadow-md transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-blue-600" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Clients
            </span>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Client Database</h3>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatNumber(stats.totalCustomers)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span>Registered Venue Clients</span>
            <span className="flex items-center gap-1 text-blue-600 font-bold group-hover:underline">
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5. QUICK ACTIONS STRIP (Fast Venue Operations)
          ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate('/bookings/create')}
          className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-between hover:shadow-md hover:scale-[1.01] transition-all duration-200 shadow-xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span>+ New Booking</span>
          </div>
          <ArrowRight className="w-4 h-4 opacity-80 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/bookings/calendar')}
          className="p-4 rounded-2xl bg-white border border-slate-300 hover:border-blue-600 text-slate-800 font-bold text-xs flex items-center justify-between hover:shadow-sm transition-all duration-200 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span>Event Calendar</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/menus')}
          className="p-4 rounded-2xl bg-white border border-slate-300 hover:border-blue-600 text-slate-800 font-bold text-xs flex items-center justify-between hover:shadow-sm transition-all duration-200 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Gem className="w-4 h-4" />
            </div>
            <span>Menu & Packages</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports/finance')}
          className="p-4 rounded-2xl bg-white border border-slate-300 hover:border-blue-600 text-slate-800 font-bold text-xs flex items-center justify-between hover:shadow-sm transition-all duration-200 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span>Finance & P&L</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          6. CHARTS & OCCUPANCY GRID
          ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-300 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">Revenue & Booking Trends</h3>
                {isFilterActive && (
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    Filtered
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">Monthly revenue trajectory vs confirmed event bookings</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-xs font-bold text-slate-700">Revenue (Rs)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-xs font-bold text-slate-700">Bookings</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748B" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#64748B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.6} />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis yAxisId="left" stroke="#64748B" fontSize={11} tickFormatter={(v) => `Rs ${(v/100000).toFixed(0)}L`} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={11} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value) : value, 
                  name === 'revenue' ? 'Revenue' : 'Bookings'
                ]}
                contentStyle={{ 
                  backgroundColor: '#0F172A', 
                  border: '1px solid #334155', 
                  borderRadius: '16px', 
                  color: '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: '600'
                }} 
              />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#2563EB" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              <Area yAxisId="right" type="monotone" dataKey="bookings" stroke="#64748B" fillOpacity={1} fill="url(#colorBookings)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column: Today's Pulse + Hall Occupancy */}
        <div className="space-y-6">
          
          {/* Today's Live Pulse */}
          <div className="bg-white rounded-3xl border border-slate-300 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Today's Live Venue Pulse
              </h4>
              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Live
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div 
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => navigate('/bookings')}
              >
                <p className="text-2xl font-black text-slate-900">{todaysProgress.eventsCount}</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">Today's Programs</p>
              </div>

              <div 
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => navigate('/bookings')}
              >
                <p className="text-2xl font-black text-slate-900">{formatNumber(todaysProgress.guests)}</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">Expected Guests</p>
              </div>

              <div 
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => navigate('/reports/finance')}
              >
                <p className="text-lg font-black text-slate-900 truncate">{formatCurrency(todaysProgress.revenue)}</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">Today's Inflow</p>
              </div>

              <div 
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => navigate('/settings/halls')}
              >
                <p className="text-2xl font-black text-slate-900">{todaysProgress.occupancy}%</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">Hall Occupancy</p>
              </div>
            </div>
          </div>

          {/* Hall Occupancy Meters */}
          <div className="bg-white rounded-3xl border border-slate-300 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Hall Capacity & Occupancy
              </h4>
              <button 
                onClick={() => navigate('/settings/halls')}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Configure
              </button>
            </div>

            {hallOccupancy.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No halls configured</p>
            ) : (
              <div className="space-y-3">
                {hallOccupancy.map((hall) => (
                  <div key={hall.id} className="p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-slate-100">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800">{hall.name}</span>
                      <span className="font-bold text-blue-600">{hall.bookings} bookings ({hall.guests} guests)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-blue-600" 
                        style={{ width: `${Math.max(10, hall.percent)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Distribution Donut */}
          {eventTypeData.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-300 p-5 shadow-xs">
              <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                Event Type Distribution
              </h4>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="45%" height={120}>
                  <PieChart>
                    <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={4} dataKey="value">
                      {eventTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 max-h-28 overflow-y-auto">
                  {eventTypeData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 truncate max-w-[90px]">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{item.raw} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          7. EVENT SCHEDULE & BOOKINGS TABLE (Filtered by Date Range)
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-300 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-lg">
                Event Schedule & Bookings
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                {filteredBookings.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {startDate && endDate 
                ? `Events between ${startDate} and ${endDate}` 
                : 'Live overview of venue bookings & guest arrangements'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/bookings')} 
              className="px-4 py-2 border border-slate-300 hover:border-blue-600 rounded-xl text-xs font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <span>All Bookings Directory</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {displaySchedule.length === 0 ? (
          <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <h4 className="text-sm font-bold text-slate-800">No events match the selected criteria</h4>
            <p className="text-xs text-slate-500 mt-1">Try resetting the date range or choosing a different hall.</p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="py-3 px-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Event Type</th>
                  <th className="py-3 px-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Date & Time</th>
                  <th className="py-3 px-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Hall</th>
                  <th className="py-3 px-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Guests</th>
                  <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total Amount</th>
                  <th className="py-3 px-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displaySchedule.map((b) => {
                  const customerName = b.customer?.name || b.guestName || b.customerName || 'Guest';
                  const initials = customerName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                  const phone = b.customer?.phone || b.guestPhone || b.phone || 'N/A';
                  const isEventToday = isToday(b.eventDate);

                  return (
                    <tr key={b.id || b.bookingNo} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Customer */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[140px]">{customerName}</p>
                            <p className="text-[11px] text-slate-500 truncate">{phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Event Type */}
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          {b.eventType || 'Event'}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-3">
                        <p className={`text-xs font-bold ${isEventToday ? 'text-blue-600 font-extrabold flex items-center gap-1' : 'text-slate-800'}`}>
                          {isEventToday && <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />}
                          {formatDate(b.eventDate)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {b.startTime ? `${formatTime(b.startTime)} - ${formatTime(b.endTime)}` : (b.shift || 'Full Day')}
                        </p>
                      </td>

                      {/* Hall */}
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {b.hall?.name || b.hallName || 'Assigned Hall'}
                        </span>
                      </td>

                      {/* Guests */}
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {formatNumber(b.guestCount)}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right">
                        <p className="text-xs font-black text-slate-900">{formatCurrency(b.totalAmount)}</p>
                        {Number(b.dueAmount) > 0 && (
                          <p className="text-[10px] font-bold text-rose-600">Due: {formatCurrency(b.dueAmount)}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block capitalize ${
                          b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          b.status === 'in_progress' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          b.status === 'completed' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          b.status === 'cancelled' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                          'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {b.status || 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForWhatsApp(b);
                              setWhatsAppModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Send WhatsApp Reminder / Update"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => navigate(`/bookings/${b.id}`)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                            title="View Booking Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          8. 1-CLICK REMINDERS DRAWER (48h Upcoming Reminders)
          ══════════════════════════════════════════════════════════════ */}
      <UpcomingRemindersDrawer
        isOpen={remindersDrawerOpen}
        onClose={() => setRemindersDrawerOpen(false)}
        branchId={branchId}
        onReminderSent={fetchReminders}
      />

      {/* ══════════════════════════════════════════════════════════════
          9. WHATSAPP SENDER MODAL (For Table Rows)
          ══════════════════════════════════════════════════════════════ */}
      {whatsAppModalOpen && selectedBookingForWhatsApp && (
        <WhatsAppModal
          isOpen={whatsAppModalOpen}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setSelectedBookingForWhatsApp(null);
          }}
          booking={selectedBookingForWhatsApp}
          defaultType="reminder"
          onSuccess={() => {
            fetchDashboardData();
            fetchReminders();
          }}
        />
      )}

    </div>
  );
}
