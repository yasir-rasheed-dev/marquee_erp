// ═══════════════════════════════════════════════════════════
// pages/BookingCreate.jsx
// COMPLETE v9 — Hall PerSeat/FullHall | Collapsible Packages, Menus & Services | Exact Qty & Correct Prices
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer, FileText, Eye, Plus, X, Upload, Package,
  Utensils, Settings, Save, Trash2, ChevronLeft,
  Users, Phone, Mail, MapPin, Tag, Receipt,
  AlertCircle, UserPlus, CreditCard, Building2, History,
  ChevronDown, ChevronUp, Flame, Sparkles, Gem, Search,
  Edit3, Armchair, BoxSelect, Percent,Info
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
import taxRateApi from '../../services/taxRateApi';
import accountApi from '../../services/accountApi';
import receiptSettingsApi from '../../services/receiptSettingsApi';
import ReactSelect from '../../components/ui/ReactSelect';

/* ─────────────────── HELPERS ─────────────────── */
const formatCurrency = (val) => `Rs ${Math.round(Number(val || 0)).toLocaleString('en-PK')}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';
const todayInput = () => new Date().toISOString().split('T')[0];

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

const extractData = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

/* Robust helper to extract items/dishes from a menu object whether structured via items or categories */
const extractMenuDetailedItems = (menu) => {
  if (!menu) return [];

  // Try to get items from menu.items
  const itemsList = menu.items || menu.menu?.items || [];
  if (Array.isArray(itemsList) && itemsList.length > 0) {
    // 🔥 FIX: Ensure each item has price and quantity
    return itemsList.map(item => ({
      ...item,
      price: item.price || item.salePrice || item.unitPrice || 0,
      quantity: item.quantity || item.qty || item.quantityPerHead || 1,
      unit: item.unit || 'plate'
    }));
  }

  // Try to get items from categories
  const categoriesList = menu.categories || menu.menu?.categories || [];
  if (Array.isArray(categoriesList) && categoriesList.length > 0) {
    let allCatItems = [];
    categoriesList.forEach(cat => {
      const catItems = cat.items || cat.menuItems || cat.dishes || [];
      const mappedItems = catItems.map(item => ({
        ...item,
        price: item.price || item.salePrice || item.unitPrice || 0,
        quantity: item.quantity || item.qty || item.quantityPerHead || 1,
        unit: item.unit || 'plate'
      }));
      allCatItems = [...allCatItems, ...mappedItems];
    });
    return allCatItems;
  }

  return [];
};

/* Robust helper: Fetches items directly from the global menus state using menuId so quantityPerHead is never missed */
const getMenuDetailedItemsWithQty = (pkgMenu, allMenus) => {
  const menuId = pkgMenu.menuId || pkgMenu.id || pkgMenu.menu?.id;

  const matchedGlobalMenu = allMenus.find(m => Number(m.id) === Number(menuId));

  if (matchedGlobalMenu) {
    if (matchedGlobalMenu.items && Array.isArray(matchedGlobalMenu.items) && matchedGlobalMenu.items.length > 0) {
      // 🔥 FIX: Ensure price and quantity are included
      return matchedGlobalMenu.items.map(item => ({
        ...item,
        price: item.price || item.salePrice || item.unitPrice || 0,
        quantity: item.quantity || item.qty || item.quantityPerHead || 1,
        unit: item.unit || 'plate'
      }));
    }
    if (matchedGlobalMenu.categories && Array.isArray(matchedGlobalMenu.categories)) {
      let catItems = [];
      matchedGlobalMenu.categories.forEach(cat => {
        const items = cat.items || cat.menuItems || cat.dishes || [];
        const mappedItems = items.map(item => ({
          ...item,
          price: item.price || item.salePrice || item.unitPrice || 0,
          quantity: item.quantity || item.qty || item.quantityPerHead || 1,
          unit: item.unit || 'plate'
        }));
        catItems = [...catItems, ...mappedItems];
      });
      if (catItems.length > 0) return catItems;
    }
  }

  return extractMenuDetailedItems(pkgMenu);
};

/* ─────────────────── COMPONENT ─────────────────── */
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
  showGst: false,
  gstNumber: 'GST-12345678',
  showNTN: false,
  ntnNumber: 'NTN-987654321',
  showCustomerDetails: true,
  showPaymentHistory: true,
  themeColor: '#1a1a2e',
  accentColor: '#2563EB',
  thermalWidth: '80mm',
  thermalFontSize: '12px',
};

const BookingCreate = () => {
  const navigate = useNavigate();
  const { branchId, companyId } = getTenantContext();

  /* ── Data Lists ── */
  const [packages, setPackages] = useState([]);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [halls, setHalls] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [events, setEvents] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // ── Filtered Accounts based on Payment Mode ──

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [receiptSettings, setReceiptSettings] = useState(defaultReceiptSettings);

  /* ── Search States ── */
  const [packageSearch, setPackageSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [customItemSelectValue, setCustomItemSelectValue] = useState('');
  const [customCatFilter, setCustomCatFilter] = useState('');

  /* ── Selection Mode ── */
  const [mode, setMode] = useState('package');

  /* ── Modals ── */
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [pkgModalData, setPkgModalData] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});

  /* ── Inline Add/Edit Modal ── */
  const [inlineModal, setInlineModal] = useState({ open: false, type: '', mode: 'create', data: null });

  /* ── Customer ── */
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: '', cnic: '', address: '', city: '',
    customerType: 'individual',
    businessName: '', businessType: '',
    contactPersonName: '', contactPersonPhone: '', contactPersonDesignation: '',
    billingAddress: '', creditLimit: '', paymentTerms: 'immediate',
    emergencyContacts: [
      { name: '', relation: '', phone: '' },
      { name: '', relation: '', phone: '' }
    ]
  });

  /* ── Form State ── */
  const [form, setForm] = useState({
  title: '',
  eventType: '',
  eventDate: todayInput(),
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
  hallChargeMode: 'per_seat',
  isMealIncluded: true,
  taxEnabled: true,
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
  bankAccountId: '',
  branchId,
  companyId,
  isEditMode: false  // 🔥 ADD THIS
});
// ── Filtered Accounts based on Payment Mode ──
const filteredAccounts = useMemo(() => {
  if (!form.paymentMode) return bankAccounts || [];

  const modeToAccountType = {
    'Cash': 'CASH',
    'Bank Transfer': 'BANK',
    'JazzCash / EasyPaisa': 'JAZZCASH',
    'Credit Card': 'CREDIT',
    'Cheque': 'BANK'
  };

  const requiredType = modeToAccountType[form.paymentMode];
  if (!requiredType) return bankAccounts || [];

  return (bankAccounts || []).filter(acc => acc.accountType === requiredType);
}, [bankAccounts, form.paymentMode]);
  /* ─────────────────── FETCH INITIAL DATA ─────────────────── */
  useEffect(() => {
  (async () => {
    try {
      const [pRes, mRes, iRes, hRes, cRes, sRes, eRes, bRes, tRes, aRes] = await Promise.all([
        packageApi.getAll().catch(() => null),
        menuApi.getAll().catch(() => null),
        itemApi.getAll().catch(() => null),
        hallApi.getAll().catch(() => null),
        customerApi.getAll().catch(() => null),
        serviceApi.getAll().catch(() => null),
        eventApi.getAll().catch(() => null),
        bookingApi.getAll().catch(() => null),
        taxRateApi.getAll({ branchId }).catch(() => null),
        accountApi.getAll({ branchId }).catch(() => null)
      ]);
      
      const packagesData = extractData(pRes);
      const menusData = extractData(mRes);
      const itemsData = extractData(iRes);
      const hallsData = extractData(hRes);
      const customersData = extractData(cRes);
      const servicesData = extractData(sRes);
      const eventsData = extractData(eRes);
      const bookingsData = extractData(bRes);
      const taxRatesData = extractData(tRes);
      const bankAccountsData = extractData(aRes);
      
      setPackages(packagesData);
      setMenus(menusData);
      setItems(itemsData);
      setHalls(hallsData);
      setCustomers(customersData);
      setServicesList(servicesData);
      setEvents(eventsData);
      setExistingBookings(bookingsData);
      setTaxRates(taxRatesData);
      setBankAccounts(bankAccountsData);
      
      // ── 🔥 EDIT MODE: Booking data load karein ──
      const pathname = window.location.pathname;
      if (pathname.includes('/bookings/edit/')) {
        const bookingId = pathname.split('/bookings/edit/')[1];
        if (bookingId) {
          try {
            console.log('📝 EDIT MODE - Loading booking:', bookingId);
            const bookingRes = await bookingApi.getById(bookingId);
            const bookingData = bookingRes?.data || bookingRes;
            console.log('📝 EDIT MODE - Booking data:', bookingData);
            
            if (bookingData) {
              // ── Customer select karein ──
              if (bookingData.customerId) {
                setSelectedCustomerId(String(bookingData.customerId));
              }
              
              // ── Form state update karein ──
              const eventDate = bookingData.eventDate ? new Date(bookingData.eventDate).toISOString().split('T')[0] : todayInput();
              const startTime = bookingData.startTime ? new Date(bookingData.startTime).toTimeString().slice(0, 5) : '18:00';
              const endTime = bookingData.endTime ? new Date(bookingData.endTime).toTimeString().slice(0, 5) : '23:00';
              
              setForm(prev => ({
                ...prev,
                title: bookingData.title || '',
                eventType: bookingData.eventType || '',
                eventDate: eventDate,
                startTime: startTime,
                endTime: endTime,
                description: bookingData.description || '',
                guestName: bookingData.guestName || '',
                guestPhone: bookingData.guestPhone || '',
                guestEmail: bookingData.guestEmail || '',
                guestCount: bookingData.guestCount || '',
                actualGuestCount: bookingData.actualGuestCount || '',
                customerId: bookingData.customerId || '',
                hallId: bookingData.hallId ? String(bookingData.hallId) : '',
                hallChargeMode: bookingData.hallChargeMode || 'per_seat',
                isMealIncluded: bookingData.isMealIncluded !== undefined ? bookingData.isMealIncluded : true,
                taxEnabled: bookingData.taxEnabled !== undefined ? bookingData.taxEnabled : true,
                totalAmount: bookingData.totalAmount || 0,
                discount: bookingData.discount || 0,
                discountType: bookingData.discountType || 'percent',
                advanceAmount: bookingData.advanceAmount || 0,
                dueAmount: bookingData.dueAmount || 0,
                paidAmount: bookingData.paidAmount || 0,
                paymentMode: bookingData.paymentMode || 'Cash',
                paymentStatus: bookingData.paymentStatus || 'pending',
                selectedPackageId: bookingData.selectedPackageId || null,
                selectedMenus: bookingData.menus || [],
                customItems: bookingData.customItems || [],
                services: bookingData.services || [],
                attachments: bookingData.attachments || [],
                status: bookingData.status || 'tentative',
                bankAccountId: bookingData.bankAccountId || '',
                branchId: bookingData.branchId || branchId,
                companyId: bookingData.companyId || companyId
              }));
              
              // ── Package select karein ──
              if (bookingData.selectedPackageId) {
                const pkg = packagesData.find(p => p.id === bookingData.selectedPackageId);
                if (pkg) {
                  setForm(prev => ({
                    ...prev,
                    selectedPackageId: pkg.id
                  }));
                }
              }
            }
          } catch (err) {
            console.error('❌ Failed to load booking for edit:', err);
            toast.error('Failed to load booking data for edit');
          }
        }
      }
    } catch (err) {
      console.error('Initial load error:', err);
      toast.error('Failed to load some data');
    } finally {
      setFetching(false);
    }
  })();
}, [branchId]);

  /* ── Fetch Receipt Settings ── */
  useEffect(() => {
    const fetchReceiptSettings = async () => {
      try {
        const res = await receiptSettingsApi.getAll({ branchId });
        const dataArray = res?.data || res;
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const db = dataArray[0];
          setReceiptSettings(prev => ({ ...defaultReceiptSettings, ...db }));
        } else {
          setReceiptSettings(defaultReceiptSettings);
        }
      } catch (err) {
        try {
          const saved = localStorage.getItem('receiptSettings');
          if (saved) {
            setReceiptSettings({ ...defaultReceiptSettings, ...JSON.parse(saved) });
          } else {
            setReceiptSettings(defaultReceiptSettings);
          }
        } catch {
          setReceiptSettings(defaultReceiptSettings);
        }
      }
    };
    if (branchId) fetchReceiptSettings();
  }, [branchId]);

  /* ─────────────────── DERIVED ─────────────────── */
 const selectedPackage = useMemo(() => {
  const pkg = packages.find(p => p.id === form.selectedPackageId);
  console.log('📦 selectedPackage found:', pkg);
  return pkg;
}, [packages, form.selectedPackageId]);

  const selectedHall = useMemo(() =>
    halls.find(h => h.id === Number(form.hallId)),
    [halls, form.hallId]
  );

  const hallCapacity = Number(selectedHall?.capacity || 0);
  const selectedCustomer = customers.find(c => c.id === Number(selectedCustomerId));

  /* ── Hall Price: Per Seat vs Full Hall ── */
  const hallPrice = useMemo(() => {
    if (!selectedHall) return 0;
    if (form.hallChargeMode === 'per_seat') {
      const guests = Number(form.guestCount) || 0;
      const perSeatRate = Number(selectedHall.perSeatPrice || selectedHall.price || 0);
      return perSeatRate * guests;
    }
    return Number(selectedHall.price || 0);
  }, [selectedHall, form.hallChargeMode, form.guestCount]);

  /* ── Filtered Lists ── */
  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return packages;
    const search = packageSearch.toLowerCase().trim();
    return packages.filter(p =>
      p.name?.toLowerCase().includes(search) ||
      p.code?.toLowerCase().includes(search) ||
      p.eventType?.toLowerCase().includes(search)
    );
  }, [packages, packageSearch]);

  const filteredMenus = useMemo(() => {
    if (!menuSearch.trim()) return menus;
    const search = menuSearch.toLowerCase().trim();
    return menus.filter(m =>
      m.name?.toLowerCase().includes(search) ||
      m.category?.toLowerCase().includes(search)
    );
  }, [menus, menuSearch]);

  /* ── Custom Items Category Filter Logic ── */
  const customItemCategories = useMemo(() => {
    const catMap = new Map();
    items.forEach(i => {
      if (i.category) {
        const catId = i.category.id || i.categoryId;
        const catName = i.category.name || i.categoryName;
        if (catId && catName) catMap.set(catId, catName);
      }
    });
    return Array.from(catMap, ([id, name]) => ({ value: String(id), label: name }));
  }, [items]);

  const filteredCustomItemsList = useMemo(() => {
    if (!customCatFilter) return items;
    return items.filter(i => String(i.category?.id || i.categoryId) === String(customCatFilter));
  }, [items, customCatFilter]);

  /* ── Slot Collision + Remaining Seats ── */
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
      const bDate = new Date(b.eventDate).toISOString().split('T')[0];
      return Number(b.hallId) === Number(form.hallId) && bDate === form.eventDate;
    });

    let totalBookedGuests = 0;
    let fullHallBooked = false;
    const conflictingBookings = [];

    for (const b of conflicting) {
      const existingStart = new Date(b.startTime).getTime();
      const existingEnd = new Date(b.endTime).getTime();
      if (newStart < existingEnd && newEnd > existingStart) {
        if (b.hallChargeMode === 'full_hall') fullHallBooked = true;
        totalBookedGuests += Number(b.guestCount || 0);
        conflictingBookings.push(b);
      }
    }

    const remaining = Math.max(0, hallCapacity - totalBookedGuests);

    if (form.hallChargeMode === 'full_hall') {
      if (fullHallBooked) {
        return { hasError: true, message: `❌ Hall already fully booked for this slot!`, remaining: 0, type: 'error', conflictingBookings };
      }
      if (totalBookedGuests > 0) {
        return { hasError: true, message: `❌ Cannot book full hall — ${totalBookedGuests} seats already booked`, remaining, type: 'error', conflictingBookings };
      }
      return { hasError: false, message: `✅ Full hall available (Capacity: ${hallCapacity})`, remaining: hallCapacity, type: 'success', conflictingBookings };
    }

    if (fullHallBooked) {
      return { hasError: true, message: `❌ Hall fully reserved (full hall booking exists)`, remaining: 0, type: 'error', conflictingBookings };
    }
    if (remaining <= 0) {
      return { hasError: true, message: `❌ Slot Full! "${selectedHall?.name}" capacity ${hallCapacity} already booked.`, remaining: 0, type: 'error', conflictingBookings };
    }
    if (requestedGuests > remaining) {
      return { hasError: true, message: `⚠️ Capacity exceeded! Booked: ${totalBookedGuests}, Remaining: ${remaining}, Requested: ${requestedGuests}`, remaining, type: 'error', conflictingBookings };
    }
    if (totalBookedGuests > 0) {
      return { hasError: false, message: `⚠️ This slot has ${totalBookedGuests} guests already. Remaining: ${remaining}`, remaining, type: 'warning', conflictingBookings };
    }
    return { hasError: false, message: `✅ Available: ${remaining} seats`, remaining, type: 'success', conflictingBookings };
  }, [form.hallId, form.eventDate, form.startTime, form.endTime, form.guestCount, form.hallChargeMode, hallCapacity, selectedHall, existingBookings]);

  /* ── Financial Calculations ── */
  const packageMealTotal = useMemo(() => {
    if (!form.isMealIncluded || !selectedPackage) return 0;
    return Number(selectedPackage.finalPrice || selectedPackage.baseTotal || selectedPackage.totalAmount || 0);
  }, [form.isMealIncluded, selectedPackage]);

  const menuMealTotal = useMemo(() => {
    if (!form.isMealIncluded) return 0;
    return form.selectedMenus.reduce((s, m) => s + Number(m.totalPrice || 0), 0);
  }, [form.isMealIncluded, form.selectedMenus]);

  const customMealTotal = useMemo(() => {
    if (!form.isMealIncluded) return 0;
    return form.customItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
  }, [form.isMealIncluded, form.customItems]);

  const mealTotal = useMemo(() =>
    packageMealTotal + menuMealTotal + customMealTotal,
    [packageMealTotal, menuMealTotal, customMealTotal]
  );

  const servicesTotal = useMemo(() =>
    form.services.reduce((s, sv) => s + Number(sv.totalPrice || 0), 0),
    [form.services]
  );

  const baseTotal = useMemo(() => {
  // ── 🔥 Hall price hamesha alag add hoti hai (package ka part nahi) ──
  let total = hallPrice;
  
  if (form.isMealIncluded) {
    // ── Package price (only if selected) ──
    if (selectedPackage) {
      const packageTotal = Number(selectedPackage.finalPrice || selectedPackage.baseTotal || 0);
      total += packageTotal;
    }
    
    // ── Extra menus (jo package se nahi hain) ──
    const extraMenusTotal = form.selectedMenus
      .filter(m => !m.fromPackage)
      .reduce((sum, m) => sum + Number(m.totalPrice || 0), 0);
    total += extraMenusTotal;
    
    // ── Custom items (hamesha extra hain) ──
    const customTotal = form.customItems.reduce((sum, i) => sum + Number(i.totalPrice || 0), 0);
    total += customTotal;
  }
  
  // ── Services: Sirf extra services jo package se nahi hain ──
  const extraServicesTotal = form.services
    .filter(s => !s.fromPackage)
    .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  total += extraServicesTotal;
  
  return total;
}, [hallPrice, selectedPackage, form.isMealIncluded, form.selectedMenus, form.customItems, form.services]);

  const discountAmount = useMemo(() => {
    const discountValue = Number(form.discount || 0);
    if (form.discountType === 'percent') {
      return (baseTotal * discountValue) / 100;
    }
    return discountValue;
  }, [baseTotal, form.discount, form.discountType]);

  const activeTaxRates = useMemo(() => {
    return taxRates.filter(t => t.isActive) || [];
  }, [taxRates]);

  const amountAfterDiscount = Math.max(0, baseTotal - discountAmount);

  const taxBreakdown = useMemo(() => {
    if (!form.taxEnabled) return [];
    return activeTaxRates.map(tax => ({
      ...tax,
      percent: Number(tax.rate || 0),
      amount: (amountAfterDiscount * Number(tax.rate || 0)) / 100
    }));
  }, [activeTaxRates, amountAfterDiscount, form.taxEnabled]);

  const taxAmount = useMemo(() => {
    if (!form.taxEnabled) return 0;
    return taxBreakdown.reduce((sum, t) => sum + t.amount, 0);
  }, [taxBreakdown, form.taxEnabled]);

  const taxRatePercent = form.taxEnabled && activeTaxRates.length > 0
    ? activeTaxRates.reduce((sum, t) => sum + Number(t.rate || 0), 0)
    : 0;

 const finalTotal = useMemo(() => Math.max(0, amountAfterDiscount + taxAmount), [amountAfterDiscount, taxAmount]);
   const dueAmount = useMemo(() => Math.max(0, finalTotal - Number(form.advanceAmount || 0)), [finalTotal, form.advanceAmount]);

  useEffect(() => {
    const calculatedDue = Math.max(0, finalTotal - Number(form.advanceAmount || 0));
    setForm(prev => ({
      ...prev,
      totalAmount: finalTotal,
      dueAmount: calculatedDue,
      paidAmount: Number(prev.advanceAmount || 0)
    }));
  }, [finalTotal, form.advanceAmount]);

  /* ── Auto-sync guest count to all menus when guestCount changes ── */
  useEffect(() => {
    const guests = parseInt(form.guestCount) || 1;
    setForm(prev => ({
      ...prev,
      selectedMenus: prev.selectedMenus.map(m => ({
        ...m,
        quantity: guests,
        totalPrice: guests * m.unitPrice
      }))
    }));
  }, [form.guestCount]);

  /* ─────────────────── HANDLERS ─────────────────── */
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleMealIncluded = (val) => {
    setForm(prev => ({ ...prev, isMealIncluded: val }));
  };
// ── 🔥 Package ke menus aur services ko mark karein ──
const selectPackage = (pkg) => {
  // ── 🔥 Hall capacity check ──
  const totalGuests = (pkg.menus || []).reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);
  const hall = halls.find(h => h.id === Number(form.hallId));
  const hallCap = Number(hall?.capacity || 0);

  if (hallCap > 0 && totalGuests > hallCap) {
    toast.error(`Package guest count (${totalGuests}) exceeds hall capacity (${hallCap})`);
    return;
  }

  setForm(prev => {
    // ── 🔥 Agar already selected hai to DESELECT karein ──
    if (prev.selectedPackageId === pkg.id) {
      return {
        ...prev,
        selectedPackageId: null,
        // ── 🔥 Sirf package wali items hatao, individual items rahein ──
        selectedMenus: prev.selectedMenus.filter(m => !m.fromPackage),
        services: prev.services.filter(s => !s.fromPackage),
        eventType: prev.eventType,
        guestCount: prev.guestCount,
        title: prev.title
      };
    }

    // ── 🔥 Package services ko map karein (fromPackage = true) ──
    const packageServices = (pkg.services || []).map(s => {
      const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
      const hours = Number(s.hours || 1);
      const unitPrice = Number(s.salePrice || s.price || s.unitPrice || 0);
      const quantity = Number(s.quantity || s.qty || 1);
      const totalPrice = isHourly ? (quantity * hours * unitPrice) : (quantity * unitPrice);
      
      return {
        serviceId: s.id || s.serviceId,
        serviceName: s.name || s.serviceName,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        notes: s.notes || '',
        pricingType: s.pricingType || 'FIXED',
        hours: isHourly ? hours : null,
        isHourly: isHourly,
        fromPackage: true // 🔥 MARK AS FROM PACKAGE
      };
    });

    // ── 🔥 Package menus ko map karein (fromPackage = true) ──
    const packageMenus = (pkg.menus || []).map(m => ({
      menuId: m.menuId || m.id,
      menuName: m.name || m.menuName || 'Menu',
      quantity: Number(m.quantity) || 1,
      unitPrice: Number(m.price || m.unitPrice || 0),
      totalPrice: Number(m.totalPrice || (m.price * (m.quantity || 1))),
      unit: m.unit || 'plate',
      fromPackage: true
    }));

    return {
      ...prev,
      selectedPackageId: pkg.id,
      eventType: pkg.eventType || prev.eventType,
      guestCount: totalGuests || prev.guestCount,
      title: pkg.name ? `${pkg.name} Booking` : prev.title,
      isMealIncluded: true,
      // ── 🔥 Existing items rahein + package items add ho jayein ──
      selectedMenus: [...prev.selectedMenus, ...packageMenus],
      services: [...prev.services, ...packageServices]
    };
  });

  toast.success(`Package "${pkg.name}" selected! You can still add individual items.`);
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
        unit: menu.unit || 'plate',
        fromPackage: false // 🔥 Individual menu
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

  const addCustomItem = (item) => {
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

const toggleService = (service) => {
  const serviceId = service.id || service.serviceId;
  
  // ── 🔥 Check if service already exists ──
  const exists = form.services.find(s => s.serviceId === serviceId);
  
  if (exists) {
    // ── 🔥 Agar package se hai to remove nahi kar sakte ──
    if (exists.fromPackage) {
      toast.info('This service is included in the package and cannot be removed');
      return;
    }
    setForm(prev => ({ 
      ...prev, 
      services: prev.services.filter(s => s.serviceId !== serviceId) 
    }));
  } else {
    const unitPrice = Number(service.salePrice || service.price || service.unitPrice || 0);
    const isHourly = service.pricingType === 'HOURLY' || service.isHourly === true;
    const hours = isHourly ? 1 : null;
    const quantity = 1;
    
    let totalPrice = Number(service.totalPrice || 0);
    if (totalPrice === 0) {
      totalPrice = isHourly ? (unitPrice * hours * quantity) : (unitPrice * quantity);
    }
    
    setForm(prev => ({
      ...prev,
      services: [...prev.services, {
        serviceId: serviceId,
        serviceName: service.name || service.serviceName,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        notes: '',
        pricingType: service.pricingType || 'FIXED',
        hours: hours,
        isHourly: isHourly,
        fromPackage: false // 🔥 Individual service
      }]
    }));
  }
};

const updateServiceQty = (serviceId, qty) => {
  const quantity = Math.max(1, Number(qty) || 1);
  setForm(prev => ({
    ...prev,
    services: prev.services.map(s => {
      if (s.serviceId !== serviceId) return s;
      
      // 🔥 FIX: Agar package se hai to total price fixed rahe
      if (s.fromPackage) {
        // Sirf quantity update karo, total price wahi rahe jo package mein hai
        return { ...s, quantity };
      }
      
      const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
      const hours = s.hours || 1;
      const unitPrice = s.unitPrice || 0;
      const totalPrice = isHourly ? (quantity * hours * unitPrice) : (quantity * unitPrice);
      return { ...s, quantity, totalPrice };
    })
  }));
};

// ── NEW FUNCTION: Update hours for hourly services ──
// ── FIX: Update hours for hourly services ──
const updateServiceHours = (serviceId, hours) => {
  const hrs = Math.max(1, Number(hours) || 1);
  setForm(prev => ({
    ...prev,
    services: prev.services.map(s => {
      if (s.serviceId !== serviceId) return s;
      const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
      if (!isHourly) return s;
      
      // 🔥 FIX: Agar package se hai to hours bhi fixed rahe
      if (s.fromPackage) {
        return { ...s };
      }
      
      const quantity = s.quantity || 1;
      const unitPrice = s.unitPrice || 0;
      const totalPrice = quantity * hrs * unitPrice;
      return { ...s, hours: hrs, totalPrice };
    })
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
      return false;
    }
    if (newCustomer.phone.length !== 11) {
      toast.error('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return false;
    }
    if (newCustomer.customerType !== 'individual' && !newCustomer.businessName.trim()) {
      toast.error('Business name is required for organizations');
      return false;
    }
    const dupPhone = customers.find(c => c.phone?.trim() === newCustomer.phone?.trim());
    const dupCnic = newCustomer.cnic ? customers.find(c => c.cnic?.trim() === newCustomer.cnic?.trim()) : null;
    if (dupPhone || dupCnic) {
      const existing = dupPhone || dupCnic;
      toast.error(`Customer already exists! (${existing.name} — ${existing.phone})`);
      setSelectedCustomerId(String(existing.id));
      setShowNewCustomerForm(false);
      return true;
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
        customerType: 'individual',
        businessName: '', businessType: '',
        contactPersonName: '', contactPersonPhone: '', contactPersonDesignation: '',
        billingAddress: '', creditLimit: '', paymentTerms: 'immediate',
        emergencyContacts: [{ name: '', relation: '', phone: '' }, { name: '', relation: '', phone: '' }]
      });
      toast.success('Customer registered and selected');
      return true;
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || '';
      if (status === 409) {
        toast.error(msg.includes('phone') ? 'Phone already registered!' : msg.includes('cnic') ? 'CNIC already registered!' : 'Customer already exists!');
      } else {
        toast.error(msg || 'Failed to create customer');
      }
      return false;
    }
  };

  /* ─────────────────── INLINE ADD/EDIT ─────────────────── */
  const openInlineModal = (type, mode = 'create', data = null) => {
    setInlineModal({ open: true, type, mode, data });
  };

  const closeInlineModal = () => {
    setInlineModal({ open: false, type: '', mode: 'create', data: null });
  };

  const handleInlineSave = async (type, payload) => {
    try {
      let res;
      if (type === 'menu') {
        if (inlineModal.mode === 'edit' && inlineModal.data?.id) {
          res = await menuApi.update(inlineModal.data.id, payload);
          toast.success('Menu updated!');
        } else {
          res = await menuApi.create(payload);
          toast.success('Menu created!');
        }
        setMenus(extractData(await menuApi.getAll()));
        const created = res.data || res;
        if (inlineModal.mode === 'create' && created?.id) toggleMenu(created);
      }
      if (type === 'item') {
        if (inlineModal.mode === 'edit' && inlineModal.data?.id) {
          res = await itemApi.update(inlineModal.data.id, payload);
          toast.success('Item updated!');
        } else {
          res = await itemApi.create(payload);
          toast.success('Item created!');
        }
        setItems(extractData(await itemApi.getAll()));
      }
      if (type === 'service') {
        if (inlineModal.mode === 'edit' && inlineModal.data?.id) {
          res = await serviceApi.update(inlineModal.data.id, payload);
          toast.success('Service updated!');
        } else {
          res = await serviceApi.create(payload);
          toast.success('Service created!');
        }
        setServicesList(extractData(await serviceApi.getAll()));
      }
      if (type === 'event') {
        if (inlineModal.mode === 'edit' && inlineModal.data?.id) {
          res = await eventApi.update(inlineModal.data.id, payload);
          toast.success('Event updated!');
        } else {
          res = await eventApi.create(payload);
          toast.success('Event created!');
        }
        setEvents(extractData(await eventApi.getAll()));
      }
      if (type === 'package') {
        if (inlineModal.mode === 'edit' && inlineModal.data?.id) {
          res = await packageApi.update(inlineModal.data.id, payload);
          toast.success('Package updated!');
        } else {
          res = await packageApi.create(payload);
          toast.success('Package created!');
        }
        setPackages(extractData(await packageApi.getAll()));
      }
      closeInlineModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${inlineModal.mode} ${type}`);
    }
  };

  /* ─────────────────── PRINT ─────────────────── */
  const generateA4HTML = (rs) => {
    const s = { ...defaultReceiptSettings, ...rs };
    const b = {
      bookingNo: 'PENDING',
      guestName: selectedCustomer?.name || form.guestName || 'Walk-in Customer',
      guestPhone: selectedCustomer?.phone || form.guestPhone || '',
      guestEmail: selectedCustomer?.email || form.guestEmail || '',
      customer: selectedCustomer || {},
      hall: selectedHall || null,
      hallChargeMode: form.hallChargeMode,
      guestCount: Number(form.guestCount) || 0,
      menus: form.isMealIncluded ? form.selectedMenus : [],
      services: form.services || [],
      customItems: form.isMealIncluded ? form.customItems : [],
      payments: [],
      totalAmount: Number(finalTotal) || 0,
      discount: Number(discountAmount) || 0,
      paidAmount: Number(form.advanceAmount) || 0,
      dueAmount: Number(dueAmount) || 0,
      paymentStatus: Number(dueAmount) <= 0 ? 'paid' : (Number(form.advanceAmount) > 0 ? 'partial' : 'pending'),
    };

    const payments = b.payments || [];
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

    let hallRent = 0;
    if (b.hall) {
      if (b.hallChargeMode === 'per_seat') {
        hallRent = Number(b.hall.perSeatPrice || b.hall.price || 0) * (b.guestCount || 0);
      } else {
        hallRent = Number(b.hall.price || 0);
      }
    }
    const totalAmount = Number(b.totalAmount || 0);
    const discount = Number(b.discount || 0);
    const localDueAmount = Number(b.dueAmount || 0);

    const logoHtml = s.showLogo && s.logoUrl
      ? `<img src="${s.logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain;" />`
      : `<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:${s.themeColor};">${s.companyName?.charAt(0) || 'U'}</div>`;

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
          ${b.hall ? (() => {
        let rate, qty, total;
        if (b.hallChargeMode === 'per_seat') {
          rate = Number(b.hall.perSeatPrice || b.hall.price || 0);
          qty = b.guestCount || 0;
          total = rate * qty;
        } else {
          rate = Number(b.hall.price || 0);
          qty = 1;
          total = rate;
        }
        return `<tr>
    <td><strong>${b.hallChargeMode === 'per_seat' ? `Hall Rent (×${qty} guests)` : 'Hall Rent (Full Hall)'}</strong><br><span style="color:#888;font-size:11px;">${b.hall.name || ''}</span></td>
    <td class="text-right">${qty}</td>
    <td class="text-right">${formatCurrency(rate)}</td>
    <td class="text-right"><strong>${formatCurrency(total)}</strong></td>
  </tr>`;
      })() : ''}
${selectedPackage && form.isMealIncluded && packageMealTotal > 0 ? `<tr>
  <td><strong>Package: ${selectedPackage.name}</strong><br><span style="color:#888;font-size:11px;">${selectedPackage.eventType || ''}</span></td>
  <td class="text-right">1</td>
  <td class="text-right">${formatCurrency(packageMealTotal)}</td>
  <td class="text-right"><strong>${formatCurrency(packageMealTotal)}</strong></td>
</tr>` : ''}
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
          <div class="summary-item due"><span class="label">Due Balance</span><span class="amount">${formatCurrency(localDueAmount)}</span></div>
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

  const generateThermalHTML = (rs) => {
    const s = { ...defaultReceiptSettings, ...rs };
    const b = {
      bookingNo: 'PENDING',
      guestName: selectedCustomer?.name || form.guestName || 'Walk-in Customer',
      guestPhone: selectedCustomer?.phone || form.guestPhone || '',
      guestEmail: selectedCustomer?.email || form.guestEmail || '',
      hall: selectedHall || null,
      hallChargeMode: form.hallChargeMode,
      guestCount: Number(form.guestCount) || 0,
      menus: form.isMealIncluded ? form.selectedMenus : [],
      services: form.services || [],
      customItems: form.isMealIncluded ? form.customItems : [],
      payments: [],
      totalAmount: Number(finalTotal) || 0,
      discount: Number(discountAmount) || 0,
      paidAmount: Number(form.advanceAmount) || 0,
      dueAmount: Number(dueAmount) || 0,
      paymentStatus: Number(dueAmount) <= 0 ? 'paid' : (Number(form.advanceAmount) > 0 ? 'partial' : 'pending'),
    };

    const payments = b.payments || [];
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
        <td style="padding:2px 0;font-size:10px;text-align:center;">${p.mode?.replace('_', ' ').toUpperCase()}</td>
        <td style="padding:2px 0;font-size:10px;text-align:right;">${formatCurrency(p.amount)}</td>
      </tr>`
    ).join('');

    let hallRent = 0;
    if (b.hall) {
      if (b.hallChargeMode === 'per_seat') {
        hallRent = Number(b.hall.perSeatPrice || b.hall.price || 0) * (b.guestCount || 0);
      } else {
        hallRent = Number(b.hall.price || 0);
      }
    }
    const totalAmount = Number(b.totalAmount || 0);
    const discount = Number(b.discount || 0);
    const paidAmount = Number(b.paidAmount || 0);
    const localDueAmount = Number(b.dueAmount || 0);

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
    body { font-family: 'Courier New', monospace; font-size: ${fontSize}; padding: 8px; color: #000; background: #fff; line-height: 1.3; }
    .receipt { max-width: ${width}; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .info-line { display: flex; justify-content: space-between; font-size: 11px; }
    @media print { body { padding: 4px; } .receipt { width: ${width}; max-width: ${width}; } .no-print { display: none; } }
    .no-print { text-align: center; margin: 10px 0; }
    .no-print button { padding: 8px 16px; background: #000; color: #fff; border: none; font-size: 12px; cursor: pointer; margin: 0 3px; }
  </style>
</head>
<body>
  <div class="receipt">
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
      ${b.hall ? (() => {
        let rate, qty, total;
        if (b.hallChargeMode === 'per_seat') {
          rate = Number(b.hall.perSeatPrice || b.hall.price || 0);
          qty = b.guestCount || 0;
          total = rate * qty;
        } else {
          rate = Number(b.hall.price || 0);
          qty = 1;
          total = rate;
        }
        return `<tr>
    <td style="padding:2px 0;font-size:11px;">Hall: ${b.hall.name || ''} ${b.hallChargeMode === 'per_seat' ? `(×${qty})` : '(Full)'}</td>
    <td style="padding:2px 0;font-size:11px;text-align:center;">${qty}</td>
    <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(total)}</td>
  </tr>`;
      })() : ''}
${selectedPackage && form.isMealIncluded && packageMealTotal > 0 ? `<tr>
  <td style="padding:2px 0;font-size:11px;">Package: ${selectedPackage.name}</td>
  <td style="padding:2px 0;font-size:11px;text-align:center;">1</td>
  <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(packageMealTotal)}</td>
</tr>` : ''}
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
  <tr style="border-top:1px dashed #000;border-bottom:2px solid #000;"><td style="font-size:11px;font-weight:bold;padding-top:4px;padding-bottom:4px;">Due</td><td style="font-size:11px;text-align:right;font-weight:bold;padding-top:4px;padding-bottom:4px;color:#c0392b;">${formatCurrency(localDueAmount)}</td></tr>
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
  </div>
</body>
</html>`;
  };

  const handlePrintA4 = () => {
    const html = generateA4HTML(receiptSettings);
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Popup blocked! Please allow popups for this site.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handlePrintThermal = () => {
    const html = generateThermalHTML(receiptSettings);
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Popup blocked! Please allow popups for this site.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };


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

  // ── 🔥 NEW RULES ──
  const advanceAmount = Number(form.advanceAmount || 0);
  
  if (advanceAmount > 0) {
    if (!form.paymentMode) {
      toast.error('⚠️ Please select a Payment Mode to receive advance payment');
      return;
    }
    if (!form.bankAccountId) {
      toast.error('⚠️ Please select a Bank Account to receive advance payment');
      return;
    }
  }

  if (showNewCustomerForm) {
    const success = await handleCreateCustomer();
    if (!success) return;
  }

  setLoading(true);

  try {
    const customer = customers.find(c => c.id === Number(selectedCustomerId));
    if (!customer) {
      toast.error('Customer not found. Please select again.');
      setLoading(false);
      return;
    }

    // ── 🔥 STEP 1: Build Menus ──
// ── 🔥 STEP 1: Build Menus ──
let payloadMenus = [];

if (form.isMealIncluded) {
  // ── Package Menus ──
  if (selectedPackage && selectedPackage.menus?.length) {
    const pkgMenus = selectedPackage.menus
      .filter(m => m.menuId || m.id)
      .map(m => ({
        menuId: Number(m.menuId || m.id),
        menuName: m.name || m.menuName || 'Menu',
        quantity: Number(m.quantity) || 1,
        unitPrice: Number(m.price || m.unitPrice || 0),
        totalPrice: Number(m.totalPrice || (m.price * (m.quantity || 1))),
        unit: m.unit || 'plate',
        notes: null
      }));
    payloadMenus = [...payloadMenus, ...pkgMenus];
  }

  // ── Added Menus (from menu selection) ──
  const addedMenus = form.selectedMenus
    .filter(m => m.menuId && Number(m.menuId) > 0)
    .map(m => ({
      menuId: Number(m.menuId),
      menuName: m.menuName || 'Menu',
      quantity: Number(m.quantity) || 1,
      unitPrice: Number(m.unitPrice || 0),
      totalPrice: Number(m.totalPrice || (m.unitPrice * m.quantity)),
      unit: m.unit || 'plate',
      notes: null
    }));
  payloadMenus = [...payloadMenus, ...addedMenus];
}

// ── 🔥 STEP 2: Build Services ──
let payloadServices = form.services
  .filter(s => s.serviceName && s.serviceId)
  .map(s => {
    const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
    const unitPrice = Number(s.unitPrice || 0);
    const quantity = Number(s.quantity || 1);
    const hours = Number(s.hours || 1);
    
    let totalPrice = Number(s.totalPrice || 0);
    if (totalPrice === 0 || !s.fromPackage) {
      totalPrice = isHourly ? (quantity * hours * unitPrice) : (quantity * unitPrice);
    }
    
    return {
      serviceId: Number(s.serviceId),
      serviceName: s.serviceName,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      notes: s.notes || null,
      hours: isHourly ? hours : null,
      pricingType: s.pricingType || 'FIXED',
      isHourly: isHourly,
      fromPackage: s.fromPackage || false
    };
  });

// ── 🔥 STEP 3: Package Services ──
if (form.isMealIncluded && selectedPackage && selectedPackage.services?.length) {
  const pkgServices = selectedPackage.services
    .filter(s => s.id || s.serviceId)
    .map(s => {
      const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
      const unitPrice = Number(s.salePrice || s.price || s.unitPrice || 0);
      const quantity = Number(s.quantity || s.qty || 1);
      const hours = Number(s.hours || 1);
      
      let totalPrice = Number(s.totalPrice || 0);
      if (totalPrice === 0) {
        totalPrice = isHourly ? (quantity * hours * unitPrice) : (quantity * unitPrice);
      }
      
      return {
        serviceId: Number(s.id || s.serviceId),
        serviceName: s.name || s.serviceName,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        notes: s.notes || null,
        hours: isHourly ? hours : null,
        pricingType: s.pricingType || 'FIXED',
        isHourly: isHourly,
        fromPackage: true
      };
    });
  
  payloadServices = [...payloadServices, ...pkgServices];
}

// ── 🔥🔥🔥 STEP 4: DEDUPLICATE MENUS ──
const seenMenuIds = new Set();
payloadMenus = payloadMenus.filter(m => {
  if (!m.menuId) return false;
  const id = String(m.menuId);
  if (seenMenuIds.has(id)) return false;
  seenMenuIds.add(id);
  return true;
});

// ── 🔥🔥🔥 STEP 5: DEDUPLICATE SERVICES ──
const seenServiceIds = new Set();
payloadServices = payloadServices.filter(s => {
  if (!s.serviceId) return false;
  const id = String(s.serviceId);
  if (seenServiceIds.has(id)) return false;
  seenServiceIds.add(id);
  return true;
});

console.log('📊 Final Menus:', payloadMenus.length);
console.log('📊 Final Services:', payloadServices.length);

    // ── 🔥 STEP 6: Payment Status ──
    const finalTotalAmount = Number(form.totalAmount);
    const paidAmount = Number(form.advanceAmount || 0);
    const dueAmountCalc = Math.max(0, finalTotalAmount - paidAmount);
    
    let paymentStatus = 'pending';
    if (dueAmountCalc <= 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'pending';
    }

    // ── 🔥 STEP 7: Final Payload ──
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
      hallChargeMode: form.hallChargeMode,
      isMealIncluded: form.isMealIncluded,
      totalAmount: Number(form.totalAmount),
      paidAmount: paidAmount,
      advanceAmount: paidAmount,
      dueAmount: dueAmountCalc,
      discount: Number(discountAmount),
      taxEnabled: form.taxEnabled,
      taxRateId: form.taxEnabled && activeTaxRates.length > 0 ? activeTaxRates[0].id : null,
      taxRate: taxRatePercent,
      taxAmount: Number(taxAmount),
      paymentMode: paidAmount > 0 ? form.paymentMode : null,
      status: form.status,
      paymentStatus: paymentStatus,
      branchId: parseInt(branchId),
      companyId: parseInt(companyId),
      bankAccountId: paidAmount > 0 ? (form.bankAccountId ? parseInt(form.bankAccountId) : null) : null,
      packageTotal: Number(packageMealTotal || 0),
      selectedPackage: selectedPackage ? {
        id: selectedPackage.id,
        name: selectedPackage.name,
        eventType: selectedPackage.eventType || '',
        finalPrice: Number(selectedPackage.finalPrice || 0),
        baseTotal: Number(selectedPackage.baseTotal || 0),
        guestCount: Number(selectedPackage.guestCount || 0),
        menus: selectedPackage.menus || [],
        services: selectedPackage.services || []
      } : null,
      menus: payloadMenus,
      customItems: form.customItems.map(i => ({
        itemId: i.itemId || null,
        itemName: i.itemName,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        totalPrice: Number(i.totalPrice) || 0,
        unit: i.unit || 'pcs',
        notes: i.displayNote || i.note || null
      })),
      services: payloadServices
    };
    
    console.log('📤 FINAL PAYLOAD:', payload);
    
    const res = await bookingApi.create(payload);
    if (res.data?.success || res.data?.id) {
      toast.success('Booking created successfully!');
      navigate('/bookings');
    } else {
      toast.error(res.data?.message || 'Failed to create booking');
    }
  } catch (err) {
    console.error('Create booking error:', err);
    toast.error(err.response?.data?.message || err.message || 'Server error');
  } finally {
    setLoading(false);
  }
};

  /* ─────────────────── INLINE FORM COMPONENT ─────────────────── */
  const InlineForm = () => {
    const { type, mode, data } = inlineModal;
    const isEdit = mode === 'edit';

    const [localForm, setLocalForm] = useState(() => {
      if (type === 'menu') return {
        name: data?.name || '', price: data?.price || '', unit: data?.unit || 'plate',
        category: data?.category || '', branchId, companyId
      };
      if (type === 'item') return {
        name: data?.name || '', salePrice: data?.salePrice || '', price: data?.price || '',
        unit: data?.unit || 'pcs', isBulkUnit: data?.isBulkUnit || false,
        conversionRate: data?.conversionRate || '', subUnitName: data?.subUnitName || 'plate',
        branchId, companyId
      };
      if (type === 'service') return {
        name: data?.name || '', price: data?.price || '', description: data?.description || '',
        branchId, companyId
      };
      if (type === 'event') return {
        name: data?.name || '', branchId, companyId
      };
      if (type === 'package') return {
        name: data?.name || '', code: data?.code || '', eventType: data?.eventType || '',
        guestCount: data?.guestCount || '', baseTotal: data?.baseTotal || '',
        discountPercent: data?.discountPercent || 0, finalPrice: data?.finalPrice || '',
        status: data?.status || 'Active', branchId, companyId
      };
      return {};
    });

    const handleSave = () => {
      if (!localForm.name) {
        toast.error('Name is required');
        return;
      }
      handleInlineSave(type, localForm);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-2xl border" style={{ borderColor: '#CBD5E1' }}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#CBD5E1' }}>
            <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
              {isEdit ? 'Edit' : 'New'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </h2>
            <button onClick={closeInlineModal} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Name *</label>
              <input value={localForm.name} onChange={e => setLocalForm({ ...localForm, name: e.target.value })}
                className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
            </div>

            {type === 'menu' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Price (Rs)</label>
                    <input type="number" value={localForm.price} onChange={e => setLocalForm({ ...localForm, price: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Unit</label>
                    <input value={localForm.unit} onChange={e => setLocalForm({ ...localForm, unit: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Category</label>
                  <input value={localForm.category} onChange={e => setLocalForm({ ...localForm, category: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                </div>
              </>
            )}

            {type === 'item' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Sale Price (Rs)</label>
                    <input type="number" value={localForm.salePrice} onChange={e => setLocalForm({ ...localForm, salePrice: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Unit</label>
                    <input value={localForm.unit} onChange={e => setLocalForm({ ...localForm, unit: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}>
                  <input type="checkbox" checked={localForm.isBulkUnit} onChange={e => setLocalForm({ ...localForm, isBulkUnit: e.target.checked })}
                    className="w-5 h-5 accent-[#2563EB]" />
                  <span className="text-sm font-bold text-gray-700">Is Bulk Unit (e.g., Degh)</span>
                </div>
                {localForm.isBulkUnit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Conversion Rate</label>
                      <input type="number" value={localForm.conversionRate} onChange={e => setLocalForm({ ...localForm, conversionRate: e.target.value })}
                        className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Sub Unit Name</label>
                      <input value={localForm.subUnitName} onChange={e => setLocalForm({ ...localForm, subUnitName: e.target.value })}
                        className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                    </div>
                  </div>
                )}
              </>
            )}

            {type === 'service' && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Price (Rs)</label>
                  <input type="number" value={localForm.price} onChange={e => setLocalForm({ ...localForm, price: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Description</label>
                  <textarea value={localForm.description} onChange={e => setLocalForm({ ...localForm, description: e.target.value })}
                    rows={2} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" style={{ borderColor: '#CBD5E1' }} />
                </div>
              </>
            )}

            {type === 'package' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Code</label>
                    <input value={localForm.code} onChange={e => setLocalForm({ ...localForm, code: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Event Type</label>
                    <input value={localForm.eventType} onChange={e => setLocalForm({ ...localForm, eventType: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Guest Count</label>
                    <input type="number" value={localForm.guestCount} onChange={e => setLocalForm({ ...localForm, guestCount: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Final Price</label>
                    <input type="number" value={localForm.finalPrice} onChange={e => setLocalForm({ ...localForm, finalPrice: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
            <button onClick={closeInlineModal} className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB]">
              {isEdit ? 'Update' : 'Create'} {type}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────────── RENDER ─────────────────── */
  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
        <p className="mt-4 text-sm font-bold" style={{ color: '#334155' }}>Loading booking data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#334155' }} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Create New Booking</h1>
                  <p className="text-xs font-medium" style={{ color: '#475569' }}>Hall + Package + Menu + Custom | Inline Edit</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrintA4} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-all" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                <Printer size={16} /> Print A4
              </button>
              <button onClick={handlePrintThermal} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-all" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
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
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: '#2563EB' }} />
                <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Customer Directory</h2>
              </div>
              <button type="button" onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all hover:scale-105"
                style={{ borderColor: '#2563EB', color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.05)' }}>
                <UserPlus size={14} /> {showNewCustomerForm ? 'Select Existing' : '+ New Customer'}
              </button>
            </div>
            <div className="p-5">
              {!showNewCustomerForm ? (
                <div className="space-y-4">
                  <ReactSelect
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    options={customers.map(c => ({
                      value: String(c.id),
                      label: c.businessName ? `${c.businessName} (${c.name})` : `${c.name} — ${c.phone}${c.city ? ` | ${c.city}` : ''}`
                    }))}
                    placeholder="Select Registered Customer"
                    isSearchable={true}
                    isClearable={true}
                  />
                  {selectedCustomer && (
                    <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                      {selectedCustomer.customerType && selectedCustomer.customerType !== 'individual' && (
                        <div className="pb-2 border-b border-dashed border-gray-300">
                          <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{selectedCustomer.customerType}</span>
                          <p className="font-bold text-blue-900 mt-1">{selectedCustomer.businessName}</p>
                          {selectedCustomer.contactPersonName && (
                            <p className="text-xs text-gray-600">Contact: {selectedCustomer.contactPersonName} {selectedCustomer.contactPersonPhone && `— ${selectedCustomer.contactPersonPhone}`}</p>
                          )}
                        </div>
                      )}
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
                        <div className="pt-2 border-t" style={{ borderColor: '#CBD5E1' }}>
                          <span className="text-gray-500 text-xs font-bold">Emergency Contacts</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedCustomer.emergencyContacts.map((ec, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: '#CBD5E1' }}>
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
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#334155' }}>Customer Type *</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { key: 'individual', label: 'Individual', icon: Users },
                        { key: 'organization', label: 'Organization', icon: Building2 },
                      ].map(type => (
                        <label key={type.key} className={`cursor-pointer border-2 rounded-xl p-2 text-center transition-all ${newCustomer.customerType === type.key ? 'border-[#2563EB] bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          <input type="radio" name="newCustType" className="hidden" checked={newCustomer.customerType === type.key} onChange={() => setNewCustomer({ ...newCustomer, customerType: type.key })} />
                          <type.icon size={14} className="mx-auto mb-1" style={{ color: newCustomer.customerType === type.key ? '#2563EB' : '#9CA3AF' }} />
                          <span className="text-[10px] font-bold block">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Full Name *" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                    <input type="tel" placeholder="Phone *" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} maxLength={11} inputMode="numeric" className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" placeholder="CNIC" value={newCustomer.cnic} onChange={e => setNewCustomer({ ...newCustomer, cnic: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" placeholder="City" value={newCustomer.city} onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                  </div>

                  {newCustomer.customerType !== 'individual' && (
                    <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 size={16} className="text-blue-700" />
                        <span className="text-xs font-bold text-blue-900 uppercase">Organization Details</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" placeholder="Business / Org Name *" value={newCustomer.businessName} onChange={e => setNewCustomer({ ...newCustomer, businessName: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ borderColor: '#CBD5E1' }} />
                        <ReactSelect
                          value={newCustomer.businessType}
                          onChange={(val) => setNewCustomer({ ...newCustomer, businessType: val })}
                          options={[
                            { value: 'it_company', label: 'IT Company' },
                            { value: 'bank', label: 'Bank / Financial' },
                            { value: 'university', label: 'University / College' },
                            { value: 'ngo', label: 'NGO / Trust' },
                            { value: 'hospital', label: 'Hospital / Clinic' },
                            { value: 'govt_dept', label: 'Govt Department' },
                            { value: 'other', label: 'Other' }
                          ]}
                          placeholder="Select Business Type"
                          isSearchable={true}
                          isClearable={true}
                        />
                        <input type="text" placeholder="Billing Address" value={newCustomer.billingAddress} onChange={e => setNewCustomer({ ...newCustomer, billingAddress: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: '#CBD5E1' }} />
                      </div>
                      <div className="border-t border-blue-200 pt-3">
                        <span className="text-[11px] font-bold text-blue-900 uppercase block mb-2">Primary Contact Person</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" placeholder="Contact Name" value={newCustomer.contactPersonName} onChange={e => setNewCustomer({ ...newCustomer, contactPersonName: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                          <input type="tel" placeholder="Contact Phone" value={newCustomer.contactPersonPhone} onChange={e => setNewCustomer({ ...newCustomer, contactPersonPhone: e.target.value.replace(/\D/g, '').slice(0, 11) })} maxLength={11} inputMode="numeric" className="border rounded-xl px-3 py-2.5 text-sm font-mono" style={{ borderColor: '#CBD5E1' }} />
                          <input type="text" placeholder="Designation" value={newCustomer.contactPersonDesignation} onChange={e => setNewCustomer({ ...newCustomer, contactPersonDesignation: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="number" placeholder="Credit Limit (Rs)" value={newCustomer.creditLimit} onChange={e => setNewCustomer({ ...newCustomer, creditLimit: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                        <ReactSelect
                          value={newCustomer.paymentTerms}
                          onChange={(val) => setNewCustomer({ ...newCustomer, paymentTerms: val })}
                          options={[
                            { value: 'immediate', label: 'Immediate' },
                            { value: 'net15', label: 'Net 15 Days' },
                            { value: 'net30', label: 'Net 30 Days' },
                            { value: 'net60', label: 'Net 60 Days' }
                          ]}
                          placeholder="Select Payment Terms"
                          isSearchable={true}
                          isClearable={false}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Emergency Contact Persons (2 Recommended)</p>
                    {newCustomer.emergencyContacts.map((ec, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder={`Contact ${idx + 1} Name`} value={ec.name}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].name = e.target.value; setNewCustomer({ ...newCustomer, emergencyContacts: updated }); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#CBD5E1' }} />
                        <input type="text" placeholder="Relation" value={ec.relation}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].relation = e.target.value; setNewCustomer({ ...newCustomer, emergencyContacts: updated }); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#CBD5E1' }} />
                        <input type="tel" placeholder="Phone Number" value={ec.phone}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].phone = e.target.value.replace(/\D/g, '').slice(0, 11); setNewCustomer({ ...newCustomer, emergencyContacts: updated }); }}
                          maxLength={11} inputMode="numeric"
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#CBD5E1' }} />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleCreateCustomer}
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>
                    <UserPlus size={14} className="inline mr-1" /> Register & Select Customer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Event & Hall Details ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
              <MapPin size={18} style={{ color: '#2563EB' }} />
              <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Event & Hall Details</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Event Type *</label>
                  <div className="flex gap-2">
                    <ReactSelect
                      value={form.eventType}
                      onChange={(val) => updateField('eventType', val)}
                      options={events.map(ev => ({ value: ev.name, label: ev.name }))}
                      placeholder="Select Event"
                      isSearchable={true}
                      isClearable={true}
                    />
                    <button type="button" onClick={() => openInlineModal('event', 'create')} className="px-3 py-2.5 rounded-xl border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#CBD5E1', color: '#2563EB' }} title="Add New Event">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Hall *</label>
                  <ReactSelect
                    value={form.hallId}
                    onChange={(val) => updateField('hallId', val)}
                    options={halls.map(h => {
                      const displayPrice = h.pricingType === 'per_seat'
                        ? `${Number(h.perSeatPrice || h.price || 0).toLocaleString()}/seat`
                        : `Rs ${Number(h.price || 0).toLocaleString()}`;
                      return {
                        value: String(h.id),
                        label: `${h.name} (Cap: ${h.capacity}) — ${displayPrice}`
                      };
                    })}
                    placeholder="Select Hall"
                    isSearchable={true}
                    isClearable={true}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Event Date *</label>
                  <input type="date" value={form.eventDate} onChange={e => updateField('eventDate', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Start Time *</label>
                  <input type="time" value={form.startTime} onChange={e => updateField('startTime', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>End Time *</label>
                  <input type="time" value={form.endTime} onChange={e => updateField('endTime', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Expected Guests *</label>
                  <input type="number" min="1" value={form.guestCount} onChange={e => updateField('guestCount', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Actual Guests</label>
                  <input type="number" min="0" value={form.actualGuestCount} onChange={e => updateField('actualGuestCount', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Booking Title</label>
                  <input type="text" placeholder="e.g. Walima - Ali UniSoft" value={form.title} onChange={e => updateField('title', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                </div>
              </div>

              {slotInfo.message && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${slotInfo.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                  slotInfo.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                  <AlertCircle size={18} /> <span>{slotInfo.message}</span>
                </div>
              )}

              {selectedHall && (
                <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} style={{ color: '#2563EB' }} />
                      <span className="font-bold text-sm text-gray-800">Hall Pricing Mode</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-blue-100 text-blue-700">
                      Capacity: {hallCapacity} | Remaining: {slotInfo.remaining}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer border-2 rounded-xl p-3 transition-all ${form.hallChargeMode === 'per_seat' ? 'border-[#2563EB] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input type="radio" name="hallChargeMode" checked={form.hallChargeMode === 'per_seat'} onChange={() => updateField('hallChargeMode', 'per_seat')} className="accent-[#2563EB]" />
                        <Armchair size={16} style={{ color: '#2563EB' }} />
                        <span className="font-bold text-sm">Per Seat</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">Rs {Number(selectedHall.perSeatPrice || selectedHall.price || 0).toLocaleString()} × {form.guestCount || 0} guests</p>
                      <p className="text-sm font-bold ml-6 mt-1" style={{ color: '#2563EB' }}>= {formatCurrency(Number(selectedHall.perSeatPrice || selectedHall.price || 0) * (Number(form.guestCount) || 0))}</p>
                    </label>
                    <label className={`cursor-pointer border-2 rounded-xl p-3 transition-all ${form.hallChargeMode === 'full_hall' ? 'border-[#2563EB] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input type="radio" name="hallChargeMode" checked={form.hallChargeMode === 'full_hall'} onChange={() => updateField('hallChargeMode', 'full_hall')} className="accent-[#2563EB]" />
                        <BoxSelect size={16} style={{ color: '#2563EB' }} />
                        <span className="font-bold text-sm">Full Hall (Fixed)</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">Fixed charge regardless of guests</p>
                      <p className="text-sm font-bold ml-6 mt-1" style={{ color: '#2563EB' }}>= {formatCurrency(Number(selectedHall.price || 0))}</p>
                    </label>
                  </div>
                  <div className={`mt-3 text-xs font-bold text-center py-2 rounded-lg ${slotInfo.remaining === 0 ? 'bg-red-100 text-red-700' :
                    slotInfo.remaining <= hallCapacity * 0.2 ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                    {slotInfo.remaining === 0 ? '🚫 No seats remaining' :
                      slotInfo.remaining === hallCapacity ? `✅ All ${hallCapacity} seats available` :
                        `🪑 ${slotInfo.remaining} of ${hallCapacity} seats remaining`}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center p-4 rounded-xl border" style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
                <Flame size={20} className="mr-3" style={{ color: '#2563EB' }} />
                <div className="flex-1">
                  <span className="font-bold text-sm text-gray-800 block">Meal Inclusion Mode</span>
                  <span className="text-xs text-gray-600">
                    {form.isMealIncluded ? 'Catering meals & dishes will be tracked with full pricing' : 'Space-only booking. Hall + Services only.'}
                  </span>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input type="radio" checked={form.isMealIncluded} onChange={() => toggleMealIncluded(true)} className="accent-[#2563EB]" /> With Meal
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input type="radio" checked={!form.isMealIncluded} onChange={() => toggleMealIncluded(false)} className="accent-[#2563EB]" /> Space Only
                  </label>
                </div>
              </div>
            </div>
          </div>

          {form.isMealIncluded && (
            <div className="bg-white rounded-2xl border p-1.5 flex gap-1.5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              {[
                { key: 'package', label: 'Package', icon: Package },
                { key: 'menu', label: 'Menu', icon: Utensils },
                { key: 'custom', label: 'Custom Items', icon: Settings }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setMode(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === tab.key ? 'text-white shadow-md' : 'text-gray-600 hover:bg-amber-50'}`}
                  style={mode === tab.key ? { background: 'linear-gradient(135deg, #1E40AF, #2563EB)' } : {}}>
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ── PACKAGE MODE (Collapsible Details) ── */}
          {form.isMealIncluded && mode === 'package' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <div className="px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
                <div className="flex items-center gap-2">
                  <Package size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Select & Customize Package</h2>
                  {form.selectedPackageId && <span className="text-xs px-2.5 py-0.5 rounded-lg font-bold bg-green-100 text-green-700 ml-2">Active Package</span>}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2563EB' }} />
                    <input type="text" placeholder="Search packages..." value={packageSearch} onChange={e => setPackageSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                  </div>
                  <button type="button" onClick={() => openInlineModal('package', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50 shrink-0" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="p-3.5 max-h-[320px] overflow-y-auto space-y-3">
                {packages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-3">No packages found.</p>
                    <button type="button" onClick={() => openInlineModal('package', 'create')} className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#2563EB] to-[#2563EB]">Create Package</button>
                  </div>
                ) : filteredPackages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No packages match your search.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredPackages.map(pkg => {
                      const isSelected = form.selectedPackageId === pkg.id;
                      const isDetailsOpen = expandedMenus[`pkg-${pkg.id}`] || false;

                      return (
                        <div key={pkg.id}
                          className={`border-2 rounded-2xl p-5 transition-all ${isSelected ? 'border-[#2563EB] bg-amber-50/40 shadow-md ring-1 ring-[#2563EB]' : 'border-gray-200 bg-white hover:border-[#D4A855]'}`}>

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-gray-800">{pkg.name}</h4>
                                <span className="text-xs px-2.5 py-0.5 rounded-lg font-mono bg-gray-100 text-gray-700">Code: {pkg.code || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800">{pkg.eventType || 'General'}</span>
                                {(() => {
                                  const totalGuests = (pkg.menus || []).reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);
                                  return <span className="text-xs text-gray-500 font-medium">👥 {totalGuests} Guests Standard</span>;
                                })()}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                              <span className="font-extrabold text-lg text-[#2563EB]">{formatCurrency(pkg.finalPrice || pkg.baseTotal || 0)}</span>
                              <button type="button" onClick={() => selectPackage(pkg)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${isSelected ? 'bg-green-600 text-white' : 'bg-[#2563EB] text-white hover:bg-[#8e6518]'}`}>
                                {isSelected ? '✓ Selected' : 'Select Package'}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); navigate('/menus/packages'); }} className="p-2 rounded-xl border hover:bg-gray-50 text-[#2563EB]" style={{ borderColor: '#CBD5E1' }} title="Go to Package Management">
                                <Edit3 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Toggle Details Button */}
                          <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setExpandedMenus(prev => ({ ...prev, [`pkg-${pkg.id}`]: !isDetailsOpen }))}
                              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
                            >
                              {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isDetailsOpen ? 'Hide Menu & Service Details' : '🔍 Show Details (Menus & Services)'}
                            </button>
                            <span className="text-[11px] text-gray-400 italic">
                              {pkg.menus?.length || 0} Menus | {pkg.services?.length || 0} Services
                            </span>
                          </div>

                          {/* Expandable Details Box */}
                          {isDetailsOpen && (
                            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                              <div className="p-3.5 rounded-xl border bg-white/80 space-y-2" style={{ borderColor: '#CBD5E1' }}>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                  <Utensils size={14} className="text-[#2563EB]" /> Included Menus & Items
                                </span>
                                {pkg.menus && pkg.menus.length > 0 ? (
                                  <div className="space-y-2 mt-2">
                                    {pkg.menus.map((m, mIdx) => {
                                      const combinedItems = getMenuDetailedItemsWithQty(m, menus);
                                      const targetMenu = menus.find(x => x.id === Number(m.menuId || m.id));
                                      const menuTotalPrice = m.totalPrice || (m.price * (m.quantity || 1)) || targetMenu?.totalSalePrice || 0;

                                      return (
                                        <div key={mIdx} className="text-xs p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 space-y-1">
                                          <div className="flex justify-between font-bold text-gray-800">
                                            <span>{m.name || m.menuName || targetMenu?.name || `Menu`}</span>
                                            <span className="text-[#2563EB]">{formatCurrency(menuTotalPrice)}</span>
                                          </div>
                                          {combinedItems.length > 0 ? (
                                            <div className="pl-2 border-l-2 border-[#2563EB]/40 text-gray-600 text-[11px] space-y-0.5 mt-1">
                                              {combinedItems.map((subItem, sIdx) => {
                                                const q = subItem.quantityPerHead ?? subItem.quantity ?? subItem.qty ?? subItem.pivot?.quantity ?? 1;
                                                const price = subItem.price || subItem.salePrice || subItem.unitPrice || 0;
                                                const total = q * price;
                                                return (
                                                  <div key={sIdx} className="flex justify-between items-center">
                                                    <span>• {subItem.name || subItem.itemName}</span>
                                                    <div className="flex items-center gap-3">
                                                      <span className="font-mono text-gray-500">{q} {subItem.unit || 'plate'}</span>
                                                      <span className="font-mono text-[#2563EB] font-bold">{formatCurrency(price)}</span>
                                                      {q > 1 && (
                                                        <span className="font-mono text-xs text-gray-400">= {formatCurrency(total)}</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-gray-400 italic pl-2">No items found in this menu</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic mt-1">No menus attached.</p>
                                )}
                              </div>

                              <div className="p-3.5 rounded-xl border bg-white/80 space-y-2" style={{ borderColor: '#CBD5E1' }}>
  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
    <Sparkles size={14} className="text-[#2563EB]" /> Included Services
  </span>
 {pkg.services && pkg.services.length > 0 ? (
  <div className="space-y-1.5 mt-2">
    {pkg.services.map((srv, sIdx) => {
      // 🔥 FIX: Total price properly calculate karein
      const unitPrice = Number(srv.salePrice || srv.price || srv.unitPrice || 0);
      const qty = Number(srv.quantity || srv.qty || 1);
      const hours = Number(srv.hours || 1);
      const isHourly = srv.pricingType === 'HOURLY';
      
      // 🔥 HOURLY: total = qty * hours * unitPrice
      // 🔥 FIXED: total = qty * unitPrice
      let totalPrice = Number(srv.totalPrice || 0);
      if (totalPrice === 0) {
        totalPrice = isHourly ? (qty * hours * unitPrice) : (qty * unitPrice);
      }
      
      // Display label with details
      let displayLabel = srv.name || srv.serviceName;
      if (isHourly) {
        displayLabel = `${srv.name || srv.serviceName} (${qty} × ${hours}h)`;
      } else if (qty > 1) {
        displayLabel = `${srv.name || srv.serviceName} (×${qty})`;
      }
      
      return (
        <div key={sIdx} className="text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 flex justify-between items-center">
          <span className="font-semibold text-gray-800">
            {displayLabel}
            {isHourly && (
              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">/hr</span>
            )}
          </span>
          <span className="font-bold text-[#2563EB]">{formatCurrency(totalPrice)}</span>
        </div>
      );
    })}
  </div>
) : (
  <p className="text-xs text-gray-400 italic mt-1">No extra services included.</p>
)}
</div>
                            </div>
                          )}

                          {isSelected && (
                            <div className="mt-3 p-2.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 font-medium flex items-center justify-between">
                              <span>✨ Package active! You can add extra custom items or menus below at runtime if needed.</span>
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

          {/* ── MENU MODE with Collapsible Dishes & Items Toggle ── */}
          {form.isMealIncluded && mode === 'menu' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
                <div className="flex items-center gap-2">
                  <Utensils size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Select Saved Menus</h2>
                  {form.selectedMenus.length > 0 && <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-green-100 text-green-700 ml-2">{form.selectedMenus.length} selected</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2563EB' }} />
                    <input type="text" placeholder="Search menus..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                  </div>
                  <button type="button" onClick={() => openInlineModal('menu', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 max-h-96 overflow-y-auto">
                {menus.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-3">No menus found.</p>
                    <button type="button" onClick={() => openInlineModal('menu', 'create')} className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#2563EB] to-[#2563EB]">Create Menu</button>
                  </div>
                ) : filteredMenus.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No menus match your search.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredMenus.map(menu => {
                      const selected = form.selectedMenus.find(m => m.menuId === menu.id);
                      const menuItems = extractMenuDetailedItems(menu);
                      const isMenuDescOpen = expandedMenus[`menu-${menu.id}`] || false;

                      return (
                        <div key={menu.id} className={`border rounded-xl p-4 transition-all ${selected ? 'border-[#2563EB] bg-amber-50/30' : 'border-gray-200 hover:border-[#D4A855]'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <input type="checkbox" checked={!!selected} onChange={() => toggleMenu(menu)} className="w-5 h-5 rounded focus:ring-[#2563EB] shrink-0" style={{ accentColor: '#2563EB' }} />
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800">{menu.name}</p>
                                <p className="text-sm text-gray-500">{formatCurrency(menu.price || menu.salePrice || menu.totalSalePrice)} / {menu.unit || 'plate'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" onClick={() => navigate('/menus/add')} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700" title="Go to Menu Management">
                                <Edit3 size={14} />
                              </button>
                              {selected && (
                                <>
                                  <label className="text-sm text-gray-600">Qty:</label>
                                  <input type="number" min="1" value={selected.quantity} onChange={(e) => updateMenuQty(menu.id, e.target.value)}
                                    className="w-20 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" style={{ borderColor: '#CBD5E1' }} />
                                  <span className="text-sm font-bold w-20 text-right" style={{ color: '#2563EB' }}>{formatCurrency(selected.totalPrice)}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Toggle Button for Menu Items/Dishes */}
                          {menuItems.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedMenus(prev => ({ ...prev, [`menu-${menu.id}`]: !isMenuDescOpen }));
                                }}
                                className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                              >
                                {isMenuDescOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {isMenuDescOpen ? 'Hide Dishes & Items' : `Show Dishes & Items (${menuItems.length})`}
                              </button>
                            </div>
                          )}

                          {/* Expandable Dishes Box */}
                          {isMenuDescOpen && menuItems.length > 0 && (
                            <div className="mt-2 pl-2 pt-2 border-t border-amber-100 space-y-1 animate-in fade-in duration-200">
                              <div className="flex flex-wrap gap-1">
                                {menuItems.map((item, idx) => {
                                  const itemQty = item.quantityPerHead ?? item.quantity ?? item.qty ?? 1;
                                  const price = item.price || item.salePrice || item.unitPrice || 0;
                                  return (
                                    <span key={idx} className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                                      <span>• {item.name || item.itemName}</span>
                                      <span className="text-gray-500">({itemQty} {item.unit || 'plate'})</span>
                                      <span className="font-mono text-[#2563EB] font-bold">@{formatCurrency(price)}</span>
                                    </span>
                                  );
                                })}
                              </div>
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
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
                <div className="flex items-center gap-2">
                  <Settings size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Add Custom Items</h2>
                </div>
                <button type="button" onClick={() => openInlineModal('item', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                  <Plus size={16} /> New Item
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <ReactSelect
                    value={customCatFilter}
                    onChange={(val) => setCustomCatFilter(val || '')}
                    options={[
                      { value: '', label: '📂 All Categories (Filter)' },
                      ...customItemCategories
                    ]}
                    placeholder="Filter by Category"
                    isSearchable={true}
                    isClearable={true}
                  />

                  <ReactSelect
                    value={customItemSelectValue}
                    onChange={(val) => {
                      if (!val) return;
                      const item = items.find(i => i.id === parseInt(val));
                      if (item) {
                        addCustomItem(item);
                        setCustomItemSelectValue('');
                      }
                    }}
                    options={filteredCustomItemsList.map(item => {
                      const alreadyAdded = form.customItems.some(i => i.itemId === item.id);
                      const isBulk = item.isBulkUnit === true || (item.unit && item.unit.toLowerCase().includes('degh'));
                      const rate = parseFloat(item.conversionRate);
                      const perPlate = isBulk && rate > 0 ? (Number(item.salePrice || item.price || 0) / rate) : Number(item.salePrice || item.price || 0);
                      const catLabel = item.category?.name ? ` [${item.category.name}]` : '';
                      return {
                        value: String(item.id),
                        label: `${alreadyAdded ? '✓ ' : ''}${item.name}${catLabel} — ${isBulk ? `${formatCurrency(item.salePrice || item.price)}/${item.unit} (${rate || '?'} plates = ${formatCurrency(perPlate)}/plate)` : formatCurrency(item.salePrice || item.price)}`,
                        isDisabled: alreadyAdded
                      };
                    })}
                    placeholder={customCatFilter ? "➕ Select item from category..." : "➕ Select an item to add..."}
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>

                {form.customItems.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    {form.customItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.unit} @ {formatCurrency(item.unitPrice)}</p>
                          {item.displayNote && <p className="text-[10px] text-gray-400 italic">{item.displayNote}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateCustomItem(idx, 'quantity', e.target.value)}
                            className="w-16 border rounded-lg px-2 py-1 text-sm text-center" style={{ borderColor: '#CBD5E1' }} />
                          <span className="font-bold text-sm text-[#2563EB] w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                          <button type="button" onClick={() => removeCustomItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

     {/* ── EXTRA SERVICES (Like Package Management) ── */}
{/* ── EXTRA SERVICES ── */}
<div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
  <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
    <div className="flex items-center gap-2">
      <Tag size={18} style={{ color: '#2563EB' }} />
      <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Additional Services</h2>
      {/* 🔥 Sirf extra services count karein (fromPackage = false) */}
      {form.services.filter(s => !s.fromPackage).length > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 ml-2">
          {form.services.filter(s => !s.fromPackage).length} selected
        </span>
      )}
      {/* 🔥 Package services count bhi dikhayein */}
      {form.services.filter(s => s.fromPackage).length > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 ml-1">
          {form.services.filter(s => s.fromPackage).length} from package
        </span>
      )}
    </div>
    <button type="button" onClick={() => openInlineModal('service', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
      <Plus size={16} /> New Service
    </button>
  </div>
  <div className="p-4">
    {servicesList.length === 0 ? (
      <div className="text-center py-4">
        <p className="text-gray-400 text-sm mb-3">No services configured.</p>
        <button type="button" onClick={() => openInlineModal('service', 'create')} className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#2563EB] to-[#2563EB]">Create Service</button>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {servicesList.map(s => {
          // 🔥 Check if service is selected (from package OR extra)
          const isSelected = form.services.some(item => item.serviceId === s.id);
          const selected = form.services.find(item => item.serviceId === s.id);
          const isFromPackage = selected?.fromPackage || false;
          const isDescOpen = expandedMenus[`service-${s.id}`] || false;
          const srvPrice = Number(s.salePrice || s.price || s.unitPrice || 0);
          const isHourly = s.pricingType === 'HOURLY';

          return (
            <div 
              key={s.id} 
              className={`p-3 rounded-xl border transition-all ${
                isSelected 
                  ? isFromPackage 
                    ? 'bg-green-50/70 border-green-500 shadow-sm ring-1 ring-green-500' 
                    : 'bg-amber-50/70 border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onClick={() => toggleService(s)}>
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => {}} 
                    className="w-4 h-4 rounded shrink-0 cursor-pointer" 
                    style={{ accentColor: isFromPackage ? '#22C55E' : '#2563EB' }} 
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                      {s.name}
                      {isFromPackage && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold border border-green-200">
                          📦 Package
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-[#2563EB]">{formatCurrency(srvPrice)}</span>
                      {isHourly && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">/hr</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {s.description && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedMenus(prev => ({ ...prev, [`service-${s.id}`]: !isDescOpen }));
                      }}
                      className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 hover:bg-amber-100"
                    >
                      {isDescOpen ? 'Hide Info' : 'ℹ️ Info'}
                    </button>
                  )}
                  {!isFromPackage && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); openInlineModal('service', 'edit', s); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-amber-50 text-amber-700" title="Edit Service">
                      <Edit3 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {isDescOpen && s.description && (
                <p className="text-[11px] text-gray-600 mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200 animate-in fade-in duration-200">
                  {s.description}
                </p>
              )}

              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/60 space-y-2">
                  {/* ── Qty ── */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500">Qty:</span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const currentQty = selected?.quantity || 1;
                          if (currentQty > 1) updateServiceQty(s.id, currentQty - 1);
                        }} 
                        className={`w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50 ${isFromPackage ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        style={{ borderColor: '#CBD5E1' }}
                        disabled={isFromPackage}
                      >
                        −
                      </button>
                      <span className="font-mono font-bold text-xs w-6 text-center">{selected?.quantity || 1}</span>
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          updateServiceQty(s.id, (selected?.quantity || 1) + 1);
                        }} 
                        className={`w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50 ${isFromPackage ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        style={{ borderColor: '#CBD5E1' }}
                        disabled={isFromPackage}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ── Hours (Only for Hourly Services) ── */}
                  {isHourly && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500">Hours:</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const currentHours = selected?.hours || 1;
                            if (currentHours > 1) updateServiceHours(s.id, currentHours - 1);
                          }} 
                          className={`w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50 ${isFromPackage ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          style={{ borderColor: '#CBD5E1' }}
                          disabled={isFromPackage}
                        >
                          −
                        </button>
                        <span className="font-mono font-bold text-xs w-6 text-center">{selected?.hours || 1}</span>
                        <button 
                          type="button" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            updateServiceHours(s.id, (selected?.hours || 1) + 1);
                          }} 
                          className={`w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50 ${isFromPackage ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          style={{ borderColor: '#CBD5E1' }}
                          disabled={isFromPackage}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Total ── */}
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                    <span className="text-[10px] font-bold text-gray-500">Total:</span>
                    <span className="font-mono text-sm font-bold text-[#2563EB]">
                      {formatCurrency(selected?.totalPrice || 0)}
                      {isHourly && (
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({selected?.quantity || 1} × {selected?.hours || 1}h)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>

          {/* ── ATTACHMENTS ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
              <Upload size={18} style={{ color: '#2563EB' }} />
              <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Attachments</h2>
            </div>
            <div className="p-5">
              <div className="border-2 border-dashed rounded-xl p-6 text-center transition-all hover:border-[#2563EB]" style={{ borderColor: '#CBD5E1' }}>
                <input type="file" multiple onChange={handleFileChange} className="hidden" id="attachment-input" />
                <label htmlFor="attachment-input" className="cursor-pointer">
                  <Upload size={32} className="mx-auto mb-2" style={{ color: '#D4A855' }} />
                  <p className="text-gray-600 text-sm font-medium">Click to upload guest list, documents, etc.</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Excel, Word, Images accepted</p>
                </label>
              </div>
              {form.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {form.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} style={{ color: '#2563EB' }} />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all shrink-0"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT COLUMN (1/3) ═══════ */}
        <div className="space-y-6">

          {/* ── Financial Summary ── */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
              <Receipt size={20} style={{ color: '#2563EB' }} /> Financial Summary
            </h3>

            <div className="space-y-3 text-sm">
  {/* ── Hall Rent (Hamesha alag) ── */}
  {selectedHall && (
    <div className="flex justify-between text-gray-600">
      <span className="flex items-center gap-1.5">
        <Building2 size={14} />
        Hall Rent {form.hallChargeMode === 'per_seat' ? `(×${form.guestCount})` : '(Fixed)'}
      </span>
      <span className="font-mono font-medium">{formatCurrency(hallPrice)}</span>
    </div>
  )}

  {/* ── Package (if selected) ── */}
  {form.isMealIncluded && selectedPackage && (
    <div className="flex justify-between text-gray-600 border-t pt-2" style={{ borderColor: '#CBD5E1' }}>
      <span className="flex items-center gap-1.5"><Package size={14} /> Package</span>
      <span className="font-mono font-medium">{formatCurrency(packageMealTotal)}</span>
    </div>
  )}

  {/* ── Extra Menus (jo package se nahi hain) ── */}
  {form.isMealIncluded && form.selectedMenus.filter(m => !m.fromPackage).length > 0 && (
    <div className="flex justify-between text-gray-600">
      <span className="flex items-center gap-1.5"><Utensils size={14} /> Extra Menus ({form.selectedMenus.filter(m => !m.fromPackage).length})</span>
      <span className="font-mono font-medium">
        {formatCurrency(form.selectedMenus.filter(m => !m.fromPackage).reduce((sum, m) => sum + Number(m.totalPrice || 0), 0))}
      </span>
    </div>
  )}

  {/* ── Custom Items ── */}
  {form.isMealIncluded && form.customItems.length > 0 && (
    <div className="flex justify-between text-gray-600">
      <span className="flex items-center gap-1.5"><Settings size={14} /> Custom Items ({form.customItems.length})</span>
      <span className="font-mono font-medium">{formatCurrency(customMealTotal)}</span>
    </div>
  )}

  {/* ── Extra Services (jo package se nahi hain) ── */}
  {form.services.filter(s => !s.fromPackage).length > 0 && (
    <div className="flex justify-between text-gray-600">
      <span className="flex items-center gap-1.5"><Tag size={14} /> Extra Services ({form.services.filter(s => !s.fromPackage).length})</span>
      <span className="font-mono font-medium">
        {formatCurrency(form.services.filter(s => !s.fromPackage).reduce((sum, s) => sum + Number(s.totalPrice || 0), 0))}
      </span>
    </div>
  )}

  {/* ── Subtotal ── */}
  <div className="border-t pt-2 flex justify-between text-gray-600" style={{ borderColor: '#CBD5E1' }}>
    <span>Subtotal</span>
    <span className="font-mono font-medium">{formatCurrency(baseTotal + discountAmount)}</span>
  </div>

  {/* ── Discount ── */}
  <div className="flex justify-between items-center text-gray-600">
    <span>Discount</span>
    <div className="flex items-center gap-2">
      <ReactSelect
        value={form.discountType}
        onChange={(val) => updateField('discountType', val)}
        options={[
          { value: 'percent', label: '%' },
          { value: 'fixed', label: 'Rs' }
        ]}
        placeholder="% / Rs"
        isSearchable={true}
        isClearable={false}
      />
      <input 
        type="number" 
        min="0" 
        value={form.discount} 
        onChange={e => updateField('discount', e.target.value)}
        className="w-20 border rounded-lg px-2 py-1 text-sm text-right font-mono" 
        style={{ borderColor: '#CBD5E1' }} 
      />
    </div>
  </div>

  {/* ── Discount Amount ── */}
  {discountAmount > 0 && (
    <div className="flex justify-between text-green-600 text-sm">
      <span>Discount Amount</span>
      <span className="font-mono font-medium">-{formatCurrency(discountAmount)}</span>
    </div>
  )}

  {/* ── Tax Toggle ── */}
  <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: '#CBD5E1' }}>
    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
      <input
        type="checkbox"
        checked={form.taxEnabled}
        onChange={(e) => updateField('taxEnabled', e.target.checked)}
        className="w-5 h-5 accent-[#2563EB]"
      />
      <Percent size={14} /> Apply Tax
    </label>
    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${form.taxEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {form.taxEnabled ? 'ON' : 'OFF'}
    </span>
  </div>

  {/* ── Tax Breakdown ── */}
  {taxBreakdown.length > 0 && taxBreakdown.map((tax, idx) => (
    <div key={tax.id || idx} className="flex justify-between text-gray-600 text-sm border-t pt-2" style={{ borderColor: '#CBD5E1' }}>
      <span className="flex items-center gap-1.5">
        <Percent size={14} /> Tax ({tax.name} @ {tax.percent}%)
      </span>
      <span className="font-mono font-medium">+{formatCurrency(tax.amount)}</span>
    </div>
  ))}

  {/* ── Grand Total ── */}
  <div className="flex justify-between text-lg font-bold border-t-2 pt-2" style={{ borderColor: '#CBD5E1', color: '#0F172A' }}>
    <span>Grand Total</span>
    <span className="font-mono text-lg" style={{ color: '#2563EB' }}>{formatCurrency(form.totalAmount || finalTotal || 0)}</span>
  </div>

  {/* ── Advance Payment ── */}
  <div className="flex justify-between items-center text-gray-600">
    <span className="flex items-center gap-1.5"><CreditCard size={14} /> Advance</span>
    <input 
      type="number" 
      min="0" 
      value={form.advanceAmount || 0} 
      onChange={e => {
        const val = parseFloat(e.target.value) || 0;
        updateField('advanceAmount', val);
      }}
      className="w-28 border rounded-lg px-2 py-1 text-sm text-right font-mono" 
      style={{ borderColor: '#CBD5E1' }} 
    />
  </div>

  {/* ── Due Balance ── */}
  <div className="flex justify-between font-bold rounded-xl px-3 py-2.5" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
    <span className="flex items-center gap-1.5"><AlertCircle size={16} /> Due Balance</span>
    <span className="font-mono text-base">{formatCurrency(dueAmount)}</span>
  </div>
</div>

            {/* ── Payment Mode ── */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: '#334155' }}>Payment Mode *</label>
              <ReactSelect
                value={form.paymentMode}
                onChange={(val) => {
                  // 🔥 Payment mode change hone par account reset karein
                  updateField('paymentMode', val);
                  updateField('bankAccountId', ''); // Account selection clear karein
                }}
                options={[
                  { value: 'Cash', label: '💵 Cash' },
                  { value: 'Bank Transfer', label: '🏦 Bank Transfer' },
                  { value: 'JazzCash / EasyPaisa', label: '📱 JazzCash / EasyPaisa' },
                  { value: 'Credit Card', label: '💳 Credit Card' },
                  { value: 'Cheque', label: '📄 Cheque' }
                ]}
                placeholder="Select Payment Mode"
                isSearchable={true}
                isClearable={false}
              />
            </div>

            {/* ── Bank Account (Filtered by Payment Mode) ── */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>
                Receive Payment In Account *
                {form.paymentMode && (
                  <span className="ml-2 text-[10px] font-normal text-gray-500">
                    ({form.paymentMode} accounts only)
                  </span>
                )}
              </label>

              <ReactSelect
  value={form.bankAccountId}
  onChange={(val) => updateField('bankAccountId', val)}
  options={(() => {
    // 🔥 Payment mode ke hisaab se accounts filter karein
    const modeToAccountType = {
      'Cash': 'CASH',
      'Bank Transfer': 'BANK',
      'JazzCash / EasyPaisa': 'JAZZCASH',
      'Credit Card': 'CREDIT',
      'Cheque': 'BANK'
    };

    const requiredType = form.paymentMode ? modeToAccountType[form.paymentMode] : null;
    
    // 🔥 FIX: filteredAccounts use karein jo safe hai
    let filtered = filteredAccounts;
    if (requiredType) {
      filtered = (bankAccounts || []).filter(acc => acc.accountType === requiredType);
    }

    return filtered.map(acc => ({
      value: String(acc.id),
      label: `${acc.bankName || acc.accountName || 'Account'} — ${acc.accountNumber || 'N/A'} (Bal: ${formatCurrency(acc.currentBalance || 0)})`
    }));
  })()}
  placeholder={
    form.paymentMode
      ? `Select ${form.paymentMode} Account`
      : '⚠️ First select Payment Mode'
  }
  isSearchable={true}
  isClearable={true}
  isDisabled={!form.paymentMode}
/>

              {/* ── Validation Messages ── */}
              {!form.paymentMode && (
                <div className="mt-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>Please select a <strong>Payment Mode</strong> first to see available accounts</span>
                  </p>
                </div>
              )}

              {form.paymentMode && (() => {
                const modeToAccountType = {
                  'Cash': 'CASH',
                  'Bank Transfer': 'BANK',
                  'JazzCash / EasyPaisa': 'JAZZCASH',
                  'Credit Card': 'CREDIT',
                  'Cheque': 'BANK'
                };
                const requiredType = modeToAccountType[form.paymentMode];
                const hasAccounts = bankAccounts.some(acc => acc.accountType === requiredType);

                if (!hasAccounts) {
                  return (
                    <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50">
                      <p className="text-xs text-red-600 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        <span>No <strong>{form.paymentMode}</strong> account found! Please create one in <strong>Settings → Chart of Accounts</strong></span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* ── Selected Account Badge ── */}
              {form.bankAccountId && form.paymentMode && (() => {
                const selectedAcc = bankAccounts.find(acc => String(acc.id) === String(form.bankAccountId));
                if (!selectedAcc) return null;

                const accountTypeColors = {
                  'CASH': { bg: '#FEF3C7', text: '#1E3A8A', label: '💰 Cash' },
                  'BANK': { bg: '#DBEAFE', text: '#1E40AF', label: '🏦 Bank' },
                  'JAZZCASH': { bg: '#FCE7F3', text: '#9D174D', label: '📱 JazzCash' },
                  'CREDIT': { bg: '#EDE9FE', text: '#5B21B6', label: '💳 Credit' },
                  'EASYPAISA': { bg: '#D1FAE5', text: '#065F46', label: '📱 EasyPaisa' },
                  'OTHER': { bg: '#F3F4F6', text: '#374151', label: '📌 Other' }
                };

                const colors = accountTypeColors[selectedAcc.accountType] || accountTypeColors['OTHER'];

                return (
                  <div className="mt-2.5 p-3 rounded-xl border border-green-200" style={{ backgroundColor: '#F0FDF4' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-lg">✓</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{selectedAcc.bankName || selectedAcc.accountName}</p>
                          <p className="text-xs text-gray-500 font-mono">{selectedAcc.accountNumber}</p>
                        </div>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {colors.label}
                      </span>
                    </div>
                    {selectedAcc.currentBalance !== undefined && (
                      <div className="mt-1.5 pt-1.5 border-t border-green-100 flex justify-between">
                        <span className="text-[10px] text-gray-500">Current Balance</span>
                        <span className="text-xs font-bold font-mono" style={{ color: '#2563EB' }}>
                          {formatCurrency(selectedAcc.currentBalance || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Submit Button ── */}
            {/* ── Submit Button ── */}
            <button
              type="submit"
              disabled={loading || slotInfo.hasError}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}
            >
              <Save size={18} /> {loading ? 'Creating...' : 'Create Booking'}
            </button>

            {/* ── Validation Messages ── */}
            {(() => {
              const advanceAmount = Number(form.advanceAmount || 0);
              const finalTotalValue = Number(form.totalAmount || finalTotal || 0);
              
              if (advanceAmount > 0) {
                if (!form.paymentMode) {
                  return (
                    <p className="text-xs text-red-500 text-center mt-2 font-medium flex items-center justify-center gap-1.5">
                      <AlertCircle size={14} /> ⚠️ Please select Payment Mode to receive advance of {formatCurrency(advanceAmount)}
                    </p>
                  );
                }
                if (!form.bankAccountId) {
                  return (
                    <p className="text-xs text-red-500 text-center mt-2 font-medium flex items-center justify-center gap-1.5">
                      <AlertCircle size={14} /> ⚠️ Please select Bank Account to receive advance of {formatCurrency(advanceAmount)}
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-green-600 text-center mt-2 font-medium flex items-center justify-center gap-1.5">
                    ✓ Advance of {formatCurrency(advanceAmount)} will be received in {form.paymentMode} account
                  </p>
                );
              } else {
                return (
                  <p className="text-xs text-amber-600 text-center mt-2 font-medium flex items-center justify-center gap-1.5">
                    ℹ️ Full amount of {formatCurrency(finalTotalValue)} will be marked as Due (No advance received)
                  </p>
                );
              }
            })()}

            {slotInfo.hasError && (
              <p className="text-xs text-red-500 text-center mt-2 font-medium">Fix slot error to proceed</p>
            )}
          </div>

          {/* ── Booking Preview ── */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
              <History size={20} style={{ color: '#2563EB' }} /> Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                <span className="text-gray-500 text-xs block">Customer</span>
                <p className="font-semibold">{selectedCustomer?.businessName ? `${selectedCustomer.businessName} (${selectedCustomer.name})` : (selectedCustomer?.name || newCustomer.name || form.guestName || 'Not selected')}</p>
                <p className="text-xs text-gray-500">{selectedCustomer?.phone || newCustomer.phone || form.guestPhone || ''}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                <span className="text-gray-500 text-xs block">Event & Hall</span>
                <p className="font-semibold">{form.eventType || 'N/A'} @ {selectedHall?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{form.hallChargeMode === 'full_hall' ? 'Full Hall Booking' : `Per Seat — ${form.guestCount || 0} guests`}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                <span className="text-gray-500 text-xs block">Date & Time</span>
                <p className="font-semibold">{form.eventDate ? new Date(form.eventDate).toLocaleDateString() : 'N/A'} | {form.startTime}-{form.endTime}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                <span className="text-gray-500 text-xs block">Guests</span>
                <p className="font-semibold">{form.guestCount || 0} expected {form.actualGuestCount ? `(${form.actualGuestCount} actual)` : ''}</p>
              </div>
              <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                <strong>Selected:</strong>
                {selectedPackage && <span className="inline-block ml-1 px-2 py-0.5 rounded bg-amber-100">Package</span>}
                {form.selectedMenus.length > 0 && <span className="inline-block ml-1 px-2 py-0.5 rounded bg-green-100">{form.selectedMenus.length} Menus</span>}
                {form.customItems.length > 0 && <span className="inline-block ml-1 px-2 py-0.5 rounded bg-blue-100">{form.customItems.length} Custom</span>}
                {form.services.length > 0 && <span className="inline-block ml-1 px-2 py-0.5 rounded bg-purple-100">{form.services.length} Services</span>}
                {!selectedPackage && form.selectedMenus.length === 0 && form.customItems.length === 0 && form.services.length === 0 && (
                  <span className="text-gray-400">No items selected yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ═══════ PACKAGE DETAIL MODAL ═══════ */}
      {pkgModalOpen && pkgModalData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl border" style={{ borderColor: '#CBD5E1' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#CBD5E1' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB]">
                  <Gem size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>{pkgModalData.name}</h2>
                  <p className="text-xs text-gray-500">Code: {pkgModalData.code}</p>
                </div>
              </div>
              <button onClick={() => setPkgModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-all"><X size={20} style={{ color: '#334155' }} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                  <span className="text-gray-500 text-xs block">Event Type</span>
                  <p className="font-bold">{pkgModalData.eventType}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                  <span className="text-gray-500 text-xs block">Status</span>
                  <p className="font-bold">{pkgModalData.status}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                  <span className="text-gray-500 text-xs block">Guest Count</span>
                  <p className="font-bold">{pkgModalData.guestCount || 'N/A'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                  <span className="text-gray-500 text-xs block">Base Total</span>
                  <p className="font-bold font-mono">{formatCurrency(pkgModalData.baseTotal)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                  <span className="text-gray-500 text-xs block">Discount</span>
                  <p className="font-bold font-mono">{pkgModalData.discountPercent || 0}%</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <span className="text-gray-500 text-xs block">Final Price</span>
                  <p className="font-bold font-mono" style={{ color: '#2563EB' }}>{formatCurrency(pkgModalData.finalPrice)}</p>
                </div>
              </div>

              {pkgModalData.menus && pkgModalData.menus.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#0F172A' }}>
                    <Utensils size={16} style={{ color: '#2563EB' }} /> Included Menus & Dishes
                  </h4>
                  <div className="space-y-3">
                    {pkgModalData.menus.map((menu, idx) => {
                      const mItems = getMenuDetailedItemsWithQty(menu, menus);
                      return (
                        <div key={menu.id ?? `menu-${idx}`} className="rounded-xl overflow-hidden border" style={{ borderColor: '#CBD5E1' }}>
                          <button type="button" onClick={() => toggleMenuExpand(menu.id ?? `idx-${idx}`)}
                            className="w-full flex items-center justify-between p-3 text-left transition-all hover:bg-amber-50/30" style={{ backgroundColor: '#F8FAFC' }}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-800">{menu.name || menu.menuName}</span>
                              <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: '#FEF3C7', color: '#1E3A8A' }}>
                                {menu.quantity || pkgModalData.guestCount || 0} guests
                              </span>
                            </div>
                            {expandedMenus[menu.id || idx] ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                          </button>
                          {expandedMenus[menu.id || idx] && (
                            <div className="p-3 space-y-2">
                              {mItems.length > 0 ? (
                                <div className="space-y-1">
                                  {mItems.map((item, iidx) => {
                                    const q = item.quantityPerHead ?? item.quantity ?? item.qty ?? item.pivot?.quantity ?? 1;
                                    return (
                                      <div key={iidx} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
                                        <span className="text-gray-700">• {item.name || item.itemName}</span>
                                        <span className="font-mono text-xs font-medium" style={{ color: '#2563EB' }}>
                                          {q} {item.unit || 'plate'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No dish details available for this menu.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pkgModalData.services && pkgModalData.services.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#0F172A' }}>
                    <Tag size={16} style={{ color: '#2563EB' }} /> Extra Services
                  </h4>
                  <div className="flex flex-wrap gap-2">
                   {pkgModalData.services && pkgModalData.services.length > 0 && (
  <div>
    <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#0F172A' }}>
      <Tag size={16} style={{ color: '#2563EB' }} /> Extra Services
    </h4>
    <div className="flex flex-wrap gap-2">
      {pkgModalData.services.map((svc, idx) => {
        const isHourly = svc.pricingType === 'HOURLY';
        const unitPrice = Number(svc.salePrice || svc.price || svc.unitPrice || 0);
        const qty = Number(svc.quantity || svc.qty || 1);
        const hours = Number(svc.hours || 1);
        
        let totalPrice = Number(svc.totalPrice || 0);
        if (totalPrice === 0) {
          totalPrice = isHourly ? (qty * hours * unitPrice) : (qty * unitPrice);
        }
        
        let displayLabel = svc.name || svc.serviceName;
        if (isHourly) {
          displayLabel = `${svc.name || svc.serviceName} (${qty} × ${hours}h)`;
        } else if (qty > 1) {
          displayLabel = `${svc.name || svc.serviceName} (×${qty})`;
        }
        
        return (
          <span key={idx} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: '#FEF3C7', color: '#1E3A8A', border: '1px solid #FCD34D' }}>
            {displayLabel} — {formatCurrency(totalPrice)}
          </span>
        );
      })}
    </div>
  </div>
)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {inlineModal.open && <InlineForm />}
    </div>
  );
};

export default BookingCreate;