// src/pages/BookingList.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Calendar, Clock, Users, MapPin, Phone, Eye, Edit2, Trash2, Plus,
  ChevronLeft, ChevronRight, X, Printer, Receipt, FileText, Download,
  AlertTriangle, CheckCircle, XCircle, Clock4, Package, Utensils, Tag,
  CreditCard, TrendingUp, TrendingDown, History, Filter,
  User, Building2, Sparkles, Gem, Flame, Ban, RotateCcw,
  Banknote, Wallet, Landmark, MoreVertical, ArrowDownRight, LayoutGrid, Table as TableIcon,
  UserPlus, Briefcase, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

import bookingApi from '../../services/bookingApi';
import accountApi from '../../services/accountApi';
import employeeApi from '../../services/employeeApi';
import payrollApi from '../../services/payrollApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import ReactSelect from '../../components/ui/ReactSelect';
import receiptSettingsApi from '../../services/receiptSettingsApi';

// ── STATUS CONFIG ──
const statusConfig = {
  tentative:    { color: '#1565C0', bg: '#E3F2FD', label: 'Tentative',    icon: Clock4 },
  confirmed:    { color: '#1B5E20', bg: '#E8F5E9', label: 'Confirmed',    icon: CheckCircle },
  in_progress:  { color: '#6A1B9A', bg: '#F3E5F5', label: 'In Progress',  icon: Flame },
  completed:    { color: '#2E7D32', bg: '#E8F5E9', label: 'Completed',    icon: Sparkles },
  cancelled:    { color: '#B71C1C', bg: '#FFEBEE', label: 'Cancelled',    icon: Ban },
  no_show:      { color: '#424242', bg: '#F5F5F5', label: 'No Show',      icon: XCircle },
};

// ── PAYMENT STATUS CONFIG ──
const paymentStatusConfig = {
  pending:   { color: '#B71C1C', bg: '#FFEBEE', label: 'Pending',   icon: Clock4 },
  partial:   { color: '#E65100', bg: '#FFF3E0', label: 'Partial',   icon: AlertTriangle },
  completed: { color: '#1B5E20', bg: '#E8F5E9', label: 'Completed', icon: CheckCircle },
  refunded:  { color: '#1565C0', bg: '#E3F2FD', label: 'Refunded',  icon: RotateCcw },
  failed:    { color: '#B71C1C', bg: '#FFEBEE', label: 'Failed',    icon: XCircle },
};

const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';

// ── DROPDOWN COMPONENT ──
const ActionDropdown = ({ booking, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    { key: 'view', label: 'View Details', icon: Eye, color: '#A97A1F' },
    { key: 'assignStaff', label: '👤 Assign Staff', icon: UserPlus, color: '#6A1B9A' },
    { key: 'status', label: 'Change Status', icon: CheckCircle, color: '#6A1B9A' },
    { key: 'payment', label: 'Receive Payment', icon: CreditCard, color: '#1B5E20', condition: Number(booking.dueAmount) > 0 },
    // { key: 'print', label: 'Print Receipt', icon: Printer, color: '#424242' },
    { key: 'edit', label: 'Edit Booking', icon: Edit2, color: '#1565C0' },
    { key: 'delete', label: 'Delete Booking', icon: Trash2, color: '#B71C1C' },
  ];

  const handleAction = (key) => {
    setIsOpen(false);
    onAction(key, booking);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
        style={{ color: '#4A4A4A' }}
      >
        <MoreVertical size={18} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border py-1 z-[99999] min-w-[180px]" style={{ borderColor: '#E0D8CC' }}>
          {actions.filter(a => a.condition !== false).map((action) => (
            <button
              key={action.key}
              onClick={() => handleAction(action.key)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-all text-left"
              style={{ color: '#1A1A1A' }}
            >
              <action.icon size={16} style={{ color: action.color }} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BookingList = () => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [hallFilter, setHallFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [viewMode, setViewMode] = useState('grid');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);

  // ── Receipt Settings ──
  const [receiptSettings, setReceiptSettings] = useState({
    companyName: 'UniSoft Enterprise',
    companySlogan: 'Premium Event & Hall Booking',
    address: 'Main Branch, City Center',
    phone: '0300-1234567',
    email: 'info@UniSoft.com',
    website: 'www.UniSoft.com',
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
    showGst: false,
    gstNumber: 'GST-12345678',
    showNTN: false,
    ntnNumber: 'NTN-987654321',
    showCustomerDetails: true,
    showPaymentHistory: true,
    themeColor: '#1a1a2e',
    accentColor: '#A97A1F',
    thermalWidth: '80mm',
    thermalFontSize: '12px',
  });

  // ── Modal States ──
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [bookingToUpdate, setBookingToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // ── Payment Modal ──
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [bookingForPayment, setBookingForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'cash',
    description: '',
    date: new Date().toISOString().split('T')[0],
    bankAccountId: ''
  });

  // ── Assign Staff Modal ──
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [bookingForAssign, setBookingForAssign] = useState(null);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    role: '',
    agreedAmount: '',
    hoursWorked: '',
    paymentType: 'auto',
    autoPayOnEventStart: true,
    notes: ''
  });
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Fetch Bookings ──
  const {
    data: bookingResult,
    loading,
    refetch
  } = useGlobalData(
    async (branchId) => {
      const activeBranchId = branchId || currentBranch?.id || 1;
      const res = await bookingApi.getAll({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        hallId: hallFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        branchId: activeBranchId
      });
      return res?.data || res || [];
    },
    {
      dependencies: [searchQuery, statusFilter, paymentStatusFilter, hallFilter, dateFrom, dateTo],
      onError: (err) => {
        console.error('Fetch bookings error:', err);
        toast.error(err?.response?.data?.message || 'Failed to load event bookings');
      }
    }
  );

  const bookingsList = Array.isArray(bookingResult?.data) ? bookingResult.data : (Array.isArray(bookingResult) ? bookingResult : []);

  // ── Fetch Receipt Settings ──
  useEffect(() => {
    const fetchReceiptSettings = async () => {
      try {
        const res = await receiptSettingsApi.getAll({ branchId: currentBranch?.id });
        const dataArray = res?.data || res;
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const db = dataArray[0];
          setReceiptSettings(prev => ({ ...prev, ...db }));
        }
      } catch (err) {
        console.error('Failed to load receipt settings:', err);
        try {
          const saved = localStorage.getItem('receiptSettings');
          if (saved) {
            setReceiptSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
          }
        } catch {}
      }
    };
    if (currentBranch?.id) fetchReceiptSettings();
  }, [currentBranch?.id]);

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

  // ── Load Employees for Assign Staff ──
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await employeeApi.getAll({ status: 'active' });
        console.log('📥 Employees for assign:', res);
        let empData = [];
        if (res && res.success && Array.isArray(res.data)) {
          empData = res.data;
        } else if (res && res.data && Array.isArray(res.data)) {
          empData = res.data;
        } else if (res && res.data && Array.isArray(res.data.data)) {
          empData = res.data.data;
        } else {
          empData = res?.data?.data || res?.data || [];
        }
        setEmployees(empData);
      } catch (err) {
        console.error('Failed to load employees:', err);
      }
    };
    loadEmployees();
  }, []);

  // ── Unique Halls ──
  const uniqueHalls = useMemo(() => {
    const halls = new Set();
    bookingsList.forEach(b => {
      if (b.hall?.name) halls.add(b.hall.name);
      else if (b.hallId) halls.add(`Hall #${b.hallId}`);
    });
    return Array.from(halls);
  }, [bookingsList]);

  const filteredBookings = useMemo(() => {
    return bookingsList.filter(booking => {
      const matchesHall = !hallFilter || booking.hall?.name === hallFilter || booking.hallId?.toString() === hallFilter;
      return matchesHall;
    });
  }, [bookingsList, hallFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = bookingsList.length;
    const confirmed = bookingsList.filter(b => b.status === 'confirmed').length;
    const in_progress = bookingsList.filter(b => b.status === 'in_progress').length;
    const completed = bookingsList.filter(b => b.status === 'completed').length;
    const tentative = bookingsList.filter(b => b.status === 'tentative').length;
    const cancelled = bookingsList.filter(b => b.status === 'cancelled').length;
    const no_show = bookingsList.filter(b => b.status === 'no_show').length;

    const totalRevenue = bookingsList.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const totalPaid = bookingsList.reduce((s, b) => s + Number(b.paidAmount || b.advanceAmount || 0), 0);
    const totalDue = bookingsList.reduce((s, b) => s + Number(b.dueAmount || 0), 0);

    return {
      total, confirmed, in_progress, completed, tentative, cancelled, no_show,
      totalRevenue, totalPaid, totalDue
    };
  }, [bookingsList]);

  // ── Handlers ──
  const handleAction = (action, booking) => {
    switch(action) {
      case 'view': 
        navigate(`/bookings/${booking.id}`);
        break;
      case 'assignStaff': 
        openAssignModal(booking);
        break;
      case 'status': 
        openStatusModal(booking); 
        break;
      case 'payment': 
        openPaymentModal(booking); 
        break;
      case 'print': 
        printBooking(booking); 
        break;
      case 'edit': 
        navigate(`/bookings/edit/${booking.id}`); 
        break;
      case 'delete': 
        handleDelete(booking.id); 
        break;
      default: 
        break;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await bookingApi.delete(id);
      toast.success('Booking deleted successfully!');
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete booking');
    }
  };

  // ── Status Modal ──
  const openStatusModal = (booking) => {
    setBookingToUpdate(booking);
    setNewStatus(booking.status);
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!bookingToUpdate || !newStatus) return;
    if (newStatus === 'completed' && Number(bookingToUpdate.dueAmount || 0) > 0) {
      toast.error(`Cannot mark as Completed — ${formatCurrency(bookingToUpdate.dueAmount)} is still due!`);
      return;
    }
    try {
      await bookingApi.update(bookingToUpdate.id, { status: newStatus });
      toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`);
      setStatusModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Payment Modal ──
  const openPaymentModal = (booking) => {
    setBookingForPayment(booking);
    setPaymentForm({
      amount: booking.dueAmount || '',
      mode: 'cash',
      description: 'Payment received',
      date: new Date().toISOString().split('T')[0],
      bankAccountId: ''
    });
    setPaymentModalOpen(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!bookingForPayment) return;
    
    const amountNum = Number(paymentForm.amount);
    if (amountNum <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (amountNum > Number(bookingForPayment.dueAmount || 0)) {
      toast.error('Amount cannot exceed due balance');
      return;
    }
    if (!paymentForm.bankAccountId) {
      toast.error('Please select a bank account to receive payment');
      return;
    }
    
    try {
      await bookingApi.addPayment(bookingForPayment.id, {
        amount: amountNum,
        mode: paymentForm.mode,
        description: paymentForm.description,
        date: paymentForm.date,
        bankAccountId: parseInt(paymentForm.bankAccountId)
      });
      
      toast.success('Payment recorded successfully!');
      setPaymentModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Payment error:', err);
      const msg = err?.response?.data?.message 
        || err?.response?.data?.error 
        || err?.message 
        || 'Failed to record payment';
      toast.error(msg);
    }
  };

  // ── ASSIGN STAFF MODAL ──
  const openAssignModal = (booking) => {
    setBookingForAssign(booking);
    setAssignForm({
      employeeId: '',
      role: '',
      agreedAmount: '',
      hoursWorked: '',
      paymentType: 'auto',
      autoPayOnEventStart: true,
      notes: ''
    });
    setAssignModalOpen(true);
  };

  const handleAssignChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAssignForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!assignForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!assignForm.agreedAmount || parseFloat(assignForm.agreedAmount) <= 0) {
      toast.error('Please enter a valid agreed amount');
      return;
    }

    try {
      setAssignLoading(true);
      const payload = {
        bookingId: bookingForAssign.id,
        employeeId: parseInt(assignForm.employeeId),
        role: assignForm.role || null,
        paymentType: assignForm.paymentType,
        agreedAmount: parseFloat(assignForm.agreedAmount),
        hoursWorked: assignForm.hoursWorked ? parseFloat(assignForm.hoursWorked) : null,
        autoPayOnEventStart: assignForm.autoPayOnEventStart,
        notes: assignForm.notes || null
      };

      console.log('📤 Assigning staff with payload:', payload);

      const result = await payrollApi.createEventAssignment(payload);

      if (result.data.success) {
        toast.success(`Staff assigned to "${bookingForAssign.eventName || bookingForAssign.title}" successfully!`);
        setAssignModalOpen(false);
        refetch();
      } else {
        toast.error(result.data.message || 'Failed to assign staff');
      }
    } catch (err) {
      console.error('Assign error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Something went wrong');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── PRINT FUNCTION ──
  const printBooking = (booking) => {
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Popup blocked! Please allow popups for this site.');
      return;
    }
    w.document.write(generateBookingHTML(booking));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const generateBookingHTML = (b) => {
  const s = { ...receiptSettings };
  
  // ── Calculate Hall Rent Correctly ──
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

  const payments = b.payments || [];
  const totalAmount = Number(b.totalAmount || 0);
  const discount = Number(b.discount || 0);
  const paidAmount = Number(b.paidAmount || b.advanceAmount || 0);
  const dueAmount = Number(b.dueAmount || 0);

  // ── Menu Rows ──
  const menuRows = (b.menus || []).map(m => 
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${m.menuName}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${m.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(m.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(m.totalPrice)}</td>
    </tr>`
  ).join('');

  // ── Service Rows ──
  const serviceRows = (b.services || []).map(s => 
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${s.serviceName}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${s.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(s.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(s.totalPrice)}</td>
    </tr>`
  ).join('');

  // ── Custom Items Rows ──
  const customRows = (b.customItems || []).map(i => 
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${i.itemName}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${i.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(i.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(i.totalPrice)}</td>
    </tr>`
  ).join('');

  // ── Package Row ──
  let packageRow = '';
  if (b.selectedPackage && b.packageTotal && b.packageTotal > 0) {
    packageRow = `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;"><strong>Package: ${b.selectedPackage?.name || ''}</strong><br><span style="color:#888;font-size:11px;">${b.selectedPackage?.eventType || ''}</span></td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">1</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(b.packageTotal)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(b.packageTotal)}</td>
    </tr>`;
  }

  // ── Hall Row ──
  let hallRow = '';
  if (b.hall && hallRent > 0) {
    const rateDisplay = b.hallChargeMode === 'per_seat' ? hallPerSeatRate : hallFixedPrice;
    const qtyDisplay = b.hallChargeMode === 'per_seat' ? guestCount : 1;
    hallRow = `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">
        <strong>${b.hallChargeMode === 'per_seat' ? `Hall Rent (×${guestCount} guests)` : 'Hall Rent (Full Hall)'}</strong>
        <br><span style="color:#888;font-size:11px;">${b.hall.name || ''}</span>
      </td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${qtyDisplay}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(rateDisplay)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(hallRent)}</td>
    </tr>`;
  }

  // ── Payment Rows ──
  const paymentRows = payments.map(p => 
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${formatDate(p.date || p.createdAt)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.mode?.replace('_', ' ').toUpperCase() || '-'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.description || '-'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;text-align:right;font-weight:600;">${formatCurrency(p.amount)}</td>
    </tr>`
  ).join('');

  // ── Logo ──
  const logoHtml = s.showLogo && s.logoUrl
    ? `<img src="${s.logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain;" />`
    : `<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:${s.themeColor};">${s.companyName?.charAt(0) || 'R'}</div>`;

  // ── Status Badge ──
  const statusBadge = statusConfig[b.status] || statusConfig.tentative;
  const paymentBadge = paymentStatusConfig[b.paymentStatus] || paymentStatusConfig.pending;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Booking Receipt #${b.bookingNo}</title>
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
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .info-box { background: #f8f7f4; border-radius: 8px; padding: 15px 18px; }
    .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 8px; font-weight: 600; }
    .info-box .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
    .info-box .row .label { color: #666; }
    .info-box .row .value { font-weight: 600; color: #1a1a2e; }
    
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .items-table thead th { background: #f8f7f4; padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 2px solid #e8e6e0; }
    .items-table tbody td { padding: 9px 14px; border-bottom: 1px solid #f0eee8; }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    
    .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: ${statusBadge.bg || '#f0f0f0'}; color: ${statusBadge.color || '#333'}; }
    
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
    
    .marquee { background: ${s.themeColor}; color: #fff; padding: 6px 0; font-size: 11px; text-align: center; overflow: hidden; white-space: nowrap; }
    .marquee span { display: inline-block; }
    
    .no-print { text-align: center; margin: 20px 0 10px 0; }
    .no-print button { padding: 10px 30px; background: ${s.themeColor}; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; margin: 0 5px; }
    .no-print button:hover { opacity: 0.9; }

    @media print {
      body { background: #fff; padding: 0; }
      .receipt-container { box-shadow: none; border-radius: 0; }
      .receipt-header { background: ${s.themeColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .company-info { background: #fafafa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .info-box { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .items-table thead th { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .summary-item { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .payment-history table th { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-footer { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .status-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .marquee { background: ${s.themeColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    
    <!-- COMPANY INFO -->
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

    <!-- MARQUEE -->
    ${s.showMarquee && s.marqueeText ? `<div class="marquee"><span>${s.marqueeText}</span></div>` : ''}

    <!-- HEADER -->
    <div class="receipt-header">
      <div class="brand">
        <h1>Booking Receipt</h1>
        <p>${s.companySlogan || 'Premium Event & Hall Booking'}</p>
      </div>
      <div class="receipt-no">
        <div class="label">Booking #</div>
        <div class="number">${b.bookingNo || b.id}</div>
        <div style="margin-top: 6px;">
          <span class="status-badge">${statusBadge.label}</span>
        </div>
      </div>
    </div>

    <!-- BODY -->
    <div class="receipt-body">
      
      <!-- CUSTOMER DETAILS -->
      ${s.showCustomerDetails ? `
      <div class="info-grid">
        <div class="info-box">
          <h3>👤 Customer Details</h3>
          <div class="row"><span class="label">Name</span><span class="value">${b.guestName || 'N/A'}</span></div>
          <div class="row"><span class="label">Phone</span><span class="value">${b.guestPhone || 'N/A'}</span></div>
          ${b.guestEmail ? `<div class="row"><span class="label">Email</span><span class="value">${b.guestEmail}</span></div>` : ''}
          ${b.customer?.cnic ? `<div class="row"><span class="label">CNIC</span><span class="value">${b.customer.cnic}</span></div>` : ''}
          ${b.customer?.city ? `<div class="row"><span class="label">City</span><span class="value">${b.customer.city}</span></div>` : ''}
        </div>
        <div class="info-box">
          <h3>📅 Event Details</h3>
          <div class="row"><span class="label">Event Type</span><span class="value">${b.eventType || 'N/A'}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${formatDate(b.eventDate)}</span></div>
          <div class="row"><span class="label">Time</span><span class="value">${formatTime(b.startTime)} - ${formatTime(b.endTime)}</span></div>
          <div class="row"><span class="label">Hall</span><span class="value">${b.hall?.name || 'N/A'}</span></div>
          <div class="row"><span class="label">Guests</span><span class="value">${b.guestCount} ${b.actualGuestCount ? `(Actual: ${b.actualGuestCount})` : ''}</span></div>
          <div class="row"><span class="label">Mode</span><span class="value">${b.hallChargeMode === 'per_seat' ? 'Per Seat' : 'Full Hall'}</span></div>
        </div>
      </div>
      ` : ''}

      <!-- ITEMS TABLE -->
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
          ${hallRow}
          ${packageRow}
          ${menuRows}
          ${customRows}
          ${serviceRows}
        </tbody>
      </table>

      <!-- SUMMARY -->
      <div class="payment-summary">
        <div class="summary-grid">
          <div class="summary-item total">
            <span class="label">Total</span>
            <span class="amount">${formatCurrency(totalAmount)}</span>
          </div>
          ${discount > 0 ? `<div class="summary-item discount"><span class="label">Discount</span><span class="amount">-${formatCurrency(discount)}</span></div>` : ''}
          <div class="summary-item paid">
            <span class="label">Paid</span>
            <span class="amount">${formatCurrency(paidAmount)}</span>
          </div>
          <div class="summary-item due">
            <span class="label">Due</span>
            <span class="amount">${formatCurrency(dueAmount)}</span>
          </div>
        </div>
      </div>

      <!-- PAYMENT HISTORY -->
      ${payments.length > 0 && s.showPaymentHistory ? `
        <div class="payment-history">
          <h4>💳 Payment History</h4>
          <table>
            <thead><tr><th>Date</th><th>Mode</th><th>Description</th><th class="text-right">Amount</th></tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
      ` : ''}

      <!-- FOOTER INFO -->
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e8e6e0; display: flex; justify-content: space-between; font-size: 11px; color: #888;">
        <span>Payment Status: ${paymentBadge.label}</span>
        <span>Generated: ${formatDateTime(new Date())}</span>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="receipt-footer">
      ${s.showHeaderText && s.headerText ? `<p style="margin-bottom:6px;font-weight:600;color:#444;">${s.headerText}</p>` : ''}
      <strong>${s.showFooterText && s.footerText ? s.footerText : 'Thank you for choosing us!'}</strong>
    </div>
  </div>

  <!-- PRINT BUTTONS -->
  <div class="no-print">
    <button onclick="window.print()">🖨️ Print A4</button>
    <button onclick="window.close()">❌ Close</button>
  </div>
</body>
</html>`;
};

  if (loading && bookingsList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F2EB' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
          <p className="mt-4 text-sm font-bold" style={{ color: '#4A4A4A' }}>Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F2EB' }}>
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#E0D8CC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Event Bookings</h1>
                <p className="text-xs font-medium" style={{ color: '#7A7A7A' }}>Manage live events, payments & history</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl border border-[#E0D8CC] flex items-center shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')} 
                  title="Grid Card View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#A97A1F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  title="Table View"
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#A97A1F] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <TableIcon size={18} />
                </button>
              </div>

              <Link to="/bookings/create">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' }}>
                  <Plus size={16} /> New Booking
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* ═══ STATS CARDS ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Bookings', value: stats.total, icon: Calendar, color: '#A97A1F', bg: '#FEF3C7' },
            { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: '#1B5E20', bg: '#E8F5E9' },
            { label: 'In Progress', value: stats.in_progress, icon: Clock4, color: '#6A1B9A', bg: '#F3E5F5' },
            { label: 'Completed', value: stats.completed, icon: Sparkles, color: '#1565C0', bg: '#E3F2FD' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md" style={{ borderColor: '#E0D8CC' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stat.value}</p>
              <p className="text-xs font-medium mt-1" style={{ color: '#7A7A7A' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ═══ SECONDARY STATS ═══ */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Tentative', value: stats.tentative, color: '#1565C0', bg: '#E3F2FD' },
            { label: 'Cancelled', value: stats.cancelled, color: '#B71C1C', bg: '#FFEBEE' },
            { label: 'No Show', value: stats.no_show, color: '#424242', bg: '#F5F5F5' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border p-3 text-center shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#7A7A7A' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ═══ FINANCIAL STATS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} style={{ color: '#1B5E20' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Total Revenue</span>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: '#1B5E20' }}>{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} style={{ color: '#1565C0' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Total Collected</span>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: '#1565C0' }}>{formatCurrency(stats.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} style={{ color: '#B71C1C' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Total Due</span>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: '#B71C1C' }}>{formatCurrency(stats.totalDue)}</p>
          </div>
        </div>

        {/* ═══ FILTERS BAR ═══ */}
        <div className="bg-white rounded-2xl border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="min-w-0">
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: '#4A4A4A' }}>Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#A97A1F' }} />
                    <input 
                      type="text" 
                      placeholder="Customer, phone, booking #..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" 
                      style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: '#4A4A4A' }}>Status</label>
                  <ReactSelect
                    value={statusFilter}
                    onChange={(val) => { setStatusFilter(val || ''); setCurrentPage(1); }}
                    options={[
                      { value: '', label: 'All Status' },
                      { value: 'tentative', label: 'Tentative' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' },
                      { value: 'no_show', label: 'No Show' }
                    ]}
                    placeholder="All Status"
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: '#4A4A4A' }}>Payment</label>
                  <ReactSelect
                    value={paymentStatusFilter}
                    onChange={(val) => { setPaymentStatusFilter(val || ''); setCurrentPage(1); }}
                    options={[
                      { value: '', label: 'All Payments' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'partial', label: 'Partial' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'refunded', label: 'Refunded' },
                      { value: 'failed', label: 'Failed' }
                    ]}
                    placeholder="All Payments"
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: '#4A4A4A' }}>Hall</label>
                  <ReactSelect
                    value={hallFilter}
                    onChange={(val) => { setHallFilter(val || ''); setCurrentPage(1); }}
                    options={[{ value: '', label: 'All Halls' }, ...uniqueHalls.map(h => ({ value: h, label: h }))]}
                    placeholder="All Halls"
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: '#4A4A4A' }}>From Date</label>
                  <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" 
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: '#4A4A4A' }}>To Date</label>
                  <input 
                    type="date" 
                    value={dateTo} 
                    onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" 
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} 
                  />
                </div>
                <button 
                  onClick={() => {
                    setSearchQuery(''); 
                    setStatusFilter(''); 
                    setPaymentStatusFilter('');
                    setHallFilter(''); 
                    setDateFrom(''); 
                    setDateTo(''); 
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  style={{ borderColor: '#E0D8CC', color: '#4A4A4A' }}
                >
                  <RotateCcw size={14} /> Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CONTENT VIEW ═══ */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#A97A1F] animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <Calendar size={48} className="mx-auto mb-3 opacity-30 text-gray-400" />
            <p className="font-bold text-gray-800">No bookings found</p>
            <p className="text-sm mt-1 text-gray-500">Try adjusting your filters or create a new booking.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedBookings.map((booking) => {
              const s = statusConfig[booking.status] || statusConfig.tentative;
              const ps = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.pending;
              return (
                <div key={booking.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" style={{ borderColor: '#E0D8CC' }}>
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-base" style={{ color: '#A97A1F' }}>#{booking.bookingNo || booking.id}</span>
                        <p className="text-xs font-semibold text-gray-800 truncate mt-0.5">{booking.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>
                        <ActionDropdown booking={booking} onAction={handleAction} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="font-bold text-gray-900 text-sm">{booking.guestName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><Phone size={12} className="text-gray-400" /> <span className="font-mono">{booking.guestPhone}</span></p>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2"><Calendar size={13} className="text-gray-400" /> <span className="font-medium">{formatDate(booking.eventDate)}</span></div>
                      <div className="flex items-center gap-2"><Clock size={13} className="text-gray-400" /> <span className="font-medium">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span></div>
                      <div className="flex items-center gap-2"><Users size={13} className="text-gray-400" /> <span className="font-medium">{booking.guestCount} guests {booking.actualGuestCount && `(Act: ${booking.actualGuestCount})`}</span></div>
                      <div className="flex items-center gap-2"><MapPin size={13} className="text-gray-400" /> <span className="font-medium truncate">{booking.hall?.name || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0ECE6] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Total / Due</span>
                      <span className="font-mono font-bold text-gray-800 text-sm">{formatCurrency(booking.totalAmount)}</span>
                      <span className="text-xs font-mono ml-1 font-bold" style={{ color: '#B71C1C' }}>({formatCurrency(booking.dueAmount)} due)</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ backgroundColor: ps.bg, color: ps.color }}>
                      {ps.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm hidden md:block" style={{ borderColor: '#E0D8CC' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F4', borderBottom: '2px solid #E0D8CC' }}>
                    <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Booking #</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Customer</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Event Date</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Guests</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Hall</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Total</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Paid</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Due</th>
                    <th className="text-center py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Status</th>
                    <th className="text-center py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Payment</th>
                    <th className="text-center py-3.5 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4A4A4A' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking, index) => {
                    const s = statusConfig[booking.status] || statusConfig.tentative;
                    const ps = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.pending;
                    return (
                      <tr key={booking.id}
                        className="transition-colors hover:bg-amber-50/30 border-b"
                        style={{ borderColor: '#F0ECE6', backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold" style={{ color: '#A97A1F' }}>#{booking.bookingNo || booking.id}</span>
                          <span className="block text-xs text-gray-400 truncate max-w-[120px]">{booking.title}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-800">{booking.guestName}</p>
                          <p className="text-xs flex items-center gap-1 text-gray-400">
                            <Phone size={10} /> {booking.guestPhone}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar size={12} />
                            <span>{formatDate(booking.eventDate)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Clock size={10} />
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <Users size={12} className="text-gray-400" />
                            <span className="font-medium">{booking.guestCount}</span>
                            {booking.actualGuestCount && booking.actualGuestCount !== booking.guestCount && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                                Act: {booking.actualGuestCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin size={12} className="text-gray-400" />
                            <span>{booking.hall?.name || `Hall #${booking.hallId}`}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold font-mono text-gray-800">{formatCurrency(booking.totalAmount)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-medium text-green-700">{formatCurrency(booking.paidAmount || booking.advanceAmount)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold" style={{ color: Number(booking.dueAmount) > 0 ? '#B71C1C' : '#1B5E20' }}>
                            {formatCurrency(booking.dueAmount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ backgroundColor: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ backgroundColor: ps.bg, color: ps.color }}>
                            {ps.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <ActionDropdown booking={booking} onAction={handleAction} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredBookings.length > 0 && (
          <div className="bg-white rounded-2xl border px-4 py-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: '#E0D8CC' }}>
            <p className="text-sm" style={{ color: '#7A7A7A' }}>
              Showing <strong>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredBookings.length)}</strong> of <strong>{filteredBookings.length}</strong> bookings
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border text-xs font-bold hover:bg-gray-50 disabled:opacity-30 transition-all" 
                style={{ borderColor: '#E0D8CC', color: '#4A4A4A' }}
              >
                First
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 transition-all" 
                style={{ borderColor: '#E0D8CC' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold px-3" style={{ color: '#4A4A4A' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 transition-all" 
                style={{ borderColor: '#E0D8CC' }}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border text-xs font-bold hover:bg-gray-50 disabled:opacity-30 transition-all" 
                style={{ borderColor: '#E0D8CC', color: '#4A4A4A' }}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ STATUS UPDATE MODAL ═══════ */}
      {statusModalOpen && bookingToUpdate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border p-6" style={{ borderColor: '#E0D8CC' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>Update Status</h3>
            <p className="text-sm text-gray-500 mb-4">Booking #{bookingToUpdate.bookingNo}</p>

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

      {/* ═══════ PAYMENT MODAL ═══════ */}
      {paymentModalOpen && bookingForPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border p-6" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Receive Payment</h3>
                <p className="text-xs text-gray-500">Booking #{bookingForPayment.bookingNo}</p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={20} style={{ color: '#4A4A4A' }} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl p-2 text-center border" style={{ backgroundColor: '#F5F5F5', borderColor: '#E0D8CC' }}>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Total</span>
                <span className="font-bold font-mono text-sm">{formatCurrency(bookingForPayment.totalAmount)}</span>
              </div>
              <div className="rounded-xl p-2 text-center border" style={{ backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }}>
                <span className="text-[10px] text-green-700 block uppercase font-bold">Paid</span>
                <span className="font-bold font-mono text-sm text-green-700">{formatCurrency(bookingForPayment.paidAmount || bookingForPayment.advanceAmount || 0)}</span>
              </div>
              <div className="rounded-xl p-2 text-center border" style={{ backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' }}>
                <span className="text-[10px] text-red-700 block uppercase font-bold">Due</span>
                <span className="font-bold font-mono text-sm text-red-700">{formatCurrency(bookingForPayment.dueAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Amount (Rs) *</label>
                <input type="number" min="1" max={bookingForPayment.dueAmount} required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
                <p className="text-[10px] text-gray-400 mt-1">Max: {formatCurrency(bookingForPayment.dueAmount)}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Payment Mode *</label>
                <ReactSelect
                  value={paymentForm.mode}
                  onChange={(val) => setPaymentForm(prev => ({ ...prev, mode: val || 'cash' }))}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'card', label: 'Card' },
                    { value: 'easypaisa', label: 'Easypaisa' },
                    { value: 'jazzcash', label: 'JazzCash' },
                    { value: 'cheque', label: 'Cheque' }
                  ]}
                  placeholder="Select Mode"
                  isSearchable={true}
                  isClearable={false}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Receive In Account *</label>
                <ReactSelect
                  value={paymentForm.bankAccountId}
                  onChange={(val) => setPaymentForm(prev => ({ ...prev, bankAccountId: val || '' }))}
                  options={[{ value: '', label: '-- Select Bank Account --' }, ...bankAccounts.filter(Boolean).map(acc => ({
                    value: String(acc.id),
                    label: `${acc.bankName} — ${acc.accountNumber} (Bal: ${formatCurrency(acc.currentBalance)})`
                  }))]}
                  placeholder="Select Account"
                  isSearchable={true}
                  isClearable={false}
                />
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

      {/* ═══════ ASSIGN STAFF MODAL ═══════ */}
      {assignModalOpen && bookingForAssign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border p-6" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                  <UserPlus size={20} className="text-purple-600" />
                  Assign Staff to Event
                </h3>
                <p className="text-xs text-gray-500">
                  {bookingForAssign.eventName || bookingForAssign.title || `Booking #${bookingForAssign.id}`}
                </p>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={20} style={{ color: '#4A4A4A' }} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Employee *</label>
                <ReactSelect
                  value={assignForm.employeeId}
                  onChange={(val) => setAssignForm(prev => ({ ...prev, employeeId: val || '' }))}
                  options={[{ value: '', label: 'Select Employee' }, ...employees.filter(Boolean).map(emp => ({
                    value: String(emp.id),
                    label: `${emp.name} (${emp.employeeCode}) - ${emp.designation?.name || 'N/A'}`
                  }))]}
                  placeholder="Select Employee"
                  isSearchable={true}
                  isClearable={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Role</label>
                  <input
                    type="text"
                    name="role"
                    value={assignForm.role}
                    onChange={handleAssignChange}
                    placeholder="e.g., Chef, Waiter"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Agreed Amount *</label>
                  <input
                    type="number"
                    name="agreedAmount"
                    value={assignForm.agreedAmount}
                    onChange={handleAssignChange}
                    placeholder="5000"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Hours Worked</label>
                  <input
                    type="number"
                    name="hoursWorked"
                    value={assignForm.hoursWorked}
                    onChange={handleAssignChange}
                    placeholder="8.5"
                    step="0.5"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Payment Type</label>
                  <ReactSelect
                    value={assignForm.paymentType}
                    onChange={(val) => setAssignForm(prev => ({ ...prev, paymentType: val || 'auto' }))}
                    options={[
                      { value: 'auto', label: 'Auto (Event Start)' },
                      { value: 'manual', label: 'Manual' }
                    ]}
                    placeholder="Payment Type"
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="autoPayOnEventStart"
                  checked={assignForm.autoPayOnEventStart}
                  onChange={handleAssignChange}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-gray-700">Auto-pay when event starts</label>
              </div>

              <div>
                <label className="text-xs font-bold uppercase mb-1 block text-gray-500">Notes</label>
                <textarea
                  name="notes"
                  value={assignForm.notes}
                  onChange={handleAssignChange}
                  rows="2"
                  placeholder="Additional notes..."
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                  style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAssignModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50" style={{ borderColor: '#E0D8CC' }}>
                  Cancel
                </button>
                <button type="submit" disabled={assignLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #6A1B9A, #7B1FA2)' }}>
                  {assignLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {assignLoading ? 'Assigning...' : 'Assign Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingList;