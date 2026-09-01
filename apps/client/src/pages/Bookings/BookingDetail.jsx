// ═══════════════════════════════════════════════════════════
// pages/BookingDetail.jsx
// COMPLETE — Booking Detail Page | A4 + Thermal Print | Tabs | Payment | Status
// Route: /bookings/:id
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, Calendar, Clock, Users, MapPin, Phone, Eye, Edit2, Trash2, Plus,
  ChevronLeft, ChevronRight, X, Printer, Receipt, FileText, Download,
  AlertTriangle, CheckCircle, XCircle, Clock4, Package, Utensils, Tag,
  CreditCard, TrendingUp, TrendingDown, History, Filter,
  User, Building2, Sparkles, Gem, Flame, Ban, RotateCcw,
  Banknote, Wallet, Landmark, MoreVertical, ArrowDownRight, ArrowLeft,
  Settings, Thermometer
} from 'lucide-react';
import toast from 'react-hot-toast';

import bookingApi from '../../services/bookingApi';
import accountApi from '../../services/accountApi';
import eventExecutionApi from '../../services/eventExecutionApi';
import receiptSettingsApi from '../../services/receiptSettingsApi';
import { useBranch } from '../../context/BranchContext';

// ── STATUS CONFIG ──
const statusConfig = {
  tentative:    { color: '#1565C0', bg: '#E3F2FD', label: 'Tentative',    icon: Clock4 },
  confirmed:    { color: '#1B5E20', bg: '#E8F5E9', label: 'Confirmed',    icon: CheckCircle },
  in_progress:  { color: '#6A1B9A', bg: '#F3E5F5', label: 'In Progress',  icon: Flame },
  completed:    { color: '#2E7D32', bg: '#E8F5E9', label: 'Completed',    icon: Sparkles },
  cancelled:    { color: '#B71C1C', bg: '#FFEBEE', label: 'Cancelled',    icon: Ban },
  no_show:      { color: '#424242', bg: '#F5F5F5', label: 'No Show',      icon: XCircle },
};

const paymentStatusConfig = {
  pending:   { color: '#B71C1C', bg: '#FFEBEE', label: 'Pending',   icon: Clock4 },
  partial:   { color: '#E65100', bg: '#FFF3E0', label: 'Partial',   icon: AlertTriangle },
  completed: { color: '#1B5E20', bg: '#E8F5E9', label: 'Completed', icon: CheckCircle },
  refunded:  { color: '#1565C0', bg: '#E3F2FD', label: 'Refunded',  icon: RotateCcw },
  failed:    { color: '#B71C1C', bg: '#FFEBEE', label: 'Failed',    icon: XCircle },
};

const paymentModeIcons = {
  cash:          Banknote,
  bank_transfer: Landmark,
  card:          CreditCard,
  easypaisa:     Wallet,
  jazzcash:      Wallet,
  cheque:        FileText,
};

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';

// ── DEFAULT RECEIPT SETTINGS ──
const defaultReceiptSettings = {
  companyName: 'UniSoft Enterprise',
  companySlogan: 'Premium Event & Hall Booking',
  address: 'Main Branch, City Center',
  phone: '0300-1234567',
  email: 'info@unisoft.com',
  website: 'www.unisoft.com',
  logoUrl: '',
  headerText: 'Thank you for choosing us!',
  footerText: 'This is a system generated receipt. No signature required.',
  marqueeText: 'Welcome to UniSoft Enterprise - Best Event Management',
  showLogo: true,
  showCompanyName: true,
  showSlogan: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showHeaderText: true,
  showFooterText: true,
  showMarquee: true,
  showQrCode: false,
  showBarcode: false,
  showCustomerDetails: true,
  showPaymentHistory: true,
  showGst: false,
  gstNumber: 'GST-12345678',
  showNTN: false,
  ntnNumber: 'NTN-987654321',
  themeColor: '#1a1a2e',
  accentColor: '#A97A1F',
  thermalWidth: '80mm',
  thermalFontSize: '12px',
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentBranch } = useBranch();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [receiptSettings, setReceiptSettings] = useState(defaultReceiptSettings);

  // ── Status Update Modal ──
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // ── Event Execution ──
  const [eventExecution, setEventExecution] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [startingEvent, setStartingEvent] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // ── Payment Modal ──
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'cash',
    description: '',
    date: new Date().toISOString().split('T')[0],
    bankAccountId: ''
  });

  // ── Bank Accounts for Payment ──
  const [bankAccounts, setBankAccounts] = useState([]);

  // ── Fetch Booking ──
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const res = await bookingApi.getById(id);
        const data = res?.data || res;
        setBooking(data);
        setNewStatus(data?.status || '');
      } catch (err) {
        console.error('Fetch booking error:', err);
        toast.error(err?.response?.data?.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  // ── Fetch Receipt Settings from API ──
  useEffect(() => {
    const fetchReceiptSettings = async () => {
      try {
        const res = await receiptSettingsApi.getAll({ branchId: currentBranch?.id });
        console.log('📥 fetchReceiptSettings raw response:', res);
        
        const dataArray = res?.data || res;
        
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const db = dataArray[0];
          setReceiptSettings(prev => ({ ...defaultReceiptSettings, ...db }));
          console.log('✅ Receipt settings loaded from DB, id:', db.id);
        } else {
          console.log('ℹ️ No receipt settings found in DB, using defaults');
          setReceiptSettings(defaultReceiptSettings);
        }
      } catch (err) {
        console.error('❌ fetchReceiptSettings error:', err);
        try {
          const saved = localStorage.getItem('receiptSettings');
          if (saved) {
            setReceiptSettings({ ...defaultReceiptSettings, ...JSON.parse(saved) });
            console.log('⚠️ Fallback to localStorage receipt settings');
          } else {
            setReceiptSettings(defaultReceiptSettings);
          }
        } catch {
          setReceiptSettings(defaultReceiptSettings);
        }
      }
    };

    if (currentBranch?.id) {
      fetchReceiptSettings();
    }
  }, [currentBranch?.id]);

  const refetch = async () => {
    try {
      const res = await bookingApi.getById(id);
      setBooking(res?.data || res);
    } catch (err) {
      toast.error('Failed to refresh booking');
    }
  };

  // ── Fetch Event Execution ──
  const fetchEventExecution = async () => {
    try {
      const res = await eventExecutionApi.getAll({ bookingId: id });
      const list = res?.data?.data || [];
      setEventExecution(list.length > 0 ? list[0] : null);
    } catch (err) {
      setEventExecution(null);
    }
  };

  useEffect(() => {
    if (id) fetchEventExecution();
  }, [id]);

  // ── Preview Inventory Deduction ──
  const handlePreviewInventory = async () => {
    try {
      setPreviewLoading(true);
      const res = await eventExecutionApi.previewInventoryDeduction(id);
      setPreviewData(res?.data?.data || null);
      setPreviewModalOpen(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Start Event Execution ──
  const handleStartEvent = async () => {
    if (!window.confirm('Start event execution? This will auto-deduct inventory based on recipes.')) return;
    try {
      setStartingEvent(true);
      const res = await eventExecutionApi.create({ bookingId: parseInt(id) });
      toast.success(res?.data?.message || 'Event started successfully!');
      setPreviewModalOpen(false);
      fetchEventExecution();
      refetch();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to start event';
      toast.error(msg);
    } finally {
      setStartingEvent(false);
    }
  };

  // ── Rollback Inventory ──
  const handleRollbackInventory = async () => {
    if (!window.confirm('⚠️ Rollback all auto-deducted inventory for this booking? Stock will be restored.')) return;
    try {
      setRollingBack(true);
      const res = await eventExecutionApi.rollbackInventoryDeduction(id);
      toast.success(res?.data?.message || 'Inventory rollback completed!');
      fetchEventExecution();
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rollback failed');
    } finally {
      setRollingBack(false);
    }
  };

  // ── Load Bank Accounts ──
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await accountApi.getAll({ branchId: currentBranch?.id });
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setBankAccounts(data);
      } catch (err) {
        console.error('Failed to load bank accounts:', err);
      }
    };
    if (currentBranch?.id) loadAccounts();
  }, [currentBranch?.id]);

  // ── Handlers ──
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await bookingApi.delete(id);
      toast.success('Booking deleted successfully!');
      navigate('/bookings');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete booking');
    }
  };

  const handleStatusUpdate = async () => {
    if (!booking || !newStatus) return;
    if (newStatus === 'completed' && Number(booking.dueAmount || 0) > 0) {
      toast.error(`Cannot mark as Completed — ${formatCurrency(booking.dueAmount)} is still due!`);
      return;
    }
    try {
      await bookingApi.update(booking.id, { status: newStatus });
      toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`);
      setStatusModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!booking) return;

    const amountNum = Number(paymentForm.amount);
    if (amountNum <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (amountNum > Number(booking.dueAmount || 0)) {
      toast.error('Amount cannot exceed due balance');
      return;
    }
    if (!paymentForm.bankAccountId) {
      toast.error('Please select a bank account to receive payment');
      return;
    }

    try {
      await bookingApi.addPayment(booking.id, {
        amount: amountNum,
        mode: paymentForm.mode,
        description: paymentForm.description,
        date: paymentForm.date,
        bankAccountId: parseInt(paymentForm.bankAccountId)
      });

      toast.success('Payment recorded successfully!');
      setPaymentModalOpen(false);
      refetch();

      setPaymentForm({
        amount: '',
        mode: 'cash',
        description: '',
        date: new Date().toISOString().split('T')[0],
        bankAccountId: ''
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record payment';
      toast.error(msg);
    }
  };

  const openPaymentModal = () => {
    setPaymentForm({
      amount: booking?.dueAmount || '',
      mode: 'cash',
      description: 'Payment received',
      date: new Date().toISOString().split('T')[0],
      bankAccountId: ''
    });
    setPaymentModalOpen(true);
  };

  // ═══════════════════════════════════════════════════════════
  // A4 PRINT FUNCTION - FULLY FIXED
  // ═══════════════════════════════════════════════════════════
  const printA4 = () => {
    if (!booking) return;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Popup blocked! Please allow popups for this site.');
      return;
    }
    w.document.write(generateA4HTML(booking, receiptSettings));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // ═══════════════════════════════════════════════════════════
  // THERMAL PRINT FUNCTION - FULLY FIXED
  // ═══════════════════════════════════════════════════════════
  const printThermal = () => {
    if (!booking) return;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Popup blocked! Please allow popups for this site.');
      return;
    }
    w.document.write(generateThermalHTML(booking, receiptSettings));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // ═══════════════════════════════════════════════════════════
  // GENERATE A4 HTML - FULLY FIXED
  // ═══════════════════════════════════════════════════════════
  const generateA4HTML = (b, rs) => {
    const s = { ...defaultReceiptSettings, ...rs };
    const payments = b.payments || [];

    // ── FIXED: Correct Hall Rent Calculation ──
    let hallRent = 0;
    let hallPerSeatRate = 0;
    let hallFixedPrice = 0;
    let guestCount = Number(b.guestCount || 0);
    
    if (b.hall) {
      hallPerSeatRate = Number(b.hall.perSeatPrice || b.hall.price || 0);
      hallFixedPrice = Number(b.hall.price || 0);
      if (b.hallChargeMode === 'per_seat') {
        hallRent = hallPerSeatRate * guestCount;
      } else {
        hallRent = hallFixedPrice;
      }
    }

   // ── FIXED: Support both camelCase and snake_case from API ──
const packageTotal = Number(b.packageTotal || b.package_total || 0);
const selectedPackage = b.selectedPackage || b.selected_package || null;

// ── DEBUG: Log to console ──
console.log('📦 packageTotal:', packageTotal);
console.log('📦 selectedPackage:', selectedPackage);

    const menuRows = (b.menus || []).map(m =>
      `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${m.menuName || m.name}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${m.quantity}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(m.unitPrice)}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(m.totalPrice)}</td>
      </tr>`
    ).join('');

    const serviceRows = (b.services || []).map(sv =>
      `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${sv.serviceName || sv.name}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${sv.quantity}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(sv.unitPrice)}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(sv.totalPrice)}</td>
      </tr>`
    ).join('');

    const customRows = (b.customItems || []).map(i =>
      `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${i.itemName}${i.displayNote ? `<br><span style="color:#888;font-size:11px;">${i.displayNote}</span>` : ''}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${i.quantity}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(i.unitPrice)}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(i.totalPrice)}</td>
      </tr>`
    ).join('');

    const paymentRows = payments.map(p =>
      `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${formatDate(p.date || p.createdAt)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.mode?.replace('_', ' ').toUpperCase() || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.description || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;text-align:right;font-weight:600;">${formatCurrency(p.amount)}</td>
      </tr>`
    ).join('');

    // ── FIXED: Hall Row with correct calculation ──
    let hallRowHtml = '';
    if (b.hall && hallRent > 0) {
      const rateDisplay = b.hallChargeMode === 'per_seat' ? hallPerSeatRate : hallFixedPrice;
      const qtyDisplay = b.hallChargeMode === 'per_seat' ? guestCount : 1;
      hallRowHtml = `<tr>
        <td>
          <strong>${b.hallChargeMode === 'per_seat' ? `Hall Rent (×${guestCount} guests)` : 'Hall Rent (Full Hall)'}</strong>
          <br><span style="color:#888;font-size:11px;">${b.hall.name || ''}</span>
        </td>
        <td class="text-right">${qtyDisplay}</td>
        <td class="text-right">${formatCurrency(rateDisplay)}</td>
        <td class="text-right"><strong>${formatCurrency(hallRent)}</strong></td>
      </tr>`;
    }

    // ── FIXED: Package Row ──
    let packageRowHtml = '';
    if (selectedPackage && packageTotal > 0) {
      packageRowHtml = `<tr>
        <td>
          <strong>Package: ${selectedPackage.name || ''}</strong>
          <br><span style="color:#888;font-size:11px;">${selectedPackage.eventType || ''}</span>
        </td>
        <td class="text-right">1</td>
        <td class="text-right">${formatCurrency(packageTotal)}</td>
        <td class="text-right"><strong>${formatCurrency(packageTotal)}</strong></td>
      </tr>`;
    }

    const totalAmount = Number(b.totalAmount || 0);
    const discount = Number(b.discount || 0);
    const paidAmount = Number(b.paidAmount || b.advanceAmount || 0);
    const dueAmount = Number(b.dueAmount || 0);

    const logoHtml = s.showLogo && s.logoUrl
      ? `<img src="${s.logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain;" />`
      : `<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:${s.themeColor};">${s.companyName?.charAt(0) || 'U'}</div>`;

    return `<!DOCTYPE html>
<html>
<head>
  <title>Booking Receipt #${b.bookingNo || b.id || 'PENDING'}</title>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a2e; background: #ffffff; line-height: 1.5; }
    .receipt-container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .company-info { text-align: center; padding: 15px 35px; background: #fafafa; border-bottom: 1px solid #e8e6e0; }
    .company-info .logo { margin-bottom: 8px; }
    .company-info h2 { font-size: 18px; font-weight: 700; color: ${s.themeColor}; margin-bottom: 4px; }
    .company-info p { font-size: 11px; color: #666; line-height: 1.6; margin: 2px 0; }
    .receipt-header { background: ${s.themeColor}; padding: 30px 35px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
    .receipt-header .brand h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .receipt-header .brand p { font-size: 12px; opacity: 0.7; margin-top: 4px; }
    .receipt-header .receipt-no { text-align: right; }
    .receipt-header .receipt-no .label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.6; }
    .receipt-header .receipt-no .number { font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px; }
    .receipt-body { padding: 30px 35px; }
    .info-box { background: #f8f7f4; border-radius: 8px; padding: 15px 18px; margin-bottom: 20px; }
    .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 8px; font-weight: 600; }
    .info-box .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .info-box .row .label { color: #666; }
    .info-box .row .value { font-weight: 600; color: #1a1a2e; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .items-table thead th { background: #f8f7f4; padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 2px solid #e8e6e0; }
    .items-table tbody td { padding: 9px 14px; border-bottom: 1px solid #f0eee8; }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .payment-summary { margin-top: 25px; border-top: 2px solid #e8e6e0; padding-top: 20px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
    .summary-item { text-align: center; padding: 12px; border-radius: 8px; background: #f8f7f4; }
    .summary-item .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; display: block; }
    .summary-item .amount { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .summary-item.total .amount { color: #1a1a2e; }
    .summary-item.paid .amount { color: #2d7d46; }
    .summary-item.due .amount { color: #c0392b; }
    .summary-item.discount .amount { color: #2980b9; }
    .payment-history { margin-top: 20px; }
    .payment-history h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; }
    .payment-history table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .payment-history table th { text-align: left; padding: 6px 10px; background: #f8f7f4; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .payment-history table td { padding: 6px 10px; border-bottom: 1px solid #f0eee8; }
    .receipt-footer { background: #f8f7f4; padding: 15px 35px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e8e6e0; margin-top: 10px; }
    .receipt-footer strong { color: #666; }
    .no-print { text-align: center; margin: 20px 0 10px 0; }
    .no-print button { padding: 10px 30px; background: ${s.themeColor}; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; margin: 0 5px; }
    .no-print button:hover { opacity: 0.9; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt-container { box-shadow: none; border-radius: 0; }
      .receipt-header { background: ${s.themeColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .info-box { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .items-table thead th { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .summary-item { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .payment-history table th { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-footer { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    ${s.showCompanyName || s.showAddress || s.showPhone ? `
    <div class="company-info">
      <div class="logo">${logoHtml}</div>
      ${s.showCompanyName ? `<h2>${s.companyName}</h2>` : ''}
      ${s.showSlogan && s.companySlogan ? `<p style="font-style:italic;color:#888;margin-bottom:6px;">${s.companySlogan}</p>` : ''}
      ${s.showAddress && s.address ? `<p>📍 ${s.address}</p>` : ''}
      ${s.showPhone && s.phone ? `<p>📞 ${s.phone}</p>` : ''}
      ${s.showEmail && s.email ? `<p>✉️ ${s.email}</p>` : ''}
      ${s.showWebsite && s.website ? `<p>🌐 ${s.website}</p>` : ''}
      ${s.showGst && s.gstNumber ? `<p>GST: ${s.gstNumber}</p>` : ''}
      ${s.showNTN && s.ntnNumber ? `<p>NTN: ${s.ntnNumber}</p>` : ''}
    </div>
    ` : ''}
    ${s.showMarquee && s.marqueeText ? `<div style="background:${s.themeColor};color:#fff;padding:6px 0;font-size:11px;text-align:center;overflow:hidden;white-space:nowrap;"><span style="display:inline-block;">${s.marqueeText}</span></div>` : ''}
    <div class="receipt-header">
      <div class="brand">
        <h1>Booking Receipt</h1>
        <p>Premium Event & Hall Booking</p>
      </div>
      <div class="receipt-no">
        <div class="label">Booking #</div>
        <div class="number">${b.bookingNo || b.id || 'PENDING'}</div>
      </div>
    </div>

    <div class="receipt-body">
      ${s.showCustomerDetails ? `
      <div class="info-box">
        <h3>Customer Details</h3>
        <div class="row"><span class="label">Name</span><span class="value">${b.guestName || 'N/A'}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">${b.guestPhone || 'N/A'}</span></div>
        ${b.guestEmail ? `<div class="row"><span class="label">Email</span><span class="value">${b.guestEmail}</span></div>` : ''}
        ${b.customer?.cnic ? `<div class="row"><span class="label">CNIC</span><span class="value">${b.customer.cnic}</span></div>` : ''}
        ${b.customer?.city ? `<div class="row"><span class="label">City</span><span class="value">${b.customer.city}</span></div>` : ''}
      </div>
      ` : ''}

      <table class="items-table">
        <thead>
          <tr>
            <th>Item / Service</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${hallRowHtml}
          ${packageRowHtml}
          ${menuRows}
          ${customRows}
          ${serviceRows}
        </tbody>
      </table>

      <div class="payment-summary">
        <div class="summary-grid">
          <div class="summary-item total"><span class="label">Subtotal</span><span class="amount">${formatCurrency(totalAmount + discount)}</span></div>
          ${discount > 0 ? `<div class="summary-item discount"><span class="label">Discount</span><span class="amount">-${formatCurrency(discount)}</span></div>` : ''}
          <div class="summary-item paid"><span class="label">Grand Total</span><span class="amount">${formatCurrency(totalAmount)}</span></div>
          <div class="summary-item due"><span class="label">Due Balance</span><span class="amount">${formatCurrency(dueAmount)}</span></div>
        </div>
      </div>

      ${payments.length > 0 && s.showPaymentHistory ? `
        <div class="payment-history">
          <h4>Payment History</h4>
          <table>
            <thead><tr><th>Date</th><th>Mode</th><th>Description</th><th class="text-right">Amount</th></tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
      ` : ''}

      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e8e6e0; display: flex; justify-content: space-between; font-size: 11px; color: #888;">
        <span>Payment Status: ${b.paymentStatus || 'pending'}</span>
        <span>Generated: ${formatDateTime(new Date())}</span>
      </div>
    </div>

    <div class="receipt-footer">
      ${s.showHeaderText && s.headerText ? `<p style="margin-bottom:6px;font-weight:600;color:#444;">${s.headerText}</p>` : ''}
      <strong>${s.showFooterText && s.footerText ? s.footerText : 'Thank you for choosing us!'}</strong>
    </div>
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ Print A4</button>
    <button onclick="window.close()">❌ Close</button>
  </div>
</body>
</html>`;
  };

  // ═══════════════════════════════════════════════════════════
  // GENERATE THERMAL HTML - FULLY FIXED
  // ═══════════════════════════════════════════════════════════
  const generateThermalHTML = (b, rs) => {
    const s = { ...defaultReceiptSettings, ...rs };
    const payments = b.payments || [];

    // ── FIXED: Correct Hall Rent Calculation ──
    let hallRent = 0;
    let hallPerSeatRate = 0;
    let hallFixedPrice = 0;
    let guestCount = Number(b.guestCount || 0);
    
    if (b.hall) {
      hallPerSeatRate = Number(b.hall.perSeatPrice || b.hall.price || 0);
      hallFixedPrice = Number(b.hall.price || 0);
      if (b.hallChargeMode === 'per_seat') {
        hallRent = hallPerSeatRate * guestCount;
      } else {
        hallRent = hallFixedPrice;
      }
    }

   // ── FIXED: Support both camelCase and snake_case from API ──
const packageTotal = Number(b.packageTotal || b.package_total || 0);
const selectedPackage = b.selectedPackage || b.selected_package || null;

// ── DEBUG: Log to console ──
console.log('📦 packageTotal:', packageTotal);
console.log('📦 selectedPackage:', selectedPackage);

    // ── FIXED: Thermal Hall Row ──
    let thermalHallRow = '';
    if (b.hall && hallRent > 0) {
      const rateDisplay = b.hallChargeMode === 'per_seat' ? hallPerSeatRate : hallFixedPrice;
      const qtyDisplay = b.hallChargeMode === 'per_seat' ? guestCount : 1;
      thermalHallRow = `<tr>
        <td style="padding:2px 0;font-size:11px;">Hall: ${b.hall.name || ''} ${b.hallChargeMode === 'per_seat' ? `(×${guestCount})` : '(Full)'}</td>
        <td style="padding:2px 0;font-size:11px;text-align:center;">${qtyDisplay}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(hallRent)}</td>
      </tr>`;
    }

    // ── FIXED: Thermal Package Row ──
    let thermalPackageRow = '';
    if (selectedPackage && packageTotal > 0) {
      thermalPackageRow = `<tr>
        <td style="padding:2px 0;font-size:11px;">Package: ${selectedPackage.name || ''}</td>
        <td style="padding:2px 0;font-size:11px;text-align:center;">1</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(packageTotal)}</td>
      </tr>`;
    }

    const menuItems = (b.menus || []).map(m =>
      `<tr>
        <td style="padding:2px 0;font-size:11px;">${m.menuName || m.name}</td>
        <td style="padding:2px 0;font-size:11px;text-align:center;">${m.quantity}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(m.totalPrice)}</td>
      </tr>`
    ).join('');

    const serviceItems = (b.services || []).map(sv =>
      `<tr>
        <td style="padding:2px 0;font-size:11px;">${sv.serviceName || sv.name}</td>
        <td style="padding:2px 0;font-size:11px;text-align:center;">${sv.quantity}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(sv.totalPrice)}</td>
      </tr>`
    ).join('');

    const customItems = (b.customItems || []).map(i =>
      `<tr>
        <td style="padding:2px 0;font-size:11px;">${i.itemName}</td>
        <td style="padding:2px 0;font-size:11px;text-align:center;">${i.quantity}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(i.totalPrice)}</td>
      </tr>`
    ).join('');

    const paymentRows = payments.map(p =>
      `<tr>
        <td style="padding:2px 0;font-size:10px;">${formatDate(p.date || p.createdAt)}</td>
        <td style="padding:2px 0;font-size:10px;text-align:center;">${p.mode?.replace('_',' ').toUpperCase()}</td>
        <td style="padding:2px 0;font-size:10px;text-align:right;">${formatCurrency(p.amount)}</td>
      </tr>`
    ).join('');

    const totalAmount = Number(b.totalAmount || 0);
    const discount = Number(b.discount || 0);
    const paidAmount = Number(b.paidAmount || b.advanceAmount || 0);
    const dueAmount = Number(b.dueAmount || 0);

    const width = s.thermalWidth === '58mm' ? '58mm' : '80mm';
    const fontSize = s.thermalFontSize || '12px';

    const logoHtml = s.showLogo && s.logoUrl
      ? `<div style="text-align:center;margin-bottom:6px;"><img src="${s.logoUrl}" style="max-height:50px;max-width:100px;object-fit:contain;" /></div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <title>Thermal Receipt #${b.bookingNo || b.id || 'PENDING'}</title>
  <style>
    @page { size: ${width} auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: ${fontSize}; width: ${width}; margin: 0 auto; padding: 4px; color: #000; background: #fff; line-height: 1.3; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .info-line { display: flex; justify-content: space-between; font-size: 11px; }
    @media print { body { width: ${width}; margin: 0; padding: 4px; } .no-print { display: none; } }
    .no-print { text-align: center; margin: 10px 0; }
    .no-print button { padding: 8px 16px; background: #000; color: #fff; border: none; font-size: 12px; cursor: pointer; margin: 0 3px; }
  </style>
</head>
<body>
  ${logoHtml}
  ${s.showCompanyName ? `<div class="center" style="font-size:14px;font-weight:bold;">${s.companyName}</div>` : ''}
  ${s.showSlogan && s.companySlogan ? `<div class="center" style="font-size:10px;color:#333;">${s.companySlogan}</div>` : ''}
  ${s.showAddress && s.address ? `<div class="center" style="font-size:10px;">${s.address}</div>` : ''}
  ${s.showPhone && s.phone ? `<div class="center" style="font-size:10px;">Ph: ${s.phone}</div>` : ''}
  ${s.showEmail && s.email ? `<div class="center" style="font-size:10px;">${s.email}</div>` : ''}
  ${s.showGst && s.gstNumber ? `<div class="center" style="font-size:10px;">GST: ${s.gstNumber}</div>` : ''}
  ${s.showNTN && s.ntnNumber ? `<div class="center" style="font-size:10px;">NTN: ${s.ntnNumber}</div>` : ''}

  <div class="divider"></div>

  <div class="center bold" style="font-size:13px;">BOOKING RECEIPT</div>
  <div class="center" style="font-size:11px;">#${b.bookingNo || b.id || 'PENDING'}</div>

  <div class="divider"></div>

  ${s.showCustomerDetails ? `
  <div style="font-size:11px;font-weight:bold;margin-bottom:3px;">CUSTOMER</div>
  <div style="font-size:11px;">${b.guestName || 'Walk-in'}</div>
  <div style="font-size:10px;">${b.guestPhone || ''}</div>
  ${b.guestEmail ? `<div style="font-size:10px;">${b.guestEmail}</div>` : ''}
  <div class="divider"></div>
  ` : ''}

  <table>
    <thead>
      <tr style="font-size:10px;border-bottom:1px solid #000;">
        <th style="text-align:left;padding:2px 0;">Item</th>
        <th style="text-align:center;padding:2px 0;">Qty</th>
        <th style="text-align:right;padding:2px 0;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${thermalHallRow}
      ${thermalPackageRow}
      ${menuItems}
      ${customItems}
      ${serviceItems}
    </tbody>
  </table>

  <div class="double-divider"></div>

  <table>
    <tr class="info-line"><td style="font-size:11px;">Subtotal</td><td style="font-size:11px;text-align:right;font-weight:bold;">${formatCurrency(totalAmount + discount)}</td></tr>
    ${discount > 0 ? `<tr class="info-line"><td style="font-size:11px;">Discount</td><td style="font-size:11px;text-align:right;color:#c0392b;">-${formatCurrency(discount)}</td></tr>` : ''}
    <tr style="border-top:1px solid #000;"><td style="font-size:12px;font-weight:bold;padding-top:4px;">TOTAL</td><td style="font-size:12px;text-align:right;font-weight:bold;padding-top:4px;">${formatCurrency(totalAmount)}</td></tr>
    <tr class="info-line"><td style="font-size:11px;">Paid</td><td style="font-size:11px;text-align:right;color:#27ae60;">${formatCurrency(paidAmount)}</td></tr>
    <tr style="border-top:1px dashed #000;border-bottom:2px solid #000;"><td style="font-size:11px;font-weight:bold;padding-top:4px;padding-bottom:4px;">Due</td><td style="font-size:11px;text-align:right;font-weight:bold;padding-top:4px;padding-bottom:4px;color:#c0392b;">${formatCurrency(dueAmount)}</td></tr>
  </table>

  ${payments.length > 0 && s.showPaymentHistory ? `
    <div class="divider"></div>
    <div style="font-size:10px;font-weight:bold;margin-bottom:3px;">PAYMENTS</div>
    <table><tbody>${paymentRows}</tbody></table>
  ` : ''}

  <div class="double-divider"></div>

  <div class="center" style="font-size:10px;margin-top:6px;">
    ${s.showHeaderText && s.headerText ? `<div style="margin-bottom:4px;font-weight:bold;">${s.headerText}</div>` : ''}
    <div>Payment: ${b.paymentStatus || 'pending'}</div>
    <div style="margin-top:4px;font-size:9px;">Generated: ${formatDateTime(new Date())}</div>
    ${s.showFooterText && s.footerText ? `<div style="margin-top:6px;border-top:1px dashed #000;padding-top:4px;">${s.footerText}</div>` : ''}
    ${s.showWebsite && s.website ? `<div style="font-size:9px;margin-top:2px;">${s.website}</div>` : ''}
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ Print Thermal</button>
    <button onclick="window.close()">❌ Close</button>
  </div>
</body>
</html>`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          <p className="mt-4 text-sm font-bold" style={{ color: '#4A4A4A' }}>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="text-center">
          <XCircle size={48} className="mx-auto mb-3 text-red-400" />
          <p className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Booking not found</p>
          <button onClick={() => navigate('/bookings')} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' }}>
            <ArrowLeft size={16} className="inline mr-2" /> Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const s = statusConfig[booking.status] || statusConfig.tentative;
  const ps = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.pending;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5F2EB' }}>
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#E0D8CC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/bookings')} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
                <ArrowLeft size={20} style={{ color: '#4A4A4A' }} />
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Booking #{booking.bookingNo || booking.id}</h1>
                <p className="text-xs font-medium" style={{ color: '#7A7A7A' }}>{booking.title || booking.eventType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Print Dropdown */}
              <div className="relative group">
                <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                  <Printer size={14} /> Print ▾
                </button>
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border shadow-lg hidden group-hover:block z-50" style={{ borderColor: '#E0D8CC' }}>
                  <button onClick={printA4} className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 flex items-center gap-2 rounded-t-xl transition">
                    <FileText size={14} /> A4 Receipt
                  </button>
                  <button onClick={printThermal} className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 flex items-center gap-2 rounded-b-xl transition">
                    <Thermometer size={14} /> Thermal Receipt
                  </button>
                </div>
              </div>

              {Number(booking.dueAmount) > 0 && (
                <button onClick={openPaymentModal} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                  <CreditCard size={14} /> Receive Payment
                </button>
              )}
              <Link to={`/bookings/edit/${booking.id}`}>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#1565C0' }}>
                  <Edit2 size={14} /> Edit
                </button>
              </Link>
              <Link to="/receipt-settings">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#6A1B9A' }} title="Receipt Settings">
                  <Settings size={14} />
                </button>
              </Link>
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-red-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#B71C1C' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* ═══ STATUS BAR ═══ */}
        <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-wrap items-center justify-between gap-3" style={{ borderColor: '#E0D8CC' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: s.bg, color: s.color }}>
              {s.label}
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: ps.bg, color: ps.color }}>
              {ps.label}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              Created: {formatDateTime(booking.createdAt)}
            </span>
          </div>
          <button onClick={() => setStatusModalOpen(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-all" style={{ borderColor: '#E0D8CC', color: '#6A1B9A' }}>
            <CheckCircle size={12} className="inline mr-1" /> Change Status
          </button>
        </div>

        {/* ═══ QUICK STATS ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <span className="text-xs text-gray-400 block uppercase font-bold">Total</span>
            <span className="text-lg font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(booking.totalAmount)}</span>
          </div>
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <span className="text-xs text-gray-400 block uppercase font-bold">Paid</span>
            <span className="text-lg font-bold font-mono text-green-700">{formatCurrency(booking.paidAmount || booking.advanceAmount || 0)}</span>
          </div>
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <span className="text-xs text-gray-400 block uppercase font-bold">Due</span>
            <span className="text-lg font-bold font-mono" style={{ color: Number(booking.dueAmount) > 0 ? '#B71C1C' : '#1B5E20' }}>
  {formatCurrency(Math.max(0, Number(booking.totalAmount || 0) - Number(booking.paidAmount || booking.advanceAmount || 0)))}
</span>
          </div>
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <span className="text-xs text-gray-400 block uppercase font-bold">Guests</span>
            <span className="text-lg font-bold font-mono">{booking.guestCount}</span>
          </div>
          <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <span className="text-xs text-gray-400 block uppercase font-bold">Event Date</span>
            <span className="text-sm font-bold">{formatDate(booking.eventDate)}</span>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: '#E0D8CC' }}>
          <div className="px-4 pt-4 border-b flex gap-1 overflow-x-auto" style={{ borderColor: '#E0D8CC' }}>
            {[
              { key: 'overview', label: 'Overview', icon: Eye },
              { key: 'items', label: 'Items & Services', icon: Package },
              { key: 'payments', label: 'Payments', icon: CreditCard },
              { key: 'history', label: 'History', icon: History },
              { key: 'attachments', label: 'Attachments', icon: FileText },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.key ? 'border-[#A97A1F] text-[#A97A1F]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <User size={16} style={{ color: '#A97A1F' }} /> Customer Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-semibold">{booking.guestName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-semibold">{booking.guestPhone}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-semibold">{booking.guestEmail || 'N/A'}</span></div>
                      {booking.customer?.cnic && (
                        <div className="flex justify-between"><span className="text-gray-500">CNIC</span><span className="font-semibold">{booking.customer.cnic}</span></div>
                      )}
                      {booking.customer?.city && (
                        <div className="flex justify-between"><span className="text-gray-500">City</span><span className="font-semibold">{booking.customer.city}</span></div>
                      )}
                      {booking.customer?.address && (
                        <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-semibold text-right max-w-[200px]">{booking.customer.address}</span></div>
                      )}
                      {booking.customer?.emergencyContacts?.length > 0 && (
                        <div className="pt-2 border-t" style={{ borderColor: '#E0D8CC' }}>
                          <span className="text-xs font-bold text-gray-500 block mb-1">Emergency Contacts</span>
                          <div className="space-y-1">
                            {booking.customer.emergencyContacts.map((ec, i) => (
                              <div key={i} className="text-xs bg-white rounded-lg px-2 py-1 border" style={{ borderColor: '#E0D8CC' }}>
                                <span className="font-semibold">{ec.name}</span> ({ec.relation}): {ec.phone}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <Calendar size={16} style={{ color: '#A97A1F' }} /> Event Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Event Type</span><span className="font-semibold">{booking.eventType}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{formatDate(booking.eventDate)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-semibold">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Hall</span><span className="font-semibold">{booking.hall?.name || `Hall #${booking.hallId}`}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Hall Capacity</span><span className="font-semibold">{booking.hall?.capacity || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Hall Rent</span><span className="font-semibold font-mono">{formatCurrency(booking.hall?.price || booking.hall?.cost || 0)}</span></div>
                      {booking.package_total > 0 && booking.selected_package && (
  <div className="flex justify-between">
    <span className="text-gray-500">Package</span>
    <span className="font-semibold">{booking.selected_package.name}</span>
  </div>
)}
{booking.package_total > 0 && (
  <div className="flex justify-between">
    <span className="text-gray-500">Package Price</span>
    <span className="font-semibold font-mono">{formatCurrency(booking.package_total)}</span>
  </div>
)}
                      <div className="flex justify-between"><span className="text-gray-500">Expected Guests</span><span className="font-semibold">{booking.guestCount}</span></div>
                      {booking.actualGuestCount && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Actual Guests</span>
                          <span className="font-semibold flex items-center gap-1">
                            {booking.actualGuestCount}
                            {booking.actualGuestCount > booking.guestCount && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">+{booking.actualGuestCount - booking.guestCount}</span>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="font-semibold text-right max-w-[200px]">{booking.description || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>
{/* ── FIXED: Package in Financial Summary ── */}
{booking.package_total > 0 && (
  <div className="flex justify-between text-gray-600 border-t pt-2" style={{ borderColor: '#E0D8CC' }}>
    <span className="flex items-center gap-1.5"><Package size={14} /> Package</span>
    <span className="font-mono font-medium">{formatCurrency(booking.package_total)}</span>
  </div>
)}
                {/* ── EVENT EXECUTION CARD ── */}
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#F0F7FF', borderColor: '#90CAF9' }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                    <Flame size={16} style={{ color: '#1565C0' }} /> Event Execution
                  </h3>
                  {eventExecution ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{
                          backgroundColor: eventExecution.status === 'completed' ? '#E8F5E9' : '#FFF3E0',
                          color: eventExecution.status === 'completed' ? '#1B5E20' : '#E65100'
                        }}>
                          {eventExecution.status === 'in_progress' ? 'In Progress' : 'Completed'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Planned Guests</span>
                        <span className="font-semibold text-sm">{eventExecution.plannedGuestCount || booking.guestCount}</span>
                      </div>
                      {eventExecution.actualGuestCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Actual Guests</span>
                          <span className="font-semibold text-sm">{eventExecution.actualGuestCount}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Inventory Cost</span>
                        <span className="font-mono font-semibold text-sm text-blue-700">{formatCurrency(eventExecution.inventoryCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Profit</span>
                        <span className="font-mono font-semibold text-sm" style={{
                          color: Number(eventExecution.profit) >= 0 ? '#1B5E20' : '#B71C1C'
                        }}>
                          {formatCurrency(eventExecution.profit)}
                        </span>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => navigate(`/event-executions/${eventExecution.id}`)}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Eye size={12} /> View Details
                        </button>
                        <button
                          onClick={handleRollbackInventory}
                          disabled={rollingBack}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {rollingBack ? <RotateCcw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Rollback
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-3">No event execution started yet.</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handlePreviewInventory}
                          disabled={previewLoading}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          {previewLoading ? <RotateCcw size={12} className="animate-spin" /> : <Eye size={12} />}
                          Preview Stock
                        </button>
                        <button
                          onClick={handleStartEvent}
                          disabled={startingEvent}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          {startingEvent ? <RotateCcw size={12} className="animate-spin" /> : <Flame size={12} />}
                          Start Event
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                    <Receipt size={16} style={{ color: '#A97A1F' }} /> Financial Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl p-3 text-center border" style={{ borderColor: '#E0D8CC' }}>
                      <span className="text-xs text-gray-500 block">Subtotal</span>
                      <span className="font-bold font-mono text-sm">{formatCurrency(Number(booking.totalAmount || 0) + Number(booking.discount || 0))}</span>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border" style={{ borderColor: '#E0D8CC' }}>
                      <span className="text-xs text-gray-500 block">Discount</span>
                      <span className="font-bold font-mono text-sm text-green-600">-{formatCurrency(booking.discount)}</span>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border" style={{ borderColor: '#E0D8CC' }}>
                      <span className="text-xs text-gray-500 block">Grand Total</span>
                      <span className="font-bold font-mono text-sm" style={{ color: '#A97A1F' }}>{formatCurrency(booking.totalAmount)}</span>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border" style={{ borderColor: '#E0D8CC' }}>
                      <span className="text-xs text-gray-500 block">Total Paid</span>
                      <span className="font-bold font-mono text-sm text-green-700">{formatCurrency(booking.paidAmount || booking.advanceAmount || 0)}</span>
                    </div>
                    <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' }}>
                      <span className="text-xs text-red-600 block">Due Balance</span>
                      <span className="font-bold font-mono text-sm text-red-700">
  {formatCurrency(Math.max(0, Number(booking.totalAmount || 0) - Number(booking.paidAmount || booking.advanceAmount || 0)))}
</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ITEMS TAB ── */}
            {activeTab === 'items' && (
              <div className="space-y-6">
                {booking.menus && booking.menus.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <Utensils size={16} style={{ color: '#A97A1F' }} /> Menu Items ({booking.menus.length})
                    </h3>
                    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E0D8CC' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: '#FAF8F4' }}>
                            <th className="text-left px-3 py-2.5 text-xs font-bold">Item</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Qty</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Unit</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Unit Price</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Total</th>
                            <th className="text-left px-3 py-2.5 text-xs font-bold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: '#F0ECE6' }}>
                          {booking.menus.map((m, i) => (
  <tr key={i}>
    <td className="px-3 py-2.5 font-semibold">{m.menuName || m.name || 'Menu Item'}</td>
    <td className="px-3 py-2.5 text-right font-mono">{m.quantity}</td>
    <td className="px-3 py-2.5 text-right">{m.unit || 'plate'}</td>
    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(m.unitPrice || 0)}</td>
    <td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: '#A97A1F' }}>{formatCurrency(m.totalPrice || 0)}</td>
    <td className="px-3 py-2.5 text-xs text-gray-500">{m.notes || '-'}</td>
  </tr>
))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {booking.services && booking.services.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <Tag size={16} style={{ color: '#A97A1F' }} /> Services & Add-ons ({booking.services.length})
                    </h3>
                    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E0D8CC' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: '#FAF8F4' }}>
                            <th className="text-left px-3 py-2.5 text-xs font-bold">Service</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Qty</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Unit Price</th>
                            <th className="text-right px-3 py-2.5 text-xs font-bold">Total</th>
                            <th className="text-left px-3 py-2.5 text-xs font-bold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: '#F0ECE6' }}>
                          {booking.services.map((s, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5 font-semibold">{s.serviceName}</td>
                              <td className="px-3 py-2.5 text-right font-mono">{s.quantity}</td>
                              <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(s.unitPrice)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: '#A97A1F' }}>{formatCurrency(s.totalPrice)}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-500">{s.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {/* ── FIXED: Package in Items Tab ── */}
{booking.package_total > 0 && booking.selected_package && (
  <div className="rounded-xl p-4 border" style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Package size={16} style={{ color: '#A97A1F' }} />
        <span className="font-bold text-sm">Package — {booking.selected_package.name || 'Package'}</span>
      </div>
      <span className="font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(booking.package_total)}</span>
    </div>
  </div>
)}
{booking.customItems && booking.customItems.length > 0 && (
  <div>
    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
      <Settings size={16} style={{ color: '#A97A1F' }} /> Custom Items ({booking.customItems.length})
    </h3>
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E0D8CC' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: '#FAF8F4' }}>
            <th className="text-left px-3 py-2.5 text-xs font-bold">Item</th>
            <th className="text-right px-3 py-2.5 text-xs font-bold">Qty</th>
            <th className="text-right px-3 py-2.5 text-xs font-bold">Unit</th>
            <th className="text-right px-3 py-2.5 text-xs font-bold">Unit Price</th>
            <th className="text-right px-3 py-2.5 text-xs font-bold">Total</th>
            <th className="text-left px-3 py-2.5 text-xs font-bold">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: '#F0ECE6' }}>
          {booking.customItems.map((item, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2.5 font-semibold">{item.itemName}</td>
              <td className="px-3 py-2.5 text-right font-mono">{item.quantity}</td>
              <td className="px-3 py-2.5 text-right">{item.unit || '-'}</td>
              <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(item.unitPrice || 0)}</td>
<td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: '#A97A1F' }}>{formatCurrency(item.totalPrice || 0)}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500">{item.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
                <div className="rounded-xl p-4 border flex items-center justify-between" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} style={{ color: '#A97A1F' }} />
                    <span className="font-bold text-sm">Hall Rent — {booking.hall?.name || 'N/A'}</span>
                  </div>
                  <span className="font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(booking.hall?.price || booking.hall?.cost || 0)}</span>
                </div>

                <div className="rounded-xl p-4 border flex items-center justify-between" style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }}>
                  <span className="font-bold text-sm" style={{ color: '#92400E' }}>Grand Total</span>
                  <span className="text-xl font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(booking.totalAmount)}</span>
                </div>
              </div>
            )}

            {/* ── PAYMENTS TAB ── */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 border text-center" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <span className="text-xs text-gray-500 block uppercase font-bold">Grand Total</span>
                    <span className="text-lg font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(booking.totalAmount)}</span>
                  </div>
                  <div className="rounded-xl p-4 border text-center" style={{ backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }}>
                    <span className="text-xs text-green-700 block uppercase font-bold">Total Paid</span>
                    <span className="text-lg font-bold font-mono text-green-700">{formatCurrency(booking.paidAmount || booking.advanceAmount || 0)}</span>
                  </div>
                  <div className="rounded-xl p-4 border text-center" style={{ backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' }}>
  <span className="text-xs text-red-700 block uppercase font-bold">Due Balance</span>
  <span className="text-lg font-bold font-mono text-red-700">
    {formatCurrency(Math.max(0, Number(booking.totalAmount || 0) - Number(booking.paidAmount || booking.advanceAmount || 0)))}
  </span>
</div>
                  <div className="rounded-xl p-4 border text-center" style={{ backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }}>
                    <span className="text-xs text-blue-700 block uppercase font-bold">Payments Made</span>
                    <span className="text-lg font-bold font-mono text-blue-700">{(booking.payments || []).length}</span>
                  </div>
                </div>

                {Number(booking.dueAmount) > 0 && (
                  <button onClick={openPaymentModal}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-[1.01]"
                    style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                    <CreditCard size={16} className="inline mr-2" /> Receive New Payment
                  </button>
                )}

                {(booking.payments || []).length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E0D8CC' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#FAF8F4' }}>
                          <th className="text-left px-3 py-2.5 text-xs font-bold">#</th>
                          <th className="text-left px-3 py-2.5 text-xs font-bold">Date</th>
                          <th className="text-left px-3 py-2.5 text-xs font-bold">Mode</th>
                          <th className="text-left px-3 py-2.5 text-xs font-bold">Description</th>
                          <th className="text-right px-3 py-2.5 text-xs font-bold">Amount</th>
                          <th className="text-right px-3 py-2.5 text-xs font-bold">Running Total</th>
                          <th className="text-right px-3 py-2.5 text-xs font-bold">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: '#F0ECE6' }}>
                        {(() => {
                          let runningTotal = 0;
                          const total = Number(booking.totalAmount || 0);
                          const sortedPayments = [...(booking.payments || [])].sort((a, b) => 
                            new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
                          );
                          return sortedPayments.map((p, i) => {
                            runningTotal += Number(p.amount || 0);
                            const remaining = total - runningTotal;
                            const ModeIcon = paymentModeIcons[p.mode] || Banknote;
                            return (
                              <tr key={p.id || i} className="hover:bg-gray-50">
                                <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{i + 1}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <div className="font-semibold">{formatDate(p.date || p.createdAt)}</div>
                                  <div className="text-xs text-gray-400">{formatTime(p.date || p.createdAt)}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <ModeIcon size={14} style={{ color: '#A97A1F' }} />
                                    <span className="capitalize font-medium">{p.mode?.replace('_', ' ')}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-gray-600">{p.description || '-'}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-green-700">{formatCurrency(p.amount)}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: '#1565C0' }}>{formatCurrency(runningTotal)}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: remaining > 0 ? '#B71C1C' : '#1B5E20' }}>{formatCurrency(remaining)}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <CreditCard size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-gray-500">No payments recorded yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Receive New Payment" to add the first payment.</p>
                  </div>
                )}

                {(booking.payments || []).length > 0 && (
                  <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <History size={16} style={{ color: '#A97A1F' }} /> Payment Timeline
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        let runningTotal = 0;
                        const total = Number(booking.totalAmount || 0);
                        const sortedPayments = [...(booking.payments || [])].sort((a, b) => 
                          new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
                        );
                        return sortedPayments.map((p, i) => {
                          runningTotal += Number(p.amount || 0);
                          const remaining = total - runningTotal;
                          const ModeIcon = paymentModeIcons[p.mode] || Banknote;
                          return (
                            <div key={p.id || i} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E8F5E9' }}>
                                <ModeIcon size={14} style={{ color: '#1B5E20' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm">{formatCurrency(p.amount)}</span>
                                  <span className="text-xs text-gray-400">{formatDate(p.date || p.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-500 capitalize">{p.mode?.replace('_', ' ')} {p.description ? `• ${p.description}` : ''}</p>
                                <div className="mt-1 flex items-center gap-2 text-xs">
                                  <span className="text-blue-600 font-mono">Paid: {formatCurrency(runningTotal)}</span>
                                  <span className="text-gray-300">|</span>
                                  <span className="font-mono" style={{ color: remaining > 0 ? '#B71C1C' : '#1B5E20' }}>Rem: {formatCurrency(remaining)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <Clock size={16} style={{ color: '#A97A1F' }} /> Booking Timeline
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#A97A1F' }} />
                        <div>
                          <p className="text-sm font-semibold">Booking Created</p>
                          <p className="text-xs text-gray-400">{formatDateTime(booking.createdAt)}</p>
                        </div>
                      </div>
                      {booking.confirmedAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#1B5E20' }} />
                          <div>
                            <p className="text-sm font-semibold">Booking Confirmed</p>
                            <p className="text-xs text-gray-400">{formatDateTime(booking.confirmedAt)}</p>
                          </div>
                        </div>
                      )}
                      {booking.completedAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#1565C0' }} />
                          <div>
                            <p className="text-sm font-semibold">Event Completed</p>
                            <p className="text-xs text-gray-400">{formatDateTime(booking.completedAt)}</p>
                          </div>
                        </div>
                      )}
                      {booking.cancelledAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#B71C1C' }} />
                          <div>
                            <p className="text-sm font-semibold">Booking Cancelled</p>
                            <p className="text-xs text-gray-400">{formatDateTime(booking.cancelledAt)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#7A7A7A' }} />
                        <div>
                          <p className="text-sm font-semibold">Last Updated</p>
                          <p className="text-xs text-gray-400">{formatDateTime(booking.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                      <RotateCcw size={16} style={{ color: '#A97A1F' }} /> Status Changes
                    </h3>
                    {(booking.statusHistory || []).length > 0 ? (
                      <div className="space-y-2">
                        {booking.statusHistory.map((h, i) => {
                          const fromCfg = statusConfig[h.fromStatus];
                          const toCfg = statusConfig[h.toStatus];
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border" style={{ borderColor: '#E0D8CC' }}>
                              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: fromCfg?.bg, color: fromCfg?.color }}>{fromCfg?.label || h.fromStatus}</span>
                              <ArrowDownRight size={14} className="text-gray-400" />
                              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: toCfg?.bg, color: toCfg?.color }}>{toCfg?.label || h.toStatus}</span>
                              <span className="text-xs text-gray-400 ml-auto">{formatDateTime(h.changedAt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No status changes recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── ATTACHMENTS TAB ── */}
            {activeTab === 'attachments' && (
              <div className="space-y-6">
                {(booking.attachments || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {booking.attachments.map((att, i) => (
                      <div key={i} className="rounded-xl p-3 border flex items-center gap-3" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E3F2FD' }}>
                          <FileText size={18} style={{ color: '#1565C0' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{att.name || `Attachment ${i + 1}`}</p>
                          <p className="text-xs text-gray-400">{att.type || 'Document'} • {formatDate(att.createdAt)}</p>
                        </div>
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-amber-100 transition-all" style={{ color: '#A97A1F' }}>
                          <Download size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-gray-500">No attachments</p>
                    <p className="text-sm text-gray-400 mt-1">No files have been attached to this booking.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ STATUS UPDATE MODAL ═══════ */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border p-6" style={{ borderColor: '#E0D8CC' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>Update Status</h3>
            <p className="text-sm text-gray-500 mb-4">Booking #{booking.bookingNo}</p>

            <div className="space-y-2 mb-6">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <button key={key} onClick={() => setNewStatus(key)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    newStatus === key ? 'border-[#A97A1F] ring-2 ring-[#A97A1F]/20' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                  {newStatus === key && <CheckCircle size={16} style={{ color: '#A97A1F' }} />}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStatusModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50" style={{ borderColor: '#E0D8CC' }}>
                Cancel
              </button>
              <button onClick={handleStatusUpdate}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' }}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PREVIEW INVENTORY MODAL ═══════ */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border p-6" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                  <Eye size={20} style={{ color: '#A97A1F' }} />
                  Inventory Deduction Preview
                </h3>
                <p className="text-xs text-gray-500">Booking #{booking?.bookingNo}</p>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={20} style={{ color: '#4A4A4A' }} />
              </button>
            </div>

            {previewData.shortages?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                  <AlertTriangle size={16} />
                  Stock Shortage — Cannot Start Event
                </div>
                <div className="space-y-1.5">
                  {previewData.shortages.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs text-red-800 bg-white/60 rounded-lg px-3 py-2">
                      <span className="font-semibold">{s.name}</span>
                      <span className="font-mono">Need: {s.required} {s.unit} | Have: {s.available}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewData.deductions?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Ingredients to Deduct</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {previewData.deductions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{d.name}</div>
                        <div className="text-[10px] text-gray-500">
                          {d.usedInDishes?.map(u => u.menuItemName).join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-green-700 text-sm">
                          -{Number(d.quantity).toLocaleString()} {d.unit}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Cost: {formatCurrency(d.totalCost)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setPreviewModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50" style={{ borderColor: '#E0D8CC' }}>
                Close
              </button>
              {previewData.success && (
                <button onClick={handleStartEvent}
                  disabled={startingEvent}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                  {startingEvent ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Flame size={16} />
                  )}
                  {startingEvent ? 'Starting...' : 'Start Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ RECEIVE PAYMENT MODAL ═══════ */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border p-6" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Receive Payment</h3>
                <p className="text-xs text-gray-500">Booking #{booking.bookingNo}</p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={20} style={{ color: '#4A4A4A' }} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl p-2 text-center border" style={{ backgroundColor: '#F5F5F5', borderColor: '#E0D8CC' }}>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Total</span>
                <span className="font-bold font-mono text-sm">{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="rounded-xl p-2 text-center border" style={{ backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }}>
                <span className="text-[10px] text-green-700 block uppercase font-bold">Paid</span>
                <span className="font-bold font-mono text-sm text-green-700">{formatCurrency(booking.paidAmount || booking.advanceAmount || 0)}</span>
              </div>
              <div className="rounded-xl p-2 text-center border" style={{ backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' }}>
                <span className="text-[10px] text-red-700 block uppercase font-bold">Due</span>
                <span className="font-bold font-mono text-sm text-red-700">
  {formatCurrency(Math.max(0, Number(booking.totalAmount || 0) - Number(booking.paidAmount || booking.advanceAmount || 0)))}
</span>
              </div>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Amount (Rs) *</label>
                <input type="number" min="1" max={booking.dueAmount} required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
                <p className="text-[10px] text-gray-400 mt-1">Max: {formatCurrency(booking.dueAmount)}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Payment Mode *</label>
                <select value={paymentForm.mode}
                  onChange={e => setPaymentForm(prev => ({ ...prev, mode: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Receive In Account *</label>
                <select value={paymentForm.bankAccountId} required
                  onChange={e => setPaymentForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                  <option value="">-- Select Bank Account --</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountNumber} (Bal: {formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Date *</label>
                <input type="date" value={paymentForm.date} required
                  onChange={e => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Description</label>
                <input type="text" placeholder="e.g. 2nd installment, final payment"
                  value={paymentForm.description}
                  onChange={e => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50" style={{ borderColor: '#E0D8CC' }}>
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetail;