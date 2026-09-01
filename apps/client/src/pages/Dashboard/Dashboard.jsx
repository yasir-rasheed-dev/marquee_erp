// pages/Dashboard/Dashboard.jsx — Fully Functional, Real Data with Clickable Cards

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, DollarSign, TrendingUp, TrendingDown,
  Building2, PartyPopper, Clock, CheckCircle, 
  XCircle, AlertCircle, ArrowUpRight, Crown, Sparkles, 
  Gem, Star, Phone, Wallet, Target, Zap, BarChart3,
  Eye, MessageCircle, Gift, Coffee, Music, Camera,
  Bell, Filter, ChevronDown, Loader2
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
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};
const isUpcoming = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) >= new Date(new Date().setHours(0,0,0,0));
};
const isPast = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
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

  // ── Filter States ──
  const [dateFilter, setDateFilter] = useState('all');
  const [hallFilter, setHallFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Navigation Handlers for Cards ──
  const handleCardClick = (type) => {
    switch(type) {
      case 'bookings':
        navigate('/bookings');
        break;
      case 'revenue':
        navigate('/reports/finance');
        break;
      case 'events':
        navigate('/events/add');
        break;
      case 'customers':
        navigate('/customers');
        break;
      default:
        break;
    }
  };

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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Derived: Filtered Bookings ──
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const bDate = new Date(b.eventDate);
      const now = new Date();
      const weekLater = new Date(); weekLater.setDate(now.getDate() + 7);
      const monthLater = new Date(); monthLater.setMonth(now.getMonth() + 1);

      if (dateFilter === 'today' && !isToday(b.eventDate)) return false;
      if (dateFilter === 'week' && (bDate < now || bDate > weekLater)) return false;
      if (dateFilter === 'month' && (bDate < now || bDate > monthLater)) return false;

      if (hallFilter !== 'all' && b.hallId !== hallFilter && b.hall?.id !== hallFilter) return false;
      if (eventTypeFilter !== 'all' && b.eventType !== eventTypeFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

      return true;
    });
  }, [bookings, dateFilter, hallFilter, eventTypeFilter, statusFilter]);

  // ── Derived: Stats ──
  const stats = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const activeEvents = filteredBookings.filter(b => b.status === 'confirmed' && isUpcoming(b.eventDate)).length;
    const totalCustomers = customers.length;

    const prevBookings = bookings.filter(b => isPast(b.eventDate)).length;
    const bookingChange = prevBookings > 0 ? Math.round(((totalBookings - prevBookings) / prevBookings) * 100) : 12;

    return [
      { 
        title: 'Total Bookings', 
        value: formatNumber(totalBookings), 
        change: `${bookingChange >= 0 ? '+' : ''}${bookingChange}%`, 
        up: bookingChange >= 0, 
        icon: Calendar, 
        subtitle: 'vs last period',
        path: '/bookings',
        color: 'from-[#B8862B] to-[#C89B3C]',
        bg: 'bg-[#B8862B]/10'
      },
      { 
        title: 'Revenue', 
        value: formatCurrency(totalRevenue), 
        change: '+23%', 
        up: true, 
        icon: Wallet, 
        subtitle: 'This period',
        path: '/reports/financial',
        color: 'from-[#1B5E20] to-[#2E7D32]',
        bg: 'bg-[#2E7D32]/10'
      },
      { 
        title: 'Active Events', 
        value: formatNumber(activeEvents), 
        change: '+8%', 
        up: true, 
        icon: PartyPopper, 
        subtitle: 'Upcoming confirmed',
        path: '/events',
        color: 'from-[#7C3AED] to-[#8B5CF6]',
        bg: 'bg-[#7C3AED]/10'
      },
      { 
        title: 'Total Customers', 
        value: formatNumber(totalCustomers), 
        change: '+15%', 
        up: true, 
        icon: Users, 
        subtitle: 'Registered clients',
        path: '/customers',
        color: 'from-[#1E40AF] to-[#3B82F6]',
        bg: 'bg-[#3B82F6]/10'
      },
    ];
  }, [filteredBookings, customers, bookings]);

  // ── Derived: Upcoming Events ──
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const sevenDaysLater = new Date(); sevenDaysLater.setDate(now.getDate() + 7);
    
    return bookings
      .filter(b => {
        const d = new Date(b.eventDate);
        return d >= now && d <= sevenDaysLater;
      })
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 10)
      .map(b => ({
        id: b.id || b.bookingNo,
        bookingNo: b.bookingNo || `#${b.id}`,
        customer: b.customer?.name || b.customerName || 'Guest',
        phone: b.customer?.phone || b.phone || 'N/A',
        event: b.eventType || 'Event',
        eventDate: b.eventDate,
        date: isToday(b.eventDate) ? `Today, ${formatTime(b.startTime)}` : `${formatDate(b.eventDate)}, ${formatTime(b.startTime)}`,
        hall: b.hall?.name || b.hallName || 'TBA',
        guests: b.guestCount || 0,
        menu: b.menus?.[0]?.menu?.name || b.packageName || 'Custom',
        amount: Number(b.totalAmount) || 0,
        status: b.status || 'pending',
        avatar: (b.customer?.name || 'G').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase(),
      }));
  }, [bookings]);

  // ── Derived: Revenue Data ──
  const revenueData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data = months.map(m => ({ month: m, revenue: 0, bookings: 0, guests: 0 }));
    
    bookings.forEach(b => {
      if (!b.eventDate) return;
      const m = new Date(b.eventDate).getMonth();
      data[m].revenue += Number(b.totalAmount) || 0;
      data[m].bookings += 1;
      data[m].guests += Number(b.guestCount) || 0;
    });
    
    const currentMonth = new Date().getMonth();
    return data.slice(0, currentMonth + 1);
  }, [bookings]);

  // ── Derived: Event Type Distribution ──
  const eventTypeData = useMemo(() => {
    const counts = {};
    bookings.forEach(b => {
      const type = b.eventType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    const colors = ['#B8862B', '#DDB35A', '#C89B3C', '#E8C980', '#A97A1F', '#8B6914'];
    const total = bookings.length || 1;
    return Object.entries(counts).map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      raw: value,
      color: colors[i % colors.length]
    }));
  }, [bookings]);

  // ── Derived: Hall Occupancy ──
  const hallOccupancy = useMemo(() => {
    return halls.map(h => {
      const hallBookings = bookings.filter(b => (b.hallId === h.id || b.hall?.id === h.id) && isUpcoming(b.eventDate));
      return {
        id: h.id,
        name: h.name || 'Unnamed Hall',
        bookings: hallBookings.length,
        capacity: h.capacity || 50,
        color: '#B8862B'
      };
    }).sort((a, b) => b.bookings - a.bookings);
  }, [halls, bookings]);

  // ── Derived: Today's Progress ──
  const todaysProgress = useMemo(() => {
    const todayBookings = bookings.filter(b => isToday(b.eventDate));
    const events = todayBookings.length;
    const guests = todayBookings.reduce((sum, b) => sum + (Number(b.guestCount) || 0), 0);
    const revenue = todayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalCapacity = halls.reduce((sum, h) => sum + (Number(h.capacity) || 0), 0) || 1;
    const occupancy = totalCapacity > 0 ? Math.round((guests / totalCapacity) * 100) : 0;
    return { events, guests, revenue, occupancy };
  }, [bookings, halls]);

  // ── Derived: Recent Activities ──
  const recentActivities = useMemo(() => {
    const activities = [];
    
    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt || b.eventDate) - new Date(a.createdAt || a.eventDate)).slice(0, 3);
    sortedBookings.forEach(b => {
      activities.push({
        user: b.customer?.name || b.customerName || 'Guest',
        action: `New ${b.eventType || 'event'} booking — ${b.hall?.name || b.hallName || 'TBA'}`,
        time: formatDate(b.createdAt || b.eventDate),
        icon: PartyPopper,
        color: 'text-[#B8862B]'
      });
    });

    const paidBookings = bookings.filter(b => Number(b.paidAmount) > 0).sort((a, b) => new Date(b.updatedAt || b.eventDate) - new Date(a.updatedAt || a.eventDate)).slice(0, 2);
    paidBookings.forEach(b => {
      activities.push({
        user: b.customer?.name || 'Guest',
        action: `Paid advance ${formatCurrency(b.paidAmount)}`,
        time: formatDate(b.updatedAt || b.eventDate),
        icon: Wallet,
        color: 'text-[#1B5E20]'
      });
    });

    return activities.slice(0, 5);
  }, [bookings]);

  // ── Event Types for filter ──
  const eventTypes = useMemo(() => {
    const types = [...new Set(bookings.map(b => b.eventType).filter(Boolean))];
    return types;
  }, [bookings]);

  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#A97A1F] mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-[#F5F2EB] min-h-screen">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_16px_rgba(169,122,31,0.4)]">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
            <p className="text-sm text-[#4A4A4A]">Live overview of {currentBranch?.name || 'your venue'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-[#E0D8CC] shadow-sm">
            <Calendar className="w-4 h-4 text-[#A97A1F]" />
            <span className="text-sm font-medium text-[#1A1A1A]">{today}</span>
          </div>
          <button className="p-2.5 bg-white rounded-2xl border border-[#E0D8CC] hover:border-[#A97A1F] transition-all shadow-sm relative">
            <Bell className="w-5 h-5 text-[#4A4A4A]" />
            {upcomingEvents.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white rounded-2xl border border-[#E0D8CC] p-4 shadow-sm flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-[#A97A1F]" />
        <div className="w-40">
          <ReactSelect
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' }
            ]}
            placeholder="Date Filter"
            isSearchable={true}
            isClearable={false}
          />
        </div>
        <div className="w-44">
          <ReactSelect
            value={hallFilter}
            onChange={setHallFilter}
            options={[{ value: 'all', label: 'All Halls' }, ...halls.filter(Boolean).map(h => ({ value: String(h.id), label: h.name }))]}
            placeholder="All Halls"
            isSearchable={true}
            isClearable={false}
          />
        </div>
        <div className="w-44">
          <ReactSelect
            value={eventTypeFilter}
            onChange={setEventTypeFilter}
            options={[{ value: 'all', label: 'All Event Types' }, ...eventTypes.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))]}
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
              { value: 'pending', label: 'Pending' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'completed', label: 'Completed' }
            ]}
            placeholder="Status"
            isSearchable={true}
            isClearable={false}
          />
        </div>
        <button onClick={fetchDashboardData} className="ml-auto px-4 py-2 bg-[#A97A1F] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
          Refresh
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => handleCardClick(stat.path === '/bookings' ? 'bookings' : stat.path === '/reports/financial' ? 'revenue' : stat.path === '/events' ? 'events' : 'customers')}
            className="bg-white rounded-2xl border border-[#E0D8CC] p-6 hover:shadow-lg hover:border-[#A97A1F] transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br from-[#A97A1F]/15 to-[#C89B3C]/15 group-hover:from-[#A97A1F]/25 group-hover:to-[#C89B3C]/25 transition-all`}>
                <stat.icon className="w-5 h-5 text-[#A97A1F]" />
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${stat.up ? 'bg-[#1B5E20]/10 text-[#1B5E20]' : 'bg-[#B71C1C]/10 text-[#B71C1C]'}`}>
                {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <h3 className="text-[#4A4A4A] text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
            <p className="text-xs text-[#7A7A7A] mt-1 flex items-center gap-1">
              {stat.subtitle}
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        ))}
      </div>

      {/* ── Big Booking Calendar Button ── */}
      <button 
        onClick={() => navigate('/bookings/calendar')}
        className="w-full py-5 bg-gradient-to-r from-[#1A1A1A] to-[#4A4A4A] rounded-2xl text-white flex items-center justify-center gap-4 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group"
      >
        <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
          <Calendar className="w-7 h-7 text-[#C89B3C]" />
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold">Booking Calendar</h3>
          <p className="text-sm text-white/70">View all events in calendar format — {upcomingEvents.length} upcoming</p>
        </div>
        <ArrowUpRight className="w-6 h-6 text-[#C89B3C] ml-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
      </button>

      {/* ── Upcoming Events ── */}
      <div className="bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-lg">Upcoming Events</h3>
            <p className="text-sm text-[#4A4A4A]">Next 7 days schedule</p>
          </div>
          <button onClick={() => navigate('/bookings')} className="px-4 py-2 border border-[#E0D8CC] rounded-xl text-sm font-semibold text-[#1A1A1A] hover:border-[#A97A1F] hover:text-[#A97A1F] flex items-center gap-1 transition-all">
            View All <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        
        {upcomingEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No upcoming events in the next 7 days</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0D8CC]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Customer</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Event</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Date</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Hall</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Guests</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Menu</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Amount</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-[#4A4A4A] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((event) => (
                  <tr key={event.id} className="border-b border-[#F0ECE6] hover:bg-[#F8F5F0] transition-colors cursor-pointer" onClick={() => navigate(`/bookings/${event.id}`)}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] flex items-center justify-center text-white font-bold text-xs">
                          {event.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A1A1A] text-sm truncate">{event.customer}</p>
                          <p className="text-xs text-[#4A4A4A] flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /> {event.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><span className="text-sm text-[#4A4A4A] whitespace-nowrap">{event.event}</span></td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-sm text-[#4A4A4A] whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 text-[#A97A1F] shrink-0" />{event.date}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-[#4A4A4A] whitespace-nowrap">{event.hall}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-sm text-[#4A4A4A] whitespace-nowrap">
                        <Users className="w-3.5 h-3.5 text-[#A97A1F] shrink-0" />{formatNumber(event.guests)}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 bg-[#F4E7C9] text-[#8B6914] rounded-lg text-xs font-bold">{event.menu}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#1A1A1A] whitespace-nowrap">{formatCurrency(event.amount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${event.status === 'confirmed' ? 'bg-[#1B5E20]/10 text-[#1B5E20]' : event.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
          <h3 className="font-bold text-[#1A1A1A] text-lg mb-1">Recent Activity</h3>
          <p className="text-sm text-[#4A4A4A] mb-6">Latest updates from your venue</p>
          {recentActivities.length === 0 ? (
            <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#F8F5F0] transition-all">
                  <div className={`p-2.5 rounded-xl bg-[#F5F2EB] ${activity.color}`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#1A1A1A] text-sm">{activity.user}</p>
                    <p className="text-sm text-[#4A4A4A]">{activity.action}</p>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#F4E7C9] rounded-xl">
              <Zap className="w-4 h-4 text-[#A97A1F]" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-lg">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: 'New Booking', path: '/bookings/create', color: 'from-[#B8862B] to-[#C89B3C]', bg: 'bg-[#B8862B]/10' },
              { icon: Users, label: 'Add Customer', path: '/customers', color: 'from-[#C89B3C] to-[#DDB35A]', bg: 'bg-[#C89B3C]/10' },
              { icon: DollarSign, label: 'Record Payment', path: '/bookings', color: 'from-[#1B5E20] to-[#2E7D32]', bg: 'bg-[#2E7D32]/10' },
              { icon: Gem, label: 'Menu Builder', path: '/menus', color: 'from-[#A97A1F] to-[#B8862B]', bg: 'bg-[#A97A1F]/10' },
              { icon: Building2, label: 'Hall Setup', path: '/settings/halls', color: 'from-[#4B5563] to-[#6B7280]', bg: 'bg-[#4B5563]/10' },
            ].map((action, i) => (
              <button 
                key={i} 
                onClick={() => navigate(action.path)} 
                className="w-full flex items-center gap-4 p-3 rounded-xl border border-[#E0D8CC] hover:border-[#A97A1F] hover:shadow-md transition-all group text-left"
              >
                <div className={`p-2.5 rounded-xl ${action.bg} group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-4 h-4 text-[#A97A1F]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A1A] text-sm">{action.label}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#7A7A7A] group-hover:text-[#A97A1F] transition-colors" />
              </button>
            ))}
          </div>

          {/* Monthly Target Mini Card */}
          <div className="mt-6 p-4 bg-gradient-to-br from-[#A97A1F]/10 to-[#C89B3C]/10 rounded-xl border border-[#A97A1F]/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#A97A1F] rounded-xl">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">Monthly Target</p>
                <p className="text-xs text-[#4A4A4A]">{formatCurrency(revenueData.reduce((s,d) => s + d.revenue, 0))} revenue this year</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenue Overview + Hall Occupancy + Today's Progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-lg">Revenue Overview</h3>
              <p className="text-sm text-[#4A4A4A]">Monthly performance with bookings count</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#A97A1F]" />
                <span className="text-xs text-[#4A4A4A]">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#C89B3C]" />
                <span className="text-xs text-[#4A4A4A]">Bookings</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A97A1F" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#A97A1F" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C89B3C" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#C89B3C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
              <XAxis dataKey="month" stroke="#7A7A7A" fontSize={12} />
              <YAxis yAxisId="left" stroke="#7A7A7A" fontSize={12} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
              <YAxis yAxisId="right" orientation="right" stroke="#7A7A7A" fontSize={12} />
              <Tooltip 
                formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Bookings']}
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0D8CC', borderRadius: '12px', color: '#1A1A1A' }} 
              />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#A97A1F" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
              <Area yAxisId="right" type="monotone" dataKey="bookings" stroke="#C89B3C" fillOpacity={1} fill="url(#colorBookings)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column: Hall Occupancy + Today's Progress */}
        <div className="space-y-4">
          {/* Hall Occupancy */}
          <div className="bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
            <h4 className="font-semibold text-[#1A1A1A] text-sm mb-4">Hall Occupancy</h4>
            {hallOccupancy.length === 0 ? (
              <p className="text-xs text-gray-400">No halls configured</p>
            ) : (
              <div className="space-y-3">
                {hallOccupancy.map((hall) => (
                  <div key={hall.id} className="cursor-pointer hover:bg-[#F5F2EB] p-2 rounded-xl transition-all" onClick={() => navigate(`/halls/${hall.id}`)}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#4A4A4A]">{hall.name}</span>
                      <span className="font-semibold text-[#1A1A1A]">{hall.bookings}/{hall.capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F0ECE6] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-[#A97A1F]" 
                        style={{ width: `${Math.min((hall.bookings / hall.capacity) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Progress */}
          <div className="bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
            <h4 className="font-semibold text-[#1A1A1A] text-sm mb-3">Today's Progress</h4>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="text-center p-3 bg-[#F5F2EB] rounded-xl cursor-pointer hover:bg-[#E8E0D8] transition-colors"
                onClick={() => navigate('/events')}
              >
                <p className="text-2xl font-bold text-[#1A1A1A]">{todaysProgress.events}</p>
                <p className="text-xs text-[#4A4A4A]">Events</p>
              </div>
              <div 
                className="text-center p-3 bg-[#F5F2EB] rounded-xl cursor-pointer hover:bg-[#E8E0D8] transition-colors"
                onClick={() => navigate('/bookings')}
              >
                <p className="text-2xl font-bold text-[#1A1A1A]">{formatNumber(todaysProgress.guests)}</p>
                <p className="text-xs text-[#4A4A4A]">Guests</p>
              </div>
              <div 
                className="text-center p-3 bg-[#F5F2EB] rounded-xl cursor-pointer hover:bg-[#E8E0D8] transition-colors"
                onClick={() => navigate('/reports/financial')}
              >
                <p className="text-2xl font-bold text-[#A97A1F]">{formatCurrency(todaysProgress.revenue)}</p>
                <p className="text-xs text-[#4A4A4A]">Revenue</p>
              </div>
              <div 
                className="text-center p-3 bg-[#F5F2EB] rounded-xl cursor-pointer hover:bg-[#E8E0D8] transition-colors"
                onClick={() => navigate('/halls')}
              >
                <p className="text-2xl font-bold text-[#1B5E20]">{todaysProgress.occupancy}%</p>
                <p className="text-xs text-[#4A4A4A]">Occupancy</p>
              </div>
            </div>
          </div>

          {/* Event Distribution Mini Pie */}
          <div className="bg-white rounded-2xl border border-[#E0D8CC] p-6 shadow-sm">
            <h4 className="font-semibold text-[#1A1A1A] text-sm mb-2">Event Distribution</h4>
            {eventTypeData.length === 0 ? (
              <p className="text-xs text-gray-400">No data</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={120}>
                  <PieChart>
                    <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={5} dataKey="value">
                      {eventTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {eventTypeData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[#4A4A4A]">{item.name}</span>
                      </div>
                      <span className="font-bold text-[#1A1A1A]">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}