// ═══════════════════════════════════════════════════════════
// pages/BookingEdit.jsx
// COMPLETE v4 — Optimized | Rate Limit Handling | Caching
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer, FileText, Eye, Plus, X, Upload, Package,
  Utensils, Settings, Save, Trash2, ChevronLeft,
  Users, Phone, Mail, MapPin, Clock, Tag, Receipt,
  AlertCircle, UserPlus, CreditCard, Building2, History,
  ChevronDown, ChevronUp, Flame, Sparkles, Gem, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

import packageApi from '../../services/packageApi';
import menuApi from '../../services/menuApi';
import itemApi from '../../services/itemApi';
import bookingApi from '../../services/bookingApi';
import hallApi from '../../services/hallApi';
import customerApi from '../../services/customerApi';
import serviceApi from '../../services/serviceApi';
import eventApi from '../../services/eventApi';

/* ─────────────────── HELPERS ─────────────────── */
const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
const formatTime = (t) => {
  if (!t) return '';
  if (typeof t === 'string' && t.includes(':')) return t.slice(0, 5);
  const date = new Date(t);
  return isNaN(date) ? '' : date.toTimeString().slice(0, 5);
};

const getTenantContext = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return {
      branchId: branch?.id || user?.branchId || null,
      companyId: branch?.companyId || user?.companyId || null,
      userId: user?.id || 1
    };
  } catch (e) {
    return { branchId: null, companyId: null, userId: 1 };
  }
};

// ── Simple in-memory cache ──
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// ── Retry wrapper for rate limiting ──
const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.response?.status === 429 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw err;
    }
  }
};

/* ─────────────────── COMPONENT ─────────────────── */
const BookingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { branchId, companyId } = getTenantContext();
  const abortControllerRef = useRef(null);

  /* ── Loading States ── */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const fetchedRef = useRef(false);   // ← YEH ADD KARO

  /* ── Data Lists ── */
  const [packages, setPackages] = useState([]);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [halls, setHalls] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [events, setEvents] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);

  /* ── Selection Mode ── */
  const [mode, setMode] = useState('package');

  /* ── Modals ── */
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [pkgModalData, setPkgModalData] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});

  /* ── Customer ── */
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: '', cnic: '', address: '', city: '',
    emergencyContacts: [
      { name: '', relation: '', phone: '' },
      { name: '', relation: '', phone: '' }
    ]
  });

  /* ── Form State ── */
  const [form, setForm] = useState({
    title: '',
    eventType: '',
    eventDate: formatDate(new Date()),
    startTime: '18:00',
    endTime: '23:00',
    description: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    guestCount: '',
    actualGuestCount: '',
    customerId: '',
    hallId: '',
    isMealIncluded: true,
    totalAmount: 0,
    discount: 0,
    discountType: 'percent',
    advanceAmount: 0,
    dueAmount: 0,
    paidAmount: 0,
    paymentMode: 'Cash',
    paymentStatus: 'pending',
    selectedPackageId: null,
    selectedMenus: [],
    customItems: [],
    services: [],
    attachments: [],
    status: 'tentative',
    branchId,
    companyId
  });

  /* ─────────────────── FETCH INITIAL DATA ─────────────────── */
  useEffect(() => {
    if (!id || id === ':id' || isNaN(Number(id)) || Number(id) <= 0) {
      toast.error('Invalid booking ID');
      navigate('/bookings');
      return;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    (async () => {
      try {
        setFetching(true);
        const cacheKey = `booking_edit_${id}`;
        const cachedData = getCached(cacheKey);

        if (cachedData) {
          // Use cached data
          const { booking, packages, menus, items, halls, customers, services, events, bookings } = cachedData;
          setPackages(packages || []);
          setMenus(menus || []);
          setItems(items || []);
          setHalls(halls || []);
          setCustomers(customers || []);
          setServicesList(services || []);
          setEvents(events || []);
          setExistingBookings(bookings || []);
          populateForm(booking);
          setFetching(false);
          setLoading(false);
          return;
        }

        // ── Sequential fetching to avoid rate limiting ──
        // First, get the booking
        let booking = null;
        try {
          const bkRes = await withRetry(() => bookingApi.getById(Number(id)));
          booking = bkRes.data?.data || bkRes.data || bkRes;
          if (!booking || !booking.id) {
            toast.error('Booking not found');
            navigate('/bookings');
            return;
          }
        } catch (err) {
          if (err.response?.status === 429) {
            toast.error('Server is busy. Please wait a moment and try again.');
          } else {
            toast.error('Failed to load booking');
          }
          navigate('/bookings');
          return;
        }

        // ── Fetch reference data sequentially with delays ──
        const fetchWithDelay = async (fn, label) => {
          try {
            // Add small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
            const res = await withRetry(fn);
            const data = res?.data?.data || res?.data || res || [];
            return Array.isArray(data) ? data : [];
          } catch (err) {
            console.warn(`Failed to fetch ${label}:`, err);
            if (err.response?.status === 429) {
              toast.error(`Rate limited while fetching ${label}. Please refresh.`);
            }
            return [];
          }
        };

        // Fetch each resource with delays
        const [pkgData, menuData, itemData, hallData, custData, servData, eventData, bookingData] = await Promise.all([
          fetchWithDelay(() => packageApi.getAll(), 'packages'),
          fetchWithDelay(() => menuApi.getAll(), 'menus'),
          fetchWithDelay(() => itemApi.getAll(), 'items'),
          fetchWithDelay(() => hallApi.getAll(), 'halls'),
          fetchWithDelay(() => customerApi.getAll(), 'customers'),
          fetchWithDelay(() => serviceApi.getAll(), 'services'),
          fetchWithDelay(() => eventApi.getAll(), 'events'),
          fetchWithDelay(() => bookingApi.getAll(), 'bookings'),
        ]);

        setPackages(pkgData);
        setMenus(menuData);
        setItems(itemData);
        setHalls(hallData);
        setCustomers(custData);
        setServicesList(servData);
        setEvents(eventData);
        setExistingBookings(bookingData);

        // Cache the data
        setCached(cacheKey, {
          booking,
          packages: pkgData,
          menus: menuData,
          items: itemData,
          halls: hallData,
          customers: custData,
          services: servData,
          events: eventData,
          bookings: bookingData,
        });

        populateForm(booking);
      } catch (err) {
        console.error('Edit load error:', err);
        if (err.name !== 'AbortError') {
          toast.error('Failed to load booking data');
        }
      } finally {
        setFetching(false);
        setLoading(false);
      }
    })();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id, navigate]);

  /* ─────────────────── POPULATE FORM ─────────────────── */
  const populateForm = (b) => {
    // Determine initial mode
    let initialMode = 'package';
    const hasCustomItems = (b.customItems?.length > 0) || (b.customItem?.length > 0);
    const hasMenus = (b.menus?.length > 0);
    const hasPackage = b.selectedPackageId || b.packageId;

    if (hasCustomItems) initialMode = 'custom';
    else if (hasMenus && !hasPackage) initialMode = 'menu';
    else if (hasPackage) initialMode = 'package';
    else if (!b.isMealIncluded) initialMode = 'package';

    setMode(initialMode);

    // Map customer
    const custId = b.customerId ? String(b.customerId) : '';
    setSelectedCustomerId(custId);

    // Map existing services
    const mappedServices = (b.services || []).map(s => ({
      serviceId: s.serviceId || s.id,
      serviceName: s.serviceName || s.name,
      quantity: Number(s.quantity) || 1,
      unitPrice: Number(s.unitPrice || s.price || 0),
      totalPrice: Number(s.totalPrice || (s.unitPrice * s.quantity) || 0),
      notes: s.notes || ''
    }));

    // Map existing menus
    const mappedMenus = (b.menus || []).map(m => ({
      menuId: m.menuId || m.id,
      menuName: m.menuName || m.name,
      quantity: Number(m.quantity) || 1,
      unitPrice: Number(m.unitPrice || m.price || 0),
      totalPrice: Number(m.totalPrice || (m.unitPrice * m.quantity) || 0),
      unit: m.unit || 'plate'
    }));

    // Map existing custom items
    const mappedCustomItems = (b.customItems || b.customItem || []).map(i => ({
      itemId: i.itemId || i.id,
      itemName: i.itemName || i.name,
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.unitPrice || 0),
      totalPrice: Number(i.totalPrice || (i.unitPrice * i.quantity) || 0),
      unit: i.unit || 'pcs',
      displayNote: i.note || i.displayNote || '',
      originalPrice: Number(i.originalPrice || i.unitPrice || 0),
      originalUnit: i.originalUnit || i.unit || 'pcs'
    }));

    setForm({
      title: b.title || '',
      eventType: b.eventType || '',
      eventDate: formatDate(b.eventDate),
      startTime: formatTime(b.startTime),
      endTime: formatTime(b.endTime),
      description: b.description || '',
      guestName: b.guestName || '',
      guestPhone: b.guestPhone || '',
      guestEmail: b.guestEmail || '',
      guestCount: b.guestCount || '',
      actualGuestCount: b.actualGuestCount || '',
      customerId: b.customerId || '',
      hallId: b.hallId ? String(b.hallId) : '',
      isMealIncluded: b.isMealIncluded !== false,
      totalAmount: Number(b.totalAmount) || 0,
      discount: Number(b.discount) || 0,
      discountType: b.discountType || 'percent',
      advanceAmount: Number(b.advanceAmount) || 0,
      dueAmount: Number(b.dueAmount) || 0,
      paidAmount: Number(b.paidAmount) || 0,
      paymentMode: b.paymentMode || 'Cash',
      paymentStatus: b.paymentStatus || 'pending',
      selectedPackageId: b.selectedPackageId || b.packageId || null,
      selectedMenus: mappedMenus,
      customItems: mappedCustomItems,
      services: mappedServices,
      attachments: [],
      status: b.status || 'tentative',
      branchId: b.branchId || branchId,
      companyId: b.companyId || companyId
    });
  };

  /* ─────────────────── DERIVED ─────────────────── */
  const selectedPackage = useMemo(() =>
    packages.find(p => p.id === form.selectedPackageId),
    [packages, form.selectedPackageId]
  );

  const selectedHall = useMemo(() =>
    halls.find(h => h.id === Number(form.hallId)),
    [halls, form.hallId]
  );

  const hallPrice = Number(selectedHall?.price || selectedHall?.cost || selectedHall?.rent || 0);
  const hallCapacity = Number(selectedHall?.capacity || 0);
  const selectedCustomer = customers.find(c => c.id === Number(selectedCustomerId));

  /* ── Slot Collision ── */
  const slotInfo = useMemo(() => {
    if (!form.hallId || !form.eventDate || !form.startTime || !form.endTime) {
      return { hasError: false, message: '', remaining: hallCapacity, type: 'info' };
    }
    const newStart = new Date(`${form.eventDate}T${form.startTime}:00`).getTime();
    const newEnd = new Date(`${form.eventDate}T${form.endTime}:00`).getTime();
    const requestedGuests = Number(form.guestCount) || 0;

    if (newEnd <= newStart) {
      return { hasError: true, message: 'End time must be after start time', remaining: hallCapacity, type: 'error' };
    }

    const conflicting = existingBookings.filter(b => {
      if (!b.eventDate || b.status === 'cancelled' || b.deletedAt) return false;
      if (Number(b.id) === Number(id)) return false;
      const bDate = new Date(b.eventDate).toISOString().split('T')[0];
      return Number(b.hallId) === Number(form.hallId) && bDate === form.eventDate;
    });

    let totalBooked = 0;
    const conflictingBookings = [];

    for (const b of conflicting) {
      const existingStart = new Date(b.startTime).getTime();
      const existingEnd = new Date(b.endTime).getTime();
      if (newStart < existingEnd && newEnd > existingStart) {
        totalBooked += Number(b.guestCount || 0);
        conflictingBookings.push(b);
      }
    }

    const remaining = hallCapacity - totalBooked;

    if (remaining <= 0) {
      return { hasError: true, message: `Slot Full! "${selectedHall?.name}" capacity ${hallCapacity} already booked.`, remaining: 0, type: 'error', conflictingBookings };
    }
    if (requestedGuests > remaining) {
      return { hasError: true, message: `Capacity exceeded! Booked: ${totalBooked}, Remaining: ${remaining}, Requested: ${requestedGuests}`, remaining, type: 'error', conflictingBookings };
    }
    if (totalBooked > 0) {
      return { hasError: false, message: `This slot has ${totalBooked} guests already. Remaining: ${remaining}`, remaining, type: 'warning', conflictingBookings };
    }
    return { hasError: false, message: `Available: ${remaining} guests`, remaining, type: 'success' };
  }, [form.hallId, form.eventDate, form.startTime, form.endTime, form.guestCount, hallCapacity, selectedHall, existingBookings, id]);

  /* ── Financial Calculations ── */
  const mealTotal = useMemo(() => {
    if (!form.isMealIncluded) return 0;
    let sum = 0;
    if (mode === 'package' && selectedPackage) {
      sum += Number(selectedPackage.finalPrice || selectedPackage.baseTotal || selectedPackage.totalAmount || 0);
    } else if (mode === 'menu') {
      sum += form.selectedMenus.reduce((s, m) => s + Number(m.totalPrice || 0), 0);
    } else if (mode === 'custom') {
      sum += form.customItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
    }
    return sum;
  }, [mode, selectedPackage, form.selectedMenus, form.customItems, form.isMealIncluded]);

  const servicesTotal = useMemo(() =>
    form.services.reduce((s, sv) => s + Number(sv.totalPrice || 0), 0),
    [form.services]
  );

  const baseTotal = useMemo(() => hallPrice + mealTotal + servicesTotal, [hallPrice, mealTotal, servicesTotal]);

  const discountAmount = useMemo(() => {
    if (form.discountType === 'percent') {
      return (baseTotal * Number(form.discount || 0)) / 100;
    }
    return Number(form.discount || 0);
  }, [baseTotal, form.discount, form.discountType]);

  const finalTotal = useMemo(() => Math.max(0, baseTotal - discountAmount), [baseTotal, discountAmount]);
  const dueAmount = useMemo(() => Math.max(0, finalTotal - Number(form.advanceAmount || 0)), [finalTotal, form.advanceAmount]);

  /* Sync totals */
  useEffect(() => {
    setForm(prev => ({ ...prev, totalAmount: finalTotal, dueAmount, paidAmount: Number(prev.advanceAmount || 0) }));
  }, [finalTotal, dueAmount]);

  /* ─────────────────── HANDLERS ─────────────────── */
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleMealIncluded = (val) => {
    setForm(prev => ({ ...prev, isMealIncluded: val }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setForm(prev => ({
      ...prev,
      selectedPackageId: null,
      selectedMenus: [],
      customItems: [],
    }));
  };

  /* ── Package ── */
  const selectPackage = (pkg) => {
    const pkgGuests = pkg.guestCount || 0;
    if (hallCapacity > 0 && pkgGuests > hallCapacity) {
      toast.error(`Package guest count (${pkgGuests}) exceeds hall capacity (${hallCapacity})`);
      return;
    }
    setForm(prev => ({
      ...prev,
      selectedPackageId: pkg.id,
      eventType: pkg.eventType || prev.eventType,
      guestCount: pkg.guestCount || prev.guestCount,
      title: pkg.name ? `${pkg.name} Booking` : prev.title,
      isMealIncluded: true
    }));
  };

  const openPackageDetails = (pkg, e) => {
    e?.stopPropagation();
    setPkgModalData(pkg);
    setExpandedMenus({});
    setPkgModalOpen(true);
  };

  const toggleMenuExpand = (menuId) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  /* ── Menus ── */
  const toggleMenu = (menu) => {
    setForm(prev => {
      const exists = prev.selectedMenus.find(m => m.menuId === menu.id);
      if (exists) {
        return { ...prev, selectedMenus: prev.selectedMenus.filter(m => m.menuId !== menu.id) };
      }
      const price = Number(menu.price || menu.salePrice || menu.totalSalePrice || 0);
      const qty = parseInt(prev.guestCount) || 1;
      if (price === 0) toast.error(`${menu.name}: Price is missing or zero`);
      return {
        ...prev,
        selectedMenus: [...prev.selectedMenus, {
          menuId: menu.id,
          menuName: menu.name,
          quantity: qty,
          unitPrice: price,
          totalPrice: price * qty,
          unit: menu.unit || 'plate'
        }]
      };
    });
  };

  const updateMenuQty = (menuId, qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    setForm(prev => ({
      ...prev,
      selectedMenus: prev.selectedMenus.map(m =>
        m.menuId === menuId ? { ...m, quantity: q, totalPrice: q * m.unitPrice } : m
      )
    }));
  };

  /* ── Custom Items ── */
  const addCustomItem = (item) => {
    const alreadyAdded = form.customItems.some(i => i.itemId === item.id);
    if (alreadyAdded) {
      toast.error(`${item.name} is already added`);
      return;
    }

    const isBulk = item.isBulkUnit === true || (item.unit && item.unit.toLowerCase().includes('degh'));
    const conversionRate = parseFloat(item.conversionRate);
    let price = Number(item.salePrice || item.price || 0);
    let unit = item.unit || 'pcs';
    let displayNote = '';

    if (isBulk) {
      if (!conversionRate || conversionRate <= 0) {
        toast.error(`${item.name}: Missing or invalid conversion rate for bulk unit`);
        return;
      }
      price = price / conversionRate;
      unit = item.subUnitName || 'plate';
      displayNote = `1 ${item.unit} = ${conversionRate} ${unit}`;
    }

    setForm(prev => ({
      ...prev,
      customItems: [...prev.customItems, {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        unit: unit,
        displayNote,
        originalPrice: Number(item.salePrice || item.price || 0),
        originalUnit: item.unit || 'pcs'
      }]
    }));
  };

  const updateCustomItem = (idx, field, value) => {
    setForm(prev => {
      const list = [...prev.customItems];
      list[idx] = { ...list[idx], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        list[idx].totalPrice = Number(list[idx].quantity) * Number(list[idx].unitPrice);
      }
      return { ...prev, customItems: list };
    });
  };

  const removeCustomItem = (idx) => setForm(prev => ({
    ...prev, customItems: prev.customItems.filter((_, i) => i !== idx)
  }));

  /* ── Services ── */
  const toggleService = (service) => {
    const exists = form.services.find(s => s.serviceId === service.id);
    if (exists) {
      setForm(prev => ({ ...prev, services: prev.services.filter(s => s.serviceId !== service.id) }));
    } else {
      const unitPrice = Number(service.salePrice || service.price || 0);
      setForm(prev => ({
        ...prev,
        services: [...prev.services, {
          serviceId: service.id,
          serviceName: service.name,
          quantity: 1,
          unitPrice: unitPrice,
          totalPrice: unitPrice,
          notes: ''
        }]
      }));
    }
  };

  const updateServiceQty = (serviceId, qty) => {
    const quantity = Math.max(1, Number(qty) || 1);
    setForm(prev => ({
      ...prev,
      services: prev.services.map(s => s.serviceId === serviceId ? { ...s, quantity, totalPrice: quantity * s.unitPrice } : s)
    }));
  };

  /* ── Attachments ── */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files.map(f => ({ name: f.name, size: f.size, type: f.type, file: f }))]
    }));
    e.target.value = '';
  };

  const removeAttachment = (idx) => setForm(prev => ({
    ...prev, attachments: prev.attachments.filter((_, i) => i !== idx)
  }));

  /* ── Customer ── */
  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Customer name and phone are required');
      return;
    }
    try {
      const payload = { ...newCustomer, branchId, companyId };
      const res = await customerApi.create(payload);
      const created = res.data || res;
      setCustomers(prev => [...prev, created]);
      setSelectedCustomerId(String(created.id));
      setShowNewCustomerForm(false);
      setNewCustomer({
        name: '', phone: '', email: '', cnic: '', address: '', city: '',
        emergencyContacts: [{ name: '', relation: '', phone: '' }, { name: '', relation: '', phone: '' }]
      });
      toast.success('Customer registered and selected');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create customer');
    }
  };

  /* ─────────────────── PRINT ─────────────────── */
  const generateA4HTML = () => {
    const pkg = selectedPackage;
    const customer = selectedCustomer;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Receipt - A4</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 3px double #b45309; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #92400e; font-size: 24px; }
          .header p { margin: 4px 0; color: #666; font-size: 13px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
          .box h3 { margin: 0 0 8px 0; font-size: 14px; color: #92400e; border-bottom: 1px solid #fcd34d; padding-bottom: 4px; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .row.bold { font-weight: 700; border-top: 2px solid #b45309; margin-top: 8px; padding-top: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
          th { background: #fef3c7; text-align: left; padding: 8px; border-bottom: 2px solid #b45309; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BOOKING CONFIRMATION</h1>
          <p>UniSoft Enterprise ERP | Banquet & Marquee Management</p>
          <p>Date: ${new Date().toLocaleDateString('en-PK')}</p>
        </div>
        <div class="grid">
          <div class="box">
            <h3>Customer Details</h3>
            <div class="row"><span>Name:</span> <strong>${customer?.name || form.guestName || 'N/A'}</strong></div>
            <div class="row"><span>Phone:</span> ${customer?.phone || form.guestPhone || 'N/A'}</div>
            <div class="row"><span>Email:</span> ${customer?.email || form.guestEmail || 'N/A'}</div>
            <div class="row"><span>Guests:</span> ${form.guestCount || 0}</div>
          </div>
          <div class="box">
            <h3>Event Details</h3>
            <div class="row"><span>Event:</span> <strong>${form.eventType || 'N/A'}</strong></div>
            <div class="row"><span>Date:</span> ${form.eventDate}</div>
            <div class="row"><span>Time:</span> ${form.startTime} - ${form.endTime}</div>
            <div class="row"><span>Hall:</span> ${selectedHall?.name || 'N/A'}</div>
            <div class="row"><span>Package:</span> ${pkg?.name || (mode === 'menu' ? 'Custom Menu' : (mode === 'custom' ? 'Custom Items' : 'N/A'))}</div>
          </div>
        </div>
        <div class="box" style="margin-bottom:20px;">
          <h3>Items & Services</h3>
          <table>
            <thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              ${selectedHall ? `<tr><td><strong>Hall Rent</strong> (${selectedHall.name})</td><td class="text-right">1</td><td class="text-right">-</td><td class="text-right">Rs ${hallPrice}</td></tr>` : ''}
              ${form.isMealIncluded && mode === 'package' && pkg ? `<tr><td><strong>${pkg.name}</strong> (Package)</td><td class="text-right">1</td><td class="text-right">-</td><td class="text-right">Rs ${pkg.finalPrice || pkg.baseTotal}</td></tr>` : ''}
              ${form.isMealIncluded && mode === 'menu' ? form.selectedMenus.map(m => `<tr><td>${m.menuName}</td><td class="text-right">${m.quantity}</td><td class="text-right">${m.unit}</td><td class="text-right">Rs ${m.totalPrice}</td></tr>`).join('') : ''}
              ${form.isMealIncluded && mode === 'custom' ? form.customItems.map(i => `<tr><td>${i.itemName}</td><td class="text-right">${i.quantity}</td><td class="text-right">${i.unit}</td><td class="text-right">Rs ${i.totalPrice}</td></tr>`).join('') : ''}
              ${form.services.map(s => `<tr><td>${s.serviceName || 'Service'}</td><td class="text-right">${s.quantity}</td><td class="text-right">-</td><td class="text-right">Rs ${s.totalPrice}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="box" style="max-width:350px; margin-left:auto;">
          <div class="row"><span>Subtotal:</span> <span>Rs ${baseTotal + discountAmount}</span></div>
          <div class="row"><span>Discount (${form.discountType === 'percent' ? form.discount + '%' : 'Fixed'}):</span> <span>- Rs ${discountAmount}</span></div>
          <div class="row bold"><span>Grand Total:</span> <span>Rs ${finalTotal}</span></div>
          <div class="row"><span>Advance Paid:</span> <span>Rs ${form.advanceAmount}</span></div>
          <div class="row bold" style="color:#b91c1c;"><span>Balance Due:</span> <span>Rs ${dueAmount}</span></div>
        </div>
        <div class="footer">
          <p>This is a computer generated receipt and does not require signature.</p>
          <p>For queries: contact@UniSoftenterprise.com | +92-XXX-XXXXXXX</p>
        </div>
      </body>
      </html>
    `;
  };

  const generateThermalHTML = () => {
    const pkg = selectedPackage;
    const customer = selectedCustomer;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thermal Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; font-size: 12px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .double { border-top: 2px solid #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; }
          .item { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px;">UniSoft ENTERPRISE</div>
        <div class="center">Banquet & Marquee Mgmt</div>
        <div class="center" style="font-size:10px;">${new Date().toLocaleString('en-PK')}</div>
        <div class="line"></div>
        <div>Booking: ${form.title || 'Event Booking'}</div>
        <div>Customer: ${customer?.name || form.guestName || 'Walk-in'}</div>
        <div>Phone: ${customer?.phone || form.guestPhone || '-'}</div>
        <div>Date: ${form.eventDate} ${form.startTime}</div>
        <div>Hall: ${selectedHall?.name || '-'}</div>
        <div class="line"></div>
        <div class="bold">ITEMS</div>
        ${selectedHall ? `<div class="flex"><span>Hall: ${selectedHall.name}</span><span>${hallPrice}</span></div>` : ''}
        ${form.isMealIncluded && mode === 'package' && pkg ? `<div class="flex"><span>${pkg.name}</span><span>${pkg.finalPrice || pkg.baseTotal}</span></div>` : ''}
        ${form.isMealIncluded && mode === 'menu' ? form.selectedMenus.map(m => `<div class="flex item"><span>${m.menuName} x${m.quantity}</span><span>${m.totalPrice}</span></div>`).join('') : ''}
        ${form.isMealIncluded && mode === 'custom' ? form.customItems.map(i => `<div class="flex item"><span>${i.itemName} x${i.quantity}</span><span>${i.totalPrice}</span></div>`).join('') : ''}
        ${form.services.length ? `<div class="line"></div><div class="bold">SERVICES</div>` : ''}
        ${form.services.map(s => `<div class="flex item"><span>${s.serviceName || 'Svc'} x${s.quantity}</span><span>${s.totalPrice}</span></div>`).join('')}
        <div class="double"></div>
        <div class="flex"><span>TOTAL</span><span class="bold">Rs ${finalTotal}</span></div>
        <div class="flex"><span>Advance</span><span>Rs ${form.advanceAmount}</span></div>
        <div class="flex bold"><span>DUE</span><span>Rs ${dueAmount}</span></div>
        <div class="double"></div>
        <div class="center" style="margin-top:10px;">Thank you for choosing us!</div>
        <div class="center" style="font-size:10px;">Software by UniSoft Enterprise</div>
      </body>
      </html>
    `;
  };

  const handlePrintA4 = () => {
    const w = window.open('', '_blank');
    w.document.write(generateA4HTML());
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const handlePrintThermal = () => {
    const w = window.open('', '_blank');
    w.document.write(generateThermalHTML());
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  /* ─────────────────── SUBMIT ─────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId && !showNewCustomerForm) {
      toast.error('Please select or create a customer');
      return;
    }
    if (!form.hallId || !form.eventDate || !form.guestCount) {
      toast.error('Please fill hall, event date and guest count');
      return;
    }
    if (slotInfo.hasError) {
      toast.error(slotInfo.message);
      return;
    }

    if (showNewCustomerForm) {
      await handleCreateCustomer();
      return;
    }

    setSaving(true);

    try {
      const customer = customers.find(c => c.id === Number(selectedCustomerId));

      let payloadMenus = [];
      let payloadServices = form.services.filter(s => s.serviceName).map(s => ({
        serviceId: s.serviceId || null,
        serviceName: s.serviceName,
        quantity: Number(s.quantity) || 1,
        unitPrice: Number(s.unitPrice) || 0,
        totalPrice: Number(s.totalPrice) || 0,
        notes: s.notes || null
      }));

      if (form.isMealIncluded) {
        if (mode === 'package' && selectedPackage) {
          if (selectedPackage.menus?.length) {
            payloadMenus = selectedPackage.menus.map(m => ({
              menuId: m.menuId || m.id,
              menuName: m.name || m.menuName,
              quantity: Number(m.quantity) || 1,
              unitPrice: Number(m.price || m.unitPrice || 0),
              totalPrice: Number(m.totalPrice || (m.price * (m.quantity || 1))),
              unit: m.unit || 'plate',
              notes: null
            })).filter(m => m.menuId && Number(m.menuId) > 0);
          }
          if (selectedPackage.services?.length) {
            const pkgServices = selectedPackage.services
              .filter(s => s.id || s.serviceId)
              .map(s => ({
                serviceId: s.id || s.serviceId,
                serviceName: s.name || s.serviceName,
                quantity: Number(s.quantity) || 1,
                unitPrice: Number(s.price || s.unitPrice || 0),
                totalPrice: Number(s.totalPrice || ((s.price || s.unitPrice || 0) * (s.quantity || 1))),
                notes: s.notes || null
              }));
            payloadServices = [...payloadServices, ...pkgServices];
          }
        } else if (mode === 'menu') {
          payloadMenus = form.selectedMenus.filter(m => m.menuId && Number(m.menuId) > 0);
        } else if (mode === 'custom') {
          payloadMenus = [];
        }
      }

      payloadMenus = payloadMenus.filter(m => m.menuId && Number(m.menuId) > 0);

      const payload = {
        title: form.title || `${form.eventType || 'Event'} - ${customer?.name || form.guestName}`,
        description: form.description || null,
        eventType: form.eventType || 'Wedding',
        eventDate: form.eventDate,
        startTime: new Date(`${form.eventDate}T${form.startTime}`).toISOString(),
        endTime: new Date(`${form.eventDate}T${form.endTime}`).toISOString(),
        guestCount: parseInt(form.guestCount) || 0,
        actualGuestCount: form.actualGuestCount ? parseInt(form.actualGuestCount) : null,
        guestName: customer?.name || form.guestName.trim(),
        guestPhone: customer?.phone || form.guestPhone.trim(),
        guestEmail: customer?.email || (form.guestEmail ? form.guestEmail.trim() : null),
        customerId: customer ? parseInt(customer.id) : null,
        hallId: parseInt(form.hallId),
        isMealIncluded: form.isMealIncluded,
        totalAmount: Number(form.totalAmount),
        paidAmount: Number(form.paidAmount),
        advanceAmount: Number(form.advanceAmount),
        dueAmount: Number(form.dueAmount),
        discount: Number(form.discountType === 'percent' ? discountAmount : form.discount),
        paymentMode: form.paymentMode,
        status: form.status,
        paymentStatus: dueAmount <= 0 ? 'paid' : (form.advanceAmount > 0 ? 'partial' : 'pending'),
        branchId: parseInt(branchId),
        companyId: parseInt(companyId),
        menus: payloadMenus,
        customItems: mode === 'custom' ? form.customItems.map(i => ({
          itemId: i.itemId,
          itemName: i.itemName,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          totalPrice: Number(i.totalPrice) || 0,
          unit: i.unit,
          note: i.displayNote || null
        })) : [],
        services: payloadServices
      };

      const res = await bookingApi.update(Number(id), payload);
      if (res.data?.success || res.data?.id) {
        toast.success('Booking updated successfully!');
        // Clear cache for this booking
        cache.delete(`booking_edit_${id}`);
        navigate('/bookings');
      } else {
        toast.error(res.data?.message || 'Failed to update booking');
      }
    } catch (err) {
      console.error('Update booking error:', err);
      if (err.response?.status === 429) {
        toast.error('Server is busy. Please try again in a moment.');
      } else {
        toast.error(err.response?.data?.message || err.message || 'Server error');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────── RENDER ─────────────────── */
  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
        <p className="mt-4 text-sm font-bold" style={{ color: '#4A4A4A' }}>Loading booking data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F2EB' }}>
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#E0D8CC' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#4A4A4A' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-[0_4px_12px_rgba(169,122,31,0.3)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Edit Booking #{id}</h1>
                  <p className="text-xs font-medium" style={{ color: '#7A7A7A' }}>Modify Package · Menu · Custom | A4 & Thermal Print</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handlePrintA4} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                <Printer size={16} /> Print A4
              </button>
              <button type="button" onClick={handlePrintThermal} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                <Receipt size={16} /> Thermal
              </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-6 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══════ LEFT COLUMN (2/3) ═══════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Customer Section ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: '#A97A1F' }} />
                <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Customer Directory</h2>
              </div>
              <button type="button" onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all hover:scale-105"
                style={{ borderColor: '#A97A1F', color: '#A97A1F', backgroundColor: 'rgba(169,122,31,0.05)' }}>
                <UserPlus size={14} /> {showNewCustomerForm ? 'Select Existing' : '+ New Customer'}
              </button>
            </div>

            <div className="p-5">
              {!showNewCustomerForm ? (
                <div className="space-y-4">
                  <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
                    style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                    <option value="">-- Select Registered Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.phone} {c.city ? `| ${c.city}` : ''}</option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><span className="text-gray-500 text-xs">Name</span><p className="font-semibold">{selectedCustomer.name}</p></div>
                        <div><span className="text-gray-500 text-xs">Phone</span><p className="font-semibold">{selectedCustomer.phone}</p></div>
                        <div><span className="text-gray-500 text-xs">CNIC</span><p className="font-semibold">{selectedCustomer.cnic || 'N/A'}</p></div>
                        <div><span className="text-gray-500 text-xs">City</span><p className="font-semibold">{selectedCustomer.city || 'N/A'}</p></div>
                      </div>
                      {selectedCustomer.address && (
                        <div><span className="text-gray-500 text-xs">Address</span><p>{selectedCustomer.address}</p></div>
                      )}
                      {selectedCustomer.emergencyContacts?.length > 0 && (
                        <div className="pt-2 border-t" style={{ borderColor: '#E0D8CC' }}>
                          <span className="text-gray-500 text-xs font-bold">Emergency Contacts</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedCustomer.emergencyContacts.map((ec, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: '#E0D8CC' }}>
                                {ec.name} ({ec.relation || 'N/A'}): {ec.phone}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Full Name *" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="Phone *" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="CNIC" value={newCustomer.cnic} onChange={e => setNewCustomer({...newCustomer, cnic: e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="City" value={newCustomer.city} onChange={e => setNewCustomer({...newCustomer, city: e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                  </div>

                  {/* Emergency Contacts */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Emergency Contact Persons (2 Recommended)</p>
                    {newCustomer.emergencyContacts.map((ec, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder={`Contact ${idx + 1} Name`} value={ec.name}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].name = e.target.value; setNewCustomer({...newCustomer, emergencyContacts: updated}); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#E0D8CC' }} />
                        <input type="text" placeholder="Relation" value={ec.relation}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].relation = e.target.value; setNewCustomer({...newCustomer, emergencyContacts: updated}); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#E0D8CC' }} />
                        <input type="text" placeholder="Phone Number" value={ec.phone}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].phone = e.target.value; setNewCustomer({...newCustomer, emergencyContacts: updated}); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#E0D8CC' }} />
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={handleCreateCustomer}
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' }}>
                    <UserPlus size={14} className="inline mr-1" /> Register & Select Customer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Event & Hall Details ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <MapPin size={18} style={{ color: '#A97A1F' }} />
              <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Event & Hall Details</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Event Type *</label>
                  <select value={form.eventType} onChange={e => updateField('eventType', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} required>
                    <option value="">-- Select --</option>
                    {events.map(ev => <option key={ev.id || ev.name} value={ev.name}>{ev.name}</option>)}
                    
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Hall *</label>
                  <select value={form.hallId} onChange={e => updateField('hallId', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} required>
                    <option value="">-- Select Hall --</option>
                    {halls.map(h => (
                      <option key={h.id} value={h.id}>{h.name} (Cap: {h.capacity}) — Rs {Number(h.price || h.cost || 0).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Event Date *</label>
                  <input type="date" value={form.eventDate} onChange={e => updateField('eventDate', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Start Time *</label>
                  <input type="time" value={form.startTime} onChange={e => updateField('startTime', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>End Time *</label>
                  <input type="time" value={form.endTime} onChange={e => updateField('endTime', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Expected Guests *</label>
                  <input type="number" min="1" value={form.guestCount} onChange={e => updateField('guestCount', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Actual Guests</label>
                  <input type="number" min="0" value={form.actualGuestCount} onChange={e => updateField('actualGuestCount', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Booking Title</label>
                  <input type="text" placeholder="e.g. Walima - Ali UniSoft" value={form.title} onChange={e => updateField('title', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
                </div>
              </div>

              {/* Slot Collision Alert */}
              {slotInfo.message && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  slotInfo.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                  slotInfo.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <AlertCircle size={18} /> <span>{slotInfo.message}</span>
                </div>
              )}

              {/* Meal Toggle */}
              <div className="mt-4 flex items-center p-4 rounded-xl border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                <Flame size={20} className="mr-3" style={{ color: '#A97A1F' }} />
                <div className="flex-1">
                  <span className="font-bold text-sm text-gray-800 block">Meal Inclusion Mode</span>
                  <span className="text-xs text-gray-600">
                    {form.isMealIncluded ? 'Catering meals & dishes will be tracked with full pricing' : 'Space-only booking. Hall + Services only.'}
                  </span>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input type="radio" checked={form.isMealIncluded} onChange={() => toggleMealIncluded(true)} className="accent-[#A97A1F]" /> With Meal
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input type="radio" checked={!form.isMealIncluded} onChange={() => toggleMealIncluded(false)} className="accent-[#A97A1F]" /> Space Only
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── Selection Mode Tabs (only if meal included) ── */}
          {form.isMealIncluded && (
            <div className="bg-white rounded-2xl border p-1.5 flex gap-1.5 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              {[
                { key: 'package', label: 'Package', icon: Package },
                { key: 'menu', label: 'Menu', icon: Utensils },
                { key: 'custom', label: 'Custom Items', icon: Settings }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => switchMode(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    mode === tab.key
                      ? 'text-white shadow-md'
                      : 'text-gray-600 hover:bg-amber-50'
                  }`}
                  style={mode === tab.key ? { background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' } : {}}>
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ── PACKAGE MODE ── */}
          {form.isMealIncluded && mode === 'package' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
                <Package size={18} style={{ color: '#A97A1F' }} />
                <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Select a Package</h2>
              </div>
              <div className="p-5">
                {packages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No packages found. Create packages first.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map(pkg => (
                      <div key={pkg.id} onClick={() => selectPackage(pkg)}
                        className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${
                          form.selectedPackageId === pkg.id
                            ? 'border-[#A97A1F] bg-amber-50/50 ring-1 ring-[#A97A1F]'
                            : 'border-gray-200 hover:border-[#D4A855]'
                        }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-800">{pkg.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">Code: {pkg.code}</p>
                          </div>
                          <button type="button" onClick={(e) => openPackageDetails(pkg, e)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC', color: '#A97A1F' }} title="View Package Details">
                            <Eye size={16} />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>{pkg.eventType}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${pkg.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{pkg.status}</span>
                        </div>
                        {pkg.menus && pkg.menus.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {pkg.menus.map((m, i) => (
                              <span key={i} className="inline-block mr-2">• {m.name || m.menuName} ({m.quantity || pkg.guestCount || 0} guests)</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 flex justify-between items-end">
                          <div className="text-sm text-gray-500">{pkg.guestCount ? `${pkg.guestCount} Guests` : 'Guests: N/A'}</div>
                          <div className="text-xl font-bold" style={{ color: '#A97A1F' }}>{formatCurrency(pkg.finalPrice || pkg.baseTotal)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MENU MODE ── */}
          {form.isMealIncluded && mode === 'menu' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
                <Utensils size={18} style={{ color: '#A97A1F' }} />
                <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Select Saved Menus</h2>
              </div>
              <div className="p-5">
                {menus.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No menus found.</p>
                ) : (
                  <div className="space-y-3">
                    {menus.map(menu => {
                      const selected = form.selectedMenus.find(m => m.menuId === menu.id);
                      return (
                        <div key={menu.id}
                          className={`border rounded-xl p-4 flex items-center justify-between transition-all ${
                            selected ? 'border-[#A97A1F] bg-amber-50/30' : 'border-gray-200 hover:border-[#D4A855]'
                          }`}>
                          <div className="flex items-center gap-4">
                            <input type="checkbox" checked={!!selected} onChange={() => toggleMenu(menu)}
                              className="w-5 h-5 rounded focus:ring-[#A97A1F]" style={{ accentColor: '#A97A1F' }} />
                            <div>
                              <p className="font-semibold text-gray-800">{menu.name}</p>
                              <p className="text-sm text-gray-500">{formatCurrency(menu.price || menu.salePrice || menu.totalSalePrice)} / {menu.unit || 'plate'}</p>
                            </div>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-3">
                              <label className="text-sm text-gray-600">Qty:</label>
                              <input type="number" min="1" value={selected.quantity}
                                onChange={(e) => updateMenuQty(menu.id, e.target.value)}
                                className="w-20 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                              <span className="text-sm font-bold w-20 text-right" style={{ color: '#A97A1F' }}>{formatCurrency(selected.totalPrice)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CUSTOM MODE ── */}
          {form.isMealIncluded && mode === 'custom' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
                <Settings size={18} style={{ color: '#A97A1F' }} />
                <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Add Custom Items</h2>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <select className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}
                    onChange={(e) => {
                      const item = items.find(i => i.id === parseInt(e.target.value));
                      if (item) addCustomItem(item);
                      e.target.value = '';
                    }} value="">
                    <option value="">➕ Select an item to add...</option>
                    {items.map(item => {
                      const alreadyAdded = form.customItems.some(i => i.itemId === item.id);
                      const isBulk = item.isBulkUnit === true || (item.unit && item.unit.toLowerCase().includes('degh'));
                      const rate = parseFloat(item.conversionRate);
                      const perPlate = isBulk && rate > 0 ? (Number(item.salePrice || item.price || 0) / rate) : Number(item.salePrice || item.price || 0);
                      return (
                        <option key={item.id} value={item.id} disabled={alreadyAdded}>
                          {alreadyAdded ? '✓ ' : ''}{item.name} — {isBulk ? `${formatCurrency(item.salePrice || item.price)}/${item.unit} (${rate || '?'} plates = ${formatCurrency(perPlate)}/plate)` : formatCurrency(item.salePrice || item.price)}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {form.customItems.length === 0 ? (
                  <p className="text-gray-400 text-center py-6 text-sm">No custom items added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {form.customItems.map((item, idx) => (
                      <div key={idx} className="border rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800">{item.itemName}</p>
                          {item.displayNote && (
                            <p className="text-xs text-amber-700 mt-0.5">{item.displayNote}</p>
                          )}
                        </div>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateCustomItem(idx, 'quantity', e.target.value)}
                          className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center" style={{ borderColor: '#E0D8CC' }} />
                        <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateCustomItem(idx, 'unitPrice', e.target.value)}
                          className="w-24 border rounded-lg px-2 py-1.5 text-sm text-center" style={{ borderColor: '#E0D8CC' }} />
                        <span className="text-sm font-bold text-right min-w-[80px]" style={{ color: '#A97A1F' }}>{formatCurrency(item.totalPrice)}</span>
                        <button type="button" onClick={() => removeCustomItem(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-all" style={{ color: '#EF4444' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SERVICES ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <Gem size={18} style={{ color: '#A97A1F' }} />
              <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Services</h2>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {servicesList.map(service => {
                  const selected = form.services.find(s => s.serviceId === service.id);
                  return (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-amber-50/30 transition-all" style={{ borderColor: selected ? '#A97A1F' : '#E0D8CC' }}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={!!selected} onChange={() => toggleService(service)}
                          className="w-4 h-4 rounded focus:ring-[#A97A1F]" style={{ accentColor: '#A97A1F' }} />
                        <div>
                          <p className="font-medium text-sm text-gray-800">{service.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(service.salePrice || service.price || 0)}</p>
                        </div>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Qty:</label>
                          <input type="number" min="1" value={selected.quantity}
                            onChange={(e) => updateServiceQty(service.id, e.target.value)}
                            className="w-16 border rounded-lg px-2 py-1 text-xs text-center" style={{ borderColor: '#E0D8CC' }} />
                          <span className="text-sm font-bold text-[#A97A1F] min-w-[70px] text-right">{formatCurrency(selected.totalPrice)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Attachments ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <Upload size={18} style={{ color: '#A97A1F' }} />
              <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Attachments</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <label className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC', color: '#A97A1F' }}>
                  <Upload size={14} className="inline mr-2" /> Upload Files
                  <input type="file" multiple onChange={handleFileChange} className="hidden" />
                </label>
                <span className="text-xs text-gray-500">{form.attachments.length} files attached</span>
              </div>
              {form.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {form.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-lg text-sm" style={{ borderColor: '#E0D8CC' }}>
                      <span className="truncate">{file.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT COLUMN (1/3) — Summary / Payment ═══════ */}
        <div className="space-y-6">
          {/* Status & Payment */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm sticky top-20" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Booking Summary</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Status</label>
                <select value={form.status} onChange={e => updateField('status', e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                  <option value="tentative">Tentative</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Hall */}
              <div className="flex justify-between text-sm border-b pb-2" style={{ borderColor: '#E0D8CC' }}>
                <span className="text-gray-600">Hall Rent</span>
                <span className="font-bold">{formatCurrency(hallPrice)}</span>
              </div>

              {/* Meal */}
              {form.isMealIncluded && (
                <div className="flex justify-between text-sm border-b pb-2" style={{ borderColor: '#E0D8CC' }}>
                  <span className="text-gray-600">
                    {mode === 'package' ? 'Package' : mode === 'menu' ? 'Menu Items' : 'Custom Items'}
                  </span>
                  <span className="font-bold">{formatCurrency(mealTotal)}</span>
                </div>
              )}

              {/* Services */}
              {form.services.length > 0 && (
                <div className="flex justify-between text-sm border-b pb-2" style={{ borderColor: '#E0D8CC' }}>
                  <span className="text-gray-600">Services</span>
                  <span className="font-bold">{formatCurrency(servicesTotal)}</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between text-sm border-b pb-2" style={{ borderColor: '#E0D8CC' }}>
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold">{formatCurrency(baseTotal)}</span>
              </div>

              {/* Discount */}
              <div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step={form.discountType === 'percent' ? '1' : '100'}
                    value={form.discount} onChange={e => updateField('discount', e.target.value)}
                    className="w-24 border rounded-lg px-3 py-1.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  <select value={form.discountType} onChange={e => updateField('discountType', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                    <option value="percent">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <span className="text-sm text-gray-500">Discount</span>
                  <span className="text-sm font-bold text-red-500 ml-auto">-{formatCurrency(discountAmount)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between text-lg font-bold pt-2 border-t-2" style={{ borderColor: '#A97A1F' }}>
                <span style={{ color: '#1A1A1A' }}>Grand Total</span>
                <span style={{ color: '#A97A1F' }}>{formatCurrency(finalTotal)}</span>
              </div>

              {/* Advance Payment */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Advance Payment</label>
                <input type="number" min="0" step="100" value={form.advanceAmount}
                  onChange={e => updateField('advanceAmount', e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
              </div>

              {/* Due Amount */}
              <div className="flex justify-between text-base font-bold p-3 rounded-xl" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                <span>Due Amount</span>
                <span>{formatCurrency(dueAmount)}</span>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Payment Mode</label>
                <select value={form.paymentMode} onChange={e => updateField('paymentMode', e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' }}>
                  {saving ? <Loader2 size={20} className="animate-spin mx-auto" /> : <><Save size={18} className="inline mr-2" /> Update Booking</>}
                </button>
                <button type="button" onClick={() => navigate(-1)}
                  className="px-4 py-3 rounded-xl border font-medium transition-all hover:bg-gray-50" style={{ borderColor: '#E0D8CC', color: '#4A4A4A' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ═══ PACKAGE DETAIL MODAL ═══ */}
      {pkgModalOpen && pkgModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center" style={{ borderColor: '#E0D8CC' }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{pkgModalData.name}</h3>
                <p className="text-sm text-gray-500">Code: {pkgModalData.code} | {pkgModalData.eventType}</p>
              </div>
              <button onClick={() => setPkgModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{pkgModalData.status}</span></div>
                <div><span className="text-gray-500">Guests:</span> <span className="font-semibold">{pkgModalData.guestCount || 'N/A'}</span></div>
                <div><span className="text-gray-500">Base Price:</span> <span className="font-semibold">{formatCurrency(pkgModalData.baseTotal)}</span></div>
                <div><span className="text-gray-500">Final Price:</span> <span className="font-semibold" style={{ color: '#A97A1F' }}>{formatCurrency(pkgModalData.finalPrice)}</span></div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: '#E0D8CC' }}>
                <h4 className="font-bold text-sm mb-3" style={{ color: '#1A1A1A' }}>Menus in this Package</h4>
                {pkgModalData.menus?.length > 0 ? (
                  <div className="space-y-2">
                    {pkgModalData.menus.map((m, idx) => (
                      <div key={idx} className="border rounded-lg p-3" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{m.name || m.menuName}</span>
                          <span className="text-sm font-bold" style={{ color: '#A97A1F' }}>{formatCurrency(m.price || m.unitPrice)}</span>
                        </div>
                        {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No menus in this package.</p>
                )}
              </div>

              {pkgModalData.services?.length > 0 && (
                <div className="border-t pt-4" style={{ borderColor: '#E0D8CC' }}>
                  <h4 className="font-bold text-sm mb-3" style={{ color: '#1A1A1A' }}>Services</h4>
                  <div className="space-y-1 text-sm">
                    {pkgModalData.services.map((s, idx) => (
                      <div key={idx} className="flex justify-between border-b pb-1" style={{ borderColor: '#E0D8CC' }}>
                        <span>{s.name || s.serviceName}</span>
                        <span>{formatCurrency(s.price || s.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingEdit;