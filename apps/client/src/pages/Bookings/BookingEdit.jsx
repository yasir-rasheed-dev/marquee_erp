// ═══════════════════════════════════════════════════════════
// pages/BookingEdit.jsx — COMPLETE FIXED VERSION
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Printer, FileText, Eye, Plus, X, Upload, Package,
  Utensils, Settings, Save, Trash2, ChevronLeft,
  Users, Phone, Mail, MapPin, Tag, Receipt,
  AlertCircle, UserPlus, CreditCard, Building2, History,
  ChevronDown, ChevronUp, Flame, Sparkles, Gem, Search,
  Edit3, Armchair, BoxSelect, Percent, Calendar, Clock,
  User, Phone as PhoneIcon, Mail as MailIcon, MapPin as MapPinIcon,
  Ban, RotateCcw, CheckCircle, XCircle,
  AlertTriangle, Info, ArrowLeft
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

// ── HELPERS ──
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

// ── STATUS CONFIG ──
const statusConfig = {
  tentative:    { color: '#1565C0', bg: '#E3F2FD', label: 'Tentative',    icon: Clock },
  confirmed:    { color: '#1B5E20', bg: '#E8F5E9', label: 'Confirmed',    icon: CheckCircle },
  in_progress:  { color: '#6A1B9A', bg: '#F3E5F5', label: 'In Progress',  icon: Flame },
  completed:    { color: '#2E7D32', bg: '#E8F5E9', label: 'Completed',    icon: Sparkles },
  cancelled:    { color: '#B71C1C', bg: '#FFEBEE', label: 'Cancelled',    icon: Ban },
  no_show:      { color: '#424242', bg: '#F5F5F5', label: 'No Show',      icon: XCircle },
};

const paymentStatusConfig = {
  pending:   { color: '#B71C1C', bg: '#FFEBEE', label: 'Pending',   icon: Clock },
  partial:   { color: '#E65100', bg: '#FFF3E0', label: 'Partial',   icon: AlertTriangle },
  completed: { color: '#1B5E20', bg: '#E8F5E9', label: 'Completed', icon: CheckCircle },
  refunded:  { color: '#1565C0', bg: '#E3F2FD', label: 'Refunded',  icon: RotateCcw },
  failed:    { color: '#B71C1C', bg: '#FFEBEE', label: 'Failed',    icon: XCircle },
};

const extractMenuDetailedItems = (menu) => {
  if (!menu) return [];
  const itemsList = menu.items || menu.menu?.items || [];
  if (Array.isArray(itemsList) && itemsList.length > 0) {
    return itemsList.map(item => ({
      ...item,
      price: item.price || item.salePrice || item.unitPrice || 0,
      quantity: item.quantity || item.qty || item.quantityPerHead || 1,
      unit: item.unit || 'plate'
    }));
  }
  const categoriesList = menu.categories || menu.menu?.categories || [];
  if (Array.isArray(categoriesList) && categoriesList.length > 0) {
    let allCatItems = [];
    categoriesList.forEach(cat => {
      const catItems = cat.items || cat.menuItems || cat.dishes || [];
      catItems.forEach(item => {
        allCatItems.push({
          ...item,
          price: item.price || item.salePrice || item.unitPrice || 0,
          quantity: item.quantity || item.qty || item.quantityPerHead || 1,
          unit: item.unit || 'plate'
        });
      });
    });
    return allCatItems;
  }
  return [];
};

const getMenuDetailedItemsWithQty = (pkgMenu, allMenus) => {
  const menuId = pkgMenu.menuId || pkgMenu.id || pkgMenu.menu?.id;
  const matchedGlobalMenu = allMenus.find(m => Number(m.id) === Number(menuId));
  if (matchedGlobalMenu) {
    return extractMenuDetailedItems(matchedGlobalMenu);
  }
  return extractMenuDetailedItems(pkgMenu);
};

/* ─────────────────── MAIN COMPONENT ─────────────────── */
const BookingEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { branchId, companyId } = getTenantContext();

  console.log('🔍 BookingEdit - id:', id);

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

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [receiptSettings, setReceiptSettings] = useState(defaultReceiptSettings);

  /* ── UI States ── */
  const [packageSearch, setPackageSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [customItemSelectValue, setCustomItemSelectValue] = useState('');
  const [customCatFilter, setCustomCatFilter] = useState('');
  const [mode, setMode] = useState('package');
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [pkgModalData, setPkgModalData] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});
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
    bookingNo: '',
    createdAt: null
  });
  
  // ── DEBUGGING SETUP ──
  useEffect(() => {
    window.packagesState = packages;
    window.formState = form;
    window.setPackages = setPackages;
    window.setForm = setForm;
    console.log('🔍 DEBUG: packagesState updated:', packages);
    console.log('🔍 DEBUG: formState updated:', form);
  }, [packages, form]);

  /* ── Derived ── */
  const selectedPackage = useMemo(() => {
    const pkg = packages.find(p => p.id === form.selectedPackageId);
    console.log('📦 selectedPackage:', pkg);
    return pkg;
  }, [packages, form.selectedPackageId]);

  const selectedHall = useMemo(() => {
    const hall = halls.find(h => h.id === Number(form.hallId));
    console.log('🏛️ selectedHall:', hall);
    return hall;
  }, [halls, form.hallId]);

  const selectedCustomer = useMemo(() => {
    const cust = customers.find(c => c.id === Number(selectedCustomerId));
    return cust;
  }, [customers, selectedCustomerId]);

  const hallCapacity = Number(selectedHall?.capacity || 0);

  /* ── Hall Price ── */
  const hallPrice = useMemo(() => {
    if (!selectedHall) return 0;
    if (form.hallChargeMode === 'per_seat') {
      const guests = Number(form.guestCount) || 0;
      const perSeatRate = Number(selectedHall.perSeatPrice || selectedHall.price || 0);
      return perSeatRate * guests;
    }
    return Number(selectedHall.price || 0);
  }, [selectedHall, form.hallChargeMode, form.guestCount]);

  /* ── Package Total ── */
  const packageMealTotal = useMemo(() => {
    if (!form.isMealIncluded || !selectedPackage) return 0;
    return Number(selectedPackage.finalPrice || selectedPackage.baseTotal || selectedPackage.totalAmount || 0);
  }, [form.isMealIncluded, selectedPackage]);

  /* ── COMPLETE baseTotal ── */
  const baseTotal = useMemo(() => {
    let total = 0;
    
    // 1️⃣ Hall Price (hamesha add)
    total += hallPrice;
    
    if (form.isMealIncluded) {
      // 2️⃣ Package Price (agar selected hai)
      if (selectedPackage) {
        total += Number(selectedPackage.finalPrice || selectedPackage.baseTotal || 0);
      }
      
      // 3️⃣ Individual Menus (jo package se nahi hain)
      total += form.selectedMenus
        .filter(m => !m.fromPackage)
        .reduce((sum, m) => sum + Number(m.totalPrice || 0), 0);
      
      // 4️⃣ Custom Items (hamesha add)
      total += form.customItems
        .reduce((sum, i) => sum + Number(i.totalPrice || 0), 0);
    }
    
    // 5️⃣ Extra Services (jo package se nahi hain)
    total += form.services
      .filter(s => !s.fromPackage)
      .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
    
    return total;
  }, [hallPrice, selectedPackage, form.isMealIncluded, form.selectedMenus, form.customItems, form.services]);

  const discountAmount = useMemo(() => {
    const discountValue = Number(form.discount || 0);
    if (form.discountType === 'percent') {
      return (baseTotal * discountValue) / 100;
    }
    return discountValue;
  }, [baseTotal, form.discount, form.discountType]);

  const amountAfterDiscount = Math.max(0, baseTotal - discountAmount);

  const activeTaxRates = useMemo(() => taxRates.filter(t => t.isActive) || [], [taxRates]);

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

  const finalTotal = useMemo(() => Math.max(0, amountAfterDiscount + taxAmount), [amountAfterDiscount, taxAmount]);
  const dueAmount = useMemo(() => Math.max(0, finalTotal - Number(form.advanceAmount || 0)), [finalTotal, form.advanceAmount]);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      totalAmount: finalTotal,
      dueAmount: dueAmount,
      paidAmount: Number(prev.advanceAmount || 0)
    }));
  }, [finalTotal, dueAmount]);

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

  /* ── Slot Info ── */
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

    let totalBookedGuests = 0;
    let fullHallBooked = false;

    for (const b of conflicting) {
      const existingStart = new Date(b.startTime).getTime();
      const existingEnd = new Date(b.endTime).getTime();
      if (newStart < existingEnd && newEnd > existingStart) {
        if (b.hallChargeMode === 'full_hall') fullHallBooked = true;
        totalBookedGuests += Number(b.guestCount || 0);
      }
    }

    const remaining = Math.max(0, hallCapacity - totalBookedGuests);

    if (form.hallChargeMode === 'full_hall') {
      if (fullHallBooked) {
        return { hasError: true, message: `❌ Hall already fully booked for this slot!`, remaining: 0, type: 'error' };
      }
      if (totalBookedGuests > 0) {
        return { hasError: true, message: `❌ Cannot book full hall — ${totalBookedGuests} seats already booked`, remaining, type: 'error' };
      }
      return { hasError: false, message: `✅ Full hall available (Capacity: ${hallCapacity})`, remaining: hallCapacity, type: 'success' };
    }

    if (fullHallBooked) {
      return { hasError: true, message: `❌ Hall fully reserved (full hall booking exists)`, remaining: 0, type: 'error' };
    }
    if (remaining <= 0) {
      return { hasError: true, message: `❌ Slot Full! "${selectedHall?.name}" capacity ${hallCapacity} already booked.`, remaining: 0, type: 'error' };
    }
    if (requestedGuests > remaining) {
      return { hasError: true, message: `⚠️ Capacity exceeded! Remaining: ${remaining}, Requested: ${requestedGuests}`, remaining, type: 'error' };
    }
    if (totalBookedGuests > 0) {
      return { hasError: false, message: `⚠️ This slot has ${totalBookedGuests} guests already. Remaining: ${remaining}`, remaining, type: 'warning' };
    }
    return { hasError: false, message: `✅ Available: ${remaining} seats`, remaining, type: 'success' };
  }, [form.hallId, form.eventDate, form.startTime, form.endTime, form.guestCount, form.hallChargeMode, hallCapacity, selectedHall, existingBookings, id]);

  /* ─────────────────── FETCH DATA ─────────────────── */
  useEffect(() => {
    (async () => {
      try {
        console.log('🔄 Fetching initial data...');
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

        console.log('📦 Packages loaded:', packagesData.length);

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

        // ── 🔥 LOAD BOOKING DATA ──
        if (id && id !== ':id') {
          try {
            console.log('📝 Loading booking for edit, ID:', id);
            const bookingRes = await bookingApi.getById(id);
            const b = bookingRes?.data || bookingRes;
            
            console.log('📝 Booking API Response:', b);

            if (b && b.id) {
              console.log('✅ Booking loaded successfully!');

              // ── Customer ──
              if (b.customerId) {
                setSelectedCustomerId(String(b.customerId));
              }

              // ── Hall ──
              if (b.hallId) {
                setForm(prev => ({ ...prev, hallId: String(b.hallId) }));
              }

              // ── 🔥 PACKAGE FIX ──
              let pkgId = null;

              if (b.selected_package && b.selected_package.id) {
                pkgId = b.selected_package.id;
                console.log('✅ Package found in selected_package:', b.selected_package);
                
                setPackages(prev => {
                  const exists = prev.find(p => p.id === b.selected_package.id);
                  if (exists) return prev;
                  return [...prev, b.selected_package];
                });
              }

              if (!pkgId) {
                pkgId = b.selectedPackageId || b.selected_package_id || b.packageId;
                console.log('🔍 Looking for package with ID:', pkgId);
                
                if (pkgId) {
                  let foundPkg = packagesData.find(p => p.id === pkgId);
                  if (!foundPkg) {
                    try {
                      const pkgRes = await packageApi.getById(pkgId);
                      const pkgData = pkgRes?.data || pkgRes;
                      if (pkgData && pkgData.id) {
                        foundPkg = pkgData;
                        setPackages(prev => {
                          const exists = prev.find(p => p.id === pkgData.id);
                          if (exists) return prev;
                          return [...prev, pkgData];
                        });
                      }
                    } catch (pkgErr) {
                      console.error('❌ Failed to fetch package:', pkgErr);
                    }
                  }
                }
              }

              if (pkgId) {
                console.log('✅✅✅ Setting selectedPackageId to:', pkgId);
                setForm(prev => ({ ...prev, selectedPackageId: pkgId }));
              }

              // ── 🔥 Active Package Identification ──
              const activePkg = b.selected_package || foundPkg || packages.find(p => p.id === pkgId);

              const pkgMenuIdSet = new Set();
              if (activePkg?.menus) {
                activePkg.menus.forEach(m => {
                  if (m.menuId) pkgMenuIdSet.add(Number(m.menuId));
                  if (m.id) pkgMenuIdSet.add(Number(m.id));
                });
              }

              const pkgServiceIdSet = new Set();
              if (activePkg?.services) {
                activePkg.services.forEach(s => {
                  if (s.serviceId) pkgServiceIdSet.add(Number(s.serviceId));
                  if (s.id) pkgServiceIdSet.add(Number(s.id));
                });
              }

              // ── Mode ──
              const hasCustomItems = (b.customItems?.length > 0);
              const hasMenus = (b.menus?.length > 0);
              const hasPackage = !!pkgId;
              
              if (hasCustomItems) setMode('custom');
              else if (hasMenus && !hasPackage) setMode('menu');
              else if (hasPackage) setMode('package');

              // ── Menus (from booking) ──
              const mappedMenus = (b.menus || []).map(m => {
                const mId = Number(m.menuId || m.id);
                const isFromPkg = pkgId ? pkgMenuIdSet.has(mId) : false;
                return {
                  menuId: mId,
                  menuName: m.menuName || m.name,
                  quantity: Number(m.quantity) || Number(b.guestCount) || 1,
                  unitPrice: isFromPkg ? 0 : Number(m.unitPrice || m.price || 0),
                  totalPrice: isFromPkg ? 0 : Number(m.totalPrice || (m.unitPrice * m.quantity) || 0),
                  originalPrice: Number(m.unitPrice || m.price || 0),
                  unit: m.unit || 'plate',
                  fromPackage: isFromPkg
                };
              });

              // Also add any package menus not in b.menus
              if (activePkg?.menus) {
                const existingMenuIds = new Set(mappedMenus.map(m => m.menuId));
                activePkg.menus.forEach(m => {
                  const mId = Number(m.menuId || m.id);
                  if (!existingMenuIds.has(mId)) {
                    mappedMenus.push({
                      menuId: mId,
                      menuName: m.name || m.menuName || 'Menu',
                      quantity: Number(m.quantity) || Number(b.guestCount) || 1,
                      unitPrice: 0,
                      totalPrice: 0,
                      originalPrice: Number(m.price || m.unitPrice || 0),
                      unit: m.unit || 'plate',
                      fromPackage: true
                    });
                  }
                });
              }

              // ── Booking Services ──
              const mappedServices = (b.services || []).map(s => {
                const sId = Number(s.serviceId || s.id);
                const isFromPkg = pkgId ? pkgServiceIdSet.has(sId) : false;
                const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
                const hours = Number(s.hours || 1);
                const unitPrice = Number(s.unitPrice || s.price || 0);
                const quantity = Number(s.quantity || 1);
                const originalTotal = isHourly ? (quantity * hours * unitPrice) : (quantity * unitPrice);

                return {
                  serviceId: sId,
                  serviceName: s.serviceName || s.name,
                  quantity: quantity,
                  unitPrice: isFromPkg ? 0 : unitPrice,
                  totalPrice: isFromPkg ? 0 : (Number(s.totalPrice) || originalTotal),
                  originalPrice: unitPrice,
                  notes: s.notes || '',
                  hours: isHourly ? hours : null,
                  pricingType: s.pricingType || 'FIXED',
                  isHourly: isHourly,
                  fromPackage: isFromPkg
                };
              });

              // Also add any package services not in b.services
              if (activePkg?.services) {
                const existingServiceIds = new Set(mappedServices.map(s => s.serviceId));
                activePkg.services.forEach(s => {
                  const sId = Number(s.id || s.serviceId);
                  if (!existingServiceIds.has(sId)) {
                    const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
                    const hours = Number(s.hours || 1);
                    const unitPrice = Number(s.salePrice || s.price || s.unitPrice || 0);
                    const quantity = Number(s.quantity || s.qty || 1);
                    mappedServices.push({
                      serviceId: sId,
                      serviceName: s.name || s.serviceName,
                      quantity: quantity,
                      unitPrice: 0,
                      totalPrice: 0,
                      originalPrice: unitPrice,
                      notes: s.notes || '',
                      pricingType: s.pricingType || 'FIXED',
                      hours: isHourly ? hours : null,
                      isHourly: isHourly,
                      fromPackage: true
                    });
                  }
                });
              }

              const allMenus = mappedMenus;
              const allServices = mappedServices;

              // ── Custom Items ──
              const mappedCustomItems = (b.customItems || []).map(i => ({
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

              // ── Attachments ──
              const attachments = (b.attachments || []).map(a => ({
                name: a.name || a.filename || 'Attachment',
                size: a.size || 0,
                type: a.type || 'file',
                url: a.url || a.path || '',
                file: null
              }));

              // ── Date/Time ──
              const eventDate = b.eventDate ? new Date(b.eventDate).toISOString().split('T')[0] : todayInput();
              const startTime = b.startTime ? new Date(b.startTime).toTimeString().slice(0, 5) : '18:00';
              const endTime = b.endTime ? new Date(b.endTime).toTimeString().slice(0, 5) : '23:00';

              // ── UPDATE FORM ──
              setForm(prev => ({
                ...prev,
                title: b.title || '',
                eventType: b.eventType || '',
                eventDate: eventDate,
                startTime: startTime,
                endTime: endTime,
                description: b.description || '',
                guestName: b.guestName || '',
                guestPhone: b.guestPhone || '',
                guestEmail: b.guestEmail || '',
                guestCount: b.guestCount || '',
                actualGuestCount: b.actualGuestCount || '',
                customerId: b.customerId || '',
                hallChargeMode: b.hallChargeMode || 'per_seat',
                isMealIncluded: b.isMealIncluded !== undefined ? b.isMealIncluded : true,
                taxEnabled: b.taxEnabled !== undefined ? b.taxEnabled : true,
                totalAmount: b.totalAmount || 0,
                discount: b.discount || 0,
                discountType: b.discountType || 'percent',
                advanceAmount: b.advanceAmount || 0,
                dueAmount: b.dueAmount || 0,
                paidAmount: b.paidAmount || 0,
                paymentMode: b.paymentMode || 'Cash',
                paymentStatus: b.paymentStatus || 'pending',
                selectedMenus: allMenus,
                customItems: mappedCustomItems,
                services: allServices,
                attachments: attachments,
                status: b.status || 'tentative',
                bankAccountId: b.bankAccountId || '',
                branchId: b.branchId || branchId,
                companyId: b.companyId || companyId,
                bookingNo: b.bookingNo || b.id || '',
                createdAt: b.createdAt || null
              }));

              console.log('✅ Form updated successfully!');
              console.log('📦 Selected Package ID:', pkgId);
              console.log('📋 All Menus:', allMenus.length);
              console.log('🔧 All Services:', allServices.length);
              console.log('🛠️ Custom Items:', mappedCustomItems.length);

            } else {
              console.warn('⚠️ No booking data found for ID:', id);
              setError('Booking not found');
            }
          } catch (err) {
            console.error('❌ Failed to load booking:', err);
            setError(err?.response?.data?.message || 'Failed to load booking data');
            toast.error('Failed to load booking data');
          }
        }
      } catch (err) {
        console.error('❌ Initial load error:', err);
        toast.error('Failed to load some data');
      } finally {
        setFetching(false);
      }
    })();
  }, [branchId, id]);

  /* ── Fetch Receipt Settings ── */
  useEffect(() => {
    const fetchReceiptSettings = async () => {
      try {
        const res = await receiptSettingsApi.getAll({ branchId });
        const dataArray = res?.data || res;
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          setReceiptSettings(prev => ({ ...defaultReceiptSettings, ...dataArray[0] }));
        }
      } catch (err) {
        try {
          const saved = localStorage.getItem('receiptSettings');
          if (saved) setReceiptSettings({ ...defaultReceiptSettings, ...JSON.parse(saved) });
        } catch {}
      }
    };
    if (branchId) fetchReceiptSettings();
  }, [branchId]);

  /* ─────────────────── HANDLERS ─────────────────── */
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleMealIncluded = (val) => setForm(prev => ({ ...prev, isMealIncluded: val }));

  const selectPackage = (pkg) => {
    setForm(prev => {
      const isDeselecting = prev.selectedPackageId === pkg.id;
      if (isDeselecting) {
        return {
          ...prev,
          selectedPackageId: null,
          selectedMenus: prev.selectedMenus.map(m => ({
            ...m,
            fromPackage: false,
            unitPrice: m.originalPrice || m.unitPrice,
            totalPrice: m.quantity * (m.originalPrice || m.unitPrice)
          })),
          services: prev.services.map(s => ({
            ...s,
            fromPackage: false,
            unitPrice: s.originalPrice || s.unitPrice,
            totalPrice: s.isHourly ? (s.quantity * (s.hours || 1) * (s.originalPrice || s.unitPrice)) : (s.quantity * (s.originalPrice || s.unitPrice))
          }))
        };
      }

      const pkgMenuIdSet = new Set((pkg.menus || []).map(m => Number(m.menuId || m.id)));
      const pkgServiceIdSet = new Set((pkg.services || []).map(s => Number(s.serviceId || s.id)));

      const updatedMenus = prev.selectedMenus.map(m => {
        const isFromPkg = pkgMenuIdSet.has(Number(m.menuId));
        return {
          ...m,
          fromPackage: isFromPkg,
          totalPrice: isFromPkg ? 0 : m.totalPrice
        };
      });

      (pkg.menus || []).forEach(m => {
        const mId = Number(m.menuId || m.id);
        if (!updatedMenus.some(x => Number(x.menuId) === mId)) {
          updatedMenus.push({
            menuId: mId,
            menuName: m.name || m.menuName || 'Menu',
            quantity: Number(m.quantity) || Number(prev.guestCount) || 1,
            unitPrice: 0,
            totalPrice: 0,
            originalPrice: Number(m.price || m.unitPrice || 0),
            unit: m.unit || 'plate',
            fromPackage: true
          });
        }
      });

      const updatedServices = prev.services.map(s => {
        const isFromPkg = pkgServiceIdSet.has(Number(s.serviceId));
        return {
          ...s,
          fromPackage: isFromPkg,
          totalPrice: isFromPkg ? 0 : s.totalPrice
        };
      });

      (pkg.services || []).forEach(s => {
        const sId = Number(s.serviceId || s.id);
        if (!updatedServices.some(x => Number(x.serviceId) === sId)) {
          const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
          const hours = Number(s.hours || 1);
          updatedServices.push({
            serviceId: sId,
            serviceName: s.name || s.serviceName,
            quantity: Number(s.quantity || 1),
            unitPrice: 0,
            totalPrice: 0,
            originalPrice: Number(s.salePrice || s.price || 0),
            notes: s.notes || '',
            pricingType: s.pricingType || 'FIXED',
            hours: isHourly ? hours : null,
            isHourly: isHourly,
            fromPackage: true
          });
        }
      });

      return {
        ...prev,
        selectedPackageId: pkg.id,
        eventType: pkg.eventType || prev.eventType,
        title: pkg.name ? `${pkg.name} Booking` : prev.title,
        isMealIncluded: true,
        selectedMenus: updatedMenus,
        services: updatedServices
      };
    });
  };

  const toggleMenu = (menu) => {
    setForm(prev => {
      const exists = prev.selectedMenus.find(m => m.menuId === menu.id);
      if (exists) {
        return { ...prev, selectedMenus: prev.selectedMenus.filter(m => m.menuId !== menu.id) };
      }
      const price = Number(menu.price || menu.salePrice || menu.totalSalePrice || 0);
      const qty = parseInt(prev.guestCount) || 1;
      return {
        ...prev,
        selectedMenus: [...prev.selectedMenus, {
          menuId: menu.id,
          menuName: menu.name,
          quantity: qty,
          unitPrice: price,
          totalPrice: price * qty,
          unit: menu.unit || 'plate',
          fromPackage: false
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
    const price = Number(item.salePrice || item.price || 0);
    setForm(prev => ({
      ...prev,
      customItems: [...prev.customItems, {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        unit: item.unit || 'pcs',
        displayNote: '',
        originalPrice: price,
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
    const exists = form.services.find(s => s.serviceId === serviceId);
    if (exists) {
      if (exists.fromPackage) {
        toast.info('This service is included in the package and cannot be removed');
        return;
      }
      setForm(prev => ({ ...prev, services: prev.services.filter(s => s.serviceId !== serviceId) }));
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
          fromPackage: false
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
        if (s.fromPackage) return s;
        const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
        const hours = s.hours || 1;
        const unitPrice = s.unitPrice || 0;
        const totalPrice = isHourly ? (quantity * hours * unitPrice) : (quantity * unitPrice);
        return { ...s, quantity, totalPrice };
      })
    }));
  };

  const updateServiceHours = (serviceId, hours) => {
    const hrs = Math.max(1, Number(hours) || 1);
    setForm(prev => ({
      ...prev,
      services: prev.services.map(s => {
        if (s.serviceId !== serviceId) return s;
        if (s.fromPackage) return s;
        const isHourly = s.pricingType === 'HOURLY' || s.isHourly === true;
        if (!isHourly) return s;
        const quantity = s.quantity || 1;
        const unitPrice = s.unitPrice || 0;
        const totalPrice = quantity * hrs * unitPrice;
        return { ...s, hours: hrs, totalPrice };
      })
    }));
  };

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

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Customer name and phone are required');
      return false;
    }
    if (newCustomer.phone.length !== 11) {
      toast.error('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return false;
    }
    try {
      const payload = { ...newCustomer, branchId, companyId };
      const res = await customerApi.create(payload);
      const created = res.data || res;
      setCustomers(prev => [...prev, created]);
      setSelectedCustomerId(String(created.id));
      setShowNewCustomerForm(false);
      toast.success('Customer registered and selected');
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create customer');
      return false;
    }
  };

  const openInlineModal = (type, mode = 'create', data = null) => {
    setInlineModal({ open: true, type, mode, data });
  };

  const closeInlineModal = () => {
    setInlineModal({ open: false, type: '', mode: 'create', data: null });
  };

  const handleInlineSave = async (type, payload) => {
    try {
      if (type === 'menu') {
        await menuApi.create(payload);
        setMenus(extractData(await menuApi.getAll()));
        toast.success('Menu created!');
      } else if (type === 'item') {
        await itemApi.create(payload);
        setItems(extractData(await itemApi.getAll()));
        toast.success('Item created!');
      } else if (type === 'service') {
        await serviceApi.create(payload);
        setServicesList(extractData(await serviceApi.getAll()));
        toast.success('Service created!');
      } else if (type === 'event') {
        await eventApi.create(payload);
        setEvents(extractData(await eventApi.getAll()));
        toast.success('Event created!');
      } else if (type === 'package') {
        await packageApi.create(payload);
        setPackages(extractData(await packageApi.getAll()));
        toast.success('Package created!');
      }
      closeInlineModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to create ${type}`);
    }
  };

  /* ── PRINT FUNCTIONS ── */
  const generateA4HTML = (rs) => {
    const s = { ...defaultReceiptSettings, ...rs };
    const b = {
      bookingNo: form.bookingNo || 'PENDING',
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
    return '<html>...</html>';
  };

  const generateThermalHTML = (rs) => {
    return '<html>...</html>';
  };

  const handlePrintA4 = () => {
    const html = generateA4HTML(receiptSettings);
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked!'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handlePrintThermal = () => {
    const html = generateThermalHTML(receiptSettings);
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked!'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  /* ── SUBMIT ── */
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
        toast.error('Customer not found');
        setLoading(false);
        return;
      }

      // ── 🔥 Build Menus ──
      let payloadMenus = [];

      if (form.isMealIncluded) {
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

        const addedMenus = form.selectedMenus
          .filter(m => m.menuId && Number(m.menuId) > 0 && !m.fromPackage)
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

      // ── 🔥 Build Services ──
      let payloadServices = [];

      // Extra services (jo package se nahi hain)
      const extraServices = form.services.filter(s => !s.fromPackage);
      payloadServices = extraServices.map(s => ({
        serviceId: Number(s.serviceId),
        serviceName: s.serviceName,
        quantity: Number(s.quantity) || 1,
        unitPrice: Number(s.unitPrice || 0),
        totalPrice: Number(s.totalPrice || 0),
        notes: s.notes || null,
        hours: s.hours || null,
        pricingType: s.pricingType || 'FIXED',
        isHourly: s.isHourly || false,
        fromPackage: false
      }));

      // Package services
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

      // ── 🔥 Deduplicate Menus ──
      const seenMenuIds = new Set();
      payloadMenus = payloadMenus.filter(m => {
        const id = m.menuId;
        if (seenMenuIds.has(id)) return false;
        seenMenuIds.add(id);
        return true;
      });

      // ── 🔥 Deduplicate Services ──
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
        paymentMode: paidAmount > 0 ? form.paymentMode : null,
        status: form.status,
        paymentStatus: paymentStatus,
        branchId: parseInt(branchId),
        companyId: parseInt(companyId),
        bankAccountId: paidAmount > 0 ? (form.bankAccountId ? parseInt(form.bankAccountId) : null) : null,
        packageTotal: Number(packageMealTotal || 0),
        selectedPackageId: selectedPackage ? selectedPackage.id : (form.selectedPackageId || null),
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

      const res = await bookingApi.update(Number(id), payload);
      if (res.data?.success || res.data?.id) {
        toast.success('Booking updated successfully!');
        navigate('/bookings');
      } else {
        toast.error(res.data?.message || 'Failed to update booking');
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err.response?.data?.message || err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────── RENDER ─────────────────── */
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
          <p className="mt-4 text-sm font-bold" style={{ color: '#334155' }}>Loading booking data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg border" style={{ borderColor: '#CBD5E1' }}>
          <XCircle size={48} className="mx-auto mb-3 text-red-400" />
          <p className="font-bold text-lg" style={{ color: '#0F172A' }}>Error Loading Booking</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <button onClick={() => navigate('/bookings')} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>
            <ArrowLeft size={16} className="inline mr-2" /> Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const s = statusConfig[form.status] || statusConfig.tentative;
  const ps = paymentStatusConfig[form.paymentStatus] || paymentStatusConfig.pending;
  const dueAmt = Number(form.dueAmount || 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/bookings')} className="p-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: '#F8F5F0' }}>
                <ChevronLeft size={20} style={{ color: '#334155' }} />
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Edit Booking #{form.bookingNo || id}</h1>
                <p className="text-xs font-medium" style={{ color: '#475569' }}>{form.title || form.eventType || 'Event'}</p>
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

      {/* STATUS BAR */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-wrap items-center justify-between gap-3" style={{ borderColor: '#CBD5E1' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: s.bg, color: s.color }}>
              {s.label}
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: ps.bg, color: ps.color }}>
              {ps.label}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              Booking #: {form.bookingNo || id}
            </span>
            {form.createdAt && (
              <span className="text-xs text-gray-400 font-medium">
                Created: {formatDateTime(form.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-6 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══════ LEFT COLUMN (2/3) ═══════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── QUICK STATS ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <span className="text-xs text-gray-400 block uppercase font-bold">Total</span>
              <span className="text-lg font-bold font-mono" style={{ color: '#2563EB' }}>{formatCurrency(form.totalAmount)}</span>
            </div>
            <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <span className="text-xs text-gray-400 block uppercase font-bold">Paid</span>
              <span className="text-lg font-bold font-mono text-green-700">{formatCurrency(form.paidAmount || form.advanceAmount || 0)}</span>
            </div>
            <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <span className="text-xs text-gray-400 block uppercase font-bold">Due</span>
              <span className="text-lg font-bold font-mono" style={{ color: dueAmt > 0 ? '#B71C1C' : '#1B5E20' }}>
                {formatCurrency(dueAmt)}
              </span>
            </div>
            <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <span className="text-xs text-gray-400 block uppercase font-bold">Guests</span>
              <span className="text-lg font-bold font-mono">{form.guestCount || 0}</span>
            </div>
            <div className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <span className="text-xs text-gray-400 block uppercase font-bold">Event Date</span>
              <span className="text-sm font-bold">{formatDate(form.eventDate)}</span>
            </div>
          </div>

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
                      {/* Customer details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><span className="text-gray-500 text-xs">Name</span><p className="font-semibold">{selectedCustomer.name}</p></div>
                        <div><span className="text-gray-500 text-xs">Phone</span><p className="font-semibold">{selectedCustomer.phone}</p></div>
                        <div><span className="text-gray-500 text-xs">CNIC</span><p className="font-semibold">{selectedCustomer.cnic || 'N/A'}</p></div>
                        <div><span className="text-gray-500 text-xs">City</span><p className="font-semibold">{selectedCustomer.city || 'N/A'}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Full Name *" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                    <input type="tel" placeholder="Phone *" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} maxLength={11} inputMode="numeric" className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
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
              <Calendar size={18} style={{ color: '#2563EB' }} />
              <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Event & Hall Details</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Event Type *</label>
                  <ReactSelect
                    value={form.eventType}
                    onChange={(val) => updateField('eventType', val)}
                    options={events.map(ev => ({ value: ev.name, label: ev.name }))}
                    placeholder="Select Event"
                    isSearchable={true}
                    isClearable={true}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Hall *</label>
                  <ReactSelect
                    value={form.hallId}
                    onChange={(val) => updateField('hallId', val)}
                    options={halls.map(h => ({
                      value: String(h.id),
                      label: `${h.name} (Cap: ${h.capacity})`
                    }))}
                    placeholder="Select Hall"
                    isSearchable={true}
                    isClearable={true}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Event Date *</label>
                  <input type="date" value={form.eventDate} onChange={e => updateField('eventDate', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Start Time *</label>
                  <input type="time" value={form.startTime} onChange={e => updateField('startTime', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>End Time *</label>
                  <input type="time" value={form.endTime} onChange={e => updateField('endTime', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Expected Guests *</label>
                  <input type="number" min="1" value={form.guestCount} onChange={e => updateField('guestCount', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Actual Guests</label>
                  <input type="number" min="0" value={form.actualGuestCount} onChange={e => updateField('actualGuestCount', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>Booking Title</label>
                  <input type="text" placeholder="e.g. Walima - Ali UniSoft" value={form.title} onChange={e => updateField('title', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
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

          {/* ── MEAL MODE SELECTOR ── */}
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

          {/* ── PACKAGE MODE ── */}
          {form.isMealIncluded && mode === 'package' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <div className="px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
                <div className="flex items-center gap-2">
                  <Package size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Select Package</h2>
                  {form.selectedPackageId && <span className="text-xs px-2.5 py-0.5 rounded-lg font-bold bg-green-100 text-green-700 ml-2">Active</span>}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2563EB' }} />
                    <input type="text" placeholder="Search packages..." value={packageSearch} onChange={e => setPackageSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                  </div>
                  <button type="button" onClick={() => openInlineModal('package', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50 shrink-0" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="p-3.5 max-h-[320px] overflow-y-auto space-y-3">
                {filteredPackages.map(pkg => {
                  const isSelected = form.selectedPackageId === pkg.id;
                  return (
                    <div key={pkg.id} className={`border-2 rounded-2xl p-5 transition-all ${isSelected ? 'border-[#2563EB] bg-amber-50/40 shadow-md' : 'border-gray-200 bg-white hover:border-[#D4A855]'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold">{pkg.name}</h4>
                          <span className="text-xs text-gray-500">Code: {pkg.code || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#2563EB]">{formatCurrency(pkg.finalPrice || pkg.baseTotal || 0)}</span>
                          <button type="button" onClick={() => selectPackage(pkg)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold ${isSelected ? 'bg-green-600 text-white' : 'bg-[#2563EB] text-white'}`}>
                            {isSelected ? '✓ Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MENU MODE ── */}
          {form.isMealIncluded && mode === 'menu' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
                <div className="flex items-center gap-2">
                  <Utensils size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Select Menus</h2>
                  {form.selectedMenus.filter(m => !m.fromPackage).length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-green-100 text-green-700 ml-2">
                      {form.selectedMenus.filter(m => !m.fromPackage).length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2563EB' }} />
                    <input type="text" placeholder="Search menus..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-sm" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                  </div>
                  <button type="button" onClick={() => openInlineModal('menu', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#CBD5E1', color: '#2563EB' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 max-h-96 overflow-y-auto">
                {filteredMenus.map(menu => {
                  const isInPackage = selectedPackage?.menus?.some(m => m.menuId === menu.id || m.id === menu.id);
                  const selected = form.selectedMenus.find(m => m.menuId === menu.id);
                  const isSelected = !!selected && !selected.fromPackage;
                  
                  return (
                    <div key={menu.id} className={`border rounded-xl p-4 transition-all ${isSelected ? 'border-[#2563EB] bg-amber-50/30' : isInPackage ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={isSelected || isInPackage} 
                            onChange={() => {
                              if (isInPackage) {
                                toast.info('This menu is already in the package');
                                return;
                              }
                              toggleMenu(menu);
                            }}
                            disabled={isInPackage}
                            className="w-5 h-5 rounded shrink-0" 
                            style={{ accentColor: isInPackage ? '#22C55E' : '#2563EB' }} 
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800">{menu.name}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(menu.price || menu.salePrice || 0)} / {menu.unit || 'plate'}</p>
                          </div>
                        </div>
                        {isInPackage && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-bold">📦 In Package</span>
                        )}
                        {isSelected && (
                          <div className="flex items-center gap-2 shrink-0">
                            <label className="text-sm text-gray-600">Qty:</label>
                            <input type="number" min="1" value={selected.quantity} onChange={(e) => updateMenuQty(menu.id, e.target.value)}
                              className="w-20 border rounded-lg px-3 py-1.5 text-sm" style={{ borderColor: '#CBD5E1' }} />
                            <span className="text-sm font-bold text-[#2563EB]">{formatCurrency(selected.totalPrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CUSTOM ITEMS MODE ── */}
          {form.isMealIncluded && mode === 'custom' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
                <div className="flex items-center gap-2">
                  <Settings size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Custom Items</h2>
                  {form.customItems.length > 0 && <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-blue-100 text-blue-700 ml-2">{form.customItems.length} added</span>}
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
                      { value: '', label: '📂 All Categories' },
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
                        // Check if item is in package
                        let isInPackage = false;
                        if (selectedPackage?.menus) {
                          selectedPackage.menus.forEach(menu => {
                            if (menu.items) {
                              menu.items.forEach(menuItem => {
                                if (menuItem.name?.toLowerCase() === item.name?.toLowerCase()) {
                                  isInPackage = true;
                                }
                              });
                            }
                          });
                        }
                        if (isInPackage) {
                          toast.warning(`"${item.name}" is already in the package!`);
                          return;
                        }
                        addCustomItem(item);
                        setCustomItemSelectValue('');
                      }
                    }}
                    options={filteredCustomItemsList.map(item => {
                      const alreadyAdded = form.customItems.some(i => i.itemId === item.id);
                      let isInPackage = false;
                      if (selectedPackage?.menus) {
                        selectedPackage.menus.forEach(menu => {
                          if (menu.items) {
                            menu.items.forEach(menuItem => {
                              if (menuItem.name?.toLowerCase() === item.name?.toLowerCase()) {
                                isInPackage = true;
                              }
                            });
                          }
                        });
                      }
                      return {
                        value: String(item.id),
                        label: `${alreadyAdded ? '✓ ' : ''}${item.name}${isInPackage ? ' 📦 (In Package)' : ''} — ${formatCurrency(item.salePrice || item.price || 0)}`,
                        isDisabled: alreadyAdded || isInPackage
                      };
                    })}
                    placeholder="Select an item to add..."
                    isSearchable={true}
                    isClearable={false}
                  />
                </div>

                {form.customItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border mb-2" style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{item.itemName}</p>
                      <p className="text-xs text-gray-500">{item.unit} @ {formatCurrency(item.unitPrice)}</p>
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
            </div>
          )}

          {/* ── SERVICES ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#CBD5E1' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 100%)', borderColor: '#CBD5E1' }}>
              <div className="flex items-center gap-2">
                <Tag size={18} style={{ color: '#2563EB' }} />
                <h2 className="font-bold text-base" style={{ color: '#0F172A' }}>Additional Services</h2>
                {form.services.filter(s => !s.fromPackage).length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 ml-2">
                    {form.services.filter(s => !s.fromPackage).length} selected
                  </span>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {servicesList.map(s => {
                  const selected = form.services.find(item => item.serviceId === s.id);
                  const isSelected = !!selected;
                  const isFromPackage = selected?.fromPackage || false;
                  const srvPrice = Number(s.salePrice || s.price || s.unitPrice || 0);
                  const isHourly = s.pricingType === 'HOURLY';

                  return (
                    <div key={s.id} className={`p-3 rounded-xl border transition-all ${
                      isSelected 
                        ? isFromPackage 
                          ? 'bg-green-50/70 border-green-500 shadow-sm ring-1 ring-green-500'
                          : 'bg-amber-50/70 border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleService(s)}
                            disabled={isFromPackage}
                            className="w-4 h-4 rounded shrink-0 cursor-pointer" 
                            style={{ accentColor: isFromPackage ? '#22C55E' : '#2563EB' }} 
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                              {s.name}
                              {isFromPackage && (
                                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold border border-green-200">
                                  📦 In Package
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
                      </div>

                      {isSelected && !isFromPackage && (
                        <div className="mt-2.5 pt-2 border-t border-amber-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500">Qty:</span>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => updateServiceQty(s.id, (selected?.quantity || 1) - 1)} className="w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50" style={{ borderColor: '#CBD5E1' }} disabled={(selected?.quantity || 1) <= 1}>−</button>
                              <span className="font-mono font-bold text-xs w-6 text-center">{selected?.quantity || 1}</span>
                              <button type="button" onClick={() => updateServiceQty(s.id, (selected?.quantity || 1) + 1)} className="w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50" style={{ borderColor: '#CBD5E1' }}>+</button>
                            </div>
                          </div>
                          {isHourly && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-500">Hours:</span>
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => updateServiceHours(s.id, (selected?.hours || 1) - 1)} className="w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50" style={{ borderColor: '#CBD5E1' }} disabled={(selected?.hours || 1) <= 1}>−</button>
                                <span className="font-mono font-bold text-xs w-6 text-center">{selected?.hours || 1}</span>
                                <button type="button" onClick={() => updateServiceHours(s.id, (selected?.hours || 1) + 1)} className="w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50" style={{ borderColor: '#CBD5E1' }}>+</button>
                              </div>
                            </div>
                          )}
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
              {/* Hall Rent */}
              {selectedHall && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Building2 size={14} /> Hall Rent {form.hallChargeMode === 'per_seat' ? `(×${form.guestCount})` : '(Fixed)'}</span>
                  <span className="font-mono font-medium">{formatCurrency(hallPrice)}</span>
                </div>
              )}

              {/* Package */}
              {form.isMealIncluded && selectedPackage && (
                <div className="flex justify-between text-gray-600 border-t pt-2" style={{ borderColor: '#CBD5E1' }}>
                  <span className="flex items-center gap-1.5"><Package size={14} /> Package: {selectedPackage.name}</span>
                  <span className="font-mono font-medium" style={{ color: '#2563EB' }}>
                    {formatCurrency(selectedPackage.finalPrice || selectedPackage.baseTotal || 0)}
                  </span>
                </div>
              )}

              {/* Individual Menus (jo package se nahi hain) */}
              {form.isMealIncluded && form.selectedMenus.filter(m => !m.fromPackage).length > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Utensils size={14} /> Menus ({form.selectedMenus.filter(m => !m.fromPackage).length})</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(form.selectedMenus.filter(m => !m.fromPackage).reduce((sum, m) => sum + Number(m.totalPrice || 0), 0))}
                  </span>
                </div>
              )}

              {/* Custom Items */}
              {form.isMealIncluded && form.customItems.length > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Settings size={14} /> Custom Items ({form.customItems.length})</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(form.customItems.reduce((sum, i) => sum + Number(i.totalPrice || 0), 0))}
                  </span>
                </div>
              )}

              {/* Extra Services (jo package se nahi hain) */}
              {form.services.filter(s => !s.fromPackage).length > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Tag size={14} /> Extra Services ({form.services.filter(s => !s.fromPackage).length})</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(form.services.filter(s => !s.fromPackage).reduce((sum, s) => sum + Number(s.totalPrice || 0), 0))}
                  </span>
                </div>
              )}

              {/* Subtotal */}
              <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: '#CBD5E1', color: '#0F172A' }}>
                <span>Subtotal</span>
                <span className="font-mono font-bold">{formatCurrency(baseTotal)}</span>
              </div>

              {/* Discount */}
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
                  <input type="number" min="0" value={form.discount} onChange={e => updateField('discount', e.target.value)}
                    className="w-20 border rounded-lg px-2 py-1 text-sm text-right font-mono" style={{ borderColor: '#CBD5E1' }} />
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Discount Amount</span>
                  <span className="font-mono font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {/* Tax Toggle */}
              <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: '#CBD5E1' }}>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                  <input type="checkbox" checked={form.taxEnabled} onChange={(e) => updateField('taxEnabled', e.target.checked)} className="w-5 h-5 accent-[#2563EB]" />
                  <Percent size={14} /> Apply Tax
                </label>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${form.taxEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {form.taxEnabled ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Tax Breakdown */}
              {taxBreakdown.length > 0 && taxBreakdown.map((tax, idx) => (
                <div key={tax.id || idx} className="flex justify-between text-gray-600 text-sm border-t pt-2" style={{ borderColor: '#CBD5E1' }}>
                  <span className="flex items-center gap-1.5"><Percent size={14} /> Tax ({tax.name} @ {tax.percent}%)</span>
                  <span className="font-mono font-medium">+{formatCurrency(tax.amount)}</span>
                </div>
              ))}

              {/* Grand Total */}
              <div className="flex justify-between text-lg font-bold border-t-2 pt-2" style={{ borderColor: '#CBD5E1', color: '#0F172A' }}>
                <span>Grand Total</span>
                <span className="font-mono text-lg" style={{ color: '#2563EB' }}>{formatCurrency(finalTotal)}</span>
              </div>

              {/* Advance */}
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1.5"><CreditCard size={14} /> Advance</span>
                <input type="number" min="0" value={form.advanceAmount || 0} onChange={e => updateField('advanceAmount', e.target.value)}
                  className="w-28 border rounded-lg px-2 py-1 text-sm text-right font-mono" style={{ borderColor: '#CBD5E1' }} />
              </div>

              {/* Due Balance */}
              <div className="flex justify-between font-bold rounded-xl px-3 py-2.5" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                <span className="flex items-center gap-1.5"><AlertCircle size={16} /> Due Balance</span>
                <span className="font-mono text-base">{formatCurrency(dueAmount)}</span>
              </div>
            </div>

            {/* ── Payment Mode ── */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: '#334155' }}>Payment Mode *</label>
              <ReactSelect
                value={form.paymentMode}
                onChange={(val) => {
                  updateField('paymentMode', val);
                  updateField('bankAccountId', '');
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

            {/* ── Bank Account ── */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#334155' }}>
                Receive Payment In Account *
                {form.paymentMode && <span className="ml-2 text-[10px] font-normal text-gray-500">({form.paymentMode} accounts only)</span>}
              </label>
              <ReactSelect
                value={form.bankAccountId}
                onChange={(val) => updateField('bankAccountId', val)}
                options={(() => {
                  const modeToAccountType = {
                    'Cash': 'CASH',
                    'Bank Transfer': 'BANK',
                    'JazzCash / EasyPaisa': 'JAZZCASH',
                    'Credit Card': 'CREDIT',
                    'Cheque': 'BANK'
                  };
                  const requiredType = form.paymentMode ? modeToAccountType[form.paymentMode] : null;
                  let filtered = bankAccounts;
                  if (requiredType) {
                    filtered = bankAccounts.filter(acc => acc.accountType === requiredType);
                  }
                  return filtered.map(acc => ({
                    value: String(acc.id),
                    label: `${acc.bankName || acc.accountName || 'Account'} — ${acc.accountNumber || 'N/A'} (Bal: ${formatCurrency(acc.currentBalance || 0)})`
                  }));
                })()}
                placeholder={form.paymentMode ? `Select ${form.paymentMode} Account` : '⚠️ First select Payment Mode'}
                isSearchable={true}
                isClearable={true}
                isDisabled={!form.paymentMode}
              />
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || slotInfo.hasError || !form.bankAccountId || !form.paymentMode}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}
            >
              <Save size={18} /> {loading ? 'Updating...' : 'Update Booking'}
            </button>

            {!form.paymentMode && (
              <p className="text-xs text-amber-600 text-center mt-2 font-medium">Please select Payment Mode first</p>
            )}
            {form.paymentMode && !form.bankAccountId && (
              <p className="text-xs text-red-500 text-center mt-2 font-medium">Please select an account to receive payment</p>
            )}
            {slotInfo.hasError && (
              <p className="text-xs text-red-500 text-center mt-2 font-medium">Fix slot error to proceed</p>
            )}
          </div>

        </div>
      </form>

      {/* ═══════ INLINE MODAL ═══════ */}
      {inlineModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-2xl border" style={{ borderColor: '#CBD5E1' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>New {inlineModal.type.charAt(0).toUpperCase() + inlineModal.type.slice(1)}</h2>
              <button onClick={closeInlineModal} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Name *</label>
                <input
                  value={inlineModal.data?.name || ''}
                  onChange={(e) => setInlineModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#334155' }}>Price (Rs)</label>
                <input
                  type="number"
                  value={inlineModal.data?.price || inlineModal.data?.salePrice || ''}
                  onChange={(e) => setInlineModal(prev => ({ ...prev, data: { ...prev.data, price: e.target.value } }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#CBD5E1' }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
              <button onClick={closeInlineModal} className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm">Cancel</button>
              <button
                onClick={() => {
                  if (!inlineModal.data?.name) { toast.error('Name is required'); return; }
                  handleInlineSave(inlineModal.type, { ...inlineModal.data, branchId, companyId });
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#2563EB] to-[#2563EB]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BookingEdit;