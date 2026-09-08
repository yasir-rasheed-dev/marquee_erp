// ═══════════════════════════════════════════════════════════
// pages/Packages/PackageManagement.jsx
// (Menu Items Preview, Extras/Cheese, Saved + Custom Services + Pagination)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Package, ChevronDown, ChevronUp,
  Calculator, Tag, DollarSign, Percent, Utensils, Sparkles, Check, 
  AlertCircle, Filter, Layers, BookmarkCheck, LayoutGrid, Table as TableIcon,
  Clock, Briefcase, ChevronLeft, ChevronRight
} from 'lucide-react';
import packageApi from '../../services/packageApi';
import menuApi from '../../services/menuApi';
import eventApi from '../../services/eventApi';
import serviceApi from '../../services/serviceApi';
import { useBranch } from '../../context/BranchContext';
import ReactSelect from '../../components/ui/ReactSelect';

// ==================== TOAST SYSTEM ====================
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id}
          className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold min-w-[280px]"
          style={{
            background: t.type === 'success' ? 'linear-gradient(135deg, #1B5E20, #2E7D32)' : 'linear-gradient(135deg, #B71C1C, #D32F2F)'
          }}>
          {t.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
  return { addToast, ToastContainer };
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const DEFAULT_EXTRA = { name: '', description: '', costPrice: '', salePrice: '' };
const DEFAULT_SERVICE = { serviceId: '', name: '', description: '', pricingType: 'FIXED', costPrice: '', salePrice: '', quantity: 1, hours: '' };

export default function PackageManagement() {
  const { currentBranch } = useBranch();
  const { addToast, ToastContainer } = useToast();

  const [packages, setPackages] = useState([]);
  const [masterMenus, setMasterMenus] = useState([]);
  const [masterEvents, setMasterEvents] = useState([]);
  const [masterServices, setMasterServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('grid');

  // ==================== FILTER STATES ====================
  const [search, setSearch] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minGuests, setMinGuests] = useState('');

  // ==================== PAGINATION STATES ====================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});

  const initialFormState = {
    name: '',
    code: '',
    eventType: '',
    status: 'active',
    description: '',
    discountPct: '0',
    menus: [],
    extras: [],
    services: []
  };

  const [form, setForm] = useState(initialFormState);

  // Fetch Data
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const branchId = currentBranch?.id || 1;
        const [pkgRes, menuRes, eventRes, svcRes] = await Promise.all([
          packageApi.getAll({ branchId }),
          menuApi.getAll({ status: 'active', branchId }),
          eventApi.getAll({ branchId }),
          serviceApi.getAll({ branchId })
        ]);
        
        if (isMounted) {
          const pkgs = pkgRes?.data?.data || pkgRes?.data || pkgRes || [];
          const menus = menuRes?.data?.data || menuRes?.data || menuRes || [];
          const events = eventRes?.data?.data || eventRes?.data || eventRes || [];
          const svcs = svcRes?.data?.data || svcRes?.data || svcRes || [];

          setPackages(Array.isArray(pkgs) ? pkgs : []);
          setMasterMenus(Array.isArray(menus) ? menus : []);
          setMasterEvents(Array.isArray(events) ? events : []);
          setMasterServices(Array.isArray(svcs) ? svcs : []);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        if (isMounted) addToast('Failed to load package data', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentBranch?.id]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedEventType, minPrice, maxPrice, minGuests, itemsPerPage]);

  // Toggle menu items expansion
  const toggleMenuExpand = (menuIndex) => {
    setExpandedMenus(prev => ({ ...prev, [menuIndex]: !prev[menuIndex] }));
  };

  // Live Pricing Calculation
  const calculateModalTotals = useCallback(() => {
    let basePrice = 0;
    
    // Menus
    form.menus.forEach(pm => {
      const menuObj = masterMenus.find(m => m.id === Number(pm.menuId));
      if (menuObj) {
        const menuPerHeadSale = parseFloat(menuObj.totalSalePrice || menuObj.salePrice || 0);
        const guests = parseFloat(pm.quantity) || 0;
        basePrice += menuPerHeadSale * guests;
      }
    });

    // Extras
    form.extras.forEach(ex => {
      basePrice += parseFloat(ex.salePrice) || 0;
    });

    // Services
    form.services.forEach(sv => {
      let svcPrice = parseFloat(sv.salePrice) || 0;
      if (sv.pricingType === 'HOURLY' && sv.hours) {
        svcPrice *= parseInt(sv.hours);
      }
      basePrice += svcPrice * (parseInt(sv.quantity) || 1);
    });

    const discount = parseFloat(form.discountPct) || 0;
    const finalPrice = basePrice - (basePrice * (discount / 100));
    return { basePrice, finalPrice };
  }, [form, masterMenus]);

  const totals = calculateModalTotals();

  // ─── MENU HANDLERS ───
  const handleAddMenu = () => {
    if (masterMenus.length === 0) {
      addToast('No saved menus available. Create a menu first!', 'error');
      return;
    }
    setForm(prev => ({
      ...prev,
      menus: [...prev.menus, { menuId: masterMenus[0].id, quantity: 200 }]
    }));
    setExpandedMenus(prev => ({ ...prev, [form.menus.length]: true }));
  };

  const handleUpdateMenu = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      menus: prev.menus.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  const handleRemoveMenu = (index) => {
    setForm(prev => ({
      ...prev,
      menus: prev.menus.filter((_, i) => i !== index)
    }));
    setExpandedMenus(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // ─── EXTRA HANDLERS ───
  const handleAddExtra = () => {
    setForm(prev => ({ ...prev, extras: [...prev.extras, { ...DEFAULT_EXTRA }] }));
  };

  const handleUpdateExtra = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      extras: prev.extras.map((ex, i) => i === index ? { ...ex, [field]: value } : ex)
    }));
  };

  const handleRemoveExtra = (index) => {
    setForm(prev => ({
      ...prev,
      extras: prev.extras.filter((_, i) => i !== index)
    }));
  };

  // ─── SERVICE HANDLERS ───
  const handleAddService = () => {
    setForm(prev => ({ ...prev, services: [...prev.services, { ...DEFAULT_SERVICE }] }));
  };

  const handleUpdateService = (index, field, value) => {
    setForm(prev => {
      const updated = prev.services.map((sv, i) => {
        if (i !== index) return sv;
        const next = { ...sv, [field]: value };
        
        // Auto-fill from saved service
        if (field === 'serviceId' && value) {
          const selectedSvc = masterServices.find(s => s.id === Number(value));
          if (selectedSvc) {
            next.name = selectedSvc.name;
            next.pricingType = selectedSvc.pricingType || 'FIXED';
            next.costPrice = selectedSvc.costPrice || 0;
            next.salePrice = selectedSvc.salePrice || 0;
            next.hours = selectedSvc.minimumHours || '';
          }
        }
        
        if (field === 'pricingType' && value === 'FIXED') {
          next.hours = '';
        }
        
        return next;
      });
      return { ...prev, services: updated };
    });
  };

  const handleRemoveService = (index) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  // ─── MODAL OPENERS ───
  const handleOpenCreate = () => {
    setEditingId(null);
    setExpandedMenus({});
    setForm({
      ...initialFormState,
      eventType: masterEvents.length > 0 ? (masterEvents[0].name || '') : ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingId(pkg.id);
    setExpandedMenus({});
    setForm({
      name: pkg.name || '',
      code: pkg.code || '',
      eventType: pkg.eventType || (masterEvents.length > 0 ? (masterEvents[0].name || '') : ''),
      status: pkg.status || 'active',
      description: pkg.description || '',
      discountPct: pkg.discountPct?.toString() || '0',
      menus: pkg.menus?.map(m => ({ menuId: m.menuId, quantity: m.quantity || 100 })) || [],
      extras: pkg.extras?.map(ex => ({ 
        name: ex.name, 
        description: ex.description || '', 
        costPrice: ex.costPrice, 
        salePrice: ex.salePrice 
      })) || [],
      services: pkg.services?.map(sv => ({
        serviceId: sv.serviceId || '',
        name: sv.name,
        description: sv.description || '',
        pricingType: sv.pricingType || 'FIXED',
        costPrice: sv.costPrice || '',
        salePrice: sv.salePrice || '',
        quantity: sv.quantity || 1,
        hours: sv.hours || ''
      })) || []
    });
    setShowModal(true);
  };

  // ─── SUBMIT ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast('Package name is required', 'error');
      return;
    }
    if (form.menus.length === 0) {
      addToast('Attach at least one saved menu', 'error');
      return;
    }

    try {
      const branchId = currentBranch?.id || 1;
      const payload = {
        name: form.name.trim(),
        code: form.code?.trim() || null,
        eventType: form.eventType,
        status: form.status,
        description: form.description || null,
        basePrice: totals.basePrice,
        discountPct: parseFloat(form.discountPct) || 0,
        finalPrice: totals.finalPrice,
        branchId,
        menus: form.menus.map(m => ({ 
          menuId: Number(m.menuId), 
          quantity: parseInt(m.quantity) || 1 
        })),
        extras: form.extras.map(ex => ({ 
          name: ex.name.trim(), 
          description: ex.description || null, 
          costPrice: parseFloat(ex.costPrice) || 0, 
          salePrice: parseFloat(ex.salePrice) || 0 
        })),
        services: form.services.map(sv => ({
          serviceId: sv.serviceId ? Number(sv.serviceId) : null,
          name: sv.name?.trim(),
          description: sv.description || null,
          pricingType: sv.pricingType || 'FIXED',
          costPrice: parseFloat(sv.costPrice) || 0,
          salePrice: parseFloat(sv.salePrice) || 0,
          quantity: parseInt(sv.quantity) || 1,
          hours: sv.pricingType === 'HOURLY' ? (parseInt(sv.hours) || 1) : null
        }))
      };

      if (editingId) {
        await packageApi.update(editingId, payload);
        addToast('Package updated successfully!');
      } else {
        await packageApi.create(payload);
        addToast('Package created successfully!');
      }

      setShowModal(false);
      const pkgRes = await packageApi.getAll({ branchId });
      setPackages(pkgRes?.data?.data || pkgRes?.data || pkgRes || []);
    } catch (err) {
      console.error('Error saving package:', err);
      addToast(err?.response?.data?.message || 'Error saving package', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      const branchId = currentBranch?.id || 1;
      await packageApi.delete(id, { branchId });
      addToast('Package deleted successfully!');
      const pkgRes = await packageApi.getAll({ branchId });
      setPackages(pkgRes?.data?.data || pkgRes?.data || pkgRes || []);
    } catch (err) {
      addToast('Failed to delete package', 'error');
    }
  };

  // ==================== ADVANCED FILTER LOGIC ====================
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(search.toLowerCase()) || 
                          (pkg.code && pkg.code.toLowerCase().includes(search.toLowerCase()));
      const matchesEventType = selectedEventType === 'ALL' || pkg.eventType?.toLowerCase() === selectedEventType.toLowerCase();
      const finalPrice = parseFloat(pkg.finalPrice || 0);
      const matchesMinPrice = minPrice === '' || finalPrice >= parseFloat(minPrice);
      const matchesMaxPrice = maxPrice === '' || finalPrice <= parseFloat(maxPrice);
      const totalGuests = pkg.menus?.reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0) || 0;
      const matchesGuests = minGuests === '' || totalGuests >= parseInt(minGuests);
      return matchesSearch && matchesEventType && matchesMinPrice && matchesMaxPrice && matchesGuests;
    });
  }, [packages, search, selectedEventType, minPrice, maxPrice, minGuests]);

  // ==================== PAGINATION CALCULATIONS ====================
  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage) || 1;
  
  const paginatedPackages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPackages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPackages, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Summary Stats
  const stats = useMemo(() => {
    const totalPackages = packages.length;
    const activePackages = packages.filter(p => p.status === 'active').length;
    const avgFinalPrice = totalPackages > 0 ? packages.reduce((acc, p) => acc + Number(p.finalPrice || 0), 0) / totalPackages : 0;
    const totalServices = packages.reduce((acc, p) => acc + (p.services?.length || 0), 0);
    return { totalPackages, activePackages, avgFinalPrice, totalServices };
  }, [packages]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(val);

  // ── Menu Items Preview Component ──
  const MenuItemsPreview = ({ menuId }) => {
    const [loadingItems, setLoadingItems] = useState(false);
    const [menuItemsMap, setMenuItemsMap] = useState({});
    
    const menuObj = masterMenus.find(m => m.id === Number(menuId));
    
    // Extract items helper from categories or items
    const extractItems = (menu) => {
      if (!menu) return [];
      if (menu.items && menu.items.length > 0) return menu.items;
      
      // If items are inside categories structure
      if (menu.categories && Array.isArray(menu.categories)) {
        let allCatItems = [];
        menu.categories.forEach(cat => {
          // Check if category has items or dishes
          const catItems = cat.items || cat.menuItems || cat.dishes || [];
          allCatItems = [...allCatItems, ...catItems];
        });
        return allCatItems;
      }
      return [];
    };

    const initialItems = extractItems(menuObj);
    const menuItems = initialItems.length > 0 ? initialItems : (menuItemsMap[menuId] || []);

    useEffect(() => {
      let isMounted = true;
      if (menuId && initialItems.length === 0 && !menuItemsMap[menuId]) {
        setLoadingItems(true);
        menuApi.getById(menuId)
          .then(res => {
            const fullMenu = res?.data?.data || res?.data || res;
            const fetchedItems = extractItems(fullMenu);
            if (isMounted && fetchedItems.length > 0) {
              setMenuItemsMap(prev => ({ ...prev, [menuId]: fetchedItems }));
            }
          })
          .catch(err => console.error('❌ Failed to load menu items:', err))
          .finally(() => {
            if (isMounted) setLoadingItems(false);
          });
      }
      return () => { isMounted = false; };
    }, [menuId]);

    if (loadingItems) {
      return <p className="text-[11px] text-amber-600 italic pl-2">Loading items...</p>;
    }

    if (!menuItems || menuItems.length === 0) {
      return <p className="text-[11px] text-gray-400 italic pl-2">No items found in this menu</p>;
    }

   return (
      <div className="mt-2 pl-2 border-l-2 border-amber-200 space-y-1">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Menu Items:</p>
        {menuItems.map((item, idx) => {
          // Properly extract quantity considering quantityPerHead from menu management
          const itemQty = item.quantityPerHead ?? item.quantity ?? item.qty ?? 1;
          return (
            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-gray-600 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                {item.name || item.itemName} ({itemQty} {item.unit || 'plate'})
              </span>
              <span className="text-gray-400 font-mono">Rs {Number(item.salePrice || item.price || 0).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Service Badge Component ──
  const ServiceBadge = ({ svc }) => {
    const isHourly = svc.pricingType === 'HOURLY';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isHourly ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
        {isHourly ? <Clock size={10} /> : <Tag size={10} />}
        {svc.name} ×{svc.quantity || 1}
        {isHourly && svc.hours ? ` (${svc.hours}h)` : ''}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />

      {/* TOP HEADER */}
      <div className="border-b backdrop-blur-xl bg-white/90 sticky top-0 z-30 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.3)] text-white">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Banquet Packages</h1>
              <p className="text-xs font-medium text-gray-500">
                Manage event packages with menus, services & add-ons
                {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100/80 text-[#8B6914] font-bold">📍 {currentBranch.name}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-slate-300 flex items-center shadow-sm">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <TableIcon size={18} />
              </button>
            </div>

            <button 
              onClick={handleOpenCreate} 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white shadow-md hover:scale-[1.02]"
            >
              <Plus size={18} /> Create New Package
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-[#2563EB]"><Layers size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Packages</span>
              <span className="text-2xl font-bold font-mono text-gray-800">{stats.totalPackages}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><BookmarkCheck size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Active</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">{stats.activePackages}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Briefcase size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Total Services</span>
              <span className="text-2xl font-bold font-mono text-blue-700">{stats.totalServices}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><DollarSign size={24} /></div>
            <div>
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Avg. Price</span>
              <span className="text-2xl font-bold font-mono text-purple-700">Rs {Math.round(stats.avgFinalPrice).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          <div className="relative md:col-span-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by package name or code..." 
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" 
            />
          </div>
          <div>
            <ReactSelect
              value={selectedEventType}
              onChange={(val) => setSelectedEventType(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Event Types' },
                ...masterEvents.map(ev => ({ value: ev.name, label: ev.name }))
              ]}
              placeholder="All Event Types"
              isSearchable={true}
              isClearable={false}
            />
          </div>
          <div className="flex items-center gap-1">
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min Price" className="w-1/2 p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            <span className="text-gray-400">-</span>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max Price" className="w-1/2 p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          </div>
          <div>
            <input type="number" value={minGuests} onChange={e => setMinGuests(e.target.value)} placeholder="Min Guests" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          </div>
        </div>

        {/* CONTENT VIEW */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading packages...</p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-300 shadow-sm">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Packages Found</h3>
            <p className="text-sm text-gray-500">Get started by creating your first banquet package.</p>
            <button onClick={handleOpenCreate} className="mt-4 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm">
              <Plus size={14} className="inline mr-1" /> Create Package
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID CARD VIEW ── */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPackages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        {pkg.code && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-[#2563EB] border border-amber-200">
                            {pkg.code}
                          </span>
                        )}
                        <h3 className="font-bold text-base text-gray-900 mt-1">{pkg.name}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-[#2563EB] border border-amber-200">
                          {pkg.eventType || 'General'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pkg.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {pkg.status}
                        </span>
                      </div>
                    </div>

                    {/* Menus with Items Preview */}
                    <div className="space-y-2 text-xs text-gray-600 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-300">
                      <span className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Utensils size={12} /> Attached Menus ({pkg.menus?.length || 0}):
                      </span>
                      {pkg.menus?.map((m, idx) => (
                        <div key={idx} className="mb-2">
                          <div className="flex justify-between font-semibold">
                            <span>• {m.menu?.name || 'Menu'}</span>
                            <span className="font-mono text-[#2563EB]">{m.quantity} Guests</span>
                          </div>
                          {m.menu?.items && m.menu.items.length > 0 && (
                            <div className="pl-3 mt-1 space-y-0.5">
                              {m.menu.items.slice(0, 4).map((item, i) => (
                                <div key={i} className="flex justify-between text-[11px] text-gray-500">
                                  <span>↳ {item.name}</span>
                                  <span className="font-mono">Rs {Number(item.salePrice || 0).toLocaleString()}</span>
                                </div>
                              ))}
                              {m.menu.items.length > 4 && (
                                <span className="text-[10px] text-amber-600 font-bold">+{m.menu.items.length - 4} more items...</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Services Preview */}
                    {pkg.services && pkg.services.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Services:</span>
                        <div className="flex flex-wrap gap-1">
                          {pkg.services.map((sv, idx) => (
                            <ServiceBadge key={idx} svc={sv} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extras Preview */}
                    {pkg.extras && pkg.extras.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Extras:</span>
                        <div className="flex flex-wrap gap-1">
                          {pkg.extras.map((ex, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">
                              {ex.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Base Price</span>
                        <span className="text-xs font-mono font-bold text-gray-600">{formatCurrency(pkg.basePrice)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Final Price</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">{formatCurrency(pkg.finalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEdit(pkg)} title="Edit Package" className="p-2 rounded-xl hover:bg-amber-50 text-[#2563EB] transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(pkg.id)} title="Delete Package" className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"><Trash2 size={16} /></button>
                    </div>
                    <button onClick={() => handleOpenEdit(pkg)} className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Package Name</th>
                    <th className="py-3.5 px-4">Event Type</th>
                    <th className="py-3.5 px-4">Menus / Items</th>
                    <th className="py-3.5 px-4">Services</th>
                    <th className="py-3.5 px-4 text-right">Final Price</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedPackages.map(pkg => (
                    <tr key={pkg.id} className="hover:bg-amber-50/30 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{pkg.name}</div>
                        {pkg.code && <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">{pkg.code}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-50 text-[#2563EB] border border-amber-200">
                          {pkg.eventType || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {pkg.menus?.map((m, idx) => (
                          <div key={idx} className="mb-1">
                            • {m.menu?.name || 'Menu'} ({m.quantity} Guests)
                            <span className="text-gray-400 ml-1">[{m.menu?.items?.length || 0} items]</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {pkg.services?.map((sv, idx) => (
                            <ServiceBadge key={idx} svc={sv} />
                          )) || <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-emerald-700">
                        {formatCurrency(pkg.finalPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${pkg.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEdit(pkg)} className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB]"><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(pkg.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PAGINATION CONTROLS
            ═══════════════════════════════════════════════════════════ */}
        {filteredPackages.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>
                Showing <strong className="text-gray-800">{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong className="text-gray-800">{Math.min(currentPage * itemsPerPage, filteredPackages.length)}</strong> of <strong className="text-gray-800">{filteredPackages.length}</strong> packages
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-gray-400">| Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'border border-gray-200 text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL FOR ADD / EDIT PACKAGE
            ═══════════════════════════════════════════════════════════ */}
        {showModal && (
          <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-[#2563EB]">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-800">
                      {editingId ? 'Edit Banquet Package' : 'Create Banquet Package'}
                    </h3>
                    <p className="text-xs text-[#2563EB] mt-0.5 font-medium">📍 Branch: <strong>{currentBranch?.name}</strong></p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600"><X size={20} /></button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                <form onSubmit={handleSubmit} id="packageForm" className="space-y-6">
                  
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Package Name *</label>
                      <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Royal Gold Wedding Package" className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Package Code</label>
                      <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="PKG-001" className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Event Type</label>
                     <ReactSelect
                        value={form.eventType}
                        onChange={(val) => setForm({...form, eventType: val || ''})}
                        options={masterEvents.length > 0 
                          ? masterEvents.map(ev => ({ value: ev.name, label: ev.name }))
                          : [{ value: '', label: 'No events found' }]
                        }
                        placeholder="Select Event Type"
                        isSearchable={true}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Status</label>
                      <ReactSelect
                        value={form.status}
                        onChange={(val) => setForm({...form, status: val || 'active'})}
                        options={STATUS_OPTIONS}
                        placeholder="Select Status"
                        isSearchable={false}
                        isClearable={false}
                      />
                    </div>
                  </div>

                  {/* ── ATTACHED SAVED MENUS (with Items Preview) ── */}
                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Utensils size={15} /> Attach Saved Menus & Guests
                      </span>
                      <button type="button" onClick={handleAddMenu} className="px-3 py-1.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90">
                        + Attach Menu
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.menus.map((pm, index) => {
                        const selectedMenu = masterMenus.find(m => m.id === Number(pm.menuId));
                        const menuPerHead = parseFloat(selectedMenu?.totalSalePrice || selectedMenu?.salePrice || 0);
                        const subtotal = menuPerHead * (parseFloat(pm.quantity) || 0);
                        const isExpanded = expandedMenus[index];

                        return (
                          <div key={index} className="p-3 bg-white rounded-xl border border-amber-200">
                            <div className="flex flex-col md:flex-row items-center gap-3">
                              <div className="flex-1 w-full">
                                <select 
                                  value={pm.menuId} 
                                  onChange={e => handleUpdateMenu(index, 'menuId', e.target.value)} 
                                  className="w-full p-2.5 border rounded-xl text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                >
                                  {masterMenus.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} (Per Head: Rs {parseFloat(m.totalSalePrice || m.salePrice || 0).toLocaleString()})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-full md:w-32">
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={pm.quantity} 
                                  onChange={e => handleUpdateMenu(index, 'quantity', e.target.value)} 
                                  placeholder="Guests" 
                                  className="w-full p-2.5 border rounded-xl text-sm font-mono font-bold text-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                />
                              </div>
                              <div className="w-full md:w-36 text-right font-mono text-xs font-bold text-emerald-700">
                                Subtotal: Rs {subtotal.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  type="button" 
                                  onClick={() => toggleMenuExpand(index)} 
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                  title={isExpanded ? "Hide Items" : "View Items"}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <button type="button" onClick={() => handleRemoveMenu(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            {/* ── MENU ITEMS PREVIEW ── */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-amber-100">
                                <MenuItemsPreview menuId={pm.menuId} />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {form.menus.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2 italic">No menus attached. Please attach at least one saved menu.</p>
                      )}
                    </div>
                  </div>

                  {/* ── SERVICES (Saved + Custom) ── */}
                  <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase size={15} /> Services (DJ, Photography, Decor, etc.)
                      </span>
                      <button type="button" onClick={handleAddService} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90">
                        + Add Service
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.services.map((sv, index) => (
                        <div key={index} className="p-3 bg-white rounded-xl border border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                            
                            {/* Service Select / Custom Name */}
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Select Saved or Custom</label>
                              <ReactSelect
                                value={sv.serviceId ? String(sv.serviceId) : ''}
                                onChange={(val) => handleUpdateService(index, 'serviceId', val)}
                                options={[
                                  { value: '', label: '— Custom Service —' },
                                  ...masterServices.map(s => ({
                                    value: String(s.id),
                                    label: `${s.name} (${s.pricingType === 'HOURLY' ? `Rs ${Number(s.salePrice).toLocaleString()}/hr` : `Rs ${Number(s.salePrice).toLocaleString()} Fixed`})`
                                  }))
                                ]}
                                placeholder="Select or Custom"
                                isSearchable={true}
                                isClearable={false}
                              />
                            </div>

                            {/* Custom Name */}
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Service Name *</label>
                              <input
                                value={sv.name}
                                onChange={e => handleUpdateService(index, 'name', e.target.value)}
                                placeholder="e.g. Premium DJ"
                                className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                required
                              />
                            </div>

                            {/* Pricing Type */}
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Type</label>
                              <ReactSelect
                                value={sv.pricingType}
                                onChange={(val) => handleUpdateService(index, 'pricingType', val || 'FIXED')}
                                options={[
                                  { value: 'FIXED', label: 'Fixed' },
                                  { value: 'HOURLY', label: 'Per Hour' }
                                ]}
                                placeholder="Pricing Type"
                                isSearchable={false}
                                isClearable={false}
                              />
                            </div>

                            {/* Sale Price */}
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">
                                {sv.pricingType === 'HOURLY' ? 'Rate/Hr (Rs)' : 'Price (Rs)'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={sv.salePrice}
                                onChange={e => handleUpdateService(index, 'salePrice', e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>

                            {/* Quantity */}
                            <div className="md:col-span-1">
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={sv.quantity}
                                onChange={e => handleUpdateService(index, 'quantity', e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>

                            {/* Hours (only for HOURLY) */}
                            {sv.pricingType === 'HOURLY' && (
                              <div className="md:col-span-1">
                                <label className="text-[10px] font-bold text-gray-500 block mb-1">Hrs</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={sv.hours}
                                  onChange={e => handleUpdateService(index, 'hours', e.target.value)}
                                  className="w-full p-2 border rounded-lg text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                              </div>
                            )}

                            {/* Remove */}
                            <div className="md:col-span-1 flex items-end justify-center h-full pb-1">
                              <button type="button" onClick={() => handleRemoveService(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Service Subtotal */}
                          <div className="mt-2 text-right">
                            <span className="text-[11px] font-bold text-blue-700">
                              Subtotal: Rs {(() => {
                                let price = parseFloat(sv.salePrice) || 0;
                                if (sv.pricingType === 'HOURLY' && sv.hours) price *= parseInt(sv.hours);
                                return (price * (parseInt(sv.quantity) || 1)).toLocaleString();
                              })()}
                            </span>
                          </div>
                        </div>
                      ))}

                      {form.services.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2 italic">No services added. Add saved services or custom ones.</p>
                      )}
                    </div>
                  </div>

                  {/* ── EXTRAS / CHEESE / ADD-ONS ── */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={15} className="text-[#2563EB]" /> Extras / Cheese / Add-ons (Optional)
                      </span>
                      <button type="button" onClick={handleAddExtra} className="px-3 py-1.5 bg-gray-700 text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90">
                        + Add Extra
                      </button>
                    </div>

                    <div className="space-y-2">
                      {form.extras.map((ex, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 bg-white rounded-xl border border-gray-200">
                          <div className="md:col-span-4">
                            <input value={ex.name} onChange={e => handleUpdateExtra(index, 'name', e.target.value)} placeholder="Name (e.g. Extra Cheese)" className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400" />
                          </div>
                          <div className="md:col-span-4">
                            <input value={ex.description} onChange={e => handleUpdateExtra(index, 'description', e.target.value)} placeholder="Description (optional)" className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400" />
                          </div>
                          <div className="md:col-span-2">
                            <input type="number" step="0.01" value={ex.costPrice} onChange={e => handleUpdateExtra(index, 'costPrice', e.target.value)} placeholder="Cost" className="w-full p-2.5 border rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-gray-400" />
                          </div>
                          <div className="md:col-span-2">
                            <input type="number" step="0.01" value={ex.salePrice} onChange={e => handleUpdateExtra(index, 'salePrice', e.target.value)} placeholder="Sale Price" className="w-full p-2.5 border rounded-lg text-sm font-mono bg-white font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-gray-400" />
                          </div>
                          <div className="md:col-span-1 text-center">
                            <button type="button" onClick={() => handleRemoveExtra(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Summary Box */}
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <span className="text-[11px] font-bold text-amber-900 block">Calculated Base Total</span>
                      <span className="font-mono font-bold text-gray-800 text-lg">{formatCurrency(totals.basePrice)}</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-amber-900 block mb-1">Discount (%)</label>
                      <input type="number" step="0.1" value={form.discountPct} onChange={e => setForm({...form, discountPct: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-amber-900 block uppercase">Final Package Price</span>
                      <span className="font-mono font-bold text-[#2563EB] text-xl">{formatCurrency(totals.finalPrice)}</span>
                    </div>
                  </div>

                </form>
              </div>

              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t bg-slate-50 flex items-center justify-end gap-3 border-slate-300 sticky bottom-0 z-20">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" form="packageForm" className="px-7 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95">
                  {editingId ? 'Update Package' : 'Save Package'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}