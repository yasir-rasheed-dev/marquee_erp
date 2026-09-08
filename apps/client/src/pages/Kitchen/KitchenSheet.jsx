import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  Printer,
  Download,
  FileText,
  Calendar,
  Users,
  Utensils,
  Clock,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  AlertTriangle,
  Play,
  Square,
  Pause,
  FileSpreadsheet,
  List,
  Grid,
  LayoutGrid,
  ArrowUpDown,
  MoreVertical,
  Coffee,
  Zap,
  Timer,
  ClipboardCheck,
  FileCheck,
  ChefHat,
  Truck,
  ShoppingCart
} from 'lucide-react';

// ── Service Imports ──
import productionPlanApi from '../../services/productionApi';
import bookingApi from '../../services/bookingApi';
import inventoryApi from '../../services/inventoryApi';
import menuApi from '../../services/menuApi';
import itemApi from '../../services/itemApi';
import kitchenOrderApi from '../../services/kitchenOrderApi';
import { useBranch } from '../../context/BranchContext';
import ReactSelect from '../../components/ui/ReactSelect';

// ── Constants ──
const PRODUCTION_STATUSES = [
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' }
];

const VIEW_MODES = {
  GRID: 'grid',
  TABLE: 'table',
  DETAIL: 'detail'
};

// ── Main Component ──
const KitchenSheet = () => {
  const { currentBranch } = useBranch();

  // ── State ──
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanDetail, setShowPlanDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showKitchenOrderModal, setShowKitchenOrderModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [items, setItems] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // New Plan Form
  const [newPlan, setNewPlan] = useState({
    bookingId: '',
    planDate: new Date().toISOString().split('T')[0],
    notes: '',
    autoGenerateItems: true
  });

  const [itemSourceType, setItemSourceType] = useState('inventory'); // 'inventory' | 'external'

  // New Item Form
  const [newItem, setNewItem] = useState({
    menuItemId: '',
    dishName: '',
    inventoryItemId: '',
    externalItemName: '',
    itemId: '',
    quantity: 1,
    unit: 'kg',
    costPrice: '',
    salePrice: '',
    notes: ''
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    planned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    totalItems: 0
  });

  // ── Refs ──
  const printRef = useRef(null);

  // ── ReactSelect Options ──
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    ...PRODUCTION_STATUSES.map(s => ({ value: s.value, label: s.label }))
  ], []);

  const bookingOptions = useMemo(() =>
    bookings.map(b => ({
      value: String(b.id),
      label: `${b.bookingNo} - ${b.title} (${b.guestName}) - ${b.guestCount} guests`
    })),
    [bookings]);

  const menuItemOptions = useMemo(() =>
    menuItems.map(item => ({
      value: String(item.id),
      label: item.name || item.menuName || item.title || `Item #${item.id}`
    })),
    [menuItems]);

  const inventoryItemOptions = useMemo(() =>
    inventoryItems.map(item => ({
      value: String(item.id),
      label: `${item.name} (${item.currentStock || 0} ${item.unit || 'units'}) — Cost: Rs ${Number(item.avgCostPrice || 0).toFixed(0)}`
    })),
    [inventoryItems]);

  const genericItemOptions = useMemo(() =>
    items.map(item => ({
      value: String(item.id),
      label: item.name || item.title || `Item #${item.id}`
    })),
    [items]);

  // ── Dish-wise Grouping for Kitchen Sheet Plan Items ──
  const groupPlanItemsByDish = useCallback((planItemsList) => {
    const dishMap = {};
    const unassignedItems = [];

    (planItemsList || []).forEach(item => {
      let dishId = item.menuItemId || item.menuItem?.id || null;
      let dishName = item.menuItem?.name || null;

      if (!dishName && item.notes) {
        const match = item.notes.match(/\(([^×\)]+)\s*×/);
        if (match && match[1]) {
          dishName = match[1].trim();
          dishId = `dish_${dishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
      }

      if (dishName || dishId) {
        const key = String(dishId || dishName);
        if (!dishMap[key]) {
          dishMap[key] = {
            id: dishId,
            name: dishName || `Dish #${dishId}`,
            items: []
          };
        }
        dishMap[key].items.push(item);
      } else {
        unassignedItems.push(item);
      }
    });

    return {
      dishGroups: Object.values(dishMap),
      unassignedItems
    };
  }, []);

  const availableDishOptions = useMemo(() => {
    const list = [{ value: '', label: 'General / No Specific Dish' }];
    const seen = new Set();

    if (selectedPlan?.items && selectedPlan.items.length > 0) {
      selectedPlan.items.forEach(item => {
        const id = item.menuItemId || item.menuItem?.id;
        let name = item.menuItem?.name;
        if (!name && item.notes) {
          const match = item.notes.match(/\(([^×\)]+)\s*×/);
          if (match && match[1]) name = match[1].trim();
        }
        if (id && name && !seen.has(String(id))) {
          seen.add(String(id));
          list.push({ value: String(id), label: `🍛 ${name}` });
        } else if (!id && name && !seen.has(name)) {
          seen.add(name);
          list.push({ value: `name:${name}`, label: `🍛 ${name}` });
        }
      });
    }
    return list;
  }, [selectedPlan]);

  const openAddItemModal = (dish = null) => {
    setItemSourceType('inventory');
    setNewItem({
      menuItemId: dish ? (dish.id ? String(dish.id) : `name:${dish.name}`) : '',
      dishName: dish ? dish.name : '',
      inventoryItemId: '',
      externalItemName: '',
      itemId: '',
      quantity: 1,
      unit: 'kg',
      costPrice: '',
      salePrice: '',
      notes: dish ? `Added for ${dish.name}` : ''
    });
    setShowAddItemModal(true);
  };

  const handleInventoryItemSelect = (invId) => {
    const inv = inventoryItems.find(i => String(i.id) === String(invId));
    if (inv) {
      setNewItem(prev => ({
        ...prev,
        inventoryItemId: invId,
        unit: inv.unit || prev.unit || 'kg',
        costPrice: inv.avgCostPrice !== undefined && inv.avgCostPrice !== null ? String(inv.avgCostPrice) : '',
        salePrice: inv.salePrice !== undefined && inv.salePrice !== null ? String(inv.salePrice) : ''
      }));
    } else {
      setNewItem(prev => ({ ...prev, inventoryItemId: invId }));
    }
  };

  // ── Fetch Plans ──
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (currentBranch?.id) params.branchId = currentBranch.id;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.planDate = dateFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await productionPlanApi.getAll(params);

      let planData = [];

      if (response?.data?.success && Array.isArray(response.data.data)) {
        planData = response.data.data;
      } else if (Array.isArray(response?.data?.data)) {
        planData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        planData = response.data;
      } else if (response?.data?.plans && Array.isArray(response.data.plans)) {
        planData = response.data.plans;
      } else if (response?.data?.results && Array.isArray(response.data.results)) {
        planData = response.data.results;
      } else if (response?.data && typeof response.data === 'object') {
        for (const key of Object.keys(response.data)) {
          if (Array.isArray(response.data[key])) {
            planData = response.data[key];
            break;
          }
        }
      }

      setPlans(planData);
      setFilteredPlans(planData);

      const newStats = {
        total: planData.length,
        planned: planData.filter(p => p.status === 'planned').length,
        inProgress: planData.filter(p => p.status === 'in_progress').length,
        completed: planData.filter(p => p.status === 'completed').length,
        cancelled: planData.filter(p => p.status === 'cancelled').length,
        totalItems: planData.reduce((acc, p) => acc + (p._count?.items || 0), 0)
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.response?.data?.message || 'Failed to fetch production plans');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, searchTerm, currentBranch?.id]);

  // ── Fetch Bookings ──
  const fetchBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const response = await bookingApi.getAll({
        limit: 500,
        branchId: currentBranch?.id,
        isActive: true
      });

      let bookingData = [];

      if (response?.data?.success && Array.isArray(response.data.data)) {
        bookingData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        bookingData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        bookingData = response.data.data;
      } else if (response?.data?.bookings && Array.isArray(response.data.bookings)) {
        bookingData = response.data.bookings;
      } else if (response?.data && typeof response.data === 'object') {
        for (const key of Object.keys(response.data)) {
          if (Array.isArray(response.data[key])) {
            bookingData = response.data[key];
            break;
          }
        }
      }

      setBookings(bookingData);

    } catch (err) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  // ── 🔥 FIXED: Fetch Inventory Items ──
  const fetchInventoryItems = useCallback(async () => {
    try {
      console.log('📡 KitchenSheet: Fetching inventory items...');
      const response = await inventoryApi.getAll({ isActive: true });
      console.log('📡 KitchenSheet: Inventory response:', response);

      let data = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response?.data?.data)) {
        data = response.data.data;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      } else if (response?.data && typeof response.data === 'object') {
        for (const key of Object.keys(response.data)) {
          if (Array.isArray(response.data[key])) {
            data = response.data[key];
            break;
          }
        }
      }

      console.log('✅ KitchenSheet: Inventory items extracted:', data.length);
      setInventoryItems(data);
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
      setInventoryItems([]);
    }
  }, []);

  // ── 🔥 FIXED: Fetch Menu Items ──
  const fetchMenuItems = useCallback(async () => {
    try {
      console.log('📡 KitchenSheet: Fetching menu items...');

      // Try menuApi.getAllItems first
      let response;
      try {
        response = await menuApi.getAllItems({ isActive: true });
      } catch (e) {
        console.log('menuApi.getAllItems failed, trying itemApi...');
        response = await itemApi.getAll({ isActive: true });
      }

      console.log('📡 KitchenSheet: Menu items response:', response);

      let data = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response?.data?.data)) {
        data = response.data.data;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      } else if (response?.data && typeof response.data === 'object') {
        for (const key of Object.keys(response.data)) {
          if (Array.isArray(response.data[key])) {
            data = response.data[key];
            break;
          }
        }
      }

      console.log('✅ KitchenSheet: Menu items extracted:', data.length);
      setMenuItems(data);
      setItems(data);
    } catch (err) {
      console.error('❌ Error fetching menu items:', err);
      setMenuItems([]);
      setItems([]);
    }
  }, []);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      const response = await kitchenOrderApi.getAll({ status: 'pending,preparing,ready' });
      if (response?.data?.success) {
        setKitchenOrders(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    }
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    fetchPlans();
    fetchBookings();
    fetchInventoryItems();
    fetchMenuItems();
    fetchKitchenOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter Effect ──
  useEffect(() => {
    let filtered = [...plans];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(p =>
        p.planDate && p.planDate.startsWith(dateFilter)
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.booking?.title?.toLowerCase().includes(term) ||
        p.booking?.guestName?.toLowerCase().includes(term) ||
        p.booking?.bookingNo?.toLowerCase().includes(term) ||
        p.notes?.toLowerCase().includes(term)
      );
    }

    setFilteredPlans(filtered);
  }, [plans, statusFilter, dateFilter, searchTerm]);

  // ── Get Booking Info ──
  const getBookingInfo = useCallback((bookingId) => {
    if (!bookingId) return null;
    return bookings.find(b => b.id === bookingId) || null;
  }, [bookings]);

  // ── Create Plan Handler ──
  const handleCreatePlan = async (e) => {
    e.preventDefault();

    if (!newPlan.bookingId) {
      setError('Please select a booking');
      return;
    }

    if (!newPlan.planDate) {
      setError('Please select a plan date');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const planData = {
        bookingId: parseInt(newPlan.bookingId),
        planDate: newPlan.planDate,
        notes: newPlan.notes || '',
        status: 'planned',
        autoFillRecipes: newPlan.autoGenerateItems
      };

      const response = await productionPlanApi.create(planData);

      let planId = null;
      let success = false;

      if (response?.data?.success && response?.data?.data?.id) {
        success = true;
        planId = response.data.data.id;
      } else if (response?.data?.id) {
        success = true;
        planId = response.data.id;
      } else if (response?.data && typeof response.data === 'object' && response.data.id) {
        success = true;
        planId = response.data.id;
      }

      if (success && planId) {
        setShowCreateModal(false);
        setNewPlan({
          bookingId: '',
          planDate: new Date().toISOString().split('T')[0],
          notes: '',
          autoGenerateItems: true
        });
        await fetchPlans();
      } else {
        setError(response?.data?.message || 'Failed to create production plan');
      }
    } catch (err) {
      console.error('Error creating plan:', err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else {
        setError('Failed to create production plan. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // ── Add Item Handler ──
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!newItem.quantity || Number(newItem.quantity) <= 0) {
      setError('Valid quantity is required');
      return;
    }
    const isExt = itemSourceType === 'external';
    if (!isExt && !newItem.inventoryItemId && !newItem.menuItemId && !newItem.itemId) {
      setError('Please select an item');
      return;
    }
    if (isExt && !newItem.externalItemName?.trim()) {
      setError('Please enter external item name');
      return;
    }

    setIsAddingItem(true);

    try {
      let targetMenuItemId = null;
      let targetDishName = newItem.dishName || '';

      if (newItem.menuItemId) {
        if (String(newItem.menuItemId).startsWith('name:')) {
          targetDishName = newItem.menuItemId.replace('name:', '');
        } else {
          targetMenuItemId = parseInt(newItem.menuItemId);
        }
      }

      const itemData = {
        isExternal: isExt,
        externalItemName: isExt ? newItem.externalItemName.trim() : undefined,
        menuItemId: targetMenuItemId,
        inventoryItemId: !isExt && newItem.inventoryItemId ? parseInt(newItem.inventoryItemId) : null,
        itemId: !isExt && newItem.itemId ? parseInt(newItem.itemId) : null,
        quantity: parseFloat(newItem.quantity) || 1,
        unit: newItem.unit || 'kg',
        costPrice: newItem.costPrice ? parseFloat(newItem.costPrice) : undefined,
        salePrice: newItem.salePrice ? parseFloat(newItem.salePrice) : undefined,
        notes: newItem.notes || (targetDishName ? `Added for ${targetDishName}` : '')
      };

      const response = await productionPlanApi.addItem(selectedPlan.id, itemData);

      if (response?.data?.success) {
        setShowAddItemModal(false);
        setNewItem({
          menuItemId: '',
          dishName: '',
          inventoryItemId: '',
          externalItemName: '',
          itemId: '',
          quantity: 1,
          unit: 'kg',
          costPrice: '',
          salePrice: '',
          notes: ''
        });
        setItemSourceType('inventory');

        // Refresh plan details
        const updated = await productionPlanApi.getById(selectedPlan.id);
        if (updated?.data?.success) {
          setSelectedPlan(updated.data.data);
        } else if (updated?.data?.id) {
          setSelectedPlan(updated.data);
        }
        await fetchPlans();
        setError(null);
      } else {
        setError(response?.data?.message || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setError(err.response?.data?.message || 'Failed to add item');
    } finally {
      setIsAddingItem(false);
    }
  };

  // ── Handlers ──

  const handlePlanClick = async (plan) => {
    try {
      const response = await productionPlanApi.getById(plan.id);
      if (response?.data?.success) {
        setSelectedPlan(response.data.data);
        setShowPlanDetail(true);
      } else if (response?.data?.id) {
        setSelectedPlan(response.data);
        setShowPlanDetail(true);
      } else {
        setSelectedPlan(plan);
        setShowPlanDetail(true);
      }
    } catch (err) {
      console.error('Error fetching plan details:', err);
      setError('Failed to fetch plan details');
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      const response = await productionPlanApi.update(selectedPlan.id, {
        status: selectedPlan.status,
        notes: selectedPlan.notes,
        planDate: selectedPlan.planDate
      });
      if (response?.data?.success) {
        setShowEditModal(false);
        await fetchPlans();
        const updated = await productionPlanApi.getById(selectedPlan.id);
        if (updated?.data?.success) {
          setSelectedPlan(updated.data.data);
        } else if (updated?.data?.id) {
          setSelectedPlan(updated.data);
        }
      }
    } catch (err) {
      console.error('Error updating plan:', err);
      setError('Failed to update production plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this production plan?')) return;
    try {
      const response = await productionPlanApi.delete(planId);
      if (response?.data?.success) {
        await fetchPlans();
        if (selectedPlan && selectedPlan.id === planId) {
          setShowPlanDetail(false);
          setSelectedPlan(null);
        }
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete production plan');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await productionPlanApi.deleteItem(itemId);
      if (response?.data?.success) {
        const updated = await productionPlanApi.getById(selectedPlan.id);
        if (updated?.data?.success) {
          setSelectedPlan(updated.data.data);
        } else if (updated?.data?.id) {
          setSelectedPlan(updated.data);
        }
        await fetchPlans();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  const handleStatusChange = async (planId, newStatus) => {
    try {
      const response = await productionPlanApi.update(planId, { status: newStatus });
      if (response?.data?.success) {
        await fetchPlans();
        if (selectedPlan && selectedPlan.id === planId) {
          const updated = await productionPlanApi.getById(planId);
          if (updated?.data?.success) {
            setSelectedPlan(updated.data.data);
          } else if (updated?.data?.id) {
            setSelectedPlan(updated.data);
          }
        }
        if (newStatus === 'completed') {
          await handleCreateKitchenOrder(planId);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const handleCreateKitchenOrder = async (planId) => {
    try {
      const plan = await productionPlanApi.getById(planId);
      if (!plan?.data) return;

      const planData = plan.data.data || plan.data;
      const response = await kitchenOrderApi.create({
        bookingId: planData.bookingId,
        priority: 'normal',
        notes: `Auto-generated from Production Plan #${planData.id}`,
        items: planData.items?.map(item => ({
          menuItemId: item.menuItemId,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes
        })) || [],
        autoFillRecipes: false
      });

      if (response?.data?.success) {
        await fetchKitchenOrders();
        setError(null);
      }
    } catch (err) {
      console.error('Error creating kitchen order:', err);
      setError('Failed to create kitchen order from plan');
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;

      const content = printRef.current.innerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Production Plan - Kitchen Sheet</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f5f5f5; }
              .header { margin-bottom: 20px; }
              .header h1 { color: #1a56db; }
            </style>
          </head>
          <body>
            ${content}
            <script>
              window.print();
              setTimeout(() => window.close(), 1000);
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getStatusConfig = (status) => {
    return PRODUCTION_STATUSES.find(s => s.value === status) || PRODUCTION_STATUSES[0];
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ── Render Functions ──

  const renderPlanCard = (plan) => {
    const statusConfig = getStatusConfig(plan.status);
    const booking = getBookingInfo(plan.bookingId);

    return (
      <div
        key={plan.id}
        onClick={() => handlePlanClick(plan)}
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {booking?.title || `Plan #${plan.id}`}
              </h3>
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-sm text-gray-500">
                  {booking?.bookingNo || 'N/A'}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  {booking?.guestName || 'Unknown Guest'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
              {plan.planDate ? formatDate(plan.planDate) : 'N/A'}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Package className="w-4 h-4 mr-1 text-gray-400" />
              {plan._count?.items || 0} items
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-1 text-gray-400" />
              {booking?.guestCount || 0} guests
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1 text-gray-400" />
              {formatDateTime(plan.createdAt)}
            </div>
          </div>

          {plan.notes && (
            <div className="mt-2 text-sm text-gray-500 line-clamp-2">
              {plan.notes}
            </div>
          )}

          {plan.status !== 'cancelled' && plan.status !== 'completed' && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: plan.status === 'planned' ? '25%' :
                      plan.status === 'in_progress' ? '50%' : '100%'
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {plan.status === 'planned' ? 'Ready to start' :
                  plan.status === 'in_progress' ? 'In production' : 'Complete'}
              </p>
            </div>
          )}
        </div>

        {plan.status !== 'completed' && plan.status !== 'cancelled' && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = plan.status === 'planned' ? 'in_progress' : 'completed';
                handleStatusChange(plan.id, nextStatus);
              }}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
            >
              {plan.status === 'planned' ? (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Complete
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlans.map(plan => {
            const statusConfig = getStatusConfig(plan.status);
            const booking = getBookingInfo(plan.bookingId);
            return (
              <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">Plan #{plan.id}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(plan.createdAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">{booking?.title || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{booking?.guestName || ''}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {plan.planDate ? formatDate(plan.planDate) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {plan._count?.items || 0}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePlanClick(plan)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan(plan);
                            setShowEditModal(true);
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlan(plan.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kitchen Sheet</h1>
                <p className="text-sm text-gray-500">
                  Production planning & kitchen preparation management
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{stats.total} Total</span>
              </div>
              <div className="flex items-center space-x-1 text-blue-600">
                <Clock className="w-4 h-4" />
                <span>{stats.planned} Planned</span>
              </div>
              <div className="flex items-center space-x-1 text-yellow-600">
                <Play className="w-4 h-4" />
                <span>{stats.inProgress} In Progress</span>
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>{stats.completed} Completed</span>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <button
                onClick={fetchPlans}
                disabled={loading}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
        <div className="px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <ReactSelect
                options={statusOptions}
                value={statusFilter}  // Simple string
                onChange={opt => setStatusFilter(opt || 'all')}  // Simple string
                placeholder="All Status"
                menuPortalTarget={null}
              />

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />

              <div className="flex items-center space-x-1 border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode(VIEW_MODES.GRID)}
                  className={`p-2 ${viewMode === VIEW_MODES.GRID ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode(VIEW_MODES.TABLE)}
                  className={`p-2 ${viewMode === VIEW_MODES.TABLE ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handlePrint}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {loading && plans.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading production plans...</p>
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No production plans found</h3>
            <p className="text-gray-400 mt-1">
              {searchTerm || statusFilter !== 'all' || dateFilter
                ? 'Try adjusting your filters'
                : 'Create a production plan to get started'}
            </p>
            {searchTerm || statusFilter !== 'all' || dateFilter ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter('');
                }}
                className="mt-4 text-purple-600 hover:text-purple-800"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create First Plan
              </button>
            )}
          </div>
        ) : viewMode === VIEW_MODES.TABLE ? (
          renderTableView()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlans.map(plan => renderPlanCard(plan))}
          </div>
        )}
      </div>

      {/* ── Create Plan Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create Production Plan</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking <span className="text-red-500">*</span>
                  </label>
                  <ReactSelect
  options={bookingOptions}
  value={newPlan.bookingId}  // Simple string
  onChange={opt => setNewPlan({ ...newPlan, bookingId: opt || '' })}  // Simple string
  placeholder="Select Booking"
  menuPortalTarget={null}
/>
                  {isLoadingBookings && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Loading bookings...
                    </p>
                  )}
                  {!isLoadingBookings && bookings.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">No bookings available. Please check API.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newPlan.planDate}
                    onChange={(e) => setNewPlan({ ...newPlan, planDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newPlan.notes}
                    onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    rows={3}
                    placeholder="Special instructions..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoGenerateItems"
                    checked={newPlan.autoGenerateItems}
                    onChange={(e) => setNewPlan({ ...newPlan, autoGenerateItems: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="autoGenerateItems" className="text-sm text-gray-700">
                    Auto-generate items from booking menu
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Plan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Plan Detail Modal ── */}
      {showPlanDetail && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Production Plan #{selectedPlan.id}
                </h2>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusConfig(selectedPlan.status)?.color}`}>
                    {getStatusConfig(selectedPlan.status)?.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {selectedPlan.booking?.bookingNo || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Print"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPlanDetail(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Booking</p>
                  <p className="font-medium">{selectedPlan.booking?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Guest</p>
                  <p className="font-medium">{selectedPlan.booking?.guestName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Plan Date</p>
                  <p className="font-medium">
                    {selectedPlan.planDate ? formatDate(selectedPlan.planDate) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Items</p>
                  <p className="font-medium">{selectedPlan.items?.length || 0}</p>
                </div>
              </div>

              {selectedPlan.notes && (
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{selectedPlan.notes}</p>
                </div>
              )}

              {/* Plan Items - Dish-Wise Grouping */}
              <div>
                {(() => {
                  const { dishGroups, unassignedItems } = groupPlanItemsByDish(selectedPlan.items || []);

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-purple-600" />
                            Raw Materials by Dish
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {dishGroups.length} Dish(es) • {(selectedPlan.items || []).length} Total Items
                          </p>
                        </div>
                        {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                          <button
                            onClick={() => openAddItemModal(null)}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add Raw Material
                          </button>
                        )}
                      </div>

                      {/* Render Each Dish Group */}
                      {dishGroups.map((dish) => (
                        <div key={dish.id || dish.name} className="border border-purple-200/80 rounded-xl bg-white overflow-hidden shadow-xs">
                          {/* Dish Header */}
                          <div className="bg-purple-50/70 border-b border-purple-200/60 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">🍛 {dish.name}</span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                {dish.items.length} Ingredients
                              </span>
                            </div>
                            {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                              <button
                                onClick={() => openAddItemModal(dish)}
                                className="px-2.5 py-1 bg-white hover:bg-purple-100/60 text-purple-700 border border-purple-300 text-xs font-medium rounded-md transition flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add to {dish.name}
                              </button>
                            )}
                          </div>

                          {/* Table for Dish Ingredients */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50/70 text-gray-500 text-xs uppercase border-b">
                                <tr>
                                  <th className="p-2.5 text-left">Raw Material</th>
                                  <th className="p-2.5 text-right">Required Qty</th>
                                  <th className="p-2.5 text-center">Unit</th>
                                  <th className="p-2.5 text-right">Cost Price</th>
                                  {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                                    <th className="p-2.5 text-right">Actions</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {dish.items.map((item) => {
                                  const cost = Number(item.inventoryItem?.avgCostPrice || 0);
                                  return (
                                    <tr key={item.id} className="hover:bg-purple-50/20">
                                      <td className="p-2.5">
                                        <div className="font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                                          <span>{item.inventoryItem?.name || item.name || 'Raw Material'}</span>
                                          {(item.notes?.includes('[External]') || item.inventoryItem?.category?.includes('External')) && (
                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-md border border-purple-200">
                                              🛒 External
                                            </span>
                                          )}
                                        </div>
                                        {item.notes && (
                                          <div className="text-xs text-gray-400 italic">
                                            {item.notes}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right font-bold text-purple-700 font-mono">
                                        {Number(item.quantity).toLocaleString()}
                                      </td>
                                      <td className="p-2.5 text-center text-gray-600">{item.unit}</td>
                                      <td className="p-2.5 text-right font-mono text-gray-600 text-xs">
                                        {cost > 0 ? `Rs ${cost.toLocaleString()}` : '—'}
                                      </td>
                                      {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                                        <td className="p-2.5 text-right">
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                            title="Delete item"
                                          >
                                            <Trash2 className="w-4 h-4 inline" />
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}

                      {/* Render Unassigned / General Ingredients */}
                      {unassignedItems.length > 0 && (
                        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-xs">
                          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                            <span className="font-semibold text-gray-700 text-sm">
                              General / Unassigned Ingredients ({unassignedItems.length})
                            </span>
                            {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                              <button
                                onClick={() => openAddItemModal(null)}
                                className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium rounded-md transition flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add General
                              </button>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                                <tr>
                                  <th className="p-2.5 text-left">Item</th>
                                  <th className="p-2.5 text-right">Qty</th>
                                  <th className="p-2.5 text-center">Unit</th>
                                  {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                                    <th className="p-2.5 text-right">Actions</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {unassignedItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-2.5">
                                      <div className="font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                                        <span>{item.inventoryItem?.name || item.name || 'Unknown'}</span>
                                        {(item.notes?.includes('[External]') || item.inventoryItem?.category?.includes('External')) && (
                                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-md border border-purple-200">
                                            🛒 External
                                          </span>
                                        )}
                                      </div>
                                      {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                                    </td>
                                    <td className="p-2.5 text-right font-bold text-gray-800 font-mono">
                                      {Number(item.quantity).toLocaleString()}
                                    </td>
                                    <td className="p-2.5 text-center text-gray-600">{item.unit}</td>
                                    {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                                      <td className="p-2.5 text-right">
                                        <button
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                        >
                                          <Trash2 className="w-4 h-4 inline" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {(!selectedPlan.items || selectedPlan.items.length === 0) && (
                        <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="font-medium">No items in this plan</p>
                          <button
                            onClick={() => openAddItemModal(null)}
                            className="mt-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium transition"
                          >
                            + Add First Raw Material
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Status:</span>
                {selectedPlan.status === 'planned' && (
                  <button
                    onClick={() => handleStatusChange(selectedPlan.id, 'in_progress')}
                    className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start Production
                  </button>
                )}
                {selectedPlan.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(selectedPlan.id, 'completed')}
                    className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Complete & Create Kitchen Order
                  </button>
                )}
                {selectedPlan.status === 'completed' && (
                  <span className="text-sm text-green-600 font-medium flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Completed
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowPlanDetail(false);
                    setSelectedPlan(null);
                  }}
                  className="px-4 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 🔥 FIXED: Add Item Modal — Responsive ── */}
      {showAddItemModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add Item to Plan</h2>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <form onSubmit={handleAddItem} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Target Dish Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Dish / Menu Item
                </label>
                <ReactSelect
                  options={availableDishOptions}
                  value={newItem.menuItemId}
                  onChange={opt => {
                    const selected = availableDishOptions.find(o => o.value === opt);
                    setNewItem({
                      ...newItem,
                      menuItemId: opt || '',
                      dishName: selected ? selected.label.replace(/^🍛\s*/, '') : ''
                    });
                  }}
                  placeholder="-- Select Target Dish (e.g. Mutton Korma) --"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {newItem.dishName ? `Assigning raw material to: 🍛 ${newItem.dishName}` : 'Select which dish this raw material belongs to, or leave general.'}
                </p>
              </div>

              {/* Source Type Selector: Inventory vs External */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                  Item Source <span className="text-red-500">*</span>
                </label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setItemSourceType('inventory')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      itemSourceType === 'inventory'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Package size={14} className={itemSourceType === 'inventory' ? 'text-purple-600' : ''} />
                    From Inventory Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemSourceType('external')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      itemSourceType === 'external'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ShoppingCart size={14} />
                    External Item (Market / Direct)
                  </button>
                </div>
              </div>

              {/* Raw Material: Dropdown for Inventory OR Text Input for External */}
              {itemSourceType === 'inventory' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raw Material (From Inventory) <span className="text-red-500">*</span>
                  </label>
                  <ReactSelect
                    options={inventoryItemOptions}
                    value={newItem.inventoryItemId}
                    onChange={handleInventoryItemSelect}
                    placeholder="-- Search & Select Raw Material (e.g. Yogurt, Meat, Rice) --"
                    isRequired
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-1">
                    External Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dahi / Yogurt, Koyla, Hara Masala, Khoya..."
                    value={newItem.externalItemName || ''}
                    onChange={(e) => setNewItem({ ...newItem, externalItemName: e.target.value })}
                    className="w-full px-3 py-2 bg-purple-50/40 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm font-medium"
                    required
                  />
                  <p className="text-[11px] text-purple-600/80 mt-1">
                    🛒 Direct / Market purchase item — will be linked to this dish without blocking warehouse stock.
                  </p>
                </div>
              )}

              {/* Quantity & Unit — Responsive Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    placeholder="kg, pcs, box..."
                  />
                </div>
              </div>

              {/* Runtime Cost Price & Sale Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price (PKR / Unit)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={newItem.costPrice}
                    onChange={(e) => setNewItem({ ...newItem, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Runtime purchase / avg cost</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price (PKR / Unit)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1800"
                    value={newItem.salePrice}
                    onChange={(e) => setNewItem({ ...newItem, salePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Runtime menu / sale price</p>
                </div>
              </div>

              {/* Live Cost Calculation Preview */}
              {newItem.quantity && newItem.costPrice && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex justify-between items-center text-xs">
                  <span className="text-purple-900 font-medium">Estimated Item Cost:</span>
                  <span className="font-mono font-bold text-purple-900 text-sm">
                    Rs {(Number(newItem.quantity) * Number(newItem.costPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  placeholder="Special instructions..."
                />
              </div>

              {/* Buttons — Responsive */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAddingItem ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Raw Material'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Print Content (Hidden) ── */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="p-8">
          <div className="header">
            <h1 className="text-2xl font-bold text-purple-600">Production Plan</h1>
            <p className="text-gray-600">Kitchen Sheet — {new Date().toLocaleDateString()}</p>
            <hr className="my-4" />
          </div>

          <table>
            <thead>
              <tr>
                <th>Plan ID</th>
                <th>Booking</th>
                <th>Guest</th>
                <th>Date</th>
                <th>Items</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map(plan => {
                const booking = getBookingInfo(plan.bookingId);
                return (
                  <tr key={plan.id}>
                    <td>#{plan.id}</td>
                    <td>{booking?.title || 'N/A'}</td>
                    <td>{booking?.guestName || 'N/A'}</td>
                    <td>{plan.planDate ? formatDate(plan.planDate) : 'N/A'}</td>
                    <td>{plan._count?.items || 0}</td>
                    <td>{getStatusConfig(plan.status)?.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 text-sm text-gray-500">
            Generated on {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenSheet;