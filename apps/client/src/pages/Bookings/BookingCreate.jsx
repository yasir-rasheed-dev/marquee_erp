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
  Edit3, Armchair, BoxSelect, Percent
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
  const itemsList = menu.items || menu.menu?.items || [];
  if (Array.isArray(itemsList) && itemsList.length > 0) return itemsList;

  const categoriesList = menu.categories || menu.menu?.categories || [];
  if (Array.isArray(categoriesList) && categoriesList.length > 0) {
    let allCatItems = [];
    categoriesList.forEach(cat => {
      const catItems = cat.items || cat.menuItems || cat.dishes || [];
      allCatItems = [...allCatItems, ...catItems];
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
      return matchedGlobalMenu.items;
    }
    if (matchedGlobalMenu.categories && Array.isArray(matchedGlobalMenu.categories)) {
      let catItems = [];
      matchedGlobalMenu.categories.forEach(cat => {
        const items = cat.items || cat.menuItems || cat.dishes || [];
        catItems = [...catItems, ...items];
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
  accentColor: '#A97A1F',
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
    companyId
  });

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
        setPackages(extractData(pRes));
        setMenus(extractData(mRes));
        setItems(extractData(iRes));
        setHalls(extractData(hRes));
        setCustomers(extractData(cRes));
        setServicesList(extractData(sRes));
        setEvents(extractData(eRes));
        setExistingBookings(extractData(bRes));
        setTaxRates(extractData(tRes));
        setBankAccounts(extractData(aRes));
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
  const selectedPackage = useMemo(() =>
    packages.find(p => p.id === form.selectedPackageId),
    [packages, form.selectedPackageId]
  );

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

  const baseTotal = useMemo(() => hallPrice + mealTotal + servicesTotal, [hallPrice, mealTotal, servicesTotal]);

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

  /* ── Package ── */
  const selectPackage = (pkg) => {
  // Compute total guests from menus
  const totalGuests = (pkg.menus || []).reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);
  const hall = halls.find(h => h.id === Number(form.hallId));
  const hallCap = Number(hall?.capacity || 0);

  if (hallCap > 0 && totalGuests > hallCap) {
    toast.error(`Package guest count (${totalGuests}) exceeds hall capacity (${hallCap})`);
    return;
  }

  setForm(prev => ({
    ...prev,
    selectedPackageId: prev.selectedPackageId === pkg.id ? null : pkg.id,
    eventType: pkg.eventType || prev.eventType,
    guestCount: totalGuests || prev.guestCount,
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
  const serviceId = service.id || service.serviceId;
  const exists = form.services.find(s => s.serviceId === serviceId);
  if (exists) {
    setForm(prev => ({ ...prev, services: prev.services.filter(s => s.serviceId !== serviceId) }));
  } else {
    const unitPrice = Number(service.salePrice || service.price || 0);
    setForm(prev => ({
      ...prev,
      services: [...prev.services, {
        serviceId: serviceId,
        serviceName: service.name || service.serviceName,
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
        <td style="padding:2px 0;font-size:10px;text-align:center;">${p.mode?.replace('_',' ').toUpperCase()}</td>
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
    if (!form.bankAccountId) {
      toast.error('Please select a bank account to receive payment');
      return;
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
        if (selectedPackage && selectedPackage.menus?.length) {
          const pkgMenus = selectedPackage.menus.map(m => ({
  menuId: m.menuId || m.id,
  menuName: m.name || m.menuName || 'Menu',
  quantity: Number(m.quantity) || 1,
  unitPrice: Number(m.price || m.unitPrice || 0),
  totalPrice: Number(m.totalPrice || (m.price * (m.quantity || 1))),
  unit: m.unit || 'plate',
  notes: null
})).filter(m => m.menuId && Number(m.menuId) > 0);
          payloadMenus = [...payloadMenus, ...pkgMenus];
        }

        const addedMenus = form.selectedMenus.filter(m => m.menuId && Number(m.menuId) > 0);
        payloadMenus = [...payloadMenus, ...addedMenus];

        if (selectedPackage && selectedPackage.services?.length) {
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
      }

      const seenMenuIds = new Set();
      payloadMenus = payloadMenus.filter(m => {
        const id = m.menuId;
        if (seenMenuIds.has(id)) return false;
        seenMenuIds.add(id);
        return true;
      });

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
  paidAmount: Number(form.paidAmount),
  advanceAmount: Number(form.advanceAmount),
  dueAmount: Math.max(0, Number(form.totalAmount) - Number(form.advanceAmount || 0)),
  // ✅ FIXED CODE - Hamesha discountAmount save karo
discount: Number(discountAmount),  // 1,000 (percent) ya 500 (fixed)
  taxEnabled: form.taxEnabled,
  taxRateId: form.taxEnabled && activeTaxRates.length > 0 ? activeTaxRates[0].id : null,
  taxRate: taxRatePercent,
  taxAmount: Number(taxAmount),
  paymentMode: form.paymentMode,
  status: form.status,
  paymentStatus: dueAmount <= 0 ? 'paid' : (form.advanceAmount > 0 ? 'partial' : 'pending'),
  branchId: parseInt(branchId),
  companyId: parseInt(companyId),
  bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : null,
  // ── FIXED: Added packageTotal and selectedPackage ──
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
  // ── END FIX ──
  menus: payloadMenus,
  customItems: form.customItems.map(i => ({
  itemId: i.itemId,
  itemName: i.itemName,
  quantity: Number(i.quantity) || 1,
  unitPrice: Number(i.unitPrice) || 0,
  totalPrice: Number(i.totalPrice) || 0,
  unit: i.unit || 'pcs',
  notes: i.displayNote || i.note || null
})),
  services: payloadServices
};
console.log('📤 FINAL PAYLOAD customItems:', payload.customItems);
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
        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-2xl border" style={{ borderColor: '#E0D8CC' }}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#E0D8CC' }}>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
              {isEdit ? 'Edit' : 'New'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </h2>
            <button onClick={closeInlineModal} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Name *</label>
              <input value={localForm.name} onChange={e => setLocalForm({ ...localForm, name: e.target.value })}
                className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
            </div>

            {type === 'menu' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Price (Rs)</label>
                    <input type="number" value={localForm.price} onChange={e => setLocalForm({ ...localForm, price: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Unit</label>
                    <input value={localForm.unit} onChange={e => setLocalForm({ ...localForm, unit: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Category</label>
                  <input value={localForm.category} onChange={e => setLocalForm({ ...localForm, category: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                </div>
              </>
            )}

            {type === 'item' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Sale Price (Rs)</label>
                    <input type="number" value={localForm.salePrice} onChange={e => setLocalForm({ ...localForm, salePrice: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Unit</label>
                    <input value={localForm.unit} onChange={e => setLocalForm({ ...localForm, unit: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }}>
                  <input type="checkbox" checked={localForm.isBulkUnit} onChange={e => setLocalForm({ ...localForm, isBulkUnit: e.target.checked })}
                    className="w-5 h-5 accent-[#A97A1F]" />
                  <span className="text-sm font-bold text-gray-700">Is Bulk Unit (e.g., Degh)</span>
                </div>
                {localForm.isBulkUnit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Conversion Rate</label>
                      <input type="number" value={localForm.conversionRate} onChange={e => setLocalForm({ ...localForm, conversionRate: e.target.value })}
                        className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Sub Unit Name</label>
                      <input value={localForm.subUnitName} onChange={e => setLocalForm({ ...localForm, subUnitName: e.target.value })}
                        className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                    </div>
                  </div>
                )}
              </>
            )}

            {type === 'service' && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Price (Rs)</label>
                  <input type="number" value={localForm.price} onChange={e => setLocalForm({ ...localForm, price: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Description</label>
                  <textarea value={localForm.description} onChange={e => setLocalForm({ ...localForm, description: e.target.value })}
                    rows={2} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" style={{ borderColor: '#E0D8CC' }} />
                </div>
              </>
            )}

            {type === 'package' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Code</label>
                    <input value={localForm.code} onChange={e => setLocalForm({ ...localForm, code: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Event Type</label>
                    <input value={localForm.eventType} onChange={e => setLocalForm({ ...localForm, eventType: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Guest Count</label>
                    <input type="number" value={localForm.guestCount} onChange={e => setLocalForm({ ...localForm, guestCount: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#4A4A4A' }}>Final Price</label>
                    <input type="number" value={localForm.finalPrice} onChange={e => setLocalForm({ ...localForm, finalPrice: e.target.value })}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#F0ECE6' }}>
            <button onClick={closeInlineModal} className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-[#A97A1F] to-[#C89B3C]">
              {isEdit ? 'Update' : 'Create'} {type}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────────── RENDER ─────────────────── */
  if (fetching) return (
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
                  <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Create New Booking</h1>
                  <p className="text-xs font-medium" style={{ color: '#7A7A7A' }}>Hall + Package + Menu + Custom | Inline Edit</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrintA4} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                <Printer size={16} /> Print A4
              </button>
              <button onClick={handlePrintThermal} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-all" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
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
                    <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
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
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#4A4A4A' }}>Customer Type *</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { key: 'individual', label: 'Individual', icon: Users },
                        { key: 'organization', label: 'Organization', icon: Building2 },
                      ].map(type => (
                        <label key={type.key} className={`cursor-pointer border-2 rounded-xl p-2 text-center transition-all ${newCustomer.customerType === type.key ? 'border-[#A97A1F] bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          <input type="radio" name="newCustType" className="hidden" checked={newCustomer.customerType === type.key} onChange={() => setNewCustomer({ ...newCustomer, customerType: type.key })} />
                          <type.icon size={14} className="mx-auto mb-1" style={{ color: newCustomer.customerType === type.key ? '#A97A1F' : '#9CA3AF' }} />
                          <span className="text-[10px] font-bold block">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Full Name *" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="Phone *" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="CNIC" value={newCustomer.cnic} onChange={e => setNewCustomer({ ...newCustomer, cnic: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="City" value={newCustomer.city} onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                    <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                  </div>

                  {newCustomer.customerType !== 'individual' && (
                    <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 size={16} className="text-blue-700" />
                        <span className="text-xs font-bold text-blue-900 uppercase">Organization Details</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" placeholder="Business / Org Name *" value={newCustomer.businessName} onChange={e => setNewCustomer({ ...newCustomer, businessName: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ borderColor: '#E0D8CC' }} />
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
                        <input type="text" placeholder="Billing Address" value={newCustomer.billingAddress} onChange={e => setNewCustomer({ ...newCustomer, billingAddress: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: '#E0D8CC' }} />
                      </div>
                      <div className="border-t border-blue-200 pt-3">
                        <span className="text-[11px] font-bold text-blue-900 uppercase block mb-2">Primary Contact Person</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" placeholder="Contact Name" value={newCustomer.contactPersonName} onChange={e => setNewCustomer({ ...newCustomer, contactPersonName: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                          <input type="text" placeholder="Contact Phone" value={newCustomer.contactPersonPhone} onChange={e => setNewCustomer({ ...newCustomer, contactPersonPhone: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm font-mono" style={{ borderColor: '#E0D8CC' }} />
                          <input type="text" placeholder="Designation" value={newCustomer.contactPersonDesignation} onChange={e => setNewCustomer({ ...newCustomer, contactPersonDesignation: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="number" placeholder="Credit Limit (Rs)" value={newCustomer.creditLimit} onChange={e => setNewCustomer({ ...newCustomer, creditLimit: e.target.value })} className="border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: '#E0D8CC' }} />
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
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Emergency Contact Persons (2 Recommended)</p>
                    {newCustomer.emergencyContacts.map((ec, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder={`Contact ${idx + 1} Name`} value={ec.name}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].name = e.target.value; setNewCustomer({ ...newCustomer, emergencyContacts: updated }); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#E0D8CC' }} />
                        <input type="text" placeholder="Relation" value={ec.relation}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].relation = e.target.value; setNewCustomer({ ...newCustomer, emergencyContacts: updated }); }}
                          className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: '#E0D8CC' }} />
                        <input type="text" placeholder="Phone Number" value={ec.phone}
                          onChange={e => { const updated = [...newCustomer.emergencyContacts]; updated[idx].phone = e.target.value; setNewCustomer({ ...newCustomer, emergencyContacts: updated }); }}
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
                  <div className="flex gap-2">
                    <ReactSelect
                      value={form.eventType}
                      onChange={(val) => updateField('eventType', val)}
                      options={events.map(ev => ({ value: ev.name, label: ev.name }))}
                      placeholder="Select Event"
                      isSearchable={true}
                      isClearable={true}
                    />
                    <button type="button" onClick={() => openInlineModal('event', 'create')} className="px-3 py-2.5 rounded-xl border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }} title="Add New Event">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Hall *</label>
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

              {slotInfo.message && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${slotInfo.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                  slotInfo.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                  <AlertCircle size={18} /> <span>{slotInfo.message}</span>
                </div>
              )}

              {selectedHall && (
                <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} style={{ color: '#A97A1F' }} />
                      <span className="font-bold text-sm text-gray-800">Hall Pricing Mode</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-blue-100 text-blue-700">
                      Capacity: {hallCapacity} | Remaining: {slotInfo.remaining}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer border-2 rounded-xl p-3 transition-all ${form.hallChargeMode === 'per_seat' ? 'border-[#A97A1F] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input type="radio" name="hallChargeMode" checked={form.hallChargeMode === 'per_seat'} onChange={() => updateField('hallChargeMode', 'per_seat')} className="accent-[#A97A1F]" />
                        <Armchair size={16} style={{ color: '#A97A1F' }} />
                        <span className="font-bold text-sm">Per Seat</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">Rs {Number(selectedHall.perSeatPrice || selectedHall.price || 0).toLocaleString()} × {form.guestCount || 0} guests</p>
                      <p className="text-sm font-bold ml-6 mt-1" style={{ color: '#A97A1F' }}>= {formatCurrency(Number(selectedHall.perSeatPrice || selectedHall.price || 0) * (Number(form.guestCount) || 0))}</p>
                    </label>
                    <label className={`cursor-pointer border-2 rounded-xl p-3 transition-all ${form.hallChargeMode === 'full_hall' ? 'border-[#A97A1F] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input type="radio" name="hallChargeMode" checked={form.hallChargeMode === 'full_hall'} onChange={() => updateField('hallChargeMode', 'full_hall')} className="accent-[#A97A1F]" />
                        <BoxSelect size={16} style={{ color: '#A97A1F' }} />
                        <span className="font-bold text-sm">Full Hall (Fixed)</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">Fixed charge regardless of guests</p>
                      <p className="text-sm font-bold ml-6 mt-1" style={{ color: '#A97A1F' }}>= {formatCurrency(Number(selectedHall.price || 0))}</p>
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

          {form.isMealIncluded && (
            <div className="bg-white rounded-2xl border p-1.5 flex gap-1.5 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              {[
                { key: 'package', label: 'Package', icon: Package },
                { key: 'menu', label: 'Menu', icon: Utensils },
                { key: 'custom', label: 'Custom Items', icon: Settings }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setMode(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === tab.key ? 'text-white shadow-md' : 'text-gray-600 hover:bg-amber-50'}`}
                  style={mode === tab.key ? { background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' } : {}}>
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ── PACKAGE MODE (Collapsible Details) ── */}
          {form.isMealIncluded && mode === 'package' && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <div className="px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
                <div className="flex items-center gap-2">
                  <Package size={18} style={{ color: '#A97A1F' }} />
                  <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Select & Customize Package</h2>
                  {form.selectedPackageId && <span className="text-xs px-2.5 py-0.5 rounded-lg font-bold bg-green-100 text-green-700 ml-2">Active Package</span>}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A97A1F' }} />
                    <input type="text" placeholder="Search packages..." value={packageSearch} onChange={e => setPackageSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
                  </div>
                  <button type="button" onClick={() => openInlineModal('package', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50 shrink-0" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="p-3.5 max-h-[320px] overflow-y-auto space-y-3">
                {packages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-3">No packages found.</p>
                    <button type="button" onClick={() => openInlineModal('package', 'create')} className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#A97A1F] to-[#C89B3C]">Create Package</button>
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
                          className={`border-2 rounded-2xl p-5 transition-all ${isSelected ? 'border-[#A97A1F] bg-amber-50/40 shadow-md ring-1 ring-[#A97A1F]' : 'border-gray-200 bg-white hover:border-[#D4A855]'}`}>

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
                              <span className="font-extrabold text-lg text-[#A97A1F]">{formatCurrency(pkg.finalPrice || pkg.baseTotal || 0)}</span>
                              <button type="button" onClick={() => selectPackage(pkg)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${isSelected ? 'bg-green-600 text-white' : 'bg-[#A97A1F] text-white hover:bg-[#8e6518]'}`}>
                                {isSelected ? '✓ Selected' : 'Select Package'}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); navigate('/menus/packages'); }} className="p-2 rounded-xl border hover:bg-gray-50 text-[#A97A1F]" style={{ borderColor: '#E0D8CC' }} title="Go to Package Management">
                                <Edit3 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Toggle Details Button */}
                          <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setExpandedMenus(prev => ({ ...prev, [`pkg-${pkg.id}`]: !isDetailsOpen }))}
                              className="text-xs font-bold text-[#A97A1F] hover:underline flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
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
                              <div className="p-3.5 rounded-xl border bg-white/80 space-y-2" style={{ borderColor: '#E0D8CC' }}>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                  <Utensils size={14} className="text-[#A97A1F]" /> Included Menus & Items
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
                                            <span className="text-[#A97A1F]">{formatCurrency(menuTotalPrice)}</span>
                                          </div>
                                          {combinedItems.length > 0 ? (
                                            <div className="pl-2 border-l-2 border-[#A97A1F]/40 text-gray-600 text-[11px] space-y-0.5 mt-1">
                                              {combinedItems.map((subItem, sIdx) => {
                                                const q = subItem.quantityPerHead ?? subItem.quantity ?? subItem.qty ?? subItem.pivot?.quantity ?? 1;
                                                return (
                                                  <div key={sIdx} className="flex justify-between">
                                                    <span>• {subItem.name || subItem.itemName}</span>
                                                    <span className="font-mono text-gray-500">{q} {subItem.unit || 'plate'}</span>
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

                              <div className="p-3.5 rounded-xl border bg-white/80 space-y-2" style={{ borderColor: '#E0D8CC' }}>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-[#A97A1F]" /> Included Services
                                </span>
                                {pkg.services && pkg.services.length > 0 ? (
                                  <div className="space-y-1.5 mt-2">
                                    {pkg.services.map((srv, sIdx) => {
                                      const srvPrice = Number(srv.totalPrice || srv.salePrice || srv.price || srv.unitPrice || 0);
                                      const srvQty = srv.quantity || srv.qty || 1;
                                      return (
                                        <div key={sIdx} className="text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 flex justify-between items-center">
                                          <span className="font-semibold text-gray-800">
                                            {srv.name || srv.serviceName} {srvQty > 1 ? `(×${srvQty})` : ''}
                                          </span>
                                          <span className="font-bold text-[#A97A1F]">{formatCurrency(srvPrice)}</span>
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
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
                <div className="flex items-center gap-2">
                  <Utensils size={18} style={{ color: '#A97A1F' }} />
                  <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Select Saved Menus</h2>
                  {form.selectedMenus.length > 0 && <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-green-100 text-green-700 ml-2">{form.selectedMenus.length} selected</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A97A1F' }} />
                    <input type="text" placeholder="Search menus..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC', backgroundColor: '#FAF8F4' }} />
                  </div>
                  <button type="button" onClick={() => openInlineModal('menu', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 max-h-96 overflow-y-auto">
                {menus.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-3">No menus found.</p>
                    <button type="button" onClick={() => openInlineModal('menu', 'create')} className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#A97A1F] to-[#C89B3C]">Create Menu</button>
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
                        <div key={menu.id} className={`border rounded-xl p-4 transition-all ${selected ? 'border-[#A97A1F] bg-amber-50/30' : 'border-gray-200 hover:border-[#D4A855]'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <input type="checkbox" checked={!!selected} onChange={() => toggleMenu(menu)} className="w-5 h-5 rounded focus:ring-[#A97A1F] shrink-0" style={{ accentColor: '#A97A1F' }} />
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
                                    className="w-20 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20" style={{ borderColor: '#E0D8CC' }} />
                                  <span className="text-sm font-bold w-20 text-right" style={{ color: '#A97A1F' }}>{formatCurrency(selected.totalPrice)}</span>
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
                                className="text-[11px] font-bold text-[#A97A1F] hover:underline flex items-center gap-1"
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
                                  return (
                                    <span key={idx} className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                      • {item.name || item.itemName} ({itemQty} {item.unit || 'plate'})
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
            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
                <div className="flex items-center gap-2">
                  <Settings size={18} style={{ color: '#A97A1F' }} />
                  <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Add Custom Items</h2>
                </div>
                <button type="button" onClick={() => openInlineModal('item', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
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
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: '#FAF8F4', borderColor: '#E0D8CC' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.unit} @ {formatCurrency(item.unitPrice)}</p>
                          {item.displayNote && <p className="text-[10px] text-gray-400 italic">{item.displayNote}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateCustomItem(idx, 'quantity', e.target.value)}
                            className="w-16 border rounded-lg px-2 py-1 text-sm text-center" style={{ borderColor: '#E0D8CC' }} />
                          <span className="font-bold text-sm text-[#A97A1F] w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                          <button type="button" onClick={() => removeCustomItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EXTRA SERVICES (Compact Modern Design) ── */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <div className="flex items-center gap-2">
                <Tag size={18} style={{ color: '#A97A1F' }} />
                <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Additional Services</h2>
                {form.services.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 ml-2">{form.services.length} selected</span>}
              </div>
              <button type="button" onClick={() => openInlineModal('service', 'create')} className="px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-amber-50" style={{ borderColor: '#E0D8CC', color: '#A97A1F' }}>
                <Plus size={16} /> New Service
              </button>
            </div>
            <div className="p-4">
              {servicesList.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-3">No services configured.</p>
                  <button type="button" onClick={() => openInlineModal('service', 'create')} className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#A97A1F] to-[#C89B3C]">Create Service</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {servicesList.map(s => {
                    const isSelected = form.services.some(item => item.serviceId === s.id);
                    const selected = form.services.find(item => item.serviceId === s.id);
                    const isDescOpen = expandedMenus[`service-${s.id}`] || false;
                    const srvPrice = Number(s.salePrice || s.price || s.unitPrice || 0);

                    return (
                      <div key={s.id} className={`p-3 rounded-xl border transition-all ${isSelected ? 'bg-amber-50/70 border-[#A97A1F] shadow-sm ring-1 ring-[#A97A1F]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onClick={() => toggleService(s)}>
                            <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-4 h-4 rounded shrink-0 cursor-pointer" style={{ accentColor: '#A97A1F' }} />
                            <div className="min-w-0">
                              <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{s.name}</p>
                              <p className="text-xs font-mono font-bold text-[#A97A1F]">{formatCurrency(srvPrice)}</p>
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
                            <button type="button" onClick={(e) => { e.stopPropagation(); openInlineModal('service', 'edit', s); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-amber-50 text-amber-700" title="Edit Service">
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </div>

                        {isDescOpen && s.description && (
                          <p className="text-[11px] text-gray-600 mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200 animate-in fade-in duration-200">
                            {s.description}
                          </p>
                        )}

                        {isSelected && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-600">Qty:</span>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={(e) => { e.stopPropagation(); updateServiceQty(s.id, (selected?.quantity || 1) - 1); }} className="w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50" style={{ borderColor: '#E0D8CC' }}>-</button>
                              <span className="font-mono font-bold text-xs w-6 text-center">{selected?.quantity || 1}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); updateServiceQty(s.id, (selected?.quantity || 1) + 1); }} className="w-6 h-6 rounded border bg-white flex items-center justify-center text-xs font-bold hover:bg-gray-50" style={{ borderColor: '#E0D8CC' }}>+</button>
                              <span className="font-mono text-xs font-bold text-[#A97A1F] ml-2">= {formatCurrency(selected?.totalPrice || 0)}</span>
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
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(169,122,31,0.08) 0%, transparent 100%)', borderColor: '#E0D8CC' }}>
              <Upload size={18} style={{ color: '#A97A1F' }} />
              <h2 className="font-bold text-base" style={{ color: '#1A1A1A' }}>Attachments</h2>
            </div>
            <div className="p-5">
              <div className="border-2 border-dashed rounded-xl p-6 text-center transition-all hover:border-[#A97A1F]" style={{ borderColor: '#E0D8CC' }}>
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
                    <div key={idx} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} style={{ color: '#A97A1F' }} />
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
          <div className="bg-white rounded-2xl border p-6 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              <Receipt size={20} style={{ color: '#A97A1F' }} /> Financial Summary
            </h3>

            <div className="space-y-3 text-sm">
              {selectedHall && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} />
                    Hall Rent {form.hallChargeMode === 'per_seat' ? `(×${form.guestCount})` : '(Fixed)'}
                  </span>
                  <span className="font-mono font-medium">{formatCurrency(hallPrice)}</span>
                </div>
              )}

              {form.isMealIncluded && selectedPackage && (
                <div className="flex justify-between text-gray-600 border-t pt-2" style={{ borderColor: '#E0D8CC' }}>
                  <span className="flex items-center gap-1.5"><Package size={14} /> Package</span>
                  <span className="font-mono font-medium">{formatCurrency(packageMealTotal)}</span>
                </div>
              )}

              {form.isMealIncluded && form.selectedMenus.length > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Utensils size={14} /> Added Menus ({form.selectedMenus.length})</span>
                  <span className="font-mono font-medium">{formatCurrency(menuMealTotal)}</span>
                </div>
              )}

              {form.isMealIncluded && form.customItems.length > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Settings size={14} /> Custom Items ({form.customItems.length})</span>
                  <span className="font-mono font-medium">{formatCurrency(customMealTotal)}</span>
                </div>
              )}

              {form.services.length > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5"><Tag size={14} /> Services ({form.services.length})</span>
                  <span className="font-mono font-medium">{formatCurrency(servicesTotal)}</span>
                </div>
              )}

              <div className="border-t pt-2 flex justify-between text-gray-600" style={{ borderColor: '#E0D8CC' }}>
                <span>Subtotal</span>
                <span className="font-mono font-medium">{formatCurrency(baseTotal + discountAmount)}</span>
              </div>

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
                    className="w-20 border rounded-lg px-2 py-1 text-sm text-right font-mono" style={{ borderColor: '#E0D8CC' }} />
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Discount Amount</span>
                  <span className="font-mono font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: '#E0D8CC' }}>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.taxEnabled}
                    onChange={(e) => updateField('taxEnabled', e.target.checked)}
                    className="w-5 h-5 accent-[#A97A1F]"
                  />
                  <Percent size={14} /> Apply Tax
                </label>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${form.taxEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {form.taxEnabled ? 'ON' : 'OFF'}
                </span>
              </div>

              {taxBreakdown.length > 0 && taxBreakdown.map((tax, idx) => (
                <div key={tax.id || idx} className="flex justify-between text-gray-600 text-sm border-t pt-2" style={{ borderColor: '#E0D8CC' }}>
                  <span className="flex items-center gap-1.5">
                    <Percent size={14} /> Tax ({tax.name} @ {tax.percent}%)
                  </span>
                  <span className="font-mono font-medium">+{formatCurrency(tax.amount)}</span>
                </div>
              ))}

              <div className="flex justify-between text-lg font-bold border-t-2 pt-2" style={{ borderColor: '#E0D8CC', color: '#1A1A1A' }}>
                <span>Grand Total</span>
                <span className="font-mono text-lg" style={{ color: '#A97A1F' }}>{formatCurrency(finalTotal)}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1.5"><CreditCard size={14} /> Advance</span>
                <input type="number" min="0" value={form.advanceAmount} onChange={e => updateField('advanceAmount', e.target.value)}
                  className="w-28 border rounded-lg px-2 py-1 text-sm text-right font-mono" style={{ borderColor: '#E0D8CC' }} />
              </div>

              <div className="flex justify-between font-bold rounded-xl px-3 py-2.5" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                <span className="flex items-center gap-1.5"><AlertCircle size={16} /> Due Balance</span>
                <span className="font-mono text-base">{formatCurrency(dueAmount)}</span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: '#4A4A4A' }}>Payment Mode</label>
                <ReactSelect
                  value={form.paymentMode}
                  onChange={(val) => updateField('paymentMode', val)}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'JazzCash / EasyPaisa', label: 'JazzCash / EasyPaisa' },
                    { value: 'Credit Card', label: 'Credit Card' },
                    { value: 'Cheque', label: 'Cheque' }
                  ]}
                  placeholder="Select Payment Mode"
                  isSearchable={true}
                  isClearable={false}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#4A4A4A' }}>Receive Payment In Account *</label>
              <ReactSelect
                value={form.bankAccountId}
                onChange={(val) => updateField('bankAccountId', val)}
                options={bankAccounts.map(acc => ({
                  value: String(acc.id),
                  label: `${acc.bankName} — ${acc.accountNumber} (Bal: ${formatCurrency(acc.currentBalance)})`
                }))}
                placeholder="Select Bank Account"
                isSearchable={true}
                isClearable={true}
              />
            </div>

            <button type="submit" disabled={loading || slotInfo.hasError || !form.bankAccountId}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #A97A1F, #C89B3C)' }}>
              <Save size={18} /> {loading ? 'Creating...' : 'Create Booking'}
            </button>

            {slotInfo.hasError && (
              <p className="text-xs text-red-500 text-center mt-2 font-medium">Fix slot error to proceed</p>
            )}
          </div>

          {/* ── Booking Preview ── */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#E0D8CC' }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              <History size={20} style={{ color: '#A97A1F' }} /> Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                <span className="text-gray-500 text-xs block">Customer</span>
                <p className="font-semibold">{selectedCustomer?.businessName ? `${selectedCustomer.businessName} (${selectedCustomer.name})` : (selectedCustomer?.name || newCustomer.name || form.guestName || 'Not selected')}</p>
                <p className="text-xs text-gray-500">{selectedCustomer?.phone || newCustomer.phone || form.guestPhone || ''}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                <span className="text-gray-500 text-xs block">Event & Hall</span>
                <p className="font-semibold">{form.eventType || 'N/A'} @ {selectedHall?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{form.hallChargeMode === 'full_hall' ? 'Full Hall Booking' : `Per Seat — ${form.guestCount || 0} guests`}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                <span className="text-gray-500 text-xs block">Date & Time</span>
                <p className="font-semibold">{form.eventDate ? new Date(form.eventDate).toLocaleDateString() : 'N/A'} | {form.startTime}-{form.endTime}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
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
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl border" style={{ borderColor: '#E0D8CC' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#E0D8CC' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C]">
                  <Gem size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{pkgModalData.name}</h2>
                  <p className="text-xs text-gray-500">Code: {pkgModalData.code}</p>
                </div>
              </div>
              <button onClick={() => setPkgModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-all"><X size={20} style={{ color: '#4A4A4A' }} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                  <span className="text-gray-500 text-xs block">Event Type</span>
                  <p className="font-bold">{pkgModalData.eventType}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                  <span className="text-gray-500 text-xs block">Status</span>
                  <p className="font-bold">{pkgModalData.status}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                  <span className="text-gray-500 text-xs block">Guest Count</span>
                  <p className="font-bold">{pkgModalData.guestCount || 'N/A'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                  <span className="text-gray-500 text-xs block">Base Total</span>
                  <p className="font-bold font-mono">{formatCurrency(pkgModalData.baseTotal)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid #E0D8CC' }}>
                  <span className="text-gray-500 text-xs block">Discount</span>
                  <p className="font-bold font-mono">{pkgModalData.discountPercent || 0}%</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <span className="text-gray-500 text-xs block">Final Price</span>
                  <p className="font-bold font-mono" style={{ color: '#A97A1F' }}>{formatCurrency(pkgModalData.finalPrice)}</p>
                </div>
              </div>

              {pkgModalData.menus && pkgModalData.menus.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                    <Utensils size={16} style={{ color: '#A97A1F' }} /> Included Menus & Dishes
                  </h4>
                  <div className="space-y-3">
                    {pkgModalData.menus.map((menu, idx) => {
                      const mItems = getMenuDetailedItemsWithQty(menu, menus);
                      return (
                        <div key={menu.id ?? `menu-${idx}`} className="rounded-xl overflow-hidden border" style={{ borderColor: '#E0D8CC' }}>
                          <button type="button" onClick={() => toggleMenuExpand(menu.id ?? `idx-${idx}`)}
                            className="w-full flex items-center justify-between p-3 text-left transition-all hover:bg-amber-50/30" style={{ backgroundColor: '#FAF8F4' }}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-800">{menu.name || menu.menuName}</span>
                              <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
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
                                      <div key={iidx} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg" style={{ backgroundColor: '#FAF8F4' }}>
                                        <span className="text-gray-700">• {item.name || item.itemName}</span>
                                        <span className="font-mono text-xs font-medium" style={{ color: '#A97A1F' }}>
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
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                    <Tag size={16} style={{ color: '#A97A1F' }} /> Extra Services
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {pkgModalData.services.map((svc, idx) => {
                      const srvPrice = Number(svc.totalPrice || svc.salePrice || svc.price || svc.unitPrice || 0);
                      return (
                        <span key={idx} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                          {svc.name || svc.serviceName} — {formatCurrency(srvPrice)}
                        </span>
                      );
                    })}
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