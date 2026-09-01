import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Clock, MapPin, Users, 
  Printer, Plus, Calendar as CalendarIcon, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';

// 🌐 Services & Contexts
import bookingApi from '../../services/bookingApi';
import hallApi from '../../services/hallApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';

// 🎨 UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ReactSelect from '../../components/ui/ReactSelect';
import Badge from '../../components/ui/Badge';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hall color indicators mapping
const hallColors = [
  { cssVar: '#3B82F6', bg: 'bg-blue-50 text-blue-700 border-blue-200' }, // Blue
  { cssVar: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }, // Green
  { cssVar: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200' }, // Amber
  { cssVar: '#8B5CF6', bg: 'bg-purple-50 text-purple-700 border-purple-200' }, // Purple
];

const BookingCalendar = () => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHall, setSelectedHall] = useState('all');

  // ── Fetch Bookings & Halls using useGlobalData hook ──
  const { 
    data: fetchResult, 
    loading 
  } = useGlobalData(
    async (branchId) => {
      const activeBranchId = branchId || currentBranch?.id || 1;
      const [bookingsRes, hallsRes] = await Promise.all([
        bookingApi.getAll({ branchId: activeBranchId }).catch(() => ({ data: [] })),
        hallApi?.getAll?.({ branchId: activeBranchId }).catch(() => ({ data: [] }))
      ]);

      return {
        bookings: bookingsRes?.data || bookingsRes || [],
        halls: hallsRes?.data || hallsRes || []
      };
    },
    {
      dependencies: [currentDate],
      onError: (err) => {
        console.error('Calendar fetch error:', err);
        toast.error('Failed to load calendar data');
      }
    }
  );

  const bookings = Array.isArray(fetchResult?.bookings) ? fetchResult.bookings : [];
  const halls = Array.isArray(fetchResult?.halls) ? fetchResult.halls : [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const navigateMonth = (dir) => setCurrentDate(new Date(year, month + dir, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Map bookings to specific date keys (YYYY-MM-DD)
 const getBookingsForDate = (day) => {
  const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().split('T')[0];
  
  return bookings.filter(b => {
    if (!b.eventDate) return false;
    const bDateStr = new Date(b.eventDate).toISOString().split('T')[0];
    
    // ── FIX: Sirf aaj aur future ki bookings ──
    if (bDateStr < todayStr) return false;
    
    const matchesDate = bDateStr === targetDateStr;
    const matchesHall = selectedHall === 'all' || b.hallId?.toString() === selectedHall || b.hall?.name === selectedHall;
    return matchesDate && matchesHall;
  });
};

  const days = [...Array(startDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-[#A97A1F] rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Interactive hall-wise schedule for <strong>{currentBranch?.name || 'Main Branch'}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" className="flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print Schedule
          </Button>
          <Link to="/bookings/create">
            <Button variant="primary" size="md" className="flex items-center gap-2 bg-[#A97A1F] hover:bg-[#966b1a] text-white">
              <Plus className="w-4 h-4" /> New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Navigation & Filters */}
      <Card padding="normal" className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="p-2.5 rounded-xl" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="primary" size="sm" className="px-4 py-2 rounded-xl bg-[#A97A1F] text-white" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" className="p-2.5 rounded-xl" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold text-gray-800 ml-2">
              {monthNames[month]} {year}
            </span>
          </div>

          {/* Month / Year Selectors */}
          <div className="flex items-center gap-3">
            <div className="w-36">
              <ReactSelect
                value={String(month)}
                onChange={(val) => setCurrentDate(new Date(year, Number(val), 1))}
                options={monthNames.map((n, i) => ({ value: String(i), label: n }))}
                placeholder="Month"
                isSearchable={true}
                isClearable={false}
              />
            </div>
            <div className="w-28">
              <ReactSelect
                value={String(year)}
                onChange={(val) => setCurrentDate(new Date(Number(val), month, 1))}
                options={[2025, 2026, 2027, 2028].map(y => ({ value: String(y), label: String(y) }))}
                placeholder="Year"
                isSearchable={true}
                isClearable={false}
              />
            </div>
          </div>

          {/* Hall Filter Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedHall('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedHall === 'all' 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              All Halls
            </button>
            {halls.map((h, idx) => {
              const active = selectedHall === h.name || selectedHall === h.id?.toString();
              const colorStyle = hallColors[idx % hallColors.length];
              return (
                <button
                  key={h.id || h.name}
                  onClick={() => setSelectedHall(active ? 'all' : h.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active ? 'ring-2 ring-offset-1 ring-[#A97A1F] shadow-sm' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: active ? `${colorStyle.cssVar}15` : '#F9FAFB', borderColor: colorStyle.cssVar, color: colorStyle.cssVar }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorStyle.cssVar }} />
                  {h.name}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Calendar Grid View */}
      <Card padding="none" className="overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white">
        {loading ? (
          <div className="p-16 text-center text-gray-400 font-medium">Loading schedule calendar...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {dayNames.map(d => (
                  <div key={d} className="py-3 px-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600 border-r border-gray-200 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 bg-gray-200 gap-px">
                {days.map((day, idx) => {
  if (day === null) return (
    <div key={`empty-${idx}`} className="min-h-[150px] bg-gray-50/50" />
  );

  const dayBookings = getBookingsForDate(day);
  const highlightToday = isToday(day);
  
  // ── CHECK: Kya date past hai? ──
  const dateObj = new Date(year, month, day);
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const isPastDate = dateObj < todayObj;

  return (
    <div 
      key={day} 
      className={`min-h-[150px] p-2.5 flex flex-col transition-all ${
        isPastDate 
          ? 'bg-gray-50/50 opacity-40 cursor-not-allowed' 
          : 'bg-white hover:bg-amber-50/20'
      }`}
    >
      {/* Day Number Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-xl ${
          highlightToday 
            ? 'bg-[#A97A1F] text-white shadow-sm' 
            : isPastDate
              ? 'text-gray-400 bg-gray-100 line-through'
              : 'text-gray-700 bg-gray-100'
        }`}>
          {day}
        </span>
        {!isPastDate && dayBookings.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            {dayBookings.length} Event{dayBookings.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Bookings List - Sirf future dates ke liye */}
      {!isPastDate ? (
        <div className="space-y-1.5 flex-1">
          {dayBookings.map((b, i) => {
            const hallIndex = halls.findIndex(h => h.name === b.hall?.name || h.id === b.hallId);
            const colorObj = hallColors[(hallIndex >= 0 ? hallIndex : i) % hallColors.length];
            
            return (
              <div 
                key={b.id || i} 
                onClick={() => navigate(`/bookings/edit/${b.id}`)}
                className="p-2 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-xs"
                style={{ 
                  backgroundColor: `${colorObj.cssVar}10`, 
                  borderLeft: `3px solid ${colorObj.cssVar}`,
                  borderColor: `${colorObj.cssVar}30`
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold truncate" style={{ color: colorObj.cssVar }}>
                    {b.hall?.name || 'Main Hall'}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/80 text-gray-600">
                    #{b.bookingNo}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900 truncate mt-0.5">{b.guestName}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                  <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate">{b.eventType} ({b.guestCount} pax)</span>
                </div>
              </div>
            );
          })}
          {dayBookings.length === 0 && (
            <div className="h-full flex items-center justify-center p-4">
              <span className="text-[11px] text-gray-300 font-medium italic">Available</span>
            </div>
          )}
        </div>
      ) : (
        /* Past dates mein "Past" label */
        <div className="h-full flex items-center justify-center p-4">
          <span className="text-[10px] text-gray-300 font-medium">Past</span>
        </div>
      )}
    </div>
  );
})}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Professional Legend Footer */}
      <Card padding="normal" className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Hall Legends:</span>
            {halls.map((h, idx) => {
              const colorObj = hallColors[idx % hallColors.length];
              return (
                <div key={h.id || h.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md shadow-xs" style={{ backgroundColor: colorObj.cssVar }} />
                  <span className="text-xs font-bold text-gray-700">{h.name}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Click any booked slot to view or edit details</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookingCalendar;