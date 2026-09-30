// ═══════════════════════════════════════════════════════════
// components/common/WhatsAppModal.jsx
// Professional WhatsApp Sender for Bookings (Zero Tabs Desktop & Web)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Send, X, Calendar, CheckCircle2,
  Heart, CreditCard, Edit3, Phone, Building2, ExternalLink, Loader2,
  Copy, Monitor, Globe, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  openWhatsAppDesktop,
  openWhatsAppWeb,
  copyWhatsAppMessage,
  formatWhatsAppPhone,
  generateReminderMessage,
  generateConfirmationMessage,
  generateFeedbackMessage,
  generatePaymentReminderMessage
} from '../../utils/whatsappHelper';
import bookingApi from '../../services/bookingApi';

const TEMPLATES = [
  { id: 'reminder', label: '📅 Event Reminder', icon: Calendar, desc: 'Kal ka function / upcoming reminder' },
  { id: 'confirmation', label: '🎉 Confirmation', icon: CheckCircle2, desc: 'Booking darj & advance receipt' },
  { id: 'feedback', label: '💐 Feedback & Thanks', icon: Heart, desc: 'Event complete hone par review' },
  { id: 'payment', label: '💳 Payment Due', icon: CreditCard, desc: 'Remaining balance reminder' },
  { id: 'custom', label: '✏️ Custom Message', icon: Edit3, desc: 'Apna customized message likhein' },
];

const WhatsAppModal = ({
  isOpen,
  onClose,
  booking,
  defaultType = 'reminder',
  onSuccess
}) => {
  const [template, setTemplate] = useState(defaultType);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendMode, setSendMode] = useState(() => {
    return localStorage.getItem('marquee_wa_mode') || 'desktop';
  });

  const [branchInfo, setBranchInfo] = useState({
    name: "Raath G's Main Branch",
    phone: '03077850656',
    address: 'Jannat Shadi Hall, Lahore, Pakistan'
  });

  // Load current branch context
  useEffect(() => {
    try {
      const savedBranch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
      if (savedBranch) {
        setBranchInfo({
          name: savedBranch.name || booking?.branch?.name || "Raath G's Main Branch",
          phone: savedBranch.phone || booking?.branch?.phone || '03077850656',
          address: savedBranch.address || booking?.branch?.address || 'Jannat Shadi Hall, Lahore, Pakistan'
        });
      } else if (booking?.branch) {
        setBranchInfo({
          name: booking.branch.name || "Raath G's Main Branch",
          phone: booking.branch.phone || '03077850656',
          address: booking.branch.address || 'Jannat Shadi Hall, Lahore, Pakistan'
        });
      }
    } catch (e) {
      // fallback
    }
  }, [booking]);

  // Set default phone & template on open
  useEffect(() => {
    if (isOpen && booking) {
      setTemplate(defaultType);
      const defaultPhone = booking.customer?.phone || booking.guestPhone || '';
      setPhone(defaultPhone);
      setCopied(false);
    }
  }, [isOpen, booking, defaultType]);

  // Update message when template changes
  useEffect(() => {
    if (!booking) return;

    let text = '';
    switch (template) {
      case 'reminder':
        text = generateReminderMessage(booking, branchInfo);
        break;
      case 'confirmation':
        text = generateConfirmationMessage(booking, branchInfo);
        break;
      case 'feedback':
        text = generateFeedbackMessage(booking, branchInfo);
        break;
      case 'payment':
        text = generatePaymentReminderMessage(booking, branchInfo);
        break;
      case 'custom':
        text = `*Assalam-o-Alaikum ${booking.customer?.name || booking.guestName || 'Customer'}!* 🌟\n\nBooking No: ${booking.bookingNo}\n\n[Apna message yahan likhein...]\n\n*${branchInfo.name}*\nRabta: ${branchInfo.phone}`;
        break;
      default:
        text = generateReminderMessage(booking, branchInfo);
    }
    setMessage(text);
  }, [template, booking, branchInfo]);

  if (!isOpen || !booking) return null;

  const handleSend = () => {
    if (!phone || phone.trim().length < 7) {
      toast.error('Barah-e-karam durust WhatsApp phone number enter karein!');
      return;
    }
    if (!message || message.trim().length === 0) {
      toast.error('Message body khali nahi ho sakti!');
      return;
    }

    // 1. Launch WhatsApp immediately (Synchronous in user click gesture)
    if (sendMode === 'desktop') {
      openWhatsAppDesktop({ phone, message });
      toast.success('WhatsApp App open ho rahi hai! (Browser ka koi naya tab nahi khulega)', {
        icon: '💻',
        duration: 4000
      });
    } else {
      openWhatsAppWeb({ phone, message });
      toast.success('WhatsApp Web tab open ho gaya hai!', {
        icon: '💬',
        duration: 4000
      });
    }

    // 2. Asynchronously log message in backend database without blocking
    bookingApi.logWhatsApp(booking.id, {
      phoneNumber: formatWhatsAppPhone(phone),
      body: message,
      messageType: template
    }).catch(logErr => {
      console.warn('Could not log WhatsApp to DB:', logErr);
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleCopy = async () => {
    try {
      await copyWhatsAppMessage({ phone, message });
      setCopied(true);
      toast.success('Message aur phone number copy ho gaya! Kisi bhi open WhatsApp tab par paste karein.', {
        icon: '📋',
        duration: 3500
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      toast.error('Copy karne mein error aaya');
    }
  };

  const setMode = (mode) => {
    setSendMode(mode);
    try {
      localStorage.setItem('marquee_wa_mode', mode);
    } catch (e) {}
  };

  const cleanPhoneDisplay = formatWhatsAppPhone(phone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">WhatsApp Messenger</h2>
              <p className="text-xs text-emerald-100">
                {booking.bookingNo} • {booking.customer?.name || booking.guestName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Official Branch Info Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2 text-emerald-800">
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Official Sender Branch:</strong> {branchInfo.name}
              </span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              <Phone className="w-3 h-3" />
              <span>{branchInfo.phone}</span>
            </div>
          </div>

          {/* Sending Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Send Destination
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('desktop')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  sendMode === 'desktop'
                    ? 'bg-emerald-50/80 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-900">
                    <Monitor size={15} className="text-emerald-700" />
                    WhatsApp Desktop (App)
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                    ⭐ 0 Browser Tabs
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-tight">
                  Direct PC app open karega. <strong>Browser ka koi naya tab nahi khulega</strong> aur existing session disconnect nahi hoga.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('web')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  sendMode === 'web'
                    ? 'bg-emerald-50/80 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-gray-900">
                    <Globe size={15} className="text-gray-600" />
                    WhatsApp Web (Browser)
                  </span>
                  <span className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-md">
                    Browser Tab
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Chrome/Edge ke andar <code className="text-gray-700 font-mono">web.whatsapp.com</code> tab open karega.
                </p>
              </button>
            </div>
          </div>

          {/* Template Selection Pills */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Select Message Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map(t => {
                const isSelected = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200'
                    }`}
                  >
                    <div className="font-semibold">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Phone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Recipient WhatsApp Number
              </label>
              {cleanPhoneDisplay && (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Format: +{cleanPhoneDisplay}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('+')) {
                    setPhone('+' + val.slice(1).replace(/\D/g, '').slice(0, 12));
                  } else {
                    setPhone(val.replace(/\D/g, '').slice(0, 11));
                  }
                }}
                maxLength={14}
                placeholder="e.g. 03001234567 or +923001234567"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            {/* Quick Chips if customer and guest have different phones */}
            {booking.customer?.phone && booking.guestPhone && booking.customer.phone !== booking.guestPhone && (
              <div className="flex gap-2 mt-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPhone(booking.customer.phone)}
                  className="text-emerald-700 hover:underline"
                >
                  Customer: {booking.customer.phone}
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => setPhone(booking.guestPhone)}
                  className="text-emerald-700 hover:underline"
                >
                  Guest: {booking.guestPhone}
                </button>
              </div>
            )}
          </div>

          {/* Message Preview (WhatsApp Chat Bubble Styling) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Message Preview (Editable)
              </label>
              <span className="text-[11px] text-gray-400">
                {message.length} characters
              </span>
            </div>
            <div className="p-3 bg-[#ECE5DD] rounded-xl border border-gray-200">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs text-gray-800 leading-relaxed font-sans bg-transparent border-0 focus:outline-none focus:ring-0 resize-y"
                  placeholder="Message content..."
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-xs"
              title="Copy message text to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!phone}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {sendMode === 'desktop' ? (
                <>
                  <Monitor className="w-4 h-4" />
                  <span>Open WhatsApp App (0 Tabs)</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Open WhatsApp Web</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppModal;
