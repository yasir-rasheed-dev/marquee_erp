import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Clock,
  Users,
  Utensils,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Printer,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  MoreVertical,
  Calendar,
  Phone,
  User,
  Package,
  DollarSign,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  LayoutGrid,
  Zap,
  Coffee,
  TrendingUp,
  TrendingDown,
  Clock as ClockIcon,
  Loader2
} from 'lucide-react';

// ── PDF Imports ──
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Service Imports ──
import kitchenOrderApi from '../../services/kitchenOrderApi';
import bookingApi from '../../services/bookingApi';
import inventoryApi from '../../services/inventoryApi';
import menuApi from '../../services/menuApi';
import packageApi from '../../services/packageApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useBranch } from '../../context/BranchContext';

// ── Constants ──
const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'preparing', label: 'Preparing', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'served', label: 'Served', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-gray-500' },
  { value: 'normal', label: 'Normal', color: 'text-blue-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-500 animate-pulse' }
];

const STATUS_FLOW = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: [],
  cancelled: []
};

// ── Main Component ──
const KDS = () => {
  const { currentBranch } = useBranch();
  // ── State ── (All existing state remains same)
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [bookings, setBookings] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newOrder, setNewOrder] = useState({
    bookingId: '',
    priority: 'normal',
    notes: '',
    autoFillRecipes: true,
    items: []
  });
  const [newItem, setNewItem] = useState({
    menuItemId: '',
    inventoryItemId: '',
    quantity: 1,
    unit: '',
    notes: ''
  });
  const [editingItem, setEditingItem] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [executingOrderId, setExecutingOrderId] = useState(null);
  const [shortageItems, setShortageItems] = useState([]);
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bookingItems, setBookingItems] = useState([]);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    cancelled: 0
  });

  // ── ReactSelect Options ── (Same as before)
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    ...ORDER_STATUSES.map(s => ({ value: s.value, label: s.label }))
  ], []);

  const priorityOptions = useMemo(() => [
    { value: 'all', label: 'All Priority' },
    ...PRIORITIES.map(p => ({ value: p.value, label: p.label }))
  ], []);

  const priorityCreateOptions = useMemo(() =>
    PRIORITIES.map(p => ({ value: p.value, label: p.label }))
  , []);

  const bookingOptions = useMemo(() =>
    bookings.map(b => ({
      value: String(b.id),
      label: `${b.bookingNo || `BK-${b.id}`} - ${b.title || 'Booking'} (${b.guestName || b.customer?.name || 'Guest'}) - ${b.guestCount || 0} guests`
    }))
  , [bookings]);

  const inventoryItemOptions = useMemo(() =>
    inventoryItems.map(item => ({
      value: String(item.id),
      label: `${item.name} (${item.currentStock || 0} ${item.unit || 'units'})`
    }))
  , [inventoryItems]);

  const menuItemOptions = useMemo(() =>
    menuItems.map(item => ({
      value: String(item.id),
      label: `${item.name} (${item.unit || ''})`
    }))
  , [menuItems]);

  // ── Refs ──
  const refreshTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── All fetch functions (same as before) ──
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await kitchenOrderApi.getAll(params);
      let orderData = response?.data || [];
      if (!Array.isArray(orderData)) orderData = [];

      setOrders(orderData);
      setFilteredOrders(orderData);

      const newStats = {
        total: orderData.length,
        pending: orderData.filter(o => o.status === 'pending').length,
        preparing: orderData.filter(o => o.status === 'preparing').length,
        ready: orderData.filter(o => o.status === 'ready').length,
        served: orderData.filter(o => o.status === 'served').length,
        cancelled: orderData.filter(o => o.status === 'cancelled').length
      };
      setStats(newStats);
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to fetch orders');
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchTerm]);

  const fetchBookings = useCallback(async () => {
    try {
      const branchId = currentBranch?.id;
      const params = { limit: 200 };
      if (branchId) params.branchId = branchId;
      const response = await bookingApi.getAll(params);
      let bookingData = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        bookingData = response.data.data;
      } else if (Array.isArray(response?.data?.data)) {
        bookingData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        bookingData = response.data;
      } else if (Array.isArray(response)) {
        bookingData = response;
      }
      setBookings(bookingData);
    } catch (err) {
      console.error('❌ Error fetching bookings in KDS:', err);
      setBookings([]);
    }
  }, [currentBranch?.id]);

  const fetchInventoryItems = useCallback(async () => {
    try {
      const response = await inventoryApi.getAll({ isActive: true });
      let inventoryData = response?.data || [];
      if (!Array.isArray(inventoryData)) inventoryData = [];
      setInventoryItems(inventoryData);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setInventoryItems([]);
    }
  }, []);

  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await menuApi.getAll({ isActive: true });
      let menuData = response?.data || [];
      if (!Array.isArray(menuData)) menuData = [];
      setMenuItems(menuData);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setMenuItems([]);
    }
  }, []);

  // ── Auto Refresh ──
  useEffect(() => {
    fetchOrders();
    fetchBookings();
    fetchInventoryItems();
    fetchMenuItems();

    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchOrders();
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchOrders, fetchBookings, fetchInventoryItems, fetchMenuItems, autoRefresh, refreshInterval]);

  useEffect(() => {
    if (showCreateModal) {
      fetchBookings();
    }
  }, [showCreateModal, fetchBookings]);

  // ── Filter Orders ──
  useEffect(() => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(o => o.priority === priorityFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.booking?.title?.toLowerCase().includes(term) ||
        o.booking?.guestName?.toLowerCase().includes(term) ||
        o.booking?.bookingNo?.toLowerCase().includes(term) ||
        o.notes?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, priorityFilter, searchTerm]);

  // ── Fetch Booking Details for Preview (same as before) ──
  useEffect(() => {
    if (!newOrder.bookingId) {
      setBookingItems([]);
      if (!newOrder.autoFillRecipes) {
        setNewOrder(prev => ({ ...prev, items: [] }));
      }
      return;
    }

    const fetchBookingDetails = async () => {
      setLoadingBooking(true);
      try {
        const response = await bookingApi.getById(newOrder.bookingId);
        let booking = response?.data?.data || response?.data || response;
        if (!booking) {
          setBookingItems([]);
          setNewOrder(prev => ({ ...prev, items: [] }));
          return;
        }

        let menus = booking.menus || [];
        let customItems = booking.customItems || [];
        let services = booking.services || [];
        let packageData = booking.selectedPackage || null;

        let previewItems = [];
        let orderItems = [];

        // Process standalone menus
        for (const menu of menus) {
          const menuId = menu.menuId;
          const guests = Number(menu.quantity) || 1;
          if (menuId) {
            try {
              const menuRes = await menuApi.getById(menuId);
              const menuObj = menuRes?.data?.data || menuRes?.data || menuRes;
              if (menuObj) {
                let dishItems = [];
                if (menuObj.items && menuObj.items.length > 0) {
                  dishItems = menuObj.items;
                } else if (menuObj.categories) {
                  menuObj.categories.forEach(cat => {
                    if (cat.items) dishItems = [...dishItems, ...cat.items];
                  });
                }
                dishItems.forEach(dish => {
                  const qtyPerHead = Number(dish.quantityPerHead || dish.quantity || 1);
                  const totalQty = qtyPerHead * guests;
                  previewItems.push({
                    type: 'Menu Dish',
                    name: dish.name,
                    quantity: totalQty,
                    unit: dish.unit || 'plate',
                    price: dish.salePrice || 0,
                    menuItemId: dish.id
                  });
                  orderItems.push({
                    menuItemId: dish.id,
                    quantity: totalQty,
                    unit: dish.unit || '',
                    notes: ''
                  });
                });
              }
            } catch (err) {
              console.error(`❌ Failed to fetch menu ${menuId}:`, err);
            }
          }
        }

        // Process package
        if (packageData && packageData.packageId) {
          try {
            const pkgRes = await packageApi.getById(packageData.packageId);
            const pkg = pkgRes?.data?.data || pkgRes?.data || pkgRes;
            if (pkg && pkg.menus && Array.isArray(pkg.menus)) {
              for (const pkgMenu of pkg.menus) {
                const menuId = pkgMenu.menuId;
                const guests = Number(pkgMenu.quantity) || 200;
                if (menuId) {
                  try {
                    const menuRes = await menuApi.getById(menuId);
                    const menuObj = menuRes?.data?.data || menuRes?.data || menuRes;
                    if (menuObj) {
                      let dishItems = [];
                      if (menuObj.items && menuObj.items.length > 0) {
                        dishItems = menuObj.items;
                      } else if (menuObj.categories) {
                        menuObj.categories.forEach(cat => {
                          if (cat.items) dishItems = [...dishItems, ...cat.items];
                        });
                      }
                      dishItems.forEach(dish => {
                        const qtyPerHead = Number(dish.quantityPerHead || dish.quantity || 1);
                        const totalQty = qtyPerHead * guests;
                        previewItems.push({
                          type: 'Package Dish',
                          name: dish.name,
                          quantity: totalQty,
                          unit: dish.unit || 'plate',
                          price: dish.salePrice || 0,
                          menuItemId: dish.id
                        });
                        orderItems.push({
                          menuItemId: dish.id,
                          quantity: totalQty,
                          unit: dish.unit || '',
                          notes: `From package ${pkg.name}`
                        });
                      });
                    }
                  } catch (err) {
                    console.error(`❌ Failed to fetch package menu ${menuId}:`, err);
                  }
                }
              }
            }
            if (pkg && pkg.extras) {
              pkg.extras.forEach(ex => {
                if (ex.name) {
                  previewItems.push({
                    type: 'Package Extra',
                    name: ex.name,
                    quantity: 1,
                    unit: '',
                    price: ex.salePrice || 0,
                    menuItemId: null
                  });
                  const matched = inventoryItems.find(i => i.name.toLowerCase() === ex.name.toLowerCase());
                  orderItems.push({
                    menuItemId: null,
                    inventoryItemId: matched ? matched.id : null,
                    quantity: 1,
                    unit: '',
                    notes: matched ? '' : `(Package Extra: ${ex.name})`
                  });
                }
              });
            }
          } catch (err) {
            console.error('❌ Failed to fetch package:', err);
          }
        }

        // Custom items
        customItems.forEach(c => {
          const qty = Number(c.quantity) || 1;
          previewItems.push({
            type: 'Custom',
            name: c.itemName || c.name,
            quantity: qty,
            unit: c.unit || '',
            price: c.unitPrice || 0,
            menuItemId: null
          });
          const matched = inventoryItems.find(i => i.name.toLowerCase() === (c.itemName || c.name).toLowerCase());
          orderItems.push({
            menuItemId: null,
            inventoryItemId: matched ? matched.id : null,
            quantity: qty,
            unit: c.unit || '',
            notes: matched ? '' : `(Custom: ${c.itemName || c.name})`
          });
        });

        // Services (preview only)
        services.forEach(s => {
          previewItems.push({
            type: 'Service',
            name: s.serviceName || s.name,
            quantity: s.quantity || 1,
            unit: '',
            price: s.unitPrice || 0,
            isService: true
          });
        });

        setBookingItems(previewItems);

        if (newOrder.autoFillRecipes) {
          setNewOrder(prev => ({ ...prev, items: orderItems }));
        } else {
          setNewOrder(prev => ({ ...prev, items: [] }));
        }
      } catch (err) {
        console.error('❌ Error fetching booking details:', err);
        setError('Failed to load booking items. Check console for details.');
        setBookingItems([]);
        setNewOrder(prev => ({ ...prev, items: [] }));
      } finally {
        setLoadingBooking(false);
      }
    };

    fetchBookingDetails();
  }, [newOrder.bookingId, newOrder.autoFillRecipes, inventoryItems]);

  // ── Handlers ──
  const handleOrderClick = async (order) => {
    try {
      const response = await kitchenOrderApi.getById(order.id);
      if (response?.success) {
        setSelectedOrder(response.data);
        setSelectedOrderItems(response.data.items || []);
        setShowOrderDetail(true);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to fetch order details');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await kitchenOrderApi.update(orderId, { status: newStatus });
      if (response?.success) {
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          const updatedOrder = await kitchenOrderApi.getById(orderId);
          if (updatedOrder?.success) {
            setSelectedOrder(updatedOrder.data);
            setSelectedOrderItems(updatedOrder.data.items || []);
          }
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const handleExecuteOrder = async (orderId) => {
    setExecutingOrderId(orderId);
    try {
      const response = await kitchenOrderApi.execute(orderId);
      if (response?.success) {
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setShowOrderDetail(false);
          setSelectedOrder(null);
        }
        setError(null);
      } else {
        if (response?.shortageItems) {
          setShortageItems(response.shortageItems);
          setShowShortageModal(true);
        } else {
          setError(response?.message || 'Failed to execute order');
        }
      }
    } catch (err) {
      console.error('Error executing order:', err);
      if (err.response?.data?.shortageItems) {
        setShortageItems(err.response.data.shortageItems);
        setShowShortageModal(true);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to execute order');
      }
    } finally {
      setExecutingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this order?')) return;
    setIsDeleting(true);
    try {
      const response = await kitchenOrderApi.delete(orderId);
      if (response?.success) {
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setShowOrderDetail(false);
          setSelectedOrder(null);
        }
        setError(null);
        alert('✅ Order deleted successfully!');
      } else {
        setError(response?.message || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.bookingId) {
      setError('Please select a booking');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const orderData = {
        bookingId: parseInt(newOrder.bookingId),
        priority: newOrder.priority || 'normal',
        notes: newOrder.notes || '',
        autoFillRecipes: newOrder.autoFillRecipes,
        items: newOrder.items || []
      };

      const response = await kitchenOrderApi.create(orderData);
      if (response?.success) {
        setShowCreateModal(false);
        setNewOrder({
          bookingId: '',
          priority: 'normal',
          notes: '',
          autoFillRecipes: true,
          items: []
        });
        setBookingItems([]);
        await fetchOrders();
        setError(null);
      } else {
        setError(response?.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsAddingItem(true);
    try {
      const itemData = {
        menuItemId: newItem.menuItemId || null,
        inventoryItemId: newItem.inventoryItemId || null,
        quantity: parseFloat(newItem.quantity) || 1,
        unit: newItem.unit || '',
        notes: newItem.notes || ''
      };
      const response = await kitchenOrderApi.addItem(selectedOrder.id, itemData);
      if (response?.success) {
        setShowAddItemModal(false);
        setNewItem({
          menuItemId: '',
          inventoryItemId: '',
          quantity: 1,
          unit: '',
          notes: ''
        });
        const updatedOrder = await kitchenOrderApi.getById(selectedOrder.id);
        if (updatedOrder?.success) {
          setSelectedOrder(updatedOrder.data);
          setSelectedOrderItems(updatedOrder.data.items || []);
        }
        setError(null);
      } else {
        setError(response?.message || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setError(err.response?.data?.message || 'Failed to add item');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleUpdateItem = async (itemId, data) => {
    try {
      const response = await kitchenOrderApi.updateItem(itemId, data);
      if (response?.success) {
        const updatedOrder = await kitchenOrderApi.getById(selectedOrder.id);
        if (updatedOrder?.success) {
          setSelectedOrder(updatedOrder.data);
          setSelectedOrderItems(updatedOrder.data.items || []);
        }
        setEditingItem(null);
      }
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await kitchenOrderApi.deleteItem(itemId);
      if (response?.success) {
        const updatedOrder = await kitchenOrderApi.getById(selectedOrder.id);
        if (updatedOrder?.success) {
          setSelectedOrder(updatedOrder.data);
          setSelectedOrderItems(updatedOrder.data.items || []);
        }
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  // ── 🔥 NEW: Generate PDF for Order ──
  const generateOrderPDF = (order, items) => {
    if (!order) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    // Header
    doc.setFontSize(18);
    doc.setTextColor('#2563EB');
    doc.text('UniSoft Enterprise', margin, 40);
    doc.setFontSize(10);
    doc.setTextColor('#666');
    doc.text('Premium Event & Hall Booking', margin, 58);
    doc.text('www.UniSoft.com | info@UniSoft.com | 0300-1234567', margin, 72);

    // Divider
    doc.setDrawColor('#2563EB');
    doc.setLineWidth(0.5);
    doc.line(margin, 85, pageWidth - margin, 85);

    // Order Title
    doc.setFontSize(14);
    doc.setTextColor('#1a1a2e');
    doc.text(`Kitchen Order #${order.id}`, margin, 110);
    doc.setFontSize(9);
    doc.setTextColor('#666');
    doc.text(`Booking: ${order.booking?.bookingNo || 'N/A'}`, margin, 128);
    doc.text(`Guest: ${order.booking?.guestName || 'Unknown'}`, margin, 142);
    doc.text(`Phone: ${order.booking?.guestPhone || 'N/A'}`, margin, 156);
    doc.text(`Event: ${order.booking?.title || 'N/A'}`, margin, 170);
    doc.text(`Date: ${order.booking?.eventDate ? new Date(order.booking.eventDate).toLocaleDateString() : 'N/A'}`, margin, 184);
    doc.text(`Guests: ${order.booking?.guestCount || 0}`, margin, 198);
    doc.text(`Status: ${order.status || 'N/A'}`, margin, 212);
    doc.text(`Priority: ${order.priority || 'normal'}`, margin, 226);
    if (order.notes) {
      doc.text(`Notes: ${order.notes}`, margin, 240);
    }

    // Items Table
    const tableRows = items.map(item => [
      item.menuItem?.name || item.inventoryItem?.name || 'Unknown',
      String(item.quantity),
      item.unit || '-',
      `Rs ${(item.liveCostPerUnit || 0).toFixed(2)}`,
      `Rs ${(item.liveTotalCost || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 260,
      head: [['Item', 'Qty', 'Unit', 'Cost/Unit', 'Total']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: '#2563EB', textColor: '#fff', fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 60, halign: 'right' },
        4: { cellWidth: 60, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    // Grand Total
    const finalY = doc.lastAutoTable?.finalY + 20 || 400;
    const totalCost = items.reduce((sum, i) => sum + (i.liveTotalCost || 0), 0);
    const paid = order.paidAmount || order.advanceAmount || 0;
    const due = totalCost - paid;

    doc.setFontSize(11);
    doc.setTextColor('#1a1a2e');
    doc.text(`Grand Total: Rs ${totalCost.toFixed(2)}`, pageWidth - margin - 120, finalY, { align: 'right' });
    doc.text(`Paid: Rs ${Number(paid).toFixed(2)}`, pageWidth - margin - 120, finalY + 16, { align: 'right' });
    doc.setTextColor('#c0392b');
    doc.text(`Due Balance: Rs ${Math.max(0, due).toFixed(2)}`, pageWidth - margin - 120, finalY + 32, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor('#999');
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.text('Thank you for choosing UniSoft Enterprise!', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 14, { align: 'center' });

    // Save PDF
    doc.save(`Kitchen_Order_${order.id}.pdf`);
  };

  // ── Helper Functions ──
  const getStatusConfig = (status) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  };

  const getPriorityConfig = (priority) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[0];
  };

  const getAvailableStatusTransitions = (currentStatus) => {
    return STATUS_FLOW[currentStatus] || [];
  };

  const getStatusBadgeColor = (status) => {
    const config = getStatusConfig(status);
    return config?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority) => {
    const config = getPriorityConfig(priority);
    return config?.color || 'text-gray-500';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ── Render Functions ──
  const renderOrderCard = (order) => {
    const statusConfig = getStatusConfig(order.status);
    const priorityConfig = getPriorityConfig(order.priority);

    return (
      <div
        key={order.id}
        onClick={() => handleOrderClick(order)}
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {order.booking?.title || `Order #${order.id}`}
              </h3>
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-sm text-gray-500">
                  {order.booking?.bookingNo || 'N/A'}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  {order.booking?.guestName || 'Unknown Guest'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className={`text-xs font-medium ${priorityConfig.color}`}>
                {priorityConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
              {order.booking?.eventDate ? formatDate(order.booking.eventDate) : 'N/A'}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-1 text-gray-400" />
              {order.booking?.guestCount || 0} guests
            </div>
          </div>
          
          {order.notes && (
            <div className="mt-2 text-sm text-gray-500 line-clamp-2">
              {order.notes}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>Items: {order._count?.items || 0}</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </div>

        {order.status !== 'served' && order.status !== 'cancelled' && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
            {order.status === 'ready' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteOrder(order.id);
                }}
                disabled={executingOrderId === order.id}
                className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 flex items-center"
              >
                {executingOrderId === order.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Serve
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatuses = getAvailableStatusTransitions(order.status);
                if (nextStatuses.length > 0) {
                  handleStatusUpdate(order.id, nextStatuses[0]);
                }
              }}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderKanbanColumn = (status) => {
    const config = getStatusConfig(status);
    const columnOrders = filteredOrders.filter(o => o.status === status);

    return (
      <div className="flex-1 min-w-[250px]">
        <div className="bg-gray-50 rounded-lg p-3 h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">
              {config.label}
              <span className="ml-2 text-sm text-gray-500">({columnOrders.length})</span>
            </h3>
            {status === 'pending' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {columnOrders.map(order => renderOrderCard(order))}
            {columnOrders.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No orders
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Utensils className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kitchen Display System</h1>
                <p className="text-sm text-gray-500">
                  Real-time kitchen order management
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{stats.pending + stats.preparing + stats.ready} Active</span>
              </div>
              <div className="flex items-center space-x-1 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span>{stats.pending} Pending</span>
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>{stats.ready} Ready</span>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <button
                onClick={fetchOrders}
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
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <ReactSelect
                options={statusOptions}
                value={statusFilter}
                onChange={opt => setStatusFilter(opt || 'all')}
                placeholder="All Status"
              />

              <ReactSelect
                options={priorityOptions}
                value={priorityFilter}
                onChange={opt => setPriorityFilter(opt || 'all')}
                placeholder="All Priority"
              />

              <div className="flex items-center space-x-1 border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Order
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
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Utensils className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No orders found</h3>
            <p className="text-gray-400 mt-1">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new order to get started'}
            </p>
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Order
              </button>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {['pending', 'preparing', 'ready', 'served', 'cancelled'].map(status =>
              renderKanbanColumn(status)
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => renderOrderCard(order))}
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedOrder.booking?.title || `Order #${selectedOrder.id}`}
                </h2>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(selectedOrder.status)}`}>
                    {getStatusConfig(selectedOrder.status)?.label}
                  </span>
                  <span className={`text-sm font-medium ${getPriorityBadge(selectedOrder.priority)}`}>
                    {getPriorityConfig(selectedOrder.priority)?.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {selectedOrder.booking?.bookingNo}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowOrderDetail(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Guest</p>
                  <p className="font-medium">{selectedOrder.booking?.guestName || 'N/A'}</p>
                  {selectedOrder.booking?.guestPhone && (
                    <p className="text-sm text-gray-500 flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {selectedOrder.booking.guestPhone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Event Date</p>
                  <p className="font-medium">
                    {selectedOrder.booking?.eventDate
                      ? new Date(selectedOrder.booking.eventDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Guests</p>
                  <p className="font-medium">{selectedOrder.booking?.guestCount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {selectedOrder.summary && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Estimated Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    PKR {selectedOrder.summary.totalEstimatedCost?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {selectedOrder.summary.itemCount} items
                  </p>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Items</h3>
                {selectedOrder.status !== 'served' && selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </button>
                )}
              </div>

              {selectedOrderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Utensils className="w-12 h-12 mx-auto mb-2" />
                  <p>No items in this order</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2 pr-4">Item</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4 text-right">Qty</th>
                        <th className="pb-2 pr-4 text-right">Unit</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderItems.map((item) => {
                        const isEditing = editingItem === item.id;
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 pr-4">
                              {item.menuItem?.name || item.inventoryItem?.name || 'Unknown'}
                            </td>
                            <td className="py-3 pr-4 text-sm">
                              {item.menuItemId ? 'Menu' : 'Inventory'}
                            </td>
                            <td className="py-3 pr-4 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={item.quantity}
                                  className="w-20 px-2 py-1 border rounded text-right"
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (val > 0) {
                                      handleUpdateItem(item.id, { quantity: val });
                                    } else {
                                      setEditingItem(null);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingItem(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="font-medium">{item.quantity}</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-right">{item.unit}</td>
                            {/* <td className="py-3 pr-4 text-right">
                              PKR {(item.liveCostPerUnit || 0).toFixed(2)}
                            </td>
                            <td className="py-3 pr-4 text-right font-medium">
                              PKR {(item.liveTotalCost || 0).toFixed(2)}
                            </td> */}
                            <td className="py-3 text-right">
                              {selectedOrder.status !== 'served' && selectedOrder.status !== 'cancelled' && (
                                <div className="flex items-center justify-end space-x-1">
                                  <button
                                    onClick={() => setEditingItem(item.id)}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Modal Footer — WITH PRINT PDF BUTTON ── */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <span className="text-sm text-gray-500">Change Status:</span>
                {getAvailableStatusTransitions(selectedOrder.status).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                    className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {getStatusConfig(status)?.label}
                  </button>
                ))}
                {selectedOrder.status === 'ready' && (
                  <button
                    onClick={() => handleExecuteOrder(selectedOrder.id)}
                    disabled={executingOrderId === selectedOrder.id}
                    className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {executingOrderId === selectedOrder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Serve & Deduct Stock
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                {/* 🔥 NEW: Print PDF Button */}
                <button
                  onClick={() => generateOrderPDF(selectedOrder, selectedOrderItems)}
                  className="px-3 py-1.5 text-sm font-medium text-[#2563EB] bg-white border border-[#2563EB] rounded-lg hover:bg-amber-50 transition-colors flex items-center"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print PDF
                </button>
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Delete Order
                </button>
                <button
                  onClick={() => setShowOrderDetail(false)}
                  className="px-4 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Order Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Create Kitchen Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking <span className="text-red-500">*</span>
                  </label>
                  <ReactSelect
                    options={bookingOptions}
                    value={newOrder.bookingId}
                    onChange={opt => setNewOrder({ ...newOrder, bookingId: opt || '' })}
                    placeholder="Select Booking"
                    isRequired
                  />
                  {bookings.length === 0 && (
                    <p className="text-xs text-yellow-500 mt-1">No bookings found. You can still create order without booking.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <ReactSelect
                    options={priorityCreateOptions}
                    value={newOrder.priority}
                    onChange={opt => setNewOrder({ ...newOrder, priority: opt || 'normal' })}
                    placeholder="Select Priority"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    rows={3}
                    placeholder="Special instructions..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoFillRecipes"
                    checked={newOrder.autoFillRecipes}
                    onChange={(e) => setNewOrder({ ...newOrder, autoFillRecipes: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoFillRecipes" className="text-sm text-gray-700">
                    Auto-fill items from booking (including package menus)
                  </label>
                </div>

                {/* ── 🔥 ITEMS PREVIEW ── */}
                {loadingBooking && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Loading booking items...</span>
                  </div>
                )}

                {!loadingBooking && bookingItems.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Items Preview</h4>
                    <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Unit</th>
                            {/* <th className="px-3 py-2 text-right">Price</th> */}
                          </tr>
                        </thead>
                        <tbody>
                          {bookingItems.map((item, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-xs text-gray-500">{item.type}</td>
                              <td className="px-3 py-2">{item.name}</td>
                              <td className="px-3 py-2 text-right">{item.quantity || 1}</td>
                              <td className="px-3 py-2 text-right">{item.unit || ''}</td>
                              {/* <td className="px-3 py-2 text-right font-medium">
                                {item.price ? `Rs ${Number(item.price).toFixed(0)}` : '-'}
                              </td> */}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {newOrder.items.length} kitchen items will be added to the order.
                      {newOrder.items.some(i => i.inventoryItemId === null && i.menuItemId === null) && 
                        ' (Some custom items may be added as notes if not found in inventory.)'
                      }
                    </p>
                  </div>
                )}

                {!loadingBooking && bookingItems.length === 0 && newOrder.bookingId && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                    This booking has no kitchen items. You can add items manually after creating the order.
                  </div>
                )}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Item Modal ── */}
      {showAddItemModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add Item to Order</h2>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Item
                </label>
                <ReactSelect
                  options={menuItemOptions}
                  value={newItem.menuItemId}
                  onChange={opt => setNewItem({ 
                    ...newItem, 
                    menuItemId: opt || '',
                    inventoryItemId: '' 
                  })}
                  placeholder="Select Menu Item"
                />
                {menuItems.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No menu items available</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-medium px-2">OR</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inventory Item
                </label>
                <ReactSelect
                  options={inventoryItemOptions}
                  value={newItem.inventoryItemId}
                  onChange={opt => setNewItem({ 
                    ...newItem, 
                    inventoryItemId: opt || '',
                    menuItemId: '' 
                  })}
                  placeholder="Select Inventory Item"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {inventoryItems.length} inventory items available
                </p>
              </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="kg, pcs, box..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="Special instructions..."
                />
              </div>

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
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isAddingItem ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stock Shortage Modal ── */}
      {showShortageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-yellow-200 bg-yellow-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <h2 className="text-lg font-bold text-yellow-800">Insufficient Stock</h2>
              </div>
              <button
                onClick={() => setShowShortageModal(false)}
                className="p-2 text-yellow-600 hover:text-yellow-800 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-gray-600 mb-4">
                The following items have insufficient stock to execute this order:
              </p>

              <div className="space-y-3">
                {shortageItems.map((item, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium text-red-800">{item.name}</p>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-sm">
                      <span className="text-red-600">Required: {item.required}</span>
                      <span className="text-gray-600">Available: {item.available}</span>
                      <span className="text-red-700 font-bold">Shortage: {item.shortage}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowShortageModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KDS;