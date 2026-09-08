// ═══════════════════════════════════════════════════════════
// components/bookings/UpcomingRemindersDrawer.jsx
// 1-Click Upcoming Event WhatsApp Reminders Queue (1 & 2 Days Ahead)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, Send, X, Calendar, Clock, CheckCircle2, AlertCircle,
  Phone, User, Building2, ExternalLink, Monitor, Globe,
  Copy, Check, Play, Pause, SkipForward, RefreshCw, Loader2,
  Users, DollarSign, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import bookingApi from '../../services/bookingApi';
import {
  openWhatsAppDesktop,
  openWhatsAppWeb,
  copyWhatsAppMessage,
  formatWhatsAppPhone,
  generateReminderMessage
} from '../../utils/whatsappHelper';

const formatCurrency = (val) => 'Rs ' + Number(val || 0).toLocaleString('en-PK');
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }) : '-';

const UpcomingRemindersDrawer = ({
  isOpen,
  onClose,
  branchId,
  onReminderSent
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ total: 0, pendingCount: 0, sentCount: 0, bookings: [] });
  const [filterType, setFilterType] = useState('pending'); // 'all', 'pending', 'sent'
  const [selectedIds, setSelectedIds] = useState([]);
  const [sendMode, setSendMode] = useState(() => localStorage.getItem('marquee_wa_mode') || 'desktop');

  // Queue Sending States
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueProgress, setQueueProgress] = useState({ current: 0, total: 0, currentName: '' });

  // Load reminders
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getUpcomingReminders({ branchId, days: 2, pastDays: 2 });
      const resData = res?.data?.data || res?.data || res || {};
      const bookings = Array.isArray(resData.bookings) ? resData.bookings : [];
      setData({
        total: bookings.length,
        pendingCount: bookings.filter(b => !b.reminderSent).length,
        sentCount: bookings.filter(b => b.reminderSent).length,
        bookings
      });

      // Default select all pending
      const pendingIds = bookings.filter(b => !b.reminderSent).map(b => b.id);
      setSelectedIds(pendingIds);
    } catch (err) {
      console.error('Fetch reminders error:', err);
      toast.error('Upcoming reminders load karne mein error aaya');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen, fetchReminders]);

  // Filtered List
  const filteredBookings = useMemo(() => {
    const list = data.bookings || [];
    if (filterType === 'pending') return list.filter(b => !b.reminderSent);
    if (filterType === 'sent') return list.filter(b => b.reminderSent);
    return list;
  }, [data.bookings, filterType]);

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const ids = filteredBookings.map(b => b.id);
    setSelectedIds(ids);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // ── Send single reminder ──
  const sendSingle = async (booking, mode = sendMode, isSilent = false) => {
    const phone = booking.guestPhone || booking.customer?.phone;
    if (!phone) {
      if (!isSilent) toast.error(`${booking.guestName} ka phone number mojood nahi hai!`);
      return false;
    }

    const branchObj = booking.branch || {
      name: "Raath G's Main Branch",
      phone: '03077850656',
      address: 'Jannat Shadi Hall, Lahore, Pakistan'
    };

    const message = generateReminderMessage(booking, branchObj);

    // Launch WhatsApp
    if (mode === 'desktop') {
      openWhatsAppDesktop({ phone, message });
    } else {
      openWhatsAppWeb({ phone, message });
    }

    // Log to backend
    try {
      await bookingApi.logWhatsApp(booking.id, {
        phoneNumber: formatWhatsAppPhone(phone),
        body: message,
        messageType: 'reminder'
      });
    } catch (e) {
      console.warn('Logging reminder failed:', e);
    }

    // Mark as sent locally
    setData(prev => {
      const updated = prev.bookings.map(b => {
        if (b.id === booking.id) {
          return { ...b, reminderSent: true, lastSentAt: new Date().toISOString() };
        }
        return b;
      });
      return {
        ...prev,
        bookings: updated,
        pendingCount: updated.filter(b => !b.reminderSent).length,
        sentCount: updated.filter(b => b.reminderSent).length,
      };
    });

    if (!isSilent) {
      toast.success(`${booking.guestName} ko WhatsApp reminder dispatch ho gaya!`, { icon: '💬' });
    }
    if (onReminderSent) onReminderSent();
    return true;
  };

  // ── Copy text for single booking ──
  const copySingle = async (booking) => {
    const phone = booking.guestPhone || booking.customer?.phone || '';
    const branchObj = booking.branch || {
      name: "Raath G's Main Branch",
      phone: '03077850656',
      address: 'Jannat Shadi Hall, Lahore, Pakistan'
    };
    const message = generateReminderMessage(booking, branchObj);
    await copyWhatsAppMessage({ phone, message });
    toast.success(`${booking.guestName} ka message copy ho gaya!`, { icon: '📋' });
  };

  // ── Queue Engine (1-by-1 Automated Step-through) ──
  const startQueue = async () => {
    const queueList = filteredBookings.filter(b => selectedIds.includes(b.id));
    if (queueList.length === 0) {
      toast.error('Pehle kam az kam aik booking select karein!');
      return;
    }

    setIsQueueRunning(true);
    setIsQueuePaused(false);
    setQueueProgress({ current: 1, total: queueList.length, currentName: queueList[0].guestName });

    for (let i = 0; i < queueList.length; i++) {
      setQueueIndex(i);
      const b = queueList[i];
      setQueueProgress({ current: i + 1, total: queueList.length, currentName: b.guestName });

      // Send
      await sendSingle(b, sendMode, true);

      // Delay between sends (2.5 seconds) to allow OS/App focus without collision
      if (i < queueList.length - 1) {
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    setIsQueueRunning(false);
    toast.success('Queue mukammal! Tamam chune hue customers ko reminders bhej diye gaye hain.', {
      icon: '🎉',
      duration: 5000
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden border-l border-gray-200 animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-[#2563EB] to-emerald-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Upcoming Event Reminders
                <span className="text-[11px] bg-white/25 px-2 py-0.5 rounded-full font-mono">
                  Next 48 Hours
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                Kal aur parson ke events ke automated WhatsApp reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls & Settings */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
          {/* Destination Mode Selector */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-gray-700 uppercase tracking-wide">Destination:</span>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
              <button
                type="button"
                onClick={() => { setSendMode('desktop'); localStorage.setItem('marquee_wa_mode', 'desktop'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  sendMode === 'desktop' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Monitor size={13} />
                <span>WhatsApp Desktop (0 Tabs)</span>
              </button>
              <button
                type="button"
                onClick={() => { setSendMode('web'); localStorage.setItem('marquee_wa_mode', 'web'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  sendMode === 'web' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe size={13} />
                <span>WhatsApp Web</span>
              </button>
            </div>
          </div>

          {/* Filter Pills & Select All */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                Pending ({data.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('sent')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'sent' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                Already Sent ({data.sentCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'all' ? 'bg-gray-800 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                All ({data.total})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-emerald-700 hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-gray-500 hover:underline font-semibold"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={fetchReminders}
                title="Refresh"
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Queue Progress Bar (Active when queue running) */}
        {isQueueRunning && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-bold">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span>
                Sending {queueProgress.current} of {queueProgress.total}: <strong>{queueProgress.currentName}</strong>
              </span>
            </div>
            <span className="text-xs text-emerald-700 font-mono">
              Auto-advancing in 2.5s...
            </span>
          </div>
        )}

        {/* Booking Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && data.bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
              <p className="text-xs font-semibold">Checking upcoming events...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 border-2 border-dashed border-gray-200 rounded-2xl">
              <CheckCircle2 size={40} className="text-emerald-500 mb-2" />
              <h4 className="font-bold text-gray-800 text-sm">No Pending Reminders!</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Agley 2 dinon mein koi aisi booking nahi jiska reminder baqi ho. Sab tayar hai!
              </p>
            </div>
          ) : (
            filteredBookings.map((b) => {
              const isSelected = selectedIds.includes(b.id);
              const hasDue = b.dueAmount > 0;

              return (
                <div
                  key={b.id}
                    className={`p-4 rounded-2xl border transition-all ${
                    b.reminderSent
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isSelected
                      ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-300 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Checkbox & Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(b.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                            b.diffDays === 1
                              ? 'bg-blue-600 text-white'
                              : b.diffDays === 2
                              ? 'bg-indigo-600 text-white'
                              : b.diffDays === 0
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-600 text-white'
                          }`}>
                            {b.timingLabel}
                          </span>
                          <span className="font-mono text-xs font-bold text-gray-500">
                            #{b.bookingNo}
                          </span>
                          <span className="text-xs font-semibold text-gray-800 truncate">
                            {b.title || b.eventType || 'Event'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-gray-400" />
                            <strong className="text-gray-900">{b.guestName}</strong>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone size={12} className="text-gray-400" />
                            <span>{b.guestPhone || 'No Phone'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{formatDate(b.eventDate)} ({b.startTime || 'Event Time'})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} className="text-gray-400" />
                            <span>{b.hall?.name || 'Main Hall'} • {b.guestCount} Guests</span>
                          </div>
                        </div>

                        {/* Financial summary bar */}
                        <div className="flex items-center gap-3 text-xs mt-2.5 pt-2 border-t border-gray-100">
                          <span className="text-gray-500">
                            Total: <strong className="text-gray-800">{formatCurrency(b.totalAmount)}</strong>
                          </span>
                          <span className="text-gray-500">
                            Paid: <strong className="text-emerald-700">{formatCurrency(b.paidAmount)}</strong>
                          </span>
                          {hasDue && (
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              Due: {formatCurrency(b.dueAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Column */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {b.reminderSent ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                          <CheckCircle2 size={12} /> Sent
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded-md flex items-center gap-1">
                          <Clock size={12} /> Pending
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copySingle(b)}
                          title="Copy message"
                          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => sendSingle(b)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <Send size={12} />
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Batch Execution */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Selected: <strong className="text-gray-900">{selectedIds.length}</strong> of {filteredBookings.length} bookings
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={startQueue}
              disabled={isQueueRunning || selectedIds.length === 0}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isQueueRunning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processing Queue...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Send Reminders to Selected ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UpcomingRemindersDrawer;
